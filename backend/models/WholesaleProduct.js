const mongoose = require("mongoose");

const wholesaleProductSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  pricePerUnit: Number,

  minOrderQty: Number,

  stock: Number,

  category: String

}, { timestamps: true });

module.exports = mongoose.model("WholesaleProduct", wholesaleProductSchema);