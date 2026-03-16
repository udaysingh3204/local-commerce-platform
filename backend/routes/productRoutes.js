const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProductsByStore,
  deleteProduct,
  updateProduct
} = require("../controllers/productController");

router.post("/create", createProduct);

router.get("/store/:storeId", getProductsByStore);

router.delete("/:id", deleteProduct);
router.get("/test", (req,res)=>{
  res.send("Product routes working")
})
router.put("/:id", updateProduct);
module.exports = router;