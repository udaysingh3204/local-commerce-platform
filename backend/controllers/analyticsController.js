const Order = require("../models/Order");
const mongoose = require("mongoose");

exports.getStoreAnalytics = async (req, res) => {

  try {

    const storeId = new mongoose.Types.ObjectId(req.params.storeId);

    /* TOTAL ORDERS */

    const totalOrders = await Order.countDocuments({ storeId });


    /* TOTAL REVENUE */

    const revenueData = await Order.aggregate([
      { $match: { storeId } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const revenue = revenueData[0]?.revenue || 0;


    /* ORDER STATUS COUNTS */

    const deliveredOrders = await Order.countDocuments({
      storeId,
      status: "delivered"
    });

    const preparingOrders = await Order.countDocuments({
      storeId,
      status: "preparing"
    });

    const pendingOrders = await Order.countDocuments({
      storeId,
      status: "pending"
    });


    /* DAILY SALES */

    const dailySales = await Order.aggregate([
      { $match: { storeId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);


    const formattedDailySales = dailySales.map(d => ({
      date: d._id,
      revenue: d.revenue
    }));


    /* PRODUCT DEMAND */

    const productDemand = await Order.aggregate([
      { $match: { storeId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          sales: { $sum: "$items.quantity" }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 }
    ]);

    const formattedProductDemand = productDemand.map(p => ({
      name: p._id,
      sales: p.sales
    }));


    /* RESPONSE */

    res.json({

      revenue,

      totalOrders,

      deliveredOrders,

      preparingOrders,

      pendingOrders,

      dailySales: formattedDailySales,

      productDemand: formattedProductDemand

    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};