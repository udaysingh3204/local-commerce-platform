const express = require("express")
const router = express.Router()

const { getDemandPrediction } = require("../controllers/inventoryController")

router.get("/prediction/:storeId", getDemandPrediction)

module.exports = router