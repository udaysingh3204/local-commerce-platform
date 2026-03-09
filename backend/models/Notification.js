const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  message: String,

  type: {
    type: String,
    enum: ["order", "delivery", "system"],
    default: "order"
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);