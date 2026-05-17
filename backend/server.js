const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

/* ── Sentry must initialise BEFORE any other require ── */
const { init: initSentry, Sentry } = require("./config/sentry");
initSentry();

const logger = require("./config/logger");

if (!process.env.JWT_SECRET) {
  logger.error("JWT_SECRET is not set — refusing to start");
  process.exit(1);
}

if (!process.env.GOOGLE_CLIENT_ID) {
  logger.warn("[auth] GOOGLE_CLIENT_ID is not configured. Google sign-in is disabled.")
}

const http = require("http");
const { Server } = require("socket.io");
const {
  helmet,
  limiter,
  authLimiter,
  paymentLimiter,
  searchLimiter,
  mongoSanitize,
  hpp,
  compression
} = require("./middleware/security")
/* ROUTES */

const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const wholesaleRoutes = require("./routes/wholesaleRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const driverAuthRoutes = require("./routes/driverAuthRoutes");
const growthRoutes = require("./routes/growthRoutes");
const demoRoutes = require("./routes/demoRoutes");
const appRoutes = require("./routes/appRoutes");
const dispatchMLRoutes = require("./routes/dispatchMLRoutes");
const queueGamificationRoutes = require("./routes/queueGamificationRoutes");
const dispatchServiceML = require("./services/dispatchServiceML");
// Phase 2 Routes
const chatRoutes = require("./routes/chatRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const referralRoutes = require("./routes/referralRoutes");
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
const languageRoutes = require("./routes/languageRoutes");
// Phase 2 Services
const chatService = require("./services/chatService");
const subscriptionService = require("./services/subscriptionService");
const referralService = require("./services/referralService");
const adminAnalyticsService = require("./services/adminAnalyticsService");
const languageService = require("./services/languageService");
// Phase 3 Routes
const searchRoutes = require("./routes/searchRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
// Phase 3 Services
const searchRecommendationService = require("./services/searchRecommendationService");
const loyaltyService = require("./services/loyaltyService");
const eventBusService = require("./services/eventBusService");
const promotionService = require("./services/promotionService");
const wishlistService = require("./services/wishlistService");
const { handlePaymentWebhook } = require("./controllers/paymentController");
const app = express();
const server = http.createServer(app);
const morgan = require("morgan")

app.set("trust proxy", 1)

app.use(morgan("combined"))

/* CORS ORIGIN CHECKER */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://admin-dashboard-ruddy-eight-35.vercel.app",
  "https://local-commerce-platform.vercel.app",
  "https://delivery-dashboard-three-murex.vercel.app",
  "https://supplier-dashboard-tau.vercel.app",
  "https://vendor-dashboard-rho.vercel.app",
];

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / server-to-server
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/* SOCKET.IO */

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  }
});

const jwt = require("jsonwebtoken");
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
  if (!token) return next(new Error("Authentication required"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

app.set("io", io);


/* GLOBAL MIDDLEWARE */

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), handlePaymentWebhook)
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handlePaymentWebhook)
app.use(express.json());

const xss = require("xss-clean");
app.use(xss());

app.use(helmet())
app.use(limiter)
app.use(hpp())
app.use(compression())

app.use((req,res,next)=>{
  req.body = mongoSanitize(req.body)
  req.query = mongoSanitize(req.query)
  next()
})
/* REQUEST LOGGER (helps debugging) */

app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

/* HEALTH CHECK */

app.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  let redisStatus = "unconfigured";
  try {
    const redisClient = require("./config/redis");
    if (redisClient && (redisClient.status === "ready" || redisClient.isOpen)) {
      await redisClient.ping();
      redisStatus = "ok";
    } else if (redisClient) {
      redisStatus = "connecting";
    }
  } catch {
    redisStatus = "error";
  }
  const status = dbState === 1 ? 200 : 503;
  res.status(status).json({
    status: dbState === 1 ? "OK" : "DEGRADED",
    db: dbState === 1 ? "ok" : "error",
    redis: redisStatus,
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || "1.0.0",
  });
});

/* API ROUTES */

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentLimiter, paymentRoutes);
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/wholesale", wholesaleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/prediction", predictionRoutes);
app.use("/api/driver", authLimiter, driverAuthRoutes);
app.use("/api/growth", growthRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/app", appRoutes);
app.use("/api/dispatch", dispatchMLRoutes);
app.use("/api/queue", queueGamificationRoutes);
app.use("/api/gamification", queueGamificationRoutes);
app.use("/api/pricing", queueGamificationRoutes);
// Phase 2 Routes
app.use("/api/chat", chatRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/language", languageRoutes);
// Phase 3 Routes
app.use("/api/search", searchLimiter, searchRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/addresses", addressRoutes);
/* SOCKET EVENTS */
io.on("connection", (socket) => {

  logger.debug("User connected: " + socket.id);

  // 👇 JOIN ROOM PER ORDER
  socket.on("joinOrderRoom", (orderId) => {
    socket.join(orderId);
    logger.debug(`Joined room: ${orderId}`);
  });

  // 👇 DRIVER LOCATION UPDATE
  socket.on("deliveryLocationUpdate", (data) => {
    const { orderId, location } = data;

    // Send ONLY to users tracking this order
    io.to(orderId).emit("deliveryLocationUpdate", {
      orderId,
      location
    });
  });

  socket.on("disconnect", () => {
    logger.debug("User disconnected: " + socket.id);
  });

  socket.on("driverLocationUpdate", ({ location }) => {
    const driverId = socket.user?.id;
    if (!driverId) return;
    global.drivers = global.drivers || {};
    global.drivers[driverId] = location;
  })
});

/* START SERVER FIRST — so healthcheck is reachable before DB connects */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

/* DATABASE CONNECTION */

mongoose.connect(process.env.MONGO_URI)

.then(async () => {

  logger.info("MongoDB connected");

  // Initialize ML services
  try {
    await dispatchServiceML.initialize();
  } catch (err) {
    logger.error("ML Service initialization error", { error: err.message });
  }

})

.catch((err) => {
  logger.error("MongoDB Error", { error: err.message });
  process.exit(1);
});

const errorHandler = require("./middleware/errorHandler")

// Sentry error handler must be before custom errorHandler
if (Sentry && typeof Sentry.expressErrorHandler === "function") {
  app.use(Sentry.expressErrorHandler())
} else if (Sentry && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === "function") {
  app.use(Sentry.Handlers.errorHandler())
}

app.use(errorHandler)

/* GRACEFUL SHUTDOWN */

const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info("MongoDB connection closed");
      process.exit(0);
    });
  });
  // Force shutdown after 30s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
