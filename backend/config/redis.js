const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: () => null, // ❌ stop retry loop
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined
    });

    redis.on("connect", () => {
      console.log("✅ Redis Connected");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis Error:", err.message);
    });

  } catch (err) {
    console.error("❌ Redis init failed:", err.message);
    redis = null;
  }
} else {
  console.log("⚠️ Redis disabled (no REDIS_URL)");
}

module.exports = redis;