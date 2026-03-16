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
}

}, { timestamps: true });

userSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("User", userSchema);