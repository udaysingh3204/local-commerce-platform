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

  paymentReference: String,

  paymentFailureReason: String,

  cancellationReason: String,

  paymentAttemptCount: {
    type: Number,
    default: 0
  },

  lastPaymentAttemptAt: Date,

  paymentRecoveredAt: Date,

  /* ORDER TOTAL */

  totalAmount: {
    type: Number,
    required: true
  },

  pricingBreakdown: {
    subtotalAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
    },
  },

  promotionAudit: {
    campaignId: {
      type: String,
      default: null,
    },
    couponCode: {
      type: String,
      default: null,
    },
    campaignName: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
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

  deliveryLocationUpdatedAt: Date,

  deliveryStartTime: Date,

  deliveryEndTime: Date,

  estimatedDeliveryTime: Number, // minutes

  deliveryAddress: {
    line: String,
    city: String,
    pincode: String
  },

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
// Compound indexes for production query performance
orderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });
orderSchema.index({ deliveryPartnerId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paymentMethod: 1 });
orderSchema.index({ "promotionAudit.campaignId": 1 }, { sparse: true });
module.exports = mongoose.model("Order", orderSchema);