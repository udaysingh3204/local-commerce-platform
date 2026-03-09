const { predictDemand } = require("../services/demandPrediction")
const Product = require("../models/Product")

exports.getDemandPrediction = async (req,res)=>{

  try{

    const storeId = req.params.storeId

    const demand = await predictDemand(storeId)

    const suggestions = []

    for(const productId in demand){

      const product = await Product.findById(productId)

      if(!product) continue

      const predicted = demand[productId]

      if(product.stock < predicted){

        suggestions.push({
          product: product.name,
          currentStock: product.stock,
          predictedDemand: predicted,
          reorder: predicted - product.stock
        })

      }

    }

    res.json({
      suggestions
    })

  }catch(error){

    res.status(500).json({error:error.message})

  }

}