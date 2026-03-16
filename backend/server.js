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

const app = express();
const server = http.createServer(app);
const morgan = require("morgan")
app.use(morgan("combined"))
/* SOCKET.IO */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

app.set("io", io);

/* GLOBAL MIDDLEWARE */

app.use(cors());
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

app.get("/", (req, res) => {
  res.status(200).send("Local Commerce Backend Running 🚀");
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

/* SOCKET EVENTS */

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  /* DELIVERY LOCATION UPDATE */

  socket.on("deliveryLocationUpdate", (data) => {

    io.emit("deliveryLocationUpdate", data);

  });

  socket.on("disconnect", () => {

    console.log("User disconnected:", socket.id);

  });

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

/* GLOBAL ERROR HANDLER */

app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    error: "Something went wrong"
  });

});

const errorHandler = require("./middleware/errorHandler")

app.use(errorHandler)