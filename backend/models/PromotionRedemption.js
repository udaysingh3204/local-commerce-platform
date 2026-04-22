const mongoose = require("mongoose");

const promotionRedemptionSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    totalSavings: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for per-user-per-campaign lookups (most common query)
promotionRedemptionSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

promotionRedemptionSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("PromotionRedemption", promotionRedemptionSchema);
