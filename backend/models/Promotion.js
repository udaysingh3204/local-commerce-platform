const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "flat", "bogo", "tiered"],
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    discount: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    maxUsagePerUser: {
      type: Number,
      default: 5,
    },
    totalBudget: {
      type: Number,
      default: null,
    },
    currentSpend: {
      type: Number,
      default: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "paused", "expired", "draft"],
      default: "active",
    },
    performance: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

promotionSchema.index({ status: 1, validFrom: 1, validTo: 1 });

module.exports = mongoose.model("Promotion", promotionSchema);
