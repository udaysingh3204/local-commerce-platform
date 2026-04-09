const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [Number]
  }
}, { timestamps: true });

driverSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Driver", driverSchema);