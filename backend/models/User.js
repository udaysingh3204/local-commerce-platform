const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["customer", "vendor", "delivery", "admin"],
    default: "customer"
  },

  address: {
    type: String
  },
  role: {
  type: String,
  enum: ["customer", "vendor", "delivery", "admin", "supplier"],
  default: "customer"
},

  isActive: {
    type: Boolean,
    default: true
  },
  location: {
  lat: Number,
  lng: Number
},

isAvailable: {
  type: Boolean,
  default: true
}

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);