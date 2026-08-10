import Redis from "ioredis"

export const redisClient = new Redis(Number(process.env.REDIS_PORT), process.env.REDIS_HOST! , {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true    
});

redisClient.on("connect", () => {
    console.log("Reddis connection success")
})

redisClient.on("error", () => {
    console.log("Error connecting the redis client")
})


