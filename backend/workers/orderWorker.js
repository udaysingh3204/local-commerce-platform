const { Worker } = require("bullmq");
const redis = require("../config/redis");

const worker = new Worker(
  "orders",
  async (job) => {
    console.log("🔥 Processing order:", job.data.orderId);

    // future logic (notifications, analytics, etc.)
  },
  {
    connection: redis
  }
);