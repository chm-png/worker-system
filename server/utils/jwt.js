const jwt = require('jsonwebtoken')
const config = require('../config')

/**
 * 生成 Access Token
 * @param {Object} payload - token载荷，包含userId和role
 * @returns {string} JWT token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '15m' // 15分钟过期
  })
}

/**
 * 生成 Refresh Token
 * @param {Object} payload - token载荷，包含userId
 * @returns {string} JWT token
 */
function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, config.jwtSecret, {
    expiresIn: '7d' // 7天过期
  })
}

/**
 * 验证 Access Token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload，失败返回null
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch (error) {
    return null
  }
}

/**
 * 验证 Refresh Token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload，失败返回null
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (decoded.type !== 'refresh') {
      return null
    }
    return decoded
  } catch (error) {
    return null
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
}
