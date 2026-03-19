const Product = require("../models/Product");
const redis = require("../config/redis");

/* HELPER: CLEAR PRODUCT CACHE */
const clearProductCache = async () => {
  try {
    const keys = await redis.keys("products:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("Cache clear error:", err);
  }
};

/* CREATE PRODUCT */
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    await clearProductCache();

    res.status(201).json({
      message: "Product created successfully",
      product
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* GET PRODUCTS (CACHE + PAGINATION + COUNT) */
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const cacheKey = `products:${page}`;

    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log("Serving from Redis");
      return res.json(JSON.parse(cached));
    }

    const [products, total] = await Promise.all([
      Product.find()
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments()
    ]);

    const response = {
      products,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);

    res.json(response);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* GET PRODUCTS BY STORE (WITH CACHE) */
exports.getProductsByStore = async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const cacheKey = `products:store:${storeId}`;

    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const products = await Product.find({ storeId });

    await redis.set(cacheKey, JSON.stringify(products), "EX", 60);

    res.json(products);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* DELETE PRODUCT */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await clearProductCache();

    res.json({ message: "Product deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* UPDATE PRODUCT */
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    await clearProductCache();

    res.json(product);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};