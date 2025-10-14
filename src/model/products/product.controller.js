// modules/products/product.controller.js
const apiResponse = require("../../utils/apiResponse");
const {
  addProduct,
  listProducts,
  getSingleProduct,
  editProduct,
  removeProduct,
  addCategory,
  listCategories,
} = require("./product.service");
const Joi = require("joi");

// ------------------ Validation Schemas ------------------

// ✅ Product validation
const productSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(2000).optional(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.string().guid({ version: "uuidv4" }).optional(),
  type: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
});

// ✅ Category validation
const categorySchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1000).optional(),
});

// ✅ Query validation for listing
const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("name", "price", "created_at").default("created_at"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  category: Joi.string().optional(),
  type: Joi.string().optional(),
  search: Joi.string().optional(),
});

// ------------------ Controllers ------------------

// ✅ Admin: create product
const createProductController = async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) return apiResponse(res, 400, false, error.details[0].message);

    if (!req.body.category_id && !req.body.type) {
      return apiResponse(res, 400, false, "Either category_id or type is required");
    }

    if (!req.file)
      return apiResponse(res, 400, false, "Product image is required");

    const data = await addProduct(req.body, req.file);
    return apiResponse(res, 201, true, "Product created successfully", data);
  } catch (err) {
    console.error("❌ Error in createProductController:", err.message);
    return apiResponse(res, 500, false, "Failed to create product", {
      error: err.message,
    });
  }
};

// ✅ Public: list products (supports category + type filters)
const getProductsController = async (req, res) => {
  try {
    const { error, value } = productQuerySchema.validate(req.query);
    if (error) return apiResponse(res, 400, false, error.details[0].message);

    const data = await listProducts(value);

    return apiResponse(res, 200, true, "Products fetched successfully", data);
  } catch (err) {
    console.error("❌ Error in getProductsController:", err.message);
    return apiResponse(res, 500, false, "Failed to fetch products", {
      error: err.message,
    });
  }
};

// ✅ Public: get single product
const getProductController = async (req, res) => {
  try {
    const data = await getSingleProduct(req.params.id);
    if (!data) return apiResponse(res, 404, false, "Product not found");
    return apiResponse(res, 200, true, "Product fetched successfully", data);
  } catch (err) {
    console.error("❌ Error in getProductController:", err.message);
    return apiResponse(res, 500, false, "Failed to fetch product", {
      error: err.message,
    });
  }
};

// ✅ Admin: update product
const updateProductController = async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body, { presence: "optional" });
    if (error) return apiResponse(res, 400, false, error.details[0].message);

    const data = await editProduct(req.params.id, req.body, req.file);
    return apiResponse(res, 200, true, "Product updated successfully", data);
  } catch (err) {
    console.error("❌ Error in updateProductController:", err.message);
    return apiResponse(res, 500, false, "Failed to update product", {
      error: err.message,
    });
  }
};

// ✅ Admin: soft-delete product
const deleteProductController = async (req, res) => {
  try {
    await removeProduct(req.params.id);
    return apiResponse(res, 200, true, "Product deleted successfully");
  } catch (err) {
    console.error("❌ Error in deleteProductController:", err.message);
    return apiResponse(res, 500, false, "Failed to delete product", {
      error: err.message,
    });
  }
};

// ------------------ Categories ------------------

// ✅ Admin: create category
const createCategoryController = async (req, res) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) return apiResponse(res, 400, false, error.details[0].message);

    const data = await addCategory(req.body.name, req.body.description);
    return apiResponse(res, 201, true, "Category created successfully", data);
  } catch (err) {
    console.error("❌ Error in createCategoryController:", err.message);
    return apiResponse(res, 500, false, "Failed to create category", {
      error: err.message,
    });
  }
};

// ✅ Public: list categories
const getCategoriesController = async (_req, res) => {
  try {
    const data = await listCategories();
    return apiResponse(res, 200, true, "Categories fetched successfully", data);
  } catch (err) {
    console.error("❌ Error in getCategoriesController:", err.message);
    return apiResponse(res, 500, false, "Failed to fetch categories", {
      error: err.message,
    });
  }
};

// ------------------ Exports ------------------
module.exports = {
  createProduct: createProductController,
  getProducts: getProductsController,
  getProduct: getProductController,
  updateProduct: updateProductController,
  deleteProduct: deleteProductController,
  createCategory: createCategoryController,
  getCategories: getCategoriesController,
};
