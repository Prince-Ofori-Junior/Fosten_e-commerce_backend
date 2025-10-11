const express = require("express");
const bodyParser = require("body-parser");
const {
  createOrder,
  getOrder,
  updateOrderStatus,
  listUserOrders,
  listAllOrders,
  paystackWebhook,
  verifyOrder,
} = require("./order.controller");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const rateLimit = require("../../middleware/rateLimiter");
const validate = require("../../middleware/validate");
const { updateOrderStatusService } = require("./order.service");

const router = express.Router();

// ------------------- ORDERS -------------------

// Create new order
router.post(
  "/",
  protect,
  rateLimit({ max: 10, windowMs: 5 * 60 * 1000 }),
  createOrder
);

// Get orders for logged-in user
router.get("/my-orders", protect, listUserOrders);

// Get a specific order
router.get("/:orderId", protect, getOrder);

// Admin: get all orders
router.get("/", protect, authorizeRoles("admin"), listAllOrders);

// Admin: update order status
const Joi = require("joi");

router.patch(
  "/:orderId/status",
  protect,
  authorizeRoles("admin"),
  validate(
    Joi.object({
      status: Joi.string()
        .valid("pending", "processing", "shipped", "delivered", "cancelled", "failed")
        .required(),
    })
  ),
  updateOrderStatus
);


// ------------------- PAYSTACK -------------------

// Verify Paystack payment
router.get("/paystack/verify/:reference", protect, verifyOrder);

// Paystack webhook (use raw body)
router.post(
  "/paystack/webhook",
  bodyParser.raw({ type: "application/json" }),
  paystackWebhook
);

module.exports = router;
