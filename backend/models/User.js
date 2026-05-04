const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  priceWhenAdded: {
    type: Number,
    default: 0
  },
  lastPriceCheckAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ""
  },
  tags: {
    type: [String],
    default: []
  },
  notifyOnPriceDrop: {
    type: Number,
    default: 10
  }
}, { _id: true });

const shareableWishlistSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: "My Wishlist"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  selectedItems: {
    type: [String],
    default: null
  }
}, { _id: false });

const referralUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  referredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "pending"
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const referralSchema = new mongoose.Schema({
  code: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  totalReferrals: {
    type: Number,
    default: 0
  },
  successfulReferrals: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    default: "level1"
  },
  referredUsers: {
    type: [referralUserSchema],
    default: []
  }
}, { _id: false });

const loyaltySchema = new mongoose.Schema({
  totalPoints: {
    type: Number,
    default: 0
  },
  pointsBalance: {
    type: Number,
    default: 0
  },
  pointsRedeemed: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastTierUpdateAt: {
    type: Date,
    default: Date.now
  },
  transactions: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  redemptions: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, { _id: false });

const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  planId: {
    type: String,
    default: "free"
  },
  isActive: {
    type: Boolean,
    default: false
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  renewalDate: {
    type: Date,
    default: null
  },
  pausedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: ""
  }
}, { _id: false });

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    default: ""
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    default: null
  },

  authProvider: {
    type: String,
    enum: ["local", "google", "hybrid"],
    default: "local"
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  avatar: {
    type: String,
    default: ""
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

  // Password reset
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
  },
  location:{
type:{
type:String,
enum:["Point"],
default:"Point"
},
coordinates:{
type:[Number],
default:[0,0]
}
},

isAvailable: {
  type: Boolean,
  default: true
},

expoPushToken: {
  type: String,
  default: null,
},

wallet: {
  type: walletSchema,
  default: () => ({})
},

wishlist: {
  type: [wishlistItemSchema],
  default: []
},

shareableWishlists: {
  type: [shareableWishlistSchema],
  default: []
},

referral: {
  type: referralSchema,
  default: () => ({})
},

referredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

referralStatus: {
  type: String,
  enum: ["inactive", "active"],
  default: "inactive"
},

loyalty: {
  type: loyaltySchema,
  default: () => ({})
},

subscription: {
  type: subscriptionSchema,
  default: () => ({})
}

}, { timestamps: true });

userSchema.index({ location: "2dsphere" });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ "referral.code": 1 }, { sparse: true });
module.exports = mongoose.model("User", userSchema);