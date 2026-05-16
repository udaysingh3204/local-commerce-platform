const logger = require("../config/logger");

module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });
  res.status(status).json({
    success: false,
    message: status < 500 ? err.message : "Internal server error"
  });
};
