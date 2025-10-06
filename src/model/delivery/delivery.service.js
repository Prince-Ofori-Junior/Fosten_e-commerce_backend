// modules/delivery/delivery.service.js
const {
  createDelivery,
  getDeliveryByOrder,
  updateDeliveryStatus,
  assignCourier,
  getAllDeliveries,
} = require("./delivery.model");
const logger = require("../../config/logger");
const createError = require("http-errors");

// Allowed statuses for delivery
const VALID_STATUSES = ["pending", "dispatched", "in-transit", "delivered", "failed"];

// -------------------- CREATE DELIVERY --------------------
const createDeliveryService = async (orderId, address, courier) => {
  if (!orderId || !address) {
    throw createError(400, "Order ID and address are required");
  }

  try {
    const delivery = await createDelivery({
      orderId,
      address,
      courier: courier || null,
      status: "pending",
    });
    logger.info(`🚚 Delivery created for order ${orderId}`);
    return delivery;
  } catch (err) {
    logger.error(`Delivery creation failed: ${err.message}`);
    throw createError(500, "Failed to create delivery");
  }
};

// -------------------- GET DELIVERY --------------------
const getDeliveryService = async (orderId) => {
  if (!orderId) throw createError(400, "Order ID is required");

  const delivery = await getDeliveryByOrder(orderId);
  if (!delivery) throw createError(404, "Delivery not found");
  return delivery;
};

// -------------------- UPDATE DELIVERY STATUS --------------------
const updateDeliveryStatusService = async (deliveryId, status) => {
  if (!deliveryId || !status) throw createError(400, "Delivery ID and status are required");
  if (!VALID_STATUSES.includes(status)) throw createError(400, "Invalid delivery status");

  try {
    const updated = await updateDeliveryStatus(deliveryId, status);
    if (!updated) throw createError(404, "Delivery not found");
    logger.info(`📦 Delivery ${deliveryId} status updated to ${status}`);
    return updated;
  } catch (err) {
    logger.error(`Failed to update delivery status: ${err.message}`);
    throw createError(500, "Failed to update delivery status");
  }
};

// -------------------- ASSIGN COURIER --------------------
const assignCourierService = async (deliveryId, courier) => {
  if (!deliveryId || !courier) throw createError(400, "Delivery ID and courier are required");

  try {
    const updated = await assignCourier(deliveryId, courier);
    if (!updated) throw createError(404, "Delivery not found");
    logger.info(`👷 Courier ${courier} assigned to delivery ${deliveryId}`);
    return updated;
  } catch (err) {
    logger.error(`Failed to assign courier: ${err.message}`);
    throw createError(500, "Failed to assign courier");
  }
};

// -------------------- LIST ALL DELIVERIES --------------------
const listDeliveriesService = async () => {
  try {
    const deliveries = await getAllDeliveries();
    return deliveries;
  } catch (err) {
    logger.error(`Failed to list deliveries: ${err.message}`);
    throw createError(500, "Failed to fetch deliveries");
  }
};

module.exports = {
  createDeliveryService,
  getDeliveryService,
  updateDeliveryStatusService,
  assignCourierService,
  listDeliveriesService,
};
