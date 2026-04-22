const Order = require("../models/Order");
const User = require("../models/User");
const Store = require("../models/Store");
const Driver = require("../models/Driver");
const GrowthLead = require("../models/GrowthLead");
const WholesaleOrder = require("../models/WholesaleOrder");
const mongoose = require("mongoose");

const formatPercent = (value) => {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

const getPercentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

const getSignalTone = (value, thresholds) => {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warning) return "warning";
  return "healthy";
};

const buildOpsBriefing = ({
  statusCounts,
  drivers,
  rollingRevenue,
  rollingOrders,
  cancellationStats,
  topStore,
  unassignedOrders,
  wholesaleStuckOrders,
}) => {
  const pending = statusCounts.pending || 0;
  const accepted = statusCounts.accepted || 0;
  const preparing = statusCounts.preparing || 0;
  const outForDelivery = statusCounts.out_for_delivery || 0;
  const activeBacklog = pending + accepted + preparing + outForDelivery;
  const backlogPerDriver = drivers ? activeBacklog / drivers : activeBacklog;
  const revenueMomentumValue = getPercentChange(rollingRevenue.current, rollingRevenue.previous);
  const orderMomentumValue = getPercentChange(rollingOrders.current, rollingOrders.previous);
  const cancellationRate = cancellationStats.total
    ? (cancellationStats.cancelled / cancellationStats.total) * 100
    : 0;

  const deliveryPressureTone = getSignalTone(backlogPerDriver, { warning: 3, critical: 5 });
  const cancellationTone = getSignalTone(cancellationRate, { warning: 8, critical: 15 });
  const assignmentTone = getSignalTone(unassignedOrders, { warning: 3, critical: 7 });
  const wholesaleTone = getSignalTone(wholesaleStuckOrders || 0, { warning: 2, critical: 4 });

  const headline =
    deliveryPressureTone === "critical"
      ? "Driver capacity is the main operational risk right now."
      : revenueMomentumValue >= 10
        ? "Demand is accelerating across the platform this week."
        : cancellationTone === "critical"
          ? "Customer experience risk is rising due to cancellations."
          : "Platform operations are stable with room to improve assignment speed.";

  const actions = [];

  if (deliveryPressureTone !== "healthy") {
    actions.push({
      title: "Shift driver capacity toward live backlog",
      detail: `${activeBacklog} active orders are in motion, averaging ${backlogPerDriver.toFixed(1)} active orders per driver.`,
      tone: deliveryPressureTone,
      target: {
        path: "/delivery",
        label: "Open delivery desk",
        query: {
          focus: "capacity",
        },
      },
    });
  }

  if (assignmentTone !== "healthy") {
    actions.push({
      title: "Reduce unassigned delivery workload",
      detail: `${unassignedOrders} accepted or preparing orders still do not have a driver assigned.`,
      tone: assignmentTone,
      target: {
        path: "/orders",
        label: "View unassigned orders",
        query: {
          status: "accepted,preparing",
          assignment: "unassigned",
        },
      },
    });
  }

  if (cancellationTone !== "healthy") {
    actions.push({
      title: "Audit cancellation hotspots",
      detail: `${cancellationStats.cancelled} of the last ${cancellationStats.total} orders were cancelled (${cancellationRate.toFixed(1)}%).`,
      tone: cancellationTone,
      target: {
        path: "/orders",
        label: "Review cancelled orders",
        query: {
          status: "cancelled",
        },
      },
    });
  }

  if (wholesaleTone !== "healthy") {
    actions.push({
      title: "Review stuck wholesale pipeline",
      detail: `${wholesaleStuckOrders} wholesale orders have been open for more than 48 hours without reaching a terminal state.`,
      tone: wholesaleTone,
      target: {
        path: "/suppliers",
        label: "Open suppliers",
      },
    });
  }

  if (topStore) {
    actions.push({
      title: `Double down on ${topStore.storeName}`,
      detail: `Top store generated ₹${Number(topStore.revenue || 0).toLocaleString()} from ${topStore.orders} orders in the last 30 days.`,
      tone: "healthy",
      target: {
        path: "/stores",
        label: "Inspect top store",
        query: {
          highlight: String(topStore.storeId),
        },
      },
    });
  }

  return {
    headline,
    generatedAt: new Date(),
    metrics: [
      {
        label: "Revenue Momentum",
        value: formatPercent(revenueMomentumValue),
        caption: `7-day revenue vs previous 7 days`,
        tone: revenueMomentumValue < 0 ? "warning" : "healthy",
      },
      {
        label: "Order Momentum",
        value: formatPercent(orderMomentumValue),
        caption: `7-day order count vs previous 7 days`,
        tone: orderMomentumValue < 0 ? "warning" : "healthy",
      },
      {
        label: "Delivery Pressure",
        value: drivers ? backlogPerDriver.toFixed(1) : `${activeBacklog}`,
        caption: drivers ? `active orders per driver` : `active orders with no drivers online`,
        tone: deliveryPressureTone,
      },
      {
        label: "Cancellation Rate",
        value: `${cancellationRate.toFixed(1)}%`,
        caption: `last 7 days`,
        tone: cancellationTone,
      },
    ],
    actions,
    topStore: topStore
      ? {
          storeId: String(topStore.storeId),
          storeName: topStore.storeName,
          revenue: topStore.revenue,
          orders: topStore.orders,
        }
      : null,
  };
};

