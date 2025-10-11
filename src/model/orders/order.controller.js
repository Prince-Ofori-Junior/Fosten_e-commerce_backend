// modules/orders/order.controller.js
const {
  placeOrderService,
  verifyOrderService,
  getUserOrdersService,
  getOrderService,
  updateOrderStatusService,
  listAllOrdersService,
} = require("./order.service");
const logger = require("../../config/logger");
const Joi = require("joi");
const crypto = require("crypto");

// ------------------- Validation -------------------
const orderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().guid({ version: "uuidv4" }).required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),

  address: Joi.string().max(255).required(),

  paymentMethod: Joi.string().valid("cod", "card", "momo").required(),

  paymentChannel: Joi.string()
    .when("paymentMethod", {
      is: "card",
      then: Joi.string().valid("visa", "mastercard", "verve").required(),
    })
    .when("paymentMethod", {
      is: "momo",
      then: Joi.string().valid("mtn", "vodafone", "airteltigo", "telecel").required(),
    })
    .when("paymentMethod", {
      is: "cod",
      then: Joi.string().valid("cod_pickup").required(),
    }),

  totalAmount: Joi.number().positive().required(),
  email: Joi.string().email().required(),
});

// ------------------- Controllers -------------------

// 1️⃣ Create Order
const createOrder = async (req, res, next) => {
  try {
    const { error } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { paymentMethod, paymentChannel } = req.body;

    const { order, paymentData } = await placeOrderService(req.user.id, req.body);
    logger.info(`🛒 Order placed by user ${req.user.id}: ${order.id}`);

    if (paymentMethod === "cod") {
      return res.status(201).json({
        success: true,
        order,
        message: "Order placed with Cash on Delivery. Pending confirmation.",
      });
    }

    return res.status(201).json({
      success: true,
      order,
      payment: {
        method: paymentMethod,
        channel: paymentChannel,
        reference: paymentData.reference,
        authorizationUrl: paymentData.authorization_url,
      },
      message: `Proceed to ${paymentMethod.toUpperCase()} payment via ${paymentChannel.toUpperCase()}.`,
    });
  } catch (err) {
    logger.error(`Order creation failed for user ${req.user.id}: ${err.message}`);
    next(err);
  }
};

// 2️⃣ Verify Payment
const verifyOrder = async (req, res, next) => {
  const { reference } = req.params;
  if (!reference) return res.status(400).json({ success: false, message: "Reference required" });

  try {
    const verification = await verifyOrderService(reference);

    if (verification.success) {
      // 🔒 lock to processing
      await updateOrderStatusService(verification.orderId, "processing");

      return res.json({
        success: true,
        orderId: verification.orderId,
        status: "processing",
        message: "Payment verified. Order is now processing.",
      });
    } else {
      return res.status(400).json({
        success: false,
        orderId: verification.orderId,
        status: "failed",
        message: "Payment verification failed",
      });
    }
  } catch (err) {
    logger.error(`Payment verification failed: ${err.message}`);
    next(err);
  }
};

// 3️⃣ User orders
const listUserOrders = async (req, res, next) => {
  try {
    const orders = await getUserOrdersService(req.user.id);
    res.json({ success: true, orders });
  } catch (err) {
    logger.error(`Failed to fetch orders for user ${req.user.id}: ${err.message}`);
    next(err);
  }
};

// 4️⃣ Get single order
const getOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await getOrderService(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (req.user.role !== "admin" && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
    }

    res.json({ success: true, order });
  } catch (err) {
    logger.error(`Failed to fetch order ${req.params.orderId}: ${err.message}`);
    next(err);
  }
};

// 5️⃣ Admin: update order status
const updateOrderStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can update status" });
    }

    const validStatuses = ["pending", "processing", "shipped", "completed", "cancelled", "failed"];
    const { status } = req.body;
    const { orderId } = req.params;

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(", ")}` });
    }

    const order = await getOrderService(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // --- Rules ---
    if (status === "processing" && order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending orders can move to processing" });
    }

    if (status === "shipped" && order.status !== "processing") {
      return res.status(400).json({ success: false, message: "Order must be processing before shipping" });
    }

    if (status === "completed") {
      if (!order.approved_by_admin) {
        return res.status(400).json({ success: false, message: "Order must be admin-approved before delivery" });
      }
      if (order.status !== "shipped") {
        return res.status(400).json({ success: false, message: "Order must be shipped before delivery" });
      }
    }

    const updatedOrder = await updateOrderStatusService(orderId, status);
    logger.info(`📦 Order ${orderId} status updated to ${status} by admin ${req.user.id}`);

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    logger.error(`Failed to update order ${req.params.orderId}: ${err.message}`);
    next(err);
  }
};

// 6️⃣ Admin: all orders
const listAllOrders = async (_req, res, next) => {
  try {
    const orders = await listAllOrdersService();
    res.json({ success: true, orders });
  } catch (err) {
    logger.error(`Failed to fetch all orders: ${err.message}`);
    next(err);
  }
};

// 7️⃣ Paystack Webhook
const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("❌ Invalid Paystack webhook signature");
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body;
    const orderId = event.data?.metadata?.orderId;

    if (!orderId) return res.status(400).json({ success: false, message: "Missing orderId metadata" });

    if (event.event === "charge.success") {
      await updateOrderStatusService(orderId, "processing");
      logger.info(`✅ Order ${orderId} marked as processing via webhook`);
    }

    if (["charge.failed", "charge.abandoned", "charge.reversed"].includes(event.event)) {
      await updateOrderStatusService(orderId, "cancelled");
      logger.info(`❌ Order ${orderId} marked as cancelled via webhook`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`⚠️ Webhook error: ${err.message}`);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  createOrder,
  verifyOrder,
  listUserOrders,
  getOrder,
  updateOrderStatus,
  listAllOrders,
  paystackWebhook,
};
