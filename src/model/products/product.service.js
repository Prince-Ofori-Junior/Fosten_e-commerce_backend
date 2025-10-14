const fs = require("fs").promises;
const logger = require("../../config/logger");
const { uploadToCloudinary } = require("../../config/cloudinary");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createCategory,
  getCategories,
} = require("./product.model");

// ------------------ UUID CHECK ------------------
const isUuid = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// ------------------ Products ------------------
const addProductService = async (data, file) => {
  if (!data.name || !data.price || !data.stock) {
    throw new Error("Name, price, and stock are required");
  }

  // ✅ Check that at least one of category_id or type is provided
  if (!data.category_id && !data.type) {
    throw new Error("Either category_id or type is required");
  }

  // ✅ Validate category_id if provided
  if (data.category_id && !isUuid(data.category_id)) {
    throw new Error("Valid category_id (UUID) is required");
  }

  // ✅ Validate and normalize type if provided
  let productType = null;
  if (data.type) {
    const allowedTypes = ["furniture", "electronics", "clothing", "grocery", "other"];
    productType = data.type.toLowerCase().trim();
    if (!allowedTypes.includes(productType)) {
      throw new Error(`Invalid product type. Must be one of: ${allowedTypes.join(", ")}`);
    }
  }

  // ✅ Upload image to Cloudinary if provided
  if (file) {
    const uploaded = await uploadToCloudinary(file.path, { folder: "ecommerce/products" });
    data.imageUrl = uploaded.secure_url;
  }

  // ✅ Create product record
  const product = await createProduct({
    name: data.name.trim(),
    description: data.description?.trim() || "",
    price: parseFloat(data.price),
    stock: parseInt(data.stock),
    category_id: data.category_id || null,
    type: productType,
    isActive: data.isActive ?? true,
    imageUrl: data.imageUrl || null,
  });

  logger.info(`Product created: ${product.id} - ${product.name} [${product.type || "no type"}]`);
  return product;
};

// ------------------ Edit Product ------------------
const editProductService = async (id, fields, file) => {
  const updateFields = {};

  if (fields.name) updateFields.name = fields.name.trim();
  if (fields.description) updateFields.description = fields.description.trim();
  if (fields.price !== undefined) updateFields.price = parseFloat(fields.price);
  if (fields.stock !== undefined) updateFields.stock = parseInt(fields.stock);

  if (fields.category_id) {
    if (!isUuid(fields.category_id)) throw new Error("Valid category_id (UUID) is required");
    updateFields.category_id = fields.category_id;
  }

  // ✅ Optional type update
  if (fields.type) {
    const allowedTypes = ["furniture", "electronics", "clothing", "grocery", "other"];
    const normalizedType = fields.type.toLowerCase().trim();
    if (!allowedTypes.includes(normalizedType)) {
      throw new Error(`Invalid product type. Must be one of: ${allowedTypes.join(", ")}`);
    }
    updateFields.type = normalizedType;
  }

  if (fields.isActive !== undefined) {
    updateFields.isActive = fields.isActive;
  }

  if (file) {
    const uploaded = await uploadToCloudinary(file.path, { folder: "ecommerce/products" });
    updateFields.imageUrl = uploaded.secure_url;
  }

  const updated = await updateProduct(id, updateFields);
  if (!updated) throw new Error("Product not found or no changes applied");

  logger.info(`Product updated: ${id}`);
  return updated;
};

// ------------------ List, Get, Delete ------------------
const listProductsService = async ({
  page = 1,
  limit = 20,
  sortBy = "created_at",
  order = "desc",
  category,
  search,
  type,
}) => {
  const safePage = Math.max(parseInt(page, 10), 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);

  const filters = {
    page: safePage,
    limit: safeLimit,
    sortBy,
    order: order.toUpperCase() === "ASC" ? "ASC" : "DESC",
    category: category?.trim() || null,
    search: search?.trim() || null,
    type: type?.trim().toLowerCase() || null,
  };

  // ✅ Model handles filtering by both category and type
  return await getProducts(filters);
};

const getSingleProductService = async (id) => {
  const product = await getProductById(id);
  if (!product) throw new Error("Product not found");
  return product;
};

const removeProductService = async (id) => {
  const deleted = await deleteProduct(id);
  if (!deleted) throw new Error("Product not found");
  logger.warn(`Product deleted: ${id}`);
  return deleted;
};

// ------------------ Categories ------------------
const addCategoryService = async (name, description = "") => {
  if (!name || !name.trim()) throw new Error("Category name is required");
  const category = await createCategory(name.trim(), description.trim());
  logger.info(`Category created: ${category.id} - ${category.name}`);
  return category;
};

const listCategoriesService = async () => {
  const categories = await getCategories();
  if (!categories.length) logger.info("No categories found");
  return categories;
};

// ------------------ Exports ------------------
module.exports = {
  addProduct: addProductService,
  listProducts: listProductsService,
  getSingleProduct: getSingleProductService,
  editProduct: editProductService,
  removeProduct: removeProductService,
  addCategory: addCategoryService,
  listCategories: listCategoriesService,
};
