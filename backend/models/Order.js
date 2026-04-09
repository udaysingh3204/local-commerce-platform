const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver"
  },

  /* ITEMS */

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      name: String,

      image: String,

      quantity: Number,

      price: Number
    }
  ],

  /* PAYMENT */

  paymentMethod: {
    type: String,
    enum: ["cod", "upi", "razorpay"],
    default: "cod"
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },

  /* ORDER TOTAL */

  totalAmount: {
    type: Number,
    required: true
  },

  /* ORDER STATUS */

  status: {
    type: String,
    default: "pending",
    enum: [
      "pending",
      "accepted",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled"
    ]
  },

  /* DELIVERY TRACKING */

  deliveryLocation: {
    lat: Number,
    lng: Number
  },

  deliveryStartTime: Date,

  deliveryEndTime: Date,

  estimatedDeliveryTime: Number, // minutes

  /* CUSTOMER LOCATION */

  customerLocation: {
    lat: Number,
    lng: Number
  },

  /* STORE LOCATION SNAPSHOT */

  storeLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number]
    }
  }

  
}, { timestamps: true });

orderSchema.index({ storeLocation: "2dsphere" });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
module.exports = mongoose.model("Order", orderSchema);