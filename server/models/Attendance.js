const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  clockInTime: {
    type: Date,
    default: null
  },
  clockInStatus: {
    type: String,
    enum: ['absent', 'late', 'success'],
    default: 'absent'
  },
  lateCount: {
    type: Number,
    default: 0
  },
  monthLateCount: {
    type: Number,
    default: 0
  },
  monthSuccessCount: {
    type: Number,
    default: 0
  },
  monthAbsentCount: {
    type: Number,
    default: 0
  },
  todayStatus: {
    type: String,
    enum: ['success', 'late', 'absent', 'none'],
    default: 'none'
  },
  todayClockInTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// 联合唯一索引：每个员工每天只有一条考勤记录
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true })
attendanceSchema.index({ clockInStatus: 1 })

module.exports = mongoose.model('Attendance', attendanceSchema)
