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
  }

}, { timestamps: true });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);