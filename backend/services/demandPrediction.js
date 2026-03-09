const Order = require("../models/Order")

exports.predictDemand = async (storeId) => {

  const orders = await Order.find({ storeId })

  const productDemand = {}

  orders.forEach(order => {

    order.items.forEach(item => {

      const id = item.productId.toString()

      if (!productDemand[id]) {
        productDemand[id] = 0
      }

      productDemand[id] += item.quantity

    })

  })

  return productDemand

}