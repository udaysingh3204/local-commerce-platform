const mongoose = require("mongoose");

const wholesaleStatusEventSchema = new mongoose.Schema({

  status: {
    type: String,
    required: true
  },

  changedAt: {
    type: Date,
    default: Date.now
  },

  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }

}, { _id: false });

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

  supplierNotes: {
    type: String,
    default: ""
  },

  cancellationReason: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    default: "pending"
  },

  confirmedAt: {
    type: Date,
    default: null
  },

  shippedAt: {
    type: Date,
    default: null
  },

  deliveredAt: {
    type: Date,
    default: null
  },

  cancelledAt: {
    type: Date,
    default: null
  },

  lastStatusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  statusHistory: {
    type: [wholesaleStatusEventSchema],
    default: []
  },

  // Partial fulfillment
  fulfilledItems: {
    type: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "WholesaleProduct" },
        quantityFulfilled: { type: Number, default: 0 },
        fulfilledAt: { type: Date, default: null },
      }
    ],
    default: []
  },

  fulfillmentProgress: {
    type: Number, // 0-100 (percentage of total line-item units fulfilled)
    default: 0,
    min: 0,
    max: 100,
  },

  // Invoice / reference metadata
  invoiceRef: {
    type: String,
    default: ""
  },

  poNumber: {
    type: String,
    default: ""
  },

}, { timestamps: true });

module.exports = mongoose.model("WholesaleOrder", wholesaleOrderSchema);