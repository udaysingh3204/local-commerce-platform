const mongoose = require("mongoose")

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["user", "driver"],
      default: "user",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    // IP and user-agent for security auditing
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// Auto-expire from DB after expiry date (TTL index)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshTokenSchema.index({ userId: 1, isRevoked: 1 })

module.exports = mongoose.model("RefreshToken", refreshTokenSchema)
