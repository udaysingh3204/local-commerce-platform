const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  title: String,

  message: String,

  type: {
    type: String,
    enum: ["order", "delivery", "system", "promo", "payment", "chat", "chat_message", "wholesale"],
    default: "order"
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },

  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });
// Indexes for efficient per-user unread queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("Notification", notificationSchema);