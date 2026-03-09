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
    ref: "User"
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      quantity: Number,

      price: Number
    }
  ],

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

  totalAmount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    default: "pending",
    enum: [
      "pending",
      "accepted",
      "preparing",
      "out_for_delivery",
      "delivered"
    ]
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);