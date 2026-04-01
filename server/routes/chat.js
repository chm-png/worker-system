const express = require('express')
const router = express.Router()
const { 
  searchFriends,
  getFriends, 
  getPendingRequests,
  sendFriendRequest, 
  handleFriendRequest,
  getChatHistory,
  sendMessage 
} = require('../controllers/chatController')
const { authMiddleware, workerMiddleware } = require('../middleware/auth')

// 搜索好友
router.get('/search', authMiddleware, workerMiddleware, searchFriends)

// 获取好友列表
router.get('/list', authMiddleware, workerMiddleware, getFriends)

// 获取待处理的好友请求
router.get('/pending', authMiddleware, workerMiddleware, getPendingRequests)

// 发送好友请求
router.post('/add', authMiddleware, workerMiddleware, sendFriendRequest)

// 处理好友请求
router.post('/handle', authMiddleware, workerMiddleware, handleFriendRequest)

// 获取聊天历史
router.get('/history', authMiddleware, getChatHistory)

// 发送消息
router.post('/send', authMiddleware, sendMessage)

module.exports = router
