const express = require("express")
const router = express.Router()

const { getDemandPrediction } = require("../controllers/predictionController")

router.get("/:storeId", getDemandPrediction)

module.exports = router