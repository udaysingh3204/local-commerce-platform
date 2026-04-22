const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const ACTIVE_DRIVER_STATUSES = ["accepted", "preparing", "out_for_delivery"]
const MAX_DELIVERY_DURATION_MINUTES = 360

const signDriverToken = (driver) => jwt.sign(
  { id: driver._id, role: "driver" },
  process.env.JWT_SECRET || "fallback_secret",
  { expiresIn: "7d" }
)

const sanitizeDriver = (driver) => ({
  _id: driver._id,
  name: driver.name,
  email: driver.email,
  isAvailable: driver.isAvailable,
  avatar: driver.avatar,
  authProvider: driver.authProvider,
})

const getStartOfDay = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const getStartOfWeek = () => {
  const start = getStartOfDay()
  start.setDate(start.getDate() - 6)
  return start
}

const formatTrendDate = (value) => new Date(value).toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
})

const getDurationMinutes = (order) => {
  if (!order.deliveryStartTime || !order.deliveryEndTime) return null

  const duration = Math.round(
    (new Date(order.deliveryEndTime).getTime() - new Date(order.deliveryStartTime).getTime()) / 60000
  )

  if (Number.isNaN(duration) || duration < 0 || duration > MAX_DELIVERY_DURATION_MINUTES) return null
  return duration
}

const buildDriverInsights = async (driverId) => {
  const [activeOrders, deliveredOrders] = await Promise.all([
    Order.find({
      deliveryPartnerId: driverId,
      status: { $in: ACTIVE_DRIVER_STATUSES },
    })
      .sort({ updatedAt: -1 })
      .select("_id status totalAmount updatedAt deliveryStartTime estimatedDeliveryTime items paymentMethod paymentStatus"),
    Order.find({
      deliveryPartnerId: driverId,
      status: "delivered",
    })
      .sort({ updatedAt: -1 })
      .select("_id totalAmount updatedAt deliveryStartTime deliveryEndTime estimatedDeliveryTime items paymentMethod paymentStatus"),
  ])

  const startOfToday = getStartOfDay()
  const startOfWeek = getStartOfWeek()

  const todayDeliveries = deliveredOrders.filter((order) => new Date(order.updatedAt) >= startOfToday)
  const weekDeliveries = deliveredOrders.filter((order) => new Date(order.updatedAt) >= startOfWeek)
  const totalEarnings = deliveredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  const todayEarnings = todayDeliveries.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  const weekEarnings = weekDeliveries.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  const avgOrderValue = deliveredOrders.length ? Math.round(totalEarnings / deliveredOrders.length) : 0

  const durationSamples = deliveredOrders
    .map((order) => getDurationMinutes(order))
    .filter((value) => typeof value === "number")

  const avgDeliveryMinutes = durationSamples.length
    ? Math.round(durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length)
    : null

  const onTimeEligible = deliveredOrders.filter((order) => {
    const duration = getDurationMinutes(order)
    return typeof duration === "number" && typeof order.estimatedDeliveryTime === "number"
  })

  const onTimeDelivered = onTimeEligible.filter((order) => {
    const duration = getDurationMinutes(order)
    return typeof duration === "number" && duration <= order.estimatedDeliveryTime
  })

  const byDate = new Map()

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(startOfToday)
    date.setDate(startOfToday.getDate() - offset)
    const key = formatTrendDate(date)
    byDate.set(key, { date: key, amount: 0, deliveries: 0 })
  }

  deliveredOrders.forEach((order) => {
    const key = formatTrendDate(order.updatedAt)
    if (!byDate.has(key)) return
    const current = byDate.get(key)
    current.amount += order.totalAmount || 0
    current.deliveries += 1
  })

  const statusBreakdown = activeOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, { accepted: 0, preparing: 0, out_for_delivery: 0 })

  return {
    summary: {
      activeCount: activeOrders.length,
      deliveredCount: deliveredOrders.length,
      todayDeliveredCount: todayDeliveries.length,
      weekDeliveredCount: weekDeliveries.length,
      todayEarnings,
      weekEarnings,
      totalEarnings,
      avgOrderValue,
      avgDeliveryMinutes,
      onTimeRate: onTimeEligible.length ? Math.round((onTimeDelivered.length / onTimeEligible.length) * 100) : null,
      statusBreakdown,
    },
    trend: Array.from(byDate.values()),
    activeOrders: activeOrders.slice(0, 6).map((order) => ({
      _id: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      estimatedDeliveryTime: order.estimatedDeliveryTime || null,
      deliveryStartTime: order.deliveryStartTime || null,
      itemCount: order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      paymentMethod: order.paymentMethod || "cod",
      paymentStatus: order.paymentStatus || "pending",
      updatedAt: order.updatedAt,
    })),
    recentDeliveries: deliveredOrders.slice(0, 10).map((order) => ({
      _id: order._id,
      totalAmount: order.totalAmount,
      updatedAt: order.updatedAt,
      durationMinutes: getDurationMinutes(order),
      estimatedDeliveryTime: order.estimatedDeliveryTime || null,
      itemCount: order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      paymentMethod: order.paymentMethod || "cod",
      paymentStatus: order.paymentStatus || "pending",
    })),
  }
}

