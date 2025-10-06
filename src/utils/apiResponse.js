// utils/apiResponse.js
const apiResponse = (res, statusCode, success, message, data = {}, errors = []) => {
  const sanitizedData = sanitize(data);
  const safeErrors = Array.isArray(errors) ? errors.map(err => sanitize(err)) : [];

  return res.status(statusCode).json({
    success,
    message, // ✅ always include message
    ...(success ? { data: sanitizedData } : { errors: safeErrors.length ? safeErrors : [message] }),
  });
};

// ------------------ Private Sanitizer ------------------
const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const clone = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = ["password", "token", "refreshToken", "secret", "creditCard"];

  sensitiveKeys.forEach((key) => {
    if (clone.hasOwnProperty(key)) delete clone[key];
  });

  return clone;
};

module.exports = apiResponse;
