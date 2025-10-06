// modules/auth/auth.controller.js
const catchAsync = require("../../utils/catchAsync");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../config/logger");
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  revokeRefreshToken,
} = require("./auth.service");
const {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
} = require("../../utils/validators");

// -------------------- REGISTER --------------------
const register = catchAsync(async (req, res) => {
  const { name, email, password, address, phone } = req.body;

  if (!validateName(name)) return apiResponse(res, 400, false, "Invalid name");
  if (!validateEmail(email)) return apiResponse(res, 400, false, "Invalid email");
  if (!validatePassword(password))
    return apiResponse(res, 400, false, "Password does not meet security criteria");

  if (phone && !validatePhone(phone))
    return apiResponse(res, 400, false, "Invalid phone number format");

  try {
    const data = await registerUser({ name, email, password, address, phone });
    logger.info(`🆕 User registered: ${email}`);
    return apiResponse(res, 201, true, "User registered successfully", data);
  } catch (err) {
    logger.error(`❌ Registration failed for ${email}: ${err.message}`);
return apiResponse(res, 400, false, err.message); // return the real error in message
  }
});

/// -------------------- LOGIN --------------------
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) return apiResponse(res, 400, false, "Invalid email");
  if (!validatePassword(password))
    return apiResponse(res, 400, false, "Invalid password format");

  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  const { user, accessToken, refreshToken } = await loginUser({ email, password }, ip);

  logger.info(
    `🔑 User login successful: ${email} from ${ip} - ${req.get("User-Agent")}`
  );

  return apiResponse(res, 200, true, "Login successful", {
    user,
    accessToken,
    refreshToken,
  });
});

// -------------------- FORGOT PASSWORD --------------------
const forgotPasswordController = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!validateEmail(email)) return apiResponse(res, 400, false, "Invalid email");

  await forgotPassword(email);

  logger.info(`🔐 Password reset requested for: ${email}`);
  return apiResponse(
    res,
    200,
    true,
    "If that email exists, password reset instructions have been sent"
  );
});

// -------------------- RESET PASSWORD --------------------
const resetPasswordController = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!validatePassword(newPassword))
    return apiResponse(res, 400, false, "Password does not meet security criteria");

  const success = await resetPassword(token, newPassword);
  if (!success) return apiResponse(res, 400, false, "Invalid or expired token");

  logger.info("✅ Password reset successful");
  return apiResponse(res, 200, true, "Password reset successful");
});

// -------------------- LOGOUT --------------------
const logoutController = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  await revokeRefreshToken(refreshToken);
  logger.info(`👋 User logged out: ${req.user?.email || "unknown"}`);
  return apiResponse(res, 200, true, "Logout successful");
});

module.exports = {
  register,
  login,
  forgotPasswordController,
  resetPasswordController,
  logoutController,
};
