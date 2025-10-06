// modules/wishlist/wishlist.controller.js
const {
  addProductToWishlist,
  removeProductFromWishlist,
  getWishlistForUser,
  listWishlists,
} = require("./wishlist.service");
const logger = require("../../config/logger");

// ---------------- Add product to wishlist ----------------
const addWishlist = async (req, res, next) => {
  try {
    const productId = parseInt(req.body.productId, 10);
    if (!productId) return res.status(400).json({ success: false, message: "Invalid product ID" });

    const item = await addProductToWishlist(req.user.id, productId);
    logger.info(`✅ User ${req.user.id} added product ${productId} to wishlist`);
    res.status(201).json({ success: true, item });
  } catch (err) {
    logger.error(`❌ Add wishlist failed: ${err.message}`);
    next(err);
  }
};

// ---------------- Remove product from wishlist ----------------
const removeWishlist = async (req, res, next) => {
  try {
    const productId = parseInt(req.body.productId, 10);
    if (!productId) return res.status(400).json({ success: false, message: "Invalid product ID" });

    const item = await removeProductFromWishlist(req.user.id, productId);
    logger.info(`🗑️ User ${req.user.id} removed product ${productId} from wishlist`);
    res.json({ success: true, item });
  } catch (err) {
    logger.error(`❌ Remove wishlist failed: ${err.message}`);
    next(err);
  }
};

// ---------------- Get user's wishlist ----------------
const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await getWishlistForUser(req.user.id);
    res.json({ success: true, wishlist });
  } catch (err) {
    logger.error(`❌ Fetch wishlist failed for user ${req.user.id}: ${err.message}`);
    next(err);
  }
};

// ---------------- Admin: list all wishlists ----------------
const listAllWishlist = async (_req, res, next) => {
  try {
    const wishlists = await listWishlists();
    res.json({ success: true, wishlists });
  } catch (err) {
    logger.error(`❌ Fetch all wishlists failed: ${err.message}`);
    next(err);
  }
};

module.exports = {
  addWishlist,
  removeWishlist,
  getWishlist,
  listAllWishlist,
};
