const { verifyAccessToken } = require('../utils/jwt')
const User = require('../models/User')

/**
 * JWT 认证中间件 - 验证 API 请求
 */
async function authMiddleware(req, res, next) {
  try {
    // 支持 Header 和 Query 两种方式传递 token（Query 用于文件导出）
    let token = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else if (req.query.token) {
      token = req.query.token
    }

    if (!token) {
      return res.status(401).json({
        code: 401,
        msg: '未授权，请先登录',
        data: null
      })
    }

    const decoded = verifyAccessToken(token)
    
    if (!decoded) {
      return res.status(401).json({
        code: 401,
        msg: 'token无效或已过期',
        data: null
      })
    }
    
    // 查询用户信息
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(401).json({
        code: 401,
        msg: '用户不存在',
        data: null
      })
    }
    
    // 将用户信息挂载到请求对象
    // 将用户信息挂载到请求对象，供后续中间件和路由处理器使用
    req.user = user          // 完整的用户对象（不含密码）
    req.userId = decoded.userId  // 用户ID，方便快速访问
    req.userRole = decoded.role  // 用户角色，用于权限校验
    
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 管理员权限中间件
 */
function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      code: 403,
      msg: '无权限访问，需要管理员权限',
      data: null
    })
  }
  next()
}

/**
 * 员工权限中间件
 */
function workerMiddleware(req, res, next) {
  if (req.userRole !== 'worker') {
    return res.status(403).json({
      code: 403,
      msg: '无权限访问，需要员工权限',
      data: null
    })
  }
  next()
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  workerMiddleware
}
