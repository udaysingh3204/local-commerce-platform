const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    tls: {}
  });

  redis.on("connect", () => {
    console.log("✅ Redis Connected");
  });

  redis.on("error", (err) => {
    console.log("⚠️ Redis disabled (connection failed)");
  });

} else {
  console.log("⚠️ Redis not configured → skipping");
}

module.exports = redis;