const protectDriver = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" })
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")

    if (decoded.role !== "driver") {
      return res.status(403).json({ message: "Not authorized for driver access" })
    }

    req.driver = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" })
  }
}

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Driver already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const driver = await Driver.create({ name, email, password: hashed, authProvider: "local" });

    res.status(201).json({
      message: "Driver registered successfully",
      driver: { _id: driver._id, name: driver.name, email: driver.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (!driver.password) {
      return res.status(400).json({ message: "This driver account uses Google sign-in" })
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signDriverToken(driver)

    res.json({
      token,
      driver: sanitizeDriver(driver)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google auth is not configured" })
    }

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload?.email) {
      return res.status(400).json({ message: "Google account email is required" })
    }

    let driver = await Driver.findOne({ email: payload.email })

    if (!driver) {
      driver = await Driver.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        password: null,
        authProvider: "google",
        googleId: payload.sub,
        avatar: payload.picture || "",
      })
    } else {
      driver.googleId = driver.googleId || payload.sub
      if (driver.password && driver.authProvider === "local") {
        driver.authProvider = "hybrid"
      } else if (!driver.password) {
        driver.authProvider = "google"
      }
      driver.avatar = payload.picture || driver.avatar || ""
      if (!driver.name && payload.name) driver.name = payload.name
      await driver.save()
    }

    res.json({
      token: signDriverToken(driver),
      driver: sanitizeDriver(driver),
    })
  } catch (err) {
    res.status(401).json({ message: "Google sign-in failed", error: err.message })
  }
})

router.get("/me", protectDriver, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id)
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })
    }

    res.json({ driver: sanitizeDriver(driver) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get("/bootstrap", protectDriver, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id)

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })
    }

    const insights = await buildDriverInsights(driver._id)

    res.json({
      driver: sanitizeDriver(driver),
      session: {
        roleHome: "/",
      },
      startup: {
        activeDeliveries: insights.summary.activeCount,
        completedDeliveries: insights.summary.deliveredCount,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get("/me/insights", protectDriver, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id)

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })
    }

    const insights = await buildDriverInsights(driver._id)

    res.json({
      driver: sanitizeDriver(driver),
      insights,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.patch("/me/location", protectDriver, async (req, res) => {
  try {
    const { lat, lng } = req.body

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "Latitude and longitude are required" })
    }

    const driver = await Driver.findByIdAndUpdate(
      req.driver.id,
      {
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
      },
      { returnDocument: "after" }
    )

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })
    }

    const io = req.app.get("io")
    const location = { lat, lng }

    io.emit("driverLocationUpdate", {
      driverId: String(driver._id),
      location,
      activeOrderIds: [],
    })

    const activeOrders = await Order.find({
      deliveryPartnerId: req.driver.id,
      status: "out_for_delivery",
    }).select("_id")

    if (activeOrders.length > 0) {
      await Order.updateMany(
        {
          _id: { $in: activeOrders.map((order) => order._id) },
        },
        {
          $set: {
            deliveryLocation: { lat, lng },
            deliveryLocationUpdatedAt: new Date(),
          },
        }
      )

      activeOrders.forEach((order) => {
        io.to(String(order._id)).emit("deliveryLocationUpdate", {
          orderId: String(order._id),
          location,
        })
      })
    }

    res.json({ driver: sanitizeDriver(driver) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.patch("/me/availability", protectDriver, async (req, res) => {
  try {
    const { isAvailable } = req.body

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" })
    }

    const driver = await Driver.findById(req.driver.id)

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })
    }

    const activeOrders = await require("../models/Order").countDocuments({
      deliveryPartnerId: driver._id,
      status: { $nin: ["delivered", "cancelled"] },
    })

    if (!isAvailable && activeOrders > 0) {
      return res.status(400).json({ message: "Complete active deliveries before going offline" })
    }

    driver.isAvailable = isAvailable
    await driver.save()

    res.json({ driver: sanitizeDriver(driver) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/* GET ALL DRIVERS (admin) */
router.get("/all", async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password").sort({ createdAt: -1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;