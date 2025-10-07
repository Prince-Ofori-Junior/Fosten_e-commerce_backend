const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool } = require("../../config/db");
const logger = require("../../config/logger");
const transporter = require("../../config/mailer");

const {
  createUser,
  findUserByEmail,
  updatePassword,
  deactivateUser,
} = require("./auth.model");

const { logLoginAttempt, isIPBlocked } = require("../../utils/loginTracker");

// -------------------- HELPERS --------------------
const isUuid = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// -------------------- JWT --------------------
const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
    algorithm: "HS512",
  });

const generateRefreshToken = async (user) => {
  if (!isUuid(user.id)) throw new Error("Invalid user ID");

  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, refreshToken]
  );

  return refreshToken;
};

// -------------------- CREATE USER --------------------
const createUserService = async ({ name, email, password, address, phone, role = "user" }) => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await createUser({ name, email, passwordHash, address, phone, role });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    phone: user.phone,
    role: user.role,
  };
};

// -------------------- REGISTER --------------------
const registerUser = async ({ name, email, password, address, phone }) => {
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw { param: "email", message: "User already exists" };

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createUser({ name, email, passwordHash, address, phone });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
      accessToken: generateToken(user),
      refreshToken: await generateRefreshToken(user),
    };
  } catch (err) {
    logger.error(`❌ registerUser failed: ${err.stack || err}`);
    if (err.param && err.message) throw err; // structured error
    throw { param: null, message: err.message || "Registration failed" }; // fallback
  }
};

// -------------------- LOGIN --------------------
const loginUser = async ({ email, password }, ip) => {
  if (await isIPBlocked(ip)) throw { param: null, message: "Too many failed attempts. Try again later." };

  const user = await findUserByEmail(email);
  if (!user || !user.is_active) {
    await logLoginAttempt(user?.id || null, ip, false);
    throw { param: null, message: "Invalid credentials" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await logLoginAttempt(user.id, ip, false);

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM login_attempts 
       WHERE user_id=$1 AND success=false AND created_at > NOW() - INTERVAL '15 minutes'`,
      [user.id]
    );

    if (parseInt(rows[0].count, 10) >= 5) await deactivateUser(user.id);

    throw { param: null, message: "Invalid credentials" };
  }

  await logLoginAttempt(user.id, ip, true);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      role: user.role,
    },
    accessToken: generateToken(user),
    refreshToken: await generateRefreshToken(user),
  };
};

// -------------------- PASSWORD RESET --------------------
const forgotPassword = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) throw { param: "email", message: "No account found with this email" };

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  await pool.query(
    `UPDATE users SET reset_token=$1, reset_expires=NOW() + INTERVAL '1 hour' WHERE id=$2`,
    [hashedToken, user.id]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });

  return resetToken;
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const { rows } = await pool.query(
    `SELECT id, reset_expires FROM users WHERE reset_token=$1`,
    [hashedToken]
  );

  if (!rows.length || new Date(rows[0].reset_expires) < new Date()) return false;

  const userId = rows[0].id;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await updatePassword(userId, passwordHash);
  await pool.query(`UPDATE users SET reset_token=NULL, reset_expires=NULL WHERE id=$1`, [userId]);

  return true;
};

// -------------------- REVOKE REFRESH TOKEN --------------------
const revokeRefreshToken = async (refreshToken) => {
  await pool.query(`DELETE FROM refresh_tokens WHERE token=$1`, [refreshToken]);
  return true;
};

module.exports = {
  createUserService,
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  revokeRefreshToken,
  generateToken,
  generateRefreshToken,
};