const buildIncidentFeed = ({
  activeDeliveries,
  cancellationRate,
  unassignedOrders,
  wholesaleStuckOrders,
}) => {
  const now = Date.now();
  const incidents = [];

  if (unassignedOrders > 0) {
    incidents.push({
      id: `dispatch-unassigned-${unassignedOrders}`,
      severity: unassignedOrders >= 6 ? "critical" : "warning",
      title: "Unassigned dispatch queue building",
      detail: `${unassignedOrders} accepted or preparing orders are still waiting for driver assignment.`,
      target: {
        path: "/orders",
        label: "Open queue",
        query: {
          status: "accepted,preparing",
          assignment: "unassigned",
        },
      },
      updatedAt: new Date(),
    });
  }

  activeDeliveries.forEach((order) => {
    const orderId = String(order._id);
    const hasDeliverySignal = Boolean(order.deliveryLocation?.lat && order.deliveryLocation?.lng);
    const estimated = typeof order.estimatedDeliveryTime === "number" ? order.estimatedDeliveryTime : null;
    const deliveryStart = order.deliveryStartTime ? new Date(order.deliveryStartTime).getTime() : null;
    const updatedAt = order.updatedAt ? new Date(order.updatedAt).getTime() : null;

    if (deliveryStart && estimated) {
      const expectedBy = deliveryStart + (estimated + 5) * 60 * 1000;
      if (now > expectedBy) {
        incidents.push({
          id: `delivery-overdue-${orderId}`,
          severity: "critical",
          title: "Delivery ETA breached",
          detail: `Order #${orderId.slice(-8).toUpperCase()} has exceeded its promised delivery window.`,
          target: {
            path: "/delivery",
            label: "Open live delivery",
          },
          updatedAt: new Date(order.updatedAt || order.deliveryStartTime || Date.now()),
        });
      }
    }

    if (!hasDeliverySignal || (updatedAt && now - updatedAt > 5 * 60 * 1000)) {
      incidents.push({
        id: `tracking-stale-${orderId}`,
        severity: hasDeliverySignal ? "warning" : "critical",
        title: hasDeliverySignal ? "Courier signal is stale" : "Courier signal missing",
        detail: `Order #${orderId.slice(-8).toUpperCase()} is on the road but location updates are not fresh enough for reliable tracking.`,
        target: {
          path: "/delivery",
          label: "Inspect tracking",
        },
        updatedAt: new Date(order.updatedAt || Date.now()),
      });
    }
  });

  if (cancellationRate >= 8) {
    incidents.push({
      id: `cancellations-${Math.round(cancellationRate)}`,
      severity: cancellationRate >= 15 ? "critical" : "warning",
      title: "Cancellation pressure rising",
      detail: `Recent cancellation rate is ${cancellationRate.toFixed(1)}%, which is above the normal operating band.`,
      target: {
        path: "/orders",
        label: "Review cancellations",
        query: {
          status: "cancelled",
        },
      },
      updatedAt: new Date(),
    });
  }

  if (wholesaleStuckOrders > 0) {
    incidents.push({
      id: `wholesale-stuck-${wholesaleStuckOrders}`,
      severity: wholesaleStuckOrders >= 4 ? "critical" : "warning",
      title: "Wholesale pipeline is stalling",
      detail: `${wholesaleStuckOrders} wholesale orders have been active for more than 48 hours without delivery or cancellation.`,
      target: {
        path: "/suppliers",
        label: "Review suppliers",
      },
      updatedAt: new Date(),
    })
  }

  return incidents
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6);
};

