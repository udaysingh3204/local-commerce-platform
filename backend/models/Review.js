const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  targetType: {
    type: String,
    enum: ["product", "store"],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxlength: 1000,
    trim: true,
    default: "",
  },
  vendorReply: {
    text: { type: String, maxlength: 500, trim: true, default: "" },
    repliedAt: { type: Date, default: null },
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true })

// One review per user per target
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true })
reviewSchema.index({ targetType: 1, targetId: 1 })
reviewSchema.index({ userId: 1 })

module.exports = mongoose.model("Review", reviewSchema)
