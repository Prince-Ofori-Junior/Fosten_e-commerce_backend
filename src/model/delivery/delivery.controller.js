// modules/delivery/delivery.controller.js
const {
  createDeliveryService,
  getDeliveryService,
  updateDeliveryStatusService,
  assignCourierService,
  listDeliveriesService,
} = require("./delivery.service");
const logger = require("../../config/logger");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { body, param, validationResult } = require("express-validator");

/**
 * Middleware to validate request
 */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// -------------------- CREATE DELIVERY --------------------
const createDelivery = [
  protect,
  authorizeRoles("admin", "manager"),
  validate([
    body("orderId").isUUID().withMessage("Invalid orderId"),
    body("address").isString().trim().notEmpty().withMessage("Address is required"),
    body("courier").optional().isString().trim(),
  ]),
  async (req, res, next) => {
    try {
      const { orderId, address, courier } = req.body;
      const delivery = await createDeliveryService(orderId, address, courier);
      logger.info(`📦 Delivery created for order ${orderId} by user ${req.user.id}`);
      res.status(201).json({ success: true, delivery });
    } catch (err) {
      logger.error(`Delivery creation failed: ${err.message}`);
      next(err);
    }
  },
];

// -------------------- GET DELIVERY --------------------
const getDelivery = [
  protect,
  authorizeRoles("admin", "manager", "courier"),
  validate([param("orderId").isUUID().withMessage("Invalid orderId")]),
  async (req, res, next) => {
    try {
      const delivery = await getDeliveryService(req.params.orderId);
      if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
      res.json({ success: true, delivery });
    } catch (err) {
      logger.error(`Fetching delivery failed: ${err.message}`);
      next(err);
    }
  },
];

// -------------------- UPDATE DELIVERY STATUS --------------------
const updateStatus = [
  protect,
  authorizeRoles("admin", "manager", "courier"),
  validate([
    param("deliveryId").isUUID().withMessage("Invalid deliveryId"),
    body("status").isIn(["pending", "in_transit", "delivered", "canceled"]).withMessage("Invalid status"),
  ]),
  async (req, res, next) => {
    try {
      const updated = await updateDeliveryStatusService(req.params.deliveryId, req.body.status);
      logger.info(`Delivery ${req.params.deliveryId} status updated to ${req.body.status} by user ${req.user.id}`);
      res.json({ success: true, delivery: updated });
    } catch (err) {
      logger.error(`Updating delivery status failed: ${err.message}`);
      next(err);
    }
  },
];

// -------------------- ASSIGN COURIER --------------------
const assignCourier = [
  protect,
  authorizeRoles("admin", "manager"),
  validate([
    param("deliveryId").isUUID().withMessage("Invalid deliveryId"),
    body("courier").isString().trim().notEmpty().withMessage("Courier is required"),
  ]),
  async (req, res, next) => {
    try {
      const updated = await assignCourierService(req.params.deliveryId, req.body.courier);
      logger.info(`Courier ${req.body.courier} assigned to delivery ${req.params.deliveryId} by user ${req.user.id}`);
      res.json({ success: true, delivery: updated });
    } catch (err) {
      logger.error(`Assigning courier failed: ${err.message}`);
      next(err);
    }
  },
];

// -------------------- LIST ALL DELIVERIES (ADMIN) --------------------
const listDeliveries = [
  protect,
  authorizeRoles("admin", "manager"),
  async (_req, res, next) => {
    try {
      const deliveries = await listDeliveriesService();
      res.json({ success: true, deliveries });
    } catch (err) {
      logger.error(`Listing deliveries failed: ${err.message}`);
      next(err);
    }
  },
];

module.exports = {
  createDelivery,
  getDelivery,
  updateStatus,
  assignCourier,
  listDeliveries,
};
