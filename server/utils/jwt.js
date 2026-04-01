const jwt = require('jsonwebtoken')
const config = require('../config')

/**
 * 生成 JWT token
 * @param {Object} payload - token载荷，包含userId和role
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  })
}

/**
 * 验证 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload，失败返回null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch (error) {
    return null
  }
}

module.exports = {
  generateToken,
  verifyToken
}
