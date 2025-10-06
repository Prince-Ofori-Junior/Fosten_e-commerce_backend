// modules/delivery/delivery.routes.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const rateLimit = require("../../middleware/rateLimiter"); // optional per-route limiter
const {
  createDelivery,
  getDelivery,
  updateStatus,
  assignCourier,
  listDeliveries,
} = require("./delivery.controller");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

// Middleware to validate request
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ----- User Routes -----
router.get(
  "/:orderId",
  protect,
  validate([param("orderId").isInt().withMessage("Order ID must be an integer")]),
  getDelivery
);

// ----- Admin Routes -----
router.use(protect, authorizeRoles("admin")); // all routes below are admin-only

router.post(
  "/",
  rateLimit, // optional: prevent spam requests
  validate([
    body("orderId").isInt().withMessage("Order ID must be an integer"),
    body("address").isString().trim().notEmpty().withMessage("Address is required"),
    body("courier").optional().isString().trim(),
  ]),
  createDelivery
);

router.patch(
  "/:deliveryId/status",
  validate([
    param("deliveryId").isInt().withMessage("Delivery ID must be an integer"),
    body("status")
      .isIn(["pending", "in_transit", "delivered", "cancelled"])
      .withMessage("Invalid status"),
  ]),
  updateStatus
);

router.patch(
  "/:deliveryId/courier",
  validate([
    param("deliveryId").isInt().withMessage("Delivery ID must be an integer"),
    body("courier").isString().trim().notEmpty().withMessage("Courier is required"),
  ]),
  assignCourier
);

router.get("/", listDeliveries);

module.exports = router;
