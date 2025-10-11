// modules/products/product.model.js
const { pool } = require("../../config/db");
const logger = require("../../config/logger");

// ------------------ Products ------------------

// ✅ Create product
const createProduct = async ({ name, description, price, stock, category_id, imageUrl }) => {
  const result = await pool.query(
    `INSERT INTO products 
      (name, description, price, stock, category_id, image_url, created_at, updated_at, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), true) 
     RETURNING *`,
    [name, description, price, stock, category_id, imageUrl]
  );
  logger.info(`📦 Product created: ${result.rows[0].id}`);
  return result.rows[0];
};

// ✅ Get paginated products with filters, search, and sorting
const getProducts = async ({
  page = 1,
  limit = 20,
  sortBy = "createdAt",
  order = "desc",
  category,
  search,
} = {}) => {
  try {
    const offset = (page - 1) * limit;
    limit = Math.min(limit, 100); // cap at 100 per page

    const sortMap = {
      id: "p.id",
      name: "p.name",
      price: "p.price",
      stock: "p.stock",
      createdAt: "p.created_at",
      updatedAt: "p.updated_at",
      category: "c.name",
    };

    const sortColumn = sortMap[sortBy] || "p.created_at";
    order = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    let baseQuery = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const conditions = [];
    const values = [];

    if (category) {
      values.push(category);
      conditions.push(`c.id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`p.name ILIKE $${values.length}`);
    }

    const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
    const orderBy = `ORDER BY ${sortColumn} ${order}`;
    const pagination = `LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    const result = await pool.query(
      `${baseQuery}${whereClause} ${orderBy} ${pagination}`,
      [...values, limit, offset]
    );

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ${whereClause.replace(/^ AND/, "")}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    return { rows: result.rows, total };
  } catch (err) {
    logger.error("❌ Error fetching products:", err);
    throw err;
  }
};

// ✅ Get product by ID
const getProductById = async (id) => {
  const result = await pool.query(
    "SELECT * FROM products WHERE id = $1 AND is_active = true",
    [id]
  );
  return result.rows[0];
};

// ✅ Update product
const updateProduct = async (id, fields) => {
  const keys = Object.keys(fields);
  if (!keys.length) return null;

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = Object.values(fields);

  const result = await pool.query(
    `UPDATE products 
     SET ${setClause}, updated_at = NOW() 
     WHERE id = $${keys.length + 1} AND is_active = true 
     RETURNING *`,
    [...values, id]
  );
  logger.info(`✏️ Product updated: ${id}`);
  return result.rows[0];
};

// ✅ Soft delete product
const deleteProduct = async (id) => {
  await pool.query(
    "UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1",
    [id]
  );
  logger.warn(`🗑️ Product soft-deleted: ${id}`);
  return true;
};

// ------------------ Categories ------------------

// ✅ Create category
const createCategory = async (name, description = "") => {
  const result = await pool.query(
    `INSERT INTO categories (name, description, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
    [name, description]
  );
  logger.info(`🗂️ Category created: ${result.rows[0].id}`);
  return result.rows[0];
};

// ✅ Get all categories
const getCategories = async () => {
  const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
  return result.rows;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createCategory,
  getCategories,
};
