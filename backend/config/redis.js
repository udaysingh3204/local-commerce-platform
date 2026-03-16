const { createClient } = require("redis")

const redisClient = createClient({
url:process.env.REDIS_URL
})

redisClient.connect()

module.exports = redisClient