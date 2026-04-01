const Attendance = require('../models/Attendance')
const User = require('../models/User')
const config = require('../config')
const { formatDate, formatTime } = require('../utils/time')

/**
 * 获取考勤统计数据（管理员用）
 * - 出勤率 = 本月(成功+迟到) / (成功+迟到+缺勤)
 * - 其他三项 = 本日各状态人数
 */
async function getAttendanceStats(req, res) {
  try {
    const currentMonth = formatDate().substring(0, 7) // YYYY-MM

    const totalWorkers = await User.countDocuments({ role: 'worker', status: true })
    const monthAttendance = await Attendance.find({ date: currentMonth }).lean()

    // 本月汇总
    let monthSuccess = 0, monthLate = 0, monthAbsent = 0
    for (const a of monthAttendance) {
      monthSuccess += a.monthSuccessCount || 0
      monthLate   += a.monthLateCount    || 0
      monthAbsent += a.monthAbsentCount  || 0
    }

    // 本日各状态人数
    let todaySuccess = 0, todayLate = 0, todayAbsent = 0
    for (const a of monthAttendance) {
      const st = a.todayStatus || 'none'
      if (st === 'success') todaySuccess++
      else if (st === 'late') todayLate++
      else todayAbsent++
    }
    // 没有打卡记录的员工视为本日缺勤
    const noRecord = totalWorkers - monthAttendance.length
    todayAbsent += noRecord

    // 本月出勤率 = (成功+迟到) / (成功+迟到+缺勤)
    const totalPresent = monthSuccess + monthLate
    const monthAbsentCount = monthAbsent
    const totalMonthDays = monthSuccess + monthLate + monthAbsent
    const attendanceRate = totalMonthDays > 0
      ? (totalPresent / totalMonthDays * 100).toFixed(1)
      : 0

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        attendanceRate: parseFloat(attendanceRate),
        monthAbsentCount,
        successCount: todaySuccess,
        lateCount: todayLate,
        absentCount: todayAbsent,
        totalWorkers,
        date: currentMonth
      }
    })
  } catch (error) {
    console.error('Get attendance stats error:', error)
    res.status(500).json({ code: 500, msg: '服务器内部错误', data: null })
  }
}

/**
 * 获取考勤列表（管理员用）- 每员工一行
 */
async function getAttendanceList(req, res) {
  try {
    const { page = 1, size = 20, name, position } = req.query
    const currentMonth = formatDate().substring(0, 7)

    let workerQuery = { role: 'worker', status: true }
    if (name) {
      workerQuery.$or = [
        { name: { $regex: name, $options: 'i' } },
        { username: { $regex: name, $options: 'i' } }
      ]
    }
    if (position) {
      workerQuery.position = position
    }

    const total = await User.countDocuments(workerQuery)
    const workers = await User.find(workerQuery)
      .skip((parseInt(page) - 1) * parseInt(size))
      .limit(parseInt(size))
      .lean()

    const userIds = workers.map(w => w._id)
    const attendanceRecords = await Attendance.find({
      workerId: { $in: userIds },
      date: currentMonth
    }).lean()

    const attendanceMap = {}
    attendanceRecords.forEach(a => attendanceMap[String(a.workerId)] = a)

    const list = workers.map(worker => {
      const record = attendanceMap[String(worker._id)]
      return {
        workerId: worker._id,
        name: worker.name,
        username: worker.username,
        photo: worker.photo ? `/api/upload/avatar/${worker._id}?t=${Date.now()}` : '',
        position: worker.position,
        department: worker.department,
        todayStatus: record ? (record.todayStatus || 'none') : 'none',
        todayClockInTime: record && record.todayClockInTime ? formatTime(record.todayClockInTime) : null,
        monthLateCount: record ? record.monthLateCount : 0,
        monthAbsentCount: record ? record.monthAbsentCount : 0
      }
    })

    res.json({ code: 200, msg: '获取成功', data: { total, list } })
  } catch (error) {
    console.error('Get attendance list error:', error)
    res.status(500).json({ code: 500, msg: '服务器内部错误', data: null })
  }
}

/**
 * 修改考勤状态（管理员用）- 只改今日状态，upsert 自动创建记录
 */
