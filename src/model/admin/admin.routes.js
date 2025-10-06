const express = require("express");
const {
  listUsers,
  updateUserRole,
  removeUser,
  listOrders,
  listProducts,
  toggleProduct,
  dashboardStats,
  createTemporaryAdmin,
} = require("./admin.controller");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

// -------------------- BOOTSTRAP ADMIN --------------------
// 🔹 This must come BEFORE global middleware
router.post("/users/temp-admin", createTemporaryAdmin);

// -------------------- GLOBAL MIDDLEWARE --------------------
// Everything below this line requires admin auth
router.use(protect);
router.use(authorizeRoles("admin"));

// -------------------- USERS --------------------
router.get("/users", listUsers);
router.put("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", removeUser);

// -------------------- ORDERS --------------------
router.get("/orders", listOrders);

// -------------------- PRODUCTS --------------------
router.get("/products", listProducts);
router.patch("/products/:productId/status", toggleProduct);

// -------------------- DASHBOARD --------------------
router.get("/dashboard/stats", dashboardStats);

module.exports = router;
