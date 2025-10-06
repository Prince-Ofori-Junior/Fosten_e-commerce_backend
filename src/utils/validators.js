const Joi = require("joi");
const { validate: uuidValidate } = require("uuid");

// -------------------- User Validators --------------------

// Validate registration input
const validateRegister = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$")
      )
      .message(
        "Password must have at least 1 uppercase, 1 lowercase, 1 number, 1 special character"
      )
      .required(),
    phone: Joi.string()
      .pattern(/^\d{10,15}$/)
      .message("Phone number must be 10-15 digits")
      .optional(),
    address: Joi.string().max(255).optional(),
  });
  return schema.validate(data, { abortEarly: false });
};

// Validate login input
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return schema.validate(data, { abortEarly: false });
};

// Individual validators (useful in controllers/services)
const validateEmail = (email) => !Joi.string().email().validate(email).error;

const validatePassword = (password) => {
  const schema = Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$"));
  return !schema.validate(password).error;
};

const validateName = (name) => !Joi.string().min(2).max(50).validate(name).error;

// Validate phone number (10-15 digits)
const validatePhone = (phone) => !Joi.string().pattern(/^\d{10,15}$/).validate(phone).error;

// -------------------- Admin / Shared Validators --------------------

// UUID validation (for users, products, orders, etc.)
const validateUUID = (id) => uuidValidate(id);

// Role validation (only allow specific roles)
const validateRole = (role) => ["user", "seller", "admin"].includes(role);

module.exports = {
  validateRegister,
  validateLogin,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone, // ✅ now included
  validateUUID,
  validateRole,
};
