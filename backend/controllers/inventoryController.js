const { predictDemand } = require("../services/demandPrediction")
const Product = require("../models/Product")
const mongoose = require("mongoose")

exports.getDemandPrediction = async (req,res)=>{

  try{

    const storeId = req.params.storeId

    const demand = await predictDemand(storeId)

    const suggestions = []

    for(const [productId, predicted] of demand){

      if (!mongoose.Types.ObjectId.isValid(productId)) continue

      const product = await Product.findById(productId)

      if(!product) continue

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