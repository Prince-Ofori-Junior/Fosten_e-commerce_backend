const pool = require("../../config/db");
const {
  createOrderWithItems,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require("./order.model");
const axios = require("axios");
const logger = require("../../config/logger");
const { v4: uuidv4 } = require("uuid");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://fosten-e-commerce-frontend.vercel.app";

// ------------------- PLACE ORDER -------------------
const placeOrderService = async (userId, orderData) => {
  const { items, totalAmount, paymentMethod, paymentChannel, email, address, phone } = orderData;

  if (!Array.isArray(items) || items.length === 0)
    throw new Error("Order must have at least one item");
  if (!totalAmount || totalAmount <= 0)
    throw new Error("Invalid total amount");

  const reference = paymentMethod !== "cod" ? `ORD-${uuidv4()}` : null;
  const status = paymentMethod === "cod" ? "pending" : "processing";

  // Create order in DB
  const { order } = await createOrderWithItems(
    { userId, totalAmount, paymentMethod, paymentChannel, address, status, paymentReference: reference },
    items
  );

  let paymentData = null;

  if (paymentMethod === "card" || paymentMethod === "momo") {
    try {
      const payload = {
        email: email || "customer@example.com",
        amount: Math.round(totalAmount * 100),
        currency: "GHS",
        reference,
        metadata: { orderId: order.id, userId },
        callback_url: `${FRONTEND_URL}/order-success`,
        channels: paymentMethod === "card" ? ["card"] : ["mobile_money"],
      };

      if (paymentMethod === "momo") {
        payload.mobile_money = {
          phone: phone, // from frontend payload
          provider: paymentChannel, // MTN, Vodafone, AirtelTigo
        };
      }

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        payload,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );

      const { authorization_url } = response.data.data;
      paymentData = { authorization_url, reference, channel: paymentChannel };
    } catch (err) {
      logger.error("Paystack initialization failed: " + err.message);
      throw new Error("Failed to initialize payment");
    }
  }

  return { order, paymentData };
};

// ------------------- VERIFY PAYMENT -------------------
const verifyOrderService = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const data = response.data.data;
    const orderId = data.metadata?.orderId;
    let finalStatus = "cancelled";

    if (data.status === "success") {
      finalStatus = "processing";
    } else if (["failed", "abandoned", "reversed"].includes(data.status)) {
      finalStatus = "cancelled";
    } else {
      finalStatus = "pending";
    }

    if (orderId) {
      await updateOrderStatus(orderId, finalStatus);
      logger.info(`🔄 Order ${orderId} updated to status: ${finalStatus}`);
    }

    return { success: data.status === "success", orderId };
  } catch (err) {
    logger.error(`Paystack verification failed: ${err.message}`);
    throw new Error("Payment verification failed");
  }
};

// ------------------- WRAPPERS -------------------
const getUserOrdersService = async (userId) => getUserOrders(userId);
const getOrderService = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Order not found");
  return order;
};
const updateOrderStatusService = async (orderId, status) => updateOrderStatus(orderId, status);
const listAllOrdersService = async () => getAllOrders();

module.exports = {
  placeOrderService,
  verifyOrderService,
  getUserOrdersService,
  getOrderService,
  updateOrderStatusService,
  listAllOrdersService,
};
