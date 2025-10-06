// modules/delivery/delivery.model.js
const pool = require("../../config/db");
const logger = require("../../config/logger");

/**
 * Create a delivery record
 */
const createDelivery = async ({ orderId, address, courier, status }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO deliveries (order_id, address, courier, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [orderId, address, courier || null, status || "pending"];
    const { rows } = await client.query(query, values);

    await client.query("COMMIT");
    logger.info(`📦 Delivery created for order ${orderId}`);
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`Failed to create delivery: ${err.message}`);
    throw new Error("Failed to create delivery");
  } finally {
    client.release();
  }
};

/**
 * Get delivery by orderId
 */
const getDeliveryByOrder = async (orderId) => {
  try {
    const query = `
      SELECT d.*, o.user_id, u.name AS customer_name
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE d.order_id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [orderId]);
    return rows[0] || null;
  } catch (err) {
    logger.error(`Failed to fetch delivery for order ${orderId}: ${err.message}`);
    throw new Error("Failed to fetch delivery");
  }
};

/**
 * Update delivery status
 */
const updateDeliveryStatus = async (deliveryId, status) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
      UPDATE deliveries
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await client.query(query, [status, deliveryId]);

    await client.query("COMMIT");
    logger.info(`✅ Delivery ${deliveryId} status updated to ${status}`);
    return rows[0] || null;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`Failed to update delivery status: ${err.message}`);
    throw new Error("Failed to update delivery status");
  } finally {
    client.release();
  }
};

/**
 * Assign courier to delivery
 */
const assignCourier = async (deliveryId, courier) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
      UPDATE deliveries
      SET courier = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await client.query(query, [courier, deliveryId]);

    await client.query("COMMIT");
    logger.info(`🚚 Courier ${courier} assigned to delivery ${deliveryId}`);
    return rows[0] || null;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`Failed to assign courier: ${err.message}`);
    throw new Error("Failed to assign courier");
  } finally {
    client.release();
  }
};

/**
 * List all deliveries (admin)
 */
const getAllDeliveries = async () => {
  try {
    const query = `
      SELECT d.*, o.total_amount, u.name AS customer_name
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON o.user_id = u.id
      ORDER BY d.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    logger.error(`Failed to fetch all deliveries: ${err.message}`);
    throw new Error("Failed to fetch deliveries");
  }
};

module.exports = {
  createDelivery,
  getDeliveryByOrder,
  updateDeliveryStatus,
  assignCourier,
  getAllDeliveries,
};