const buildGrowthSummary = ({ aggregated, recentLeads }) => {
  const facets = aggregated?.[0] || {};
  const countOf = (bucket) => bucket?.[0]?.count || 0;

  return {
    totalLeads: countOf(facets.totalLeads),
    thisWeekLeads: countOf(facets.thisWeekLeads),
    referredLeads: countOf(facets.referredLeads),
    campusWaitlist: countOf(facets.campusWaitlist),
    topUseCases: (facets.topUseCases || []).map((entry) => ({
      useCase: entry._id || "waitlist",
      count: entry.count,
    })),
    recentLeads: (recentLeads || []).map((lead) => ({
      id: String(lead._id),
      name: lead.name || lead.email,
      email: lead.email,
      city: lead.city || "Noida",
      useCase: lead.useCase || "waitlist",
      source: lead.source || "homepage",
      interests: Array.isArray(lead.interests) ? lead.interests.slice(0, 3) : [],
      referralCode: lead.referralCode || null,
      createdAt: lead.createdAt,
    })),
  };
};

const buildPaymentSummary = ({ recentPayments }) => {
  const summary = recentPayments?.[0] || { paid: 0, pending: 0, failed: 0, retries: 0 }
  const actionable = summary.failed + summary.pending

  return {
    paid: summary.paid || 0,
    pending: summary.pending || 0,
    failed: summary.failed || 0,
    retries: summary.retries || 0,
    recoveryRate: summary.failed
      ? Math.round(((summary.retries || 0) / summary.failed) * 100)
      : 0,
    actionable,
  }
}

const buildCouponSummary = ({ couponTotals, topCoupons }) => {
  const totals = couponTotals?.[0] || {
    couponOrders: 0,
    discountSpend: 0,
    discountedRevenue: 0,
    grossBeforeDiscount: 0,
  }

  const couponOrders = Number(totals.couponOrders || 0)
  const discountSpend = Number(totals.discountSpend || 0)
  const grossBeforeDiscount = Number(totals.grossBeforeDiscount || 0)

  return {
    couponOrders,
    discountSpend,
    discountedRevenue: Number(totals.discountedRevenue || 0),
    avgDiscountPerOrder: couponOrders ? Number((discountSpend / couponOrders).toFixed(2)) : 0,
    discountRate: grossBeforeDiscount ? Number(((discountSpend / grossBeforeDiscount) * 100).toFixed(2)) : 0,
    topCoupons: (topCoupons || []).map((entry) => ({
      code: entry._id || "NO_CODE",
      orders: Number(entry.orders || 0),
      discountSpend: Number(entry.discountSpend || 0),
      revenue: Number(entry.revenue || 0),
    })),
  }
}

