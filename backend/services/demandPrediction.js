const Order = require("../models/Order")
const mongoose = require("mongoose")

exports.predictDemand = async (storeId) => {

  const orders = await Order.find({ storeId })

  const productDemand = {}

  orders.forEach(order => {

    order.items.forEach(item => {

      if (!item.productId) return
      const id = item.productId.toString()
      if (!mongoose.Types.ObjectId.isValid(id)) return

      if (!productDemand[id]) {

        productDemand[id] = 0

      }

      productDemand[id] += item.quantity

    })

  })

  /* SORT PRODUCTS BY DEMAND */

  const sortedProducts = Object.entries(productDemand)
    .sort((a, b) => b[1] - a[1])

  return sortedProducts

}