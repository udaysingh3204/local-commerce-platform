const express = require("express")
const router = express.Router()

const {
  createProduct,
  getProducts,
  getProductsByStore
} = require("../controllers/productController")

router.post("/", createProduct)
router.get("/", getProducts)
router.get("/store/:storeId", getProductsByStore)

module.exports = router