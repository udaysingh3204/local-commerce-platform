const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const {
  helmet,
  limiter,
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
const app = express();
const server = http.createServer(app);
const morgan = require("morgan")
app.use(morgan("combined"))
/* SOCKET.IO */

const io = new Server(server, {
  cors: {
    origin: ["https://admin-dashboard-ruddy-eight-35.vercel.app",
      "https://local-commerce-platform.vercel.app",
      "https://delivery-dashboard-three-murex.vercel.app",
      "https://supplier-dashboard-tau.vercel.app",
      "https://vendor-dashboard-rho.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    methods: ["GET", "POST", "PATCH"]
  }
});

app.set("io", io);

// 🚀 TEST DRIVER LOCATION (SIMULATION)
app.get("/test-location", (req, res) => {

  const io = req.app.get("io");

  const orderId = req.query.orderId;

  if (!orderId) {
    return res.send("❌ Missing orderId");
  }

  const location = {
    lat: 28.5355 + Math.random() * 0.002,
    lng: 77.3910 + Math.random() * 0.002
  };

  io.to(orderId).emit("deliveryLocationUpdate", {
    orderId,
    location
  });

  console.log("📡 Location sent:", location);

  res.send("✅ Location sent");
});


/* GLOBAL MIDDLEWARE */

app.use(cors({
  origin: ["https://admin-dashboard-ruddy-eight-35.vercel.app",
    "https://local-commerce-platform.vercel.app",
    "https://delivery-dashboard-three-murex.vercel.app",
    "https://supplier-dashboard-tau.vercel.app",
    "https://vendor-dashboard-rho.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
  ], 
  credentials: true
}));
app.use(express.json());

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
  console.log(`${req.method} ${req.url}`);
  next();
});

/* HEALTH CHECK */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime()
  });
});

/* API ROUTES */

app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/wholesale", wholesaleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/prediction", predictionRoutes);
app.use("/api/driver", driverAuthRoutes);
/* SOCKET EVENTS */
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // 👇 JOIN ROOM PER ORDER
  socket.on("joinOrderRoom", (orderId) => {
    socket.join(orderId);
    console.log(`Joined room: ${orderId}`);
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
    console.log("User disconnected:", socket.id);
  });

  socket.on("driverLocationUpdate", ({ driverId, location }) => {
  global.drivers = global.drivers || {}
  global.drivers[driverId] = location
})
});

/* DATABASE CONNECTION */

mongoose.connect(process.env.MONGO_URI)

.then(() => {

  console.log("MongoDB connected");

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

  });

})

.catch((err) => {

  console.error("MongoDB Error:", err);

});



const errorHandler = require("./middleware/errorHandler")

app.use(errorHandler)