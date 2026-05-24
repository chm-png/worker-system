const { getCache, setCache, deleteCache, deleteCachePattern } = require('../utils/redis')

// 基础缓存中间件
function cacheMiddleware(options = {}) {
  const { 
    keyGenerator,
    ttl = 300, // 默认5分钟
    enabled = true
  } = options
  
  return async (req, res, next) => {
    // 如果Redis未启用，直接通过
    if (!enabled || process.env.REDIS_ENABLED !== 'true') {
      return next()
    }
    
    try {
      // 生成缓存键
      const cacheKey = keyGenerator ? keyGenerator(req) : `${req.method}:${req.originalUrl}`
      
      // 尝试从缓存获取
      const cachedData = await getCache(cacheKey)
      
      if (cachedData !== null) {
        console.log(`[Cache] 命中缓存: ${cacheKey}`)
        return res.json(cachedData)
      }
      
      // 缓存未命中，继续处理
      // 拦截 res.json，缓存结果
      const originalJson = res.json
      res.json = function(data) {
        // 缓存成功响应
        if (data && (data.code === 200 || data.code === 0)) {
          setCache(cacheKey, data, ttl).catch(err => {
            console.error(`[Cache] 设置缓存失败: ${cacheKey}`, err)
          })
        }
        return originalJson.call(this, data)
      }
      
      next()
      
    } catch (error) {
      console.error('[Cache] 缓存中间件错误:', error)
      next()
    }
  }
}

// 用户信息缓存中间件
function userCacheMiddleware(options = {}) {
  return cacheMiddleware({
    ...options,
    keyGenerator: (req) => `user:${req.user?.userId || req.params?.userId}`,
    ttl: 3600 // 1小时
  })
}

// 任务列表缓存中间件
function taskListCacheMiddleware(options = {}) {
  return cacheMiddleware({
    ...options,
    keyGenerator: (req) => {
      const { page = 1, size = 20, workerId, status } = req.query
      const userId = req.user?.userId || 'admin'
      return `tasks:list:${userId}:${page}:${size}:${workerId || 'all'}:${status || 'all'}`
    },
    ttl: 300 // 5分钟
  })
}

// 我的任务缓存中间件
function myTasksCacheMiddleware(options = {}) {
  return cacheMiddleware({
    ...options,
    keyGenerator: (req) => `tasks:my:${req.user?.userId}`,
    ttl: 180 // 3分钟
  })
}

// 清除特定模式的缓存
async function clearCachePattern(pattern) {
  try {
    return await deleteCachePattern(pattern)
  } catch (error) {
    console.error(`[Cache] 清除模式缓存失败: ${pattern}`, error)
    return false
  }
}

// 清除用户相关缓存
async function clearUserCache(userId) {
  try {
    const patterns = [
      `user:${userId}`,
      `tasks:my:${userId}`,
      `attendance:${userId}:*`
    ]
    for (const pattern of patterns) {
      await deleteCachePattern(pattern)
    }
    return true
  } catch (error) {
    console.error(`[Cache] 清除用户缓存失败: ${userId}`, error)
    return false
  }
}

// 清除任务相关缓存
async function clearTaskCache(userId = null) {
  try {
    const patterns = userId 
      ? [`tasks:my:${userId}`, `tasks:list:*`]
      : ['tasks:*']
      
    for (const pattern of patterns) {
      await deleteCachePattern(pattern)
    }
    return true
  } catch (error) {
    console.error('[Cache] 清除任务缓存失败:', error)
    return false
  }
}

module.exports = {
  cacheMiddleware,
  userCacheMiddleware,
  taskListCacheMiddleware,
  myTasksCacheMiddleware,
  clearCachePattern,
  clearUserCache,
  clearTaskCache
}
