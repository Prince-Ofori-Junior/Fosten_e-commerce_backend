// modules/notifications/notification.routes.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("../../middleware/rateLimiter"); // advanced rate limiter
const {
  sendNotification,
  getUserNotifications,
  listNotifications,
} = require("./notification.controller");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

// -------------------- MIDDLEWARE --------------------
// Rate limiter: protect all notification routes
router.use(rateLimit);

// Validate request body for sending notifications
const validateNotification = [
  body("title").isString().trim().isLength({ min: 3 }).withMessage("Title is required"),
  body("message").isString().trim().isLength({ min: 3 }).withMessage("Message is required"),
  body("userId").optional().isInt().withMessage("Invalid userId"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

// -------------------- USER ROUTES --------------------
// Get current user's notifications
router.get("/", protect, getUserNotifications);

// -------------------- ADMIN ROUTES --------------------
// Send notification
router.post("/", protect, authorizeRoles("admin"), validateNotification, sendNotification);

// List all notifications
router.get("/all", protect, authorizeRoles("admin"), listNotifications);

module.exports = router;
