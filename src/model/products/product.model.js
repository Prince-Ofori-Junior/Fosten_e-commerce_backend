// modules/products/product.model.js
const { pool } = require("../../config/db");
const logger = require("../../config/logger");

// ------------------ Products ------------------

// ✅ Create product (supports category_id + type)
const createProduct = async ({
  name,
  description,
  price,
  stock,
  category_id,
  imageUrl,
  type,
}) => {
  const result = await pool.query(
    `
    INSERT INTO products 
      (name, description, price, stock, category_id, image_url, type, created_at, updated_at, is_active) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true) 
    RETURNING *
    `,
    [name, description, price, stock, category_id, imageUrl, type]
  );

  logger.info(`📦 Product created: ${result.rows[0].id}`);
  return result.rows[0];
};

// ✅ Get paginated products with filters, search, sorting, and both category & type filters
const getProducts = async ({
  page = 1,
  limit = 20,
  sortBy = "created_at",
  order = "desc",
  category,
  type,
  search,
} = {}) => {
  try {
    const offset = (page - 1) * limit;
    const cappedLimit = Math.min(limit, 100);

    const sortMap = {
      id: "p.id",
      name: "p.name",
      price: "p.price",
      stock: "p.stock",
      created_at: "p.created_at",
      updated_at: "p.updated_at",
      category: "c.name",
      type: "p.type",
    };

    const sortColumn = sortMap[sortBy] || "p.created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    let baseQuery = `
      SELECT 
        p.*, 
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const conditions = [];
    const values = [];

    if (category) {
      values.push(category);
      conditions.push(`(c.id = $${values.length} OR c.name ILIKE $${values.length})`);
    }

    if (type) {
      values.push(type);
      conditions.push(`p.type = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
    }

    const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
    const orderBy = `ORDER BY ${sortColumn} ${sortOrder}`;
    const pagination = `LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    // Main query
    const result = await pool.query(
      `${baseQuery}${whereClause} ${orderBy} ${pagination}`,
      [...values, cappedLimit, offset]
    );

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
    `;
    const countResult = await pool.query(countQuery, values);

    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: Number(page),
      limit: Number(limit),
    };
  } catch (err) {
    logger.error("❌ Error fetching products:", err);
    throw err;
  }
};

// ✅ Get product by ID
const getProductById = async (id) => {
  const result = await pool.query(
    `
    SELECT p.*, c.name AS category_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = $1 AND p.is_active = true
    `,
    [id]
  );
  return result.rows[0];
};

// ✅ Update product (supports type, image, category)
const updateProduct = async (id, fields) => {
  const keys = Object.keys(fields);
  if (!keys.length) return null;

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = Object.values(fields);

  const result = await pool.query(
    `
    UPDATE products 
    SET ${setClause}, updated_at = NOW() 
    WHERE id = $${keys.length + 1} AND is_active = true 
    RETURNING *
    `,
    [...values, id]
  );

  if (!result.rows[0]) return null;
  logger.info(`✏️ Product updated: ${id}`);
  return result.rows[0];
};

// ✅ Soft delete product
const deleteProduct = async (id) => {
  const result = await pool.query(
    "UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id",
    [id]
  );

  if (!result.rowCount) return false;
  logger.warn(`🗑️ Product soft-deleted: ${id}`);
  return true;
};

// ------------------ Categories ------------------

// ✅ Create category
const createCategory = async (name, description = "") => {
  const result = await pool.query(
    `
    INSERT INTO categories (name, description, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW()) 
    RETURNING *
    `,
    [name, description]
  );
  logger.info(`🗂️ Category created: ${result.rows[0].id}`);
  return result.rows[0];
};

// ✅ Get all categories
const getCategories = async () => {
  const result = await pool.query(
    "SELECT * FROM categories ORDER BY name ASC"
  );
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
