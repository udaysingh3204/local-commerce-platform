const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  vehicleType: {
    type: String,
    default: "bike"
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  // ✅ ADD THIS (CRITICAL)
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: []
    }
  }

}, { timestamps: true });

// ✅ ADD INDEX (IMPORTANT FOR GEO)
deliveryPartnerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);