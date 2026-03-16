const { predictDemand } = require("../services/demandPrediction")

exports.getDemandPrediction = async (req, res) => {

  try {

    const storeId = req.params.storeId

    const demand = await predictDemand(storeId)

    res.json({
      storeId,
      predictions: demand
    })

  } catch (error) {

    res.status(500).json({
      error: error.message
    })

  }

}