const buildWholesaleSummary = ({ statusCounts, topSuppliers, latencyMetrics, stuckOrders }) => {
  const counts = statusCounts.reduce((acc, entry) => {
    acc[entry._id || "pending"] = Number(entry.count || 0)
    return acc
  }, {})

  const totalOrders = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)
  const activeOrders = Number(counts.pending || 0) + Number(counts.confirmed || 0) + Number(counts.shipped || 0)
  const confirmedOrders = Number(counts.confirmed || 0)
  const deliveredOrders = Number(counts.delivered || 0)
  const cancelledOrders = Number(counts.cancelled || 0)
  const cancellationRate = totalOrders ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0
  const deliveredRevenue = (topSuppliers || []).reduce((sum, supplier) => sum + Number(supplier.deliveredRevenue || 0), 0)

  return {
    totalOrders,
    activeOrders,
    confirmedOrders,
    deliveredOrders,
    cancelledOrders,
    cancellationRate,
    stuckOrders: Number(stuckOrders || 0),
    deliveredRevenue,
    avgConfirmationHours: Number(latencyMetrics?.avgConfirmationHours || 0),
    avgFulfillmentHours: Number(latencyMetrics?.avgFulfillmentHours || 0),
    topSuppliers: (topSuppliers || []).map((supplier) => ({
      supplierId: String(supplier._id),
      supplierName: supplier.supplierName || "Unknown Supplier",
      orders: Number(supplier.orders || 0),
      deliveredOrders: Number(supplier.deliveredOrders || 0),
      deliveredRevenue: Number(supplier.deliveredRevenue || 0),
    })),
  }
}

const parseCouponWindowDays = (daysBackInput) => {
  const parsedDaysBack = Number.parseInt(String(daysBackInput || "30"), 10)
  return Number.isFinite(parsedDaysBack)
    ? Math.min(Math.max(parsedDaysBack, 1), 120)
    : 30
}

