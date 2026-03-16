const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const mongoSanitize = require("mongo-sanitize")
const hpp = require("hpp")
const compression = require("compression")

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
})

module.exports = {
  helmet,
  limiter,
  mongoSanitize,
  hpp,
  compression
}