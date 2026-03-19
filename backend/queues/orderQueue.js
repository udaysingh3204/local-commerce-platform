const { Queue } = require("bullmq");
const redis = require("../config/redis");

const orderQueue = new Queue("orders", {
  connection: redis
});

module.exports = orderQueue;