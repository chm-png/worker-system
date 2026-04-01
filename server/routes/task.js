const express = require('express')
const router = express.Router()
const { 
  createTask, 
  getTaskList, 
  getTaskDetail,
  getMyTasks, 
  markTaskRead,
  finishTask,
  getHistoricalTasks 
} = require('../controllers/taskController')
const { authMiddleware, adminMiddleware, workerMiddleware } = require('../middleware/auth')

// 创建任务（管理员）
router.post('/create', authMiddleware, adminMiddleware, createTask)

// 获取任务列表（管理员）
router.get('/list', authMiddleware, adminMiddleware, getTaskList)

// 获取任务详情
router.get('/detail', authMiddleware, getTaskDetail)

// 获取我的任务（员工）
router.get('/my', authMiddleware, workerMiddleware, getMyTasks)

// 标记任务为已读（员工）
router.post('/read', authMiddleware, workerMiddleware, markTaskRead)

// 完成任务（员工）
router.post('/finish', authMiddleware, workerMiddleware, finishTask)

// 获取历史任务（员工）
router.get('/history', authMiddleware, workerMiddleware, getHistoricalTasks)

module.exports = router
