const mongoose = require("mongoose");

const growthLeadSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 180,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 30,
  },
  city: {
    type: String,
    trim: true,
    default: "Noida",
    maxlength: 80,
  },
  useCase: {
    type: String,
    trim: true,
    maxlength: 80,
    default: "waitlist",
  },
  source: {
    type: String,
    trim: true,
    maxlength: 80,
    default: "homepage",
  },
  referralCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 40,
  },
  referredBy: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 40,
  },
  status: {
    type: String,
    enum: ["new", "contacted", "qualified", "converted", "archived"],
    default: "new",
  },
  ownerNote: {
    type: String,
    trim: true,
    maxlength: 300,
    default: "",
  },
  interests: {
    type: [String],
    default: [],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

growthLeadSchema.index({ email: 1, source: 1 }, { unique: true });

module.exports = mongoose.model("GrowthLead", growthLeadSchema);