const Order = require("../models/Order");

exports.getStoreAnalytics = async (req, res) => {

  try {

    const storeId = req.params.storeId;

    const totalOrders = await Order.countDocuments({ storeId });

    const revenueData = await Order.aggregate([
      { $match: { storeId: storeId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0,0,0,0);

    const todayOrders = await Order.countDocuments({
      storeId,
      createdAt: { $gte: today }
    });

    res.json({
      totalOrders,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      todayOrders
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};