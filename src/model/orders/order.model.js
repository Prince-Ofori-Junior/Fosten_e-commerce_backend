// modules/orders/order.model.js
const { pool } = require("../../config/db");
const logger = require("../../config/logger");

// ------------------- CREATE ORDER WITH ITEMS -------------------
const createOrderWithItems = async (orderData, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { userId, totalAmount, paymentMethod, paymentChannel, status, paymentReference, address } = orderData;

    const insertOrderQuery = `
      INSERT INTO orders (
        user_id, total_amount, payment_method, payment_channel,
        status, payment_reference, address, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *;
    `;
    const orderValues = [userId, totalAmount, paymentMethod, paymentChannel || null, status || "pending", paymentReference || null, address];
    const orderResult = await client.query(insertOrderQuery, orderValues);
    const order = orderResult.rows[0];

    if (!Array.isArray(items) || items.length === 0) throw new Error("Order must contain at least one item");

    const insertItemQuery = `
      INSERT INTO order_items (order_id, product_id, quantity, price, created_at, updated_at)
      VALUES ($1,$2,$3,$4,NOW(),NOW())
      RETURNING *;
    `;
    const addedItems = [];
    for (const item of items) {
      const { productId, quantity, price } = item;
      if (!productId || quantity <= 0 || price <= 0) throw new Error("Invalid item data");

      const itemValues = [order.id, productId, quantity, price];
      const itemResult = await client.query(insertItemQuery, itemValues);
      addedItems.push(itemResult.rows[0]);
    }

    await client.query("COMMIT");
    logger.info(`✅ Order ${order.id} created with ${addedItems.length} items`);
    return { order, items: addedItems };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`❌ Failed to create order: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
};

// ------------------- GET USER ORDERS -------------------
const getUserOrders = async (userId) => {
  const query = `
    SELECT 
      o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// ------------------- GET ORDER BY ID -------------------
const getOrderById = async (orderId) => {
  const query = `
    SELECT 
      o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = $1
    GROUP BY o.id;
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows[0];
};

// ------------------- GET ALL ORDERS (ADMIN) -------------------
const getAllOrders = async () => {
  const query = `
    SELECT 
      o.*,
      u.name AS user_name,
      u.email AS user_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS items
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id, u.id
    ORDER BY o.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

// ------------------- UPDATE ORDER STATUS -------------------
const updateOrderStatus = async (orderId, status) => {
  const allowedStatuses = ["pending","processing","completed","shipped","delivered","cancelled","failed"];
  if (!allowedStatuses.includes(status)) throw new Error("Invalid order status");

  const query = `
    UPDATE orders
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [status, orderId]);
  if (!result.rows.length) throw new Error("Order not found");
  logger.info(`✅ Order ${orderId} status updated to ${status}`); 
  return result.rows[0];
}; 

module.exports = {
  createOrderWithItems,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
