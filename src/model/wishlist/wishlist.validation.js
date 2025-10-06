// src/model/wishlist/wishlist.validation.js
const { body, param, validationResult } = require('express-validator');

/**
 * Centralized validation handler
 * Returns first error or all errors depending on strategy
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Only expose minimal info in production
    const sanitizedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
    }));
    return res.status(400).json({ success: false, errors: sanitizedErrors });
  }
  next();
};

/**
 * Validation for adding a product to wishlist
 */
const addWishlistValidation = [
  body('productId')
    .exists().withMessage('Product ID is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('Product ID must be a positive integer')
    .toInt(), // Convert to integer
  handleValidationErrors,
];

/**
 * Validation for removing a product from wishlist
 */
const removeWishlistValidation = [
  param('productId')
    .exists().withMessage('Product ID is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('Product ID must be a positive integer')
    .toInt(),
  handleValidationErrors,
];

/**
 * Optional: Validation for fetching wishlist
 */
const fetchWishlistValidation = [
  // Example: validate query params for pagination
  body('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
    .toInt(),
  handleValidationErrors,
];

module.exports = {
  addWishlistValidation,
  removeWishlistValidation,
  fetchWishlistValidation,
};
