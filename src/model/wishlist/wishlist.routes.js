// modules/wishlist/wishlist.routes.js
const express = require("express");
const {
  addWishlist,
  removeWishlist,
  getWishlist,
  listAllWishlist,
} = require("./wishlist.controller");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const rateLimit = require("express-rate-limit");
const validate = require("../../middleware/validate");
const {
  addWishlistValidation,
  removeWishlistValidation,
} = require("./wishlist.validation");

const router = express.Router();

// Rate limiter to prevent abuse
const wishlistLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 requests per minute per IP
  message: "Too many wishlist requests from this IP, please try again later",
});

// ---------------- User: manage wishlist ----------------
// Add product to wishlist
router.post("/", protect, wishlistLimiter, addWishlistValidation, addWishlist);

// Remove product from wishlist
router.delete("/", protect, wishlistLimiter, removeWishlistValidation, removeWishlist);

// Get current user's wishlist
router.get("/", protect, getWishlist);

// ---------------- Admin: view all wishlists ----------------
router.get("/all", protect, authorizeRoles("admin"), listAllWishlist);

module.exports = router;
