// modules/auth/auth.routes.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  register,
  login,
  forgotPasswordController,
} = require("./auth.controller");
const { protect } = require("../../middleware/authMiddleware");

const router = express.Router();

// -------------------- VALIDATORS --------------------
const validateRegister = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/\d/).withMessage("Password must contain at least one number"),
  body("phone")
    .optional()
    .matches(/^\+?\d{7,15}$/).withMessage("Phone number must be valid"),
  body("address")
    .optional()
    .isLength({ min: 5 }).withMessage("Address must be at least 5 characters long"),
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// -------------------- ROUTES --------------------

// Register
router.post("/register", validateRegister, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  register(req, res, next);
});

// Login
router.post("/login", validateLogin, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  login(req, res, next);
});

// Forgot password
router.post("/forgot-password", (req, res, next) => {
  forgotPasswordController(req, res, next);
});

// Get logged-in user profile
router.get("/me", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
