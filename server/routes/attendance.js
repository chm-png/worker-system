const express = require('express')
const router = express.Router()
const {
  getAttendanceStats,
  getAttendanceList,
  getAttendanceExport,
  updateAttendance,
  clockIn,
  getTodayAttendance
} = require('../controllers/attendanceController')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// 获取考勤统计（管理员）
router.get('/stats', authMiddleware, adminMiddleware, getAttendanceStats)

// 获取考勤列表（管理员）
router.get('/list', authMiddleware, adminMiddleware, getAttendanceList)

// 导出考勤日报表（管理员）
router.get('/export', authMiddleware, adminMiddleware, getAttendanceExport)

// 修改考勤状态（管理员）
router.post('/update', authMiddleware, adminMiddleware, updateAttendance)

// 员工打卡
router.post('/clock', authMiddleware, clockIn)

// 获取今日考勤（员工）
router.get('/today', authMiddleware, getTodayAttendance)

module.exports = router
