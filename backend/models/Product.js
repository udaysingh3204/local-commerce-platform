const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  stock: {
    type: Number,
    default: 0
  },

  category: {
    type: String,
    default: "general"
  },

  image: {
    type: String
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);