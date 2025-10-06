// modules/wishlist/wishlist.model.js
const pool = require("../../config/db");
const logger = require("../../config/logger");

// ---------------- Add product to wishlist ----------------
const addToWishlist = async (userId, productId) => {
  try {
    if (!userId || !productId) throw new Error("Invalid user or product ID");

    const query = `
      INSERT INTO wishlists (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userId, productId]);
    return rows[0] || null; // null if already exists
  } catch (err) {
    logger.error(`❌ addToWishlist failed for user ${userId}, product ${productId}: ${err.message}`);
    throw err;
  }
};

// ---------------- Remove product from wishlist ----------------
const removeFromWishlist = async (userId, productId) => {
  try {
    if (!userId || !productId) throw new Error("Invalid user or product ID");

    const query = `
      DELETE FROM wishlists
      WHERE user_id = $1 AND product_id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userId, productId]);
    return rows[0] || null; // null if item not found
  } catch (err) {
    logger.error(`❌ removeFromWishlist failed for user ${userId}, product ${productId}: ${err.message}`);
    throw err;
  }
};

// ---------------- Get wishlist for a user ----------------
const getUserWishlist = async (userId) => {
  try {
    if (!userId) throw new Error("Invalid user ID");

    const query = `
      SELECT w.id, p.id as product_id, p.name, p.price, p.image_url
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (err) {
    logger.error(`❌ getUserWishlist failed for user ${userId}: ${err.message}`);
    throw err;
  }
};

// ---------------- Admin: list all wishlists ----------------
const listAllWishlists = async () => {
  try {
    const query = `
      SELECT w.id, u.id as user_id, u.name as user_name, p.id as product_id, p.name as product_name
      FROM wishlists w
      JOIN users u ON w.user_id = u.id
      JOIN products p ON w.product_id = p.id
      ORDER BY w.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    logger.error(`❌ listAllWishlists failed: ${err.message}`);
    throw err;
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  listAllWishlists,
};
