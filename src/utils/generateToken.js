// utils/generateToken.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn("⚠️  JWT_REFRESH_SECRET not set. Using JWT_SECRET as fallback.");
}

// -------------------- ACCESS TOKEN --------------------
const generateToken = (payload, expiresIn = "1d", jwtSecret = process.env.JWT_SECRET) => {
  const safePayload = { ...payload };
  if (safePayload.password) delete safePayload.password;

  return jwt.sign(safePayload, jwtSecret, {
    expiresIn,
    algorithm: "HS512",
    jwtid: crypto.randomUUID(),
  });
};

// -------------------- REFRESH TOKEN --------------------
const generateRefreshToken = (payload, expiresIn = "7d", jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) => {
  const safePayload = { id: payload.id, role: payload.role }; // keep minimal data

  return jwt.sign(safePayload, jwtSecret, {
    expiresIn,
    algorithm: "HS512",
    jwtid: crypto.randomUUID(),
  });
};

// -------------------- VERIFY --------------------
const verifyToken = (token, jwtSecret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, jwtSecret, { algorithms: ["HS512"] });
  } catch (err) {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }
};

const verifyRefreshToken = (token, jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, jwtSecret, { algorithms: ["HS512"] });
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }
};

module.exports = { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken };
