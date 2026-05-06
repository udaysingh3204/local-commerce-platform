const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const mongoSanitize = require("mongo-sanitize")
const hpp = require("hpp")
const compression = require("compression")

// Global: 200 req / 15 min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})

// Auth routes: 15 req / 15 min (prevents brute-force / credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
})

// Payment routes: 30 req / 15 min
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many payment requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
})

// Search routes: 120 req / 1 min (high-frequency but still guarded)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many search requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = {
  helmet,
  limiter,
  authLimiter,
  paymentLimiter,
  searchLimiter,
  mongoSanitize,
  hpp,
  compression,
}