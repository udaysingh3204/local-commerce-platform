const winston = require("winston")

const { combine, timestamp, json, colorize, simple, errors } = winston.format

const isProduction = process.env.NODE_ENV === "production"

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: {
    service: "localmart-backend",
    version: process.env.npm_package_version || "1.0.0",
  },
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? combine(errors({ stack: true }), timestamp(), json())
        : combine(colorize(), simple()),
    }),
  ],
})

// Log unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason })
})

module.exports = logger