const toCsvCell = (value) => {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/* ================= PLATFORM DASHBOARD (ADMIN) ================= */

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const couponWindowDays = parseCouponWindowDays(req.query.daysBack)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const couponWindowStart = new Date(now);
    couponWindowStart.setDate(couponWindowStart.getDate() - couponWindowDays);

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

    const [recentRevenueWindows, recentOrderWindows, cancellationStats, topStorePerformance, unassignedOrders, activeDeliveries, growthLeadAggregate, recentGrowthLeads, recentPayments, couponTotals, topCoupons, wholesaleStatusCounts, wholesaleTopSuppliers, wholesaleLatency, wholesaleStuckOrders] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: "delivered",
            createdAt: { $gte: fourteenDaysAgo },
          },
        },
        {
          $project: {
            totalAmount: 1,
            period: {
              $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, "current", "previous"],
            },
          },
        },
        {
          $group: {
            _id: "$period",
            total: { $sum: "$totalAmount" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: fourteenDaysAgo },
          },
        },
        {
          $project: {
            period: {
              $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, "current", "previous"],
            },
          },
        },
        {
          $group: {
            _id: "$period",
            total: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: "$storeId",
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0],
              },
            },
          },
        },
        { $sort: { revenue: -1, orders: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "_id",
            as: "store",
          },
        },
        {
          $project: {
            storeId: "$_id",
            orders: 1,
            revenue: 1,
            storeName: {
              $ifNull: [{ $arrayElemAt: ["$store.storeName", 0] }, "Unknown Store"],
            },
          },
        },
      ]),
      Order.countDocuments({
        status: { $in: ["accepted", "preparing"] },
        deliveryPartnerId: { $exists: false },
      }),
      Order.find({
        status: "out_for_delivery",
      })
        .select("_id estimatedDeliveryTime deliveryStartTime deliveryLocation updatedAt")
        .lean(),
      GrowthLead.aggregate([
        {
          $facet: {
            totalLeads: [{ $count: "count" }],
            thisWeekLeads: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $count: "count" },
            ],
            referredLeads: [
              { $match: { referredBy: { $exists: true, $nin: [null, ""] } } },
              { $count: "count" },
            ],
            campusWaitlist: [
              { $match: { useCase: "campus-waitlist" } },
              { $count: "count" },
            ],
            topUseCases: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $group: { _id: "$useCase", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 4 },
            ],
          },
        },
      ]),
      GrowthLead.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email city useCase source interests referralCode createdAt")
        .lean(),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            paid: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] },
            },
            retries: {
              $sum: {
                $cond: [{ $gt: ["$paymentAttemptCount", 1] }, 1, 0],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: couponWindowStart },
            "promotionAudit.campaignId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            couponOrders: { $sum: 1 },
            discountSpend: { $sum: { $ifNull: ["$promotionAudit.discountAmount", 0] } },
            discountedRevenue: { $sum: "$totalAmount" },
            grossBeforeDiscount: {
              $sum: {
                $ifNull: [
                  "$pricingBreakdown.subtotalAmount",
                  { $add: ["$totalAmount", { $ifNull: ["$promotionAudit.discountAmount", 0] }] },
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: couponWindowStart },
            "promotionAudit.campaignId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$promotionAudit.couponCode",
            orders: { $sum: 1 },
            discountSpend: { $sum: { $ifNull: ["$promotionAudit.discountAmount", 0] } },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { discountSpend: -1, orders: -1 } },
        { $limit: 5 },
      ]),
      WholesaleOrder.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      WholesaleOrder.aggregate([
        {
          $group: {
            _id: "$supplierId",
            orders: { $sum: 1 },
            deliveredOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
              },
            },
            deliveredRevenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0],
              },
            },
          },
        },
        { $sort: { deliveredRevenue: -1, orders: -1 } },
        { $limit: 4 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "supplier",
          },
        },
        {
          $project: {
            _id: 1,
            orders: 1,
            deliveredOrders: 1,
            deliveredRevenue: 1,
            supplierName: {
              $ifNull: [{ $arrayElemAt: ["$supplier.name", 0] }, "Unknown Supplier"],
            },
          },
        },
      ]),
      WholesaleOrder.aggregate([
        {
          $group: {
            _id: null,
            avgConfirmationHours: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$confirmedAt", null] }, { $ne: ["$createdAt", null] }] },
                  {
                    $divide: [
                      { $subtract: ["$confirmedAt", "$createdAt"] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            },
            avgFulfillmentHours: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$deliveredAt", null] }, { $ne: ["$createdAt", null] }] },
                  {
                    $divide: [
                      { $subtract: ["$deliveredAt", "$createdAt"] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
      ]),
      WholesaleOrder.countDocuments({
        status: { $in: ["pending", "confirmed", "shipped"] },
        createdAt: { $lt: new Date(now.getTime() - (48 * 60 * 60 * 1000)) },
      }),
    ]);

    const revenueMap = recentRevenueWindows.reduce((acc, entry) => {
      acc[entry._id] = entry.total;
      return acc;
    }, {});

    const orderMap = recentOrderWindows.reduce((acc, entry) => {
      acc[entry._id] = entry.total;
      return acc;
    }, {});

    const opsBriefing = buildOpsBriefing({
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      drivers,
      rollingRevenue: {
        current: revenueMap.current || 0,
        previous: revenueMap.previous || 0,
      },
      rollingOrders: {
        current: orderMap.current || 0,
        previous: orderMap.previous || 0,
      },
      cancellationStats: cancellationStats[0] || { total: 0, cancelled: 0 },
      topStore: topStorePerformance[0] || null,
      unassignedOrders,
      wholesaleStuckOrders,
    });

    const cancellationRate = cancellationStats[0]?.total
      ? (cancellationStats[0].cancelled / cancellationStats[0].total) * 100
      : 0;

    const incidentFeed = buildIncidentFeed({
      activeDeliveries,
      cancellationRate,
      unassignedOrders,
      wholesaleStuckOrders,
    });

    const growthSummary = buildGrowthSummary({
      aggregated: growthLeadAggregate,
      recentLeads: recentGrowthLeads,
    });

    const paymentSummary = buildPaymentSummary({
      recentPayments,
    })

    const couponSummary = buildCouponSummary({
      couponTotals,
      topCoupons,
    })
    couponSummary.windowDays = couponWindowDays

    const wholesaleSummary = buildWholesaleSummary({
      statusCounts: wholesaleStatusCounts,
      topSuppliers: wholesaleTopSuppliers,
      latencyMetrics: wholesaleLatency[0] || null,
      stuckOrders: wholesaleStuckOrders,
    })

    const statusSummary = statusCounts.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.json({
      users,
      stores,
      orders,
      drivers,
      revenue,
      statusCounts: statusSummary,
      recentOrders,
      dailySales: dailySales.reverse(),
      opsBriefing,
      incidentFeed,
      growthSummary,
      paymentSummary,
      couponSummary,
      wholesaleSummary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.exportCouponAnalyticsCsv = async (req, res) => {
  try {
    const now = new Date()
    const couponWindowDays = parseCouponWindowDays(req.query.daysBack)
    const couponWindowStart = new Date(now)
    couponWindowStart.setDate(couponWindowStart.getDate() - couponWindowDays)

    const [couponTotals, topCoupons] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: couponWindowStart },
            "promotionAudit.campaignId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            couponOrders: { $sum: 1 },
            discountSpend: { $sum: { $ifNull: ["$promotionAudit.discountAmount", 0] } },
            discountedRevenue: { $sum: "$totalAmount" },
            grossBeforeDiscount: {
              $sum: {
                $ifNull: [
                  "$pricingBreakdown.subtotalAmount",
                  { $add: ["$totalAmount", { $ifNull: ["$promotionAudit.discountAmount", 0] }] },
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: couponWindowStart },
            "promotionAudit.campaignId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$promotionAudit.couponCode",
            orders: { $sum: 1 },
            discountSpend: { $sum: { $ifNull: ["$promotionAudit.discountAmount", 0] } },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { discountSpend: -1, orders: -1 } },
        { $limit: 200 },
      ]),
    ])

    const couponSummary = buildCouponSummary({ couponTotals, topCoupons })
    const lines = []
    lines.push(["metric", "value"].map(toCsvCell).join(","))
    lines.push(["windowDays", couponWindowDays].map(toCsvCell).join(","))
    lines.push(["couponOrders", couponSummary.couponOrders].map(toCsvCell).join(","))
    lines.push(["discountSpend", couponSummary.discountSpend].map(toCsvCell).join(","))
    lines.push(["discountedRevenue", couponSummary.discountedRevenue].map(toCsvCell).join(","))
    lines.push(["avgDiscountPerOrder", couponSummary.avgDiscountPerOrder].map(toCsvCell).join(","))
    lines.push(["discountRate", couponSummary.discountRate].map(toCsvCell).join(","))
    lines.push("")
    lines.push(["couponCode", "orders", "discountSpend", "revenue"].map(toCsvCell).join(","))

    for (const coupon of couponSummary.topCoupons || []) {
      lines.push([
        coupon.code,
        coupon.orders,
        coupon.discountSpend,
        coupon.revenue,
      ].map(toCsvCell).join(","))
    }

    const filenameDate = now.toISOString().slice(0, 10)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="coupon-analytics-${couponWindowDays}d-${filenameDate}.csv"`)
    res.status(200).send(lines.join("\n"))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

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

// ── Wholesale SLA drill-down (admin-only) ──────────────────────
exports.getWholesaleSlaAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const windowDays = Math.min(Math.max(Number(req.query.days) || 90, 7), 365);
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const [supplierSla, platformLatency] = await Promise.all([
      // Per-supplier SLA metrics
      WholesaleOrder.aggregate([
        { $match: { createdAt: { $gte: windowStart } } },
        {
          $group: {
            _id: "$supplierId",
            totalOrders: { $sum: 1 },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            deliveredRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$totalAmount", 0] },
            },
            avgConfirmationHours: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$confirmedAt", null] }, { $ne: ["$createdAt", null] }] },
                  { $divide: [{ $subtract: ["$confirmedAt", "$createdAt"] }, 3600000] },
                  null,
                ],
              },
            },
            avgFulfillmentHours: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$deliveredAt", null] }, { $ne: ["$createdAt", null] }] },
                  { $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000] },
                  null,
                ],
              },
            },
            // On-time: delivered within 72 hours of creation
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "delivered"] },
                      { $ne: ["$deliveredAt", null] },
                      {
                        $lte: [
                          { $subtract: ["$deliveredAt", "$createdAt"] },
                          72 * 3600000,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "supplierUser",
          },
        },
        {
          $project: {
            supplierId: "$_id",
            supplierName: { $ifNull: [{ $arrayElemAt: ["$supplierUser.name", 0] }, "Unknown Supplier"] },
            totalOrders: 1,
            deliveredOrders: 1,
            cancelledOrders: 1,
            deliveredRevenue: 1,
            avgConfirmationHours: { $round: ["$avgConfirmationHours", 1] },
            avgFulfillmentHours: { $round: ["$avgFulfillmentHours", 1] },
            onTimeRate: {
              $cond: [
                { $gt: ["$deliveredOrders", 0] },
                {
                  $round: [
                    { $multiply: [{ $divide: ["$onTimeDeliveries", "$deliveredOrders"] }, 100] },
                    1,
                  ],
                },
                null,
              ],
            },
            cancellationRate: {
              $cond: [
                { $gt: ["$totalOrders", 0] },
                { $round: [{ $multiply: [{ $divide: ["$cancelledOrders", "$totalOrders"] }, 100] }, 1] },
                0,
              ],
            },
          },
        },
        { $sort: { deliveredRevenue: -1 } },
      ]),

      // Platform-wide latency percentiles (delivered orders only)
      WholesaleOrder.aggregate([
        {
          $match: {
            status: "delivered",
            deliveredAt: { $ne: null },
            createdAt: { $gte: windowStart },
          },
        },
        {
          $project: {
            confirmationHours: {
              $cond: [
                { $ne: ["$confirmedAt", null] },
                { $divide: [{ $subtract: ["$confirmedAt", "$createdAt"] }, 3600000] },
                null,
              ],
            },
            fulfillmentHours: {
              $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgConfirmationHours: { $avg: "$confirmationHours" },
            avgFulfillmentHours: { $avg: "$fulfillmentHours" },
            minFulfillmentHours: { $min: "$fulfillmentHours" },
            maxFulfillmentHours: { $max: "$fulfillmentHours" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      windowDays,
      generatedAt: now,
      platformLatency: platformLatency[0]
        ? {
            avgConfirmationHours: Number((platformLatency[0].avgConfirmationHours || 0).toFixed(1)),
            avgFulfillmentHours: Number((platformLatency[0].avgFulfillmentHours || 0).toFixed(1)),
            minFulfillmentHours: Number((platformLatency[0].minFulfillmentHours || 0).toFixed(1)),
            maxFulfillmentHours: Number((platformLatency[0].maxFulfillmentHours || 0).toFixed(1)),
            deliveredOrdersAnalysed: Number(platformLatency[0].count || 0),
          }
        : null,
      supplierSla: supplierSla.map((s) => ({
        supplierId: String(s.supplierId),
        supplierName: s.supplierName,
        totalOrders: s.totalOrders,
        deliveredOrders: s.deliveredOrders,
        cancelledOrders: s.cancelledOrders,
        deliveredRevenue: s.deliveredRevenue,
        avgConfirmationHours: s.avgConfirmationHours,
        avgFulfillmentHours: s.avgFulfillmentHours,
        onTimeRate: s.onTimeRate,
        cancellationRate: s.cancellationRate,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};