// modules/wishlist/wishlist.service.js
const {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  listAllWishlists,
} = require("./wishlist.model");
const logger = require("../../config/logger");
const createError = require("http-errors");

// ---------------- User Wishlist ----------------

// Add product to wishlist
const addProductToWishlist = async (userId, productId) => {
  if (!userId || !productId) throw createError(400, "Invalid input");

  try {
    const item = await addToWishlist(userId, productId);
    if (!item) throw createError(409, "Product already in wishlist");

    logger.info(`User ${userId} added product ${productId} to wishlist`);
    return item;
  } catch (err) {
    logger.error(`Failed to add product ${productId} to wishlist for user ${userId}: ${err.message}`);
    throw err;
  }
};

// Remove product from wishlist
const removeProductFromWishlist = async (userId, productId) => {
  if (!userId || !productId) throw createError(400, "Invalid input");

  try {
    const item = await removeFromWishlist(userId, productId);
    if (!item) throw createError(404, "Product not found in wishlist");

    logger.info(`User ${userId} removed product ${productId} from wishlist`);
    return item;
  } catch (err) {
    logger.error(`Failed to remove product ${productId} from wishlist for user ${userId}: ${err.message}`);
    throw err;
  }
};

// Get wishlist for a specific user
const getWishlistForUser = async (userId) => {
  if (!userId) throw createError(400, "User ID required");

  try {
    return await getUserWishlist(userId);
  } catch (err) {
    logger.error(`Failed to fetch wishlist for user ${userId}: ${err.message}`);
    throw err;
  }
};

// Admin: list all wishlists
const listWishlists = async () => {
  try {
    return await listAllWishlists();
  } catch (err) {
    logger.error(`Failed to list all wishlists: ${err.message}`);
    throw createError(500, "Unable to fetch wishlists");
  }
};

module.exports = {
  addProductToWishlist,
  removeProductFromWishlist,
  getWishlistForUser,
  listWishlists,
};
