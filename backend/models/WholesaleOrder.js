const mongoose = require("mongoose");

const wholesaleOrderSchema = new mongoose.Schema({

  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WholesaleProduct"
      },

      quantity: Number,

      price: Number
    }
  ],

  totalAmount: Number,

  status: {
    type: String,
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("WholesaleOrder", wholesaleOrderSchema);