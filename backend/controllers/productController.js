const Product = require("../models/Product");

let redis = null;

try {
  redis = require("../config/redis");
} catch (err) {
  console.log("Redis disabled");
}

/* CLEAR CACHE SAFELY */
const clearProductCache = async () => {
  if (!redis) return;

  try {
    const keys = await redis.keys("products:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.log("Cache clear skipped");
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

/* GET PRODUCTS */
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const cacheKey = `products:${page}`;

    let cached = null;

    if (redis) {
      try {
        cached = await redis.get(cacheKey);
      } catch {}
    }

    if (cached) {
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

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
      } catch {}
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* GET PRODUCTS BY STORE */
exports.getProductsByStore = async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const cacheKey = `products:store:${storeId}`;

    let cached = null;

    if (redis) {
      try {
        cached = await redis.get(cacheKey);
      } catch {}
    }

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const products = await Product.find({ storeId });

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(products), "EX", 60);
      } catch {}
    }

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