const Order = require("../models/Order");
const User = require("../models/User");
const Store = require("../models/Store");
const Driver = require("../models/Driver");
const mongoose = require("mongoose");

/* ================= PLATFORM DASHBOARD (ADMIN) ================= */

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const [users, stores, orders, drivers] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Order.countDocuments(),
      Driver.countDocuments()
    ]);

    const revenueData = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }
    ]);

    const revenue = revenueData[0]?.revenue || 0;

    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const dailySales = await Order.aggregate([
      { $match: { status: "delivered" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      users,
      stores,
      orders,
      drivers,
      revenue,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      recentOrders,
      dailySales: dailySales.reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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