async function updateAttendance(req, res) {
  try {
    const { workerId, clockInStatus } = req.body
    const currentMonth = formatDate().substring(0, 7)

    // Upsert：有记录则更新，无记录则创建（只改今日状态，不动月度累计）
    const record = await Attendance.findOneAndUpdate(
      { workerId, date: currentMonth },
      {
        $set: {
          todayStatus: clockInStatus,
          todayClockInTime: clockInStatus !== 'absent' ? new Date() : null
        }
      },
      { new: true, upsert: true }
    )

    const io = req.app.get('io')
    if (io) {
      io.to(workerId.toString()).emit('attendance_updated', {
        workerId,
        todayStatus: record.todayStatus
      })
    }

    res.json({ code: 200, msg: '修改成功', data: record })
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({ code: 500, msg: '服务器内部错误', data: null })
  }
}

/**
 * 员工打卡
 */
async function clockIn(req, res) {
  try {
    const userId = req.userId
    const today = formatDate()
    const now = new Date()
    
    // 获取当前时间（分钟）
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    // 判断打卡状态
    let clockInStatus
    if (currentMinutes >= config.clockInRules.normalStart && 
        currentMinutes <= config.clockInRules.normalEnd) {
      clockInStatus = 'success'
    } else if (currentMinutes > config.clockInRules.normalEnd && 
               currentMinutes <= config.clockInRules.lateEnd) {
      clockInStatus = 'late'
    } else {
      clockInStatus = 'late'
    }
    
    // 检查是否已有打卡记录
    let attendance = await Attendance.findOne({ workerId: userId, date: today })
    
    if (attendance) {
      return res.status(400).json({
        code: 400,
        msg: '今日已打卡，请勿重复打卡',
        data: attendance
      })
    }
    
    // 获取用户的迟到次数
    const user = await User.findById(userId)
    const lateCount = user.lateCount || 0
    const monthLateCount = user.monthLateCount || 0
    
    // 创建打卡记录
    attendance = new Attendance({
      workerId: userId,
      date: today,
      clockInTime: now,
      clockInStatus,
      lateCount: clockInStatus === 'late' ? lateCount + 1 : lateCount,
      monthLateCount: clockInStatus === 'late' ? monthLateCount + 1 : monthLateCount
    })
    
    await attendance.save()
    
    res.json({
      code: 200,
      msg: '打卡成功',
      data: {
        ...attendance.toObject(),
        clockInTime: formatTime(attendance.clockInTime)
      }
    })
  } catch (error) {
    console.error('Clock in error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取今日考勤（员工用）
 */
async function getTodayAttendance(req, res) {
  try {
    const userId = req.userId
    const today = formatDate()
    
    const attendance = await Attendance.findOne({ workerId: userId, date: today })
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: attendance ? {
        ...attendance.toObject(),
        clockInTime: attendance.clockInTime ? formatTime(attendance.clockInTime) : null
      } : null
    })
  } catch (error) {
    console.error('Get today attendance error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 导出考勤日报表
 */
async function getAttendanceExport(req, res) {
  try {
    const { date } = req.query
    const targetDate = date || formatDate()

    const workers = await User.find({ role: 'worker', status: true }).lean()
    const attendanceRecords = await Attendance.find({ date: targetDate }).lean()
    const attendanceMap = {}
    attendanceRecords.forEach(a => {
      attendanceMap[String(a.workerId)] = a
    })

    const rows = workers.map(worker => {
      const record = attendanceMap[String(worker._id)]
      const clockInStatusVal = record ? record.clockInStatus : 'absent'
      const statusText = clockInStatusVal === 'success' ? '正常打卡' : clockInStatusVal === 'late' ? '迟到' : '缺勤'
      return [
        worker.name,
        worker.username,
        worker.position || '',
        worker.department || '',
        statusText,
        record && record.clockInTime ? formatTime(record.clockInTime) : '--:--:--',
        record ? record.monthLateCount : 0
      ]
    })

    // 生成 CSV 内容
    const header = ['姓名', '工号', '岗位', '部门', '打卡状态', '签到时间', '本月迟到次数']
    const csvRows = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvRows.join('\n')

    // 添加 BOM 以支持 Excel 打开 UTF-8 CSV
    const bom = '\uFEFF'
    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=考勤日报表_${targetDate}.csv`)
    res.end(bom + csvContent)
  } catch (error) {
    console.error('Export attendance error:', error)
    res.status(500).json({ code: 500, msg: '导出失败', data: null })
  }
}

module.exports = {
  getAttendanceStats,
  getAttendanceList,
  getAttendanceExport,
  updateAttendance,
  clockIn,
  getTodayAttendance
}
