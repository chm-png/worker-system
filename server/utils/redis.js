const Redis = require('ioredis')

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
}

let redisClient = null

// 初始化 Redis 连接
function initRedis() {
  if (redisClient) {
    return redisClient
  }

  redisClient = new Redis(redisConfig)
  
  redisClient.on('connect', () => {
    console.log('[Redis] 连接成功')
  })
  
  redisClient.on('ready', () => {
    console.log('[Redis] 服务已就绪')
  })
  
  redisClient.on('error', (err) => {
    console.error('[Redis] 连接错误:', err)
  })
  
  redisClient.on('close', () => {
    console.warn('[Redis] 连接已关闭')
  })
  
  return redisClient
}

// 获取 Redis 实例
function getRedis() {
  if (!redisClient) {
    return initRedis()
  }
  return redisClient
}

// 设置缓存
async function setCache(key, value, ttl = 3600) {
  try {
    const client = getRedis()
    const serialized = JSON.stringify(value)
    if (ttl > 0) {
      await client.setex(key, ttl, serialized)
    } else {
      await client.set(key, serialized)
    }
    return true
  } catch (error) {
    console.error('[Redis] 设置缓存失败:', error)
    return false
  }
}

// 获取缓存
async function getCache(key) {
  try {
    const client = getRedis()
    const data = await client.get(key)
    if (!data) {
      return null
    }
    return JSON.parse(data)
  } catch (error) {
    console.error('[Redis] 获取缓存失败:', error)
    return null
  }
}

// 删除缓存
async function deleteCache(key) {
  try {
    const client = getRedis()
    const result = await client.del(key)
    return result > 0
  } catch (error) {
    console.error('[Redis] 删除缓存失败:', error)
    return false
  }
}

// 批量删除缓存（按模式）
async function deleteCachePattern(pattern) {
  try {
    const client = getRedis()
    const keys = await client.keys(pattern)
    if (keys.length === 0) {
      return true
    }
    await client.del(keys)
    return true
  } catch (error) {
    console.error('[Redis] 批量删除缓存失败:', error)
    return false
  }
}

// 设置缓存（带互斥锁，防止缓存击穿）
async function setCacheWithLock(key, value, ttl = 3600, lockTimeout = 5000) {
  try {
    const client = getRedis()
    const lockKey = `lock:${key}`
    
    // 尝试获取锁
    const lockResult = await client.set(lockKey, '1', 'PX', lockTimeout, 'NX')
    
    if (!lockResult) {
      console.warn('[Redis] 获取锁失败，其他进程正在更新')
      return false
    }
    
    try {
      // 设置实际缓存
      await setCache(key, value, ttl)
      return true
    } finally {
      // 释放锁
      await client.del(lockKey)
    }
  } catch (error) {
    console.error('[Redis] 设置带锁缓存失败:', error)
    return false
  }
}

// 检查键是否存在
async function exists(key) {
  try {
    const client = getRedis()
    const result = await client.exists(key)
    return result === 1
  } catch (error) {
    console.error('[Redis] 检查键存在失败:', error)
    return false
  }
}

// 设置过期时间
async function expire(key, ttl) {
  try {
    const client = getRedis()
    const result = await client.expire(key, ttl)
    return result === 1
  } catch (error) {
    console.error('[Redis] 设置过期时间失败:', error)
    return false
  }
}

// 获取剩余生存时间
async function ttl(key) {
  try {
    const client = getRedis()
    return await client.ttl(key)
  } catch (error) {
    console.error('[Redis] 获取TTL失败:', error)
    return -1
  }
}

// 批量设置缓存
async function msetCache(pairs, ttl = 3600) {
  try {
    const client = getRedis()
    const pipeline = client.pipeline()
    
    for (const [key, value] of pairs) {
      const serialized = JSON.stringify(value)
      if (ttl > 0) {
        pipeline.setex(key, ttl, serialized)
      } else {
        pipeline.set(key, serialized)
      }
    }
    
    await pipeline.exec()
    return true
  } catch (error) {
    console.error('[Redis] 批量设置缓存失败:', error)
    return false
  }
}

// 批量获取缓存
async function mgetCache(keys) {
  try {
    const client = getRedis()
    const values = await client.mget(keys)
    
    return keys.map((key, index) => {
      const value = values[index]
      if (value) {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      }
      return null
    })
  } catch (error) {
    console.error('[Redis] 批量获取缓存失败:', error)
    return keys.map(() => null)
  }
}

// 关闭 Redis 连接
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

module.exports = {
  initRedis,
  getRedis,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  setCacheWithLock,
  exists,
  expire,
  ttl,
  msetCache,
  mgetCache,
  closeRedis
}
