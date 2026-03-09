const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

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

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

/* ---------------- Middleware ---------------- */

app.use(cors());
app.use(express.json());

/* ---------------- Health Route ---------------- */

app.get("/", (req, res) => {
  res.send("Local Commerce Backend Running 🚀");
});

/* ---------------- API Routes ---------------- */

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

/* ---------------- Socket.IO ---------------- */

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("deliveryLocationUpdate", (data) => {
    io.emit("deliveryLocationUpdate", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

/* ---------------- MongoDB ---------------- */

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB connected");
})
.catch(err => {
  console.error("MongoDB connection error:", err);
});

/* ---------------- Start Server ---------------- */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});