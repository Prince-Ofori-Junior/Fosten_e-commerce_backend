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

  if (!validateName(name))
    return apiResponse(res, 400, false, "Invalid name", {}, [{ param: "name", message: "Name must be at least 2 characters" }]);

  if (!validateEmail(email))
    return apiResponse(res, 400, false, "Invalid email", {}, [{ param: "email", message: "Email format is incorrect" }]);

  if (!validatePassword(password))
    return apiResponse(res, 400, false, "Password does not meet security criteria", {}, [{ param: "password", message: "Password must be at least 6 characters" }]);

  if (phone && !validatePhone(phone))
    return apiResponse(res, 400, false, "Invalid phone number format", {}, [{ param: "phone", message: "Phone number format is invalid" }]);

  try {
    const data = await registerUser({ name, email, password, address, phone });
    logger.info(`🆕 User registered: ${email}`);
    return apiResponse(res, 201, true, "User registered successfully", data);
  } catch (err) {
    logger.error(`❌ Registration failed for ${email}: ${err.message}`);
    return apiResponse(res, 400, false, err.message, {}, [{ param: null, message: err.message }]);
  }
});

// -------------------- LOGIN --------------------
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email))
    return apiResponse(res, 400, false, "Invalid email", {}, [{ param: "email", message: "Email format is invalid" }]);

  if (!validatePassword(password))
    return apiResponse(res, 400, false, "Invalid password format", {}, [{ param: "password", message: "Password must be at least 6 characters" }]);

  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  try {
    const { user, accessToken, refreshToken } = await loginUser({ email, password }, ip);
    logger.info(`🔑 User login successful: ${email} from ${ip} - ${req.get("User-Agent")}`);
    return apiResponse(res, 200, true, "Login successful", { user, accessToken, refreshToken });
  } catch (err) {
    logger.error(`❌ Login failed for ${email}: ${err.message}`);
    return apiResponse(res, 400, false, err.message, {}, [{ param: null, message: err.message }]);
  }
});

const forgotPasswordController = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!validateEmail(email))
    return apiResponse(res, 400, false, "Invalid email", {}, [{ param: "email", message: "Email format is invalid" }]);

  try {
    await forgotPassword(email);
    logger.info(`🔐 Password reset requested for: ${email}`);
    return apiResponse(res, 200, true, "If that email exists, password reset instructions have been sent");
  } catch (err) {
    return apiResponse(res, 400, false, err.message, {}, [{ param: null, message: err.message }]);
  }
});

const resetPasswordController = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!validatePassword(newPassword))
    return apiResponse(res, 400, false, "Password does not meet security criteria", {}, [{ param: "password", message: "Password must be at least 6 characters" }]);

  const success = await resetPassword(token, newPassword);
  if (!success)
    return apiResponse(res, 400, false, "Invalid or expired token", {}, [{ param: null, message: "Token is invalid or expired" }]);

  logger.info("✅ Password reset successful");
  return apiResponse(res, 200, true, "Password reset successful");
});

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
