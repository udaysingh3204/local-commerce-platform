const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({

  storeName: {
    type: String,
    required: true
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: String,
    default: "grocery"
  },

  address: String,

  deliveryRadius: {
    type: Number,
    default: 5
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }

}, { timestamps: true });

storeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Store", storeSchema);