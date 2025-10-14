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
  if (!data.name || !data.price || !data.stock || !data.category_id) {
    throw new Error("Name, price, stock, and category_id are required");
  }

  if (!isUuid(data.category_id)) {
    throw new Error("Valid category_id (UUID) is required");
  }

  if (file) {
    const uploaded = await uploadToCloudinary(file.path, { folder: "ecommerce/products" });
    data.imageUrl = uploaded.secure_url;
  }

  const product = await createProduct({
    name: data.name.trim(),
    description: data.description?.trim() || "",
    price: parseFloat(data.price),
    stock: parseInt(data.stock),
    category_id: data.category_id,
    imageUrl: data.imageUrl || null,
  });

  logger.info(`Product created: ${product.id} - ${product.name}`);
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
const listProductsService = async ({ page = 1, limit = 20, sortBy = "createdAt", order = "desc", category, search }) => {
  const safePage = Math.max(parseInt(page, 10), 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);

  if (category) category = category.trim();
  if (search) search = search.trim();
  order = order.trim().toUpperCase() === "ASC" ? "ASC" : "DESC";

  return await getProducts({ page: safePage, limit: safeLimit, sortBy, order, category, search });
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
const addCategoryService = async (name) => {
  if (!name || !name.trim()) throw new Error("Category name is required");
  const category = await createCategory(name.trim());
  logger.info(`Category created: ${category.id} - ${category.name}`);
  return category;
};

const listCategoriesService = async () => getCategories();

module.exports = {
  addProduct: addProductService,
  listProducts: listProductsService,
  getSingleProduct: getSingleProductService,
  editProduct: editProductService,
  removeProduct: removeProductService,
  addCategory: addCategoryService,
  listCategories: listCategoriesService,
};
