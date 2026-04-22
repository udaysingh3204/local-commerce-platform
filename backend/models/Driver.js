const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  authProvider: {
    type: String,
    enum: ["local", "google", "hybrid"],
    default: "local"
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: ""
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, { timestamps: true });

driverSchema.index({ location: "2dsphere" });
driverSchema.index({ email: 1 }, { unique: true });
driverSchema.index({ isAvailable: 1 });

module.exports = mongoose.model("Driver", driverSchema);