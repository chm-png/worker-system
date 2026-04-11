const express = require('express')
const router = express.Router()
const { login, getUserInfo, register, getWorkers, searchWorkers, addWorker, changePassword, refreshToken } = require('../controllers/userController')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// 用户登录（无需鉴权）
router.post('/login', login)

// 刷新token（无需鉴权）
router.post('/refresh', refreshToken)

// 注册用户（仅用于初始化）
router.post('/register', register)

// 获取当前用户信息
router.get('/user/info', authMiddleware, getUserInfo)

// 获取所有员工列表
router.get('/workers', authMiddleware, getWorkers)

// 搜索员工
router.get('/search', authMiddleware, searchWorkers)

// 添加员工（管理员）
router.post('/workers/add', authMiddleware, adminMiddleware, addWorker)

// 修改密码（员工）
router.post('/password/change', authMiddleware, changePassword)

module.exports = router
