const { pool } = require("../../config/db");
const logger = require("../../config/logger");

// -------------------- USERS --------------------

// Create a new user with address and phone
const createUser = async ({ name, email, passwordHash, role = "user", address = null, phone = null }) => {
  const query = `
    INSERT INTO users (name, email, password, role, address, phone, is_active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
    RETURNING id, name, email, role, address, phone, is_active, created_at
  `;
  const values = [name, email, passwordHash, role, address, phone];

  try {
    const { rows } = await pool.query(query, values);
    logger.info(`🆕 User created: ${email} with role ${role}`);
    return rows[0];
  } catch (err) {
    logger.error(`Failed to create user ${email}: ${err.message}`);
    throw new Error("User creation failed");
  }
};

// Fetch user by email
const findUserByEmail = async (email) => {
  const query = `
    SELECT id, name, email, role, password, is_active, address, phone
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Fetch user by ID
const findUserById = async (id) => {
  const query = `
    SELECT id, name, email, role, is_active, address, phone
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Update password
const updatePassword = async (id, passwordHash) => {
  const query = `UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2`;
  try {
    await pool.query(query, [passwordHash, id]);
    logger.info(`🔐 Password updated for user ID ${id}`);
  } catch (err) {
    logger.error(`Failed to update password for user ID ${id}: ${err.message}`);
    throw new Error("Password update failed");
  }
};

// Deactivate user
const deactivateUser = async (id) => {
  const query = `UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1`;
  try {
    await pool.query(query, [id]);
    logger.warn(`🚫 User ID ${id} deactivated`);
  } catch (err) {
    logger.error(`Failed to deactivate user ID ${id}: ${err.message}`);
    throw new Error("Failed to deactivate user");
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updatePassword,
  deactivateUser,
};
