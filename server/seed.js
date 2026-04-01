/**
 * 数据库种子脚本 - 插入模拟工人数据
 * 运行方式: node seed.js
 *
 * 每人 1 条月度记录：
 * - monthSuccessCount + monthLateCount + monthAbsentCount = 24（随机）
 * - todayStatus 单独随机（成功 70% / 迟到 20% / 缺勤 10%）
 * - 出勤率 = (success + late) / 24
 */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Attendance = require('./models/Attendance')
const config = require('./config')

const mongoUrl = config.mongoUrl

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStatusText(s) {
  return s === 'success' ? '正常打卡' : s === 'late' ? '迟到' : s === 'absent' ? '缺勤' : '未打卡'
}

async function seed() {
  try {
    await mongoose.connect(mongoUrl)
    console.log('MongoDB connected')

    // ============ 工人数据 ============
    const workers = [
      { username: 'W001', name: '王强',   phone: '13800001001', position: '高级工程师',   department: '技术部' },
      { username: 'W002', name: '陈坤',   phone: '13800001002', position: '测试工程师',   department: '测试部' },
      { username: 'W003', name: '李明',   phone: '13800001003', position: '产品经理',     department: '产品部' },
      { username: 'W004', name: '赵丽',   phone: '13800001004', position: 'UI设计师',     department: '设计部' },
      { username: 'W005', name: '刘洋',   phone: '13800001005', position: '前端开发',     department: '技术部' },
      { username: 'W006', name: '周杰',   phone: '13800001006', position: '后端开发',     department: '技术部' },
      { username: 'W007', name: '吴霞',   phone: '13800001007', position: '运维工程师',   department: '运维部' },
      { username: 'W008', name: '郑浩',   phone: '13800001008', position: '数据分析师',   department: '数据部' },
      { username: 'W009', name: '孙静',   phone: '13800001009', position: '产品设计师',   department: '产品部' },
      { username: 'W010', name: '杨帆',   phone: '13800001010', position: 'Java开发',    department: '技术部' },
      { username: 'W011', name: '黄磊',   phone: '13800001011', position: 'Python开发',   department: '技术部' },
      { username: 'W012', name: '林峰',   phone: '13800001012', position: '安全工程师',   department: '安全部' },
      { username: 'W013', name: '徐涛',   phone: '13800001013', position: '架构师',       department: '技术部' },
      { username: 'W014', name: '马超',   phone: '13800001014', position: '算法工程师',   department: '研发部' },
      { username: 'W015', name: '朱琳',   phone: '13800001015', position: '前端工程师',   department: '技术部' },
      { username: 'W016', name: '胡军',   phone: '13800001016', position: '项目经理',     department: '项目部' },
      { username: 'W017', name: '郭靖',   phone: '13800001017', position: '测试主管',     department: '测试部' },
      { username: 'W018', name: '李娜',   phone: '13800001018', position: '运营专员',     department: '运营部' },
      { username: 'W019', name: '张伟',   phone: '13800001019', position: 'DevOps工程师', department: '运维部' },
      { username: 'W020', name: '韩雪',   phone: '13800001020', position: '产品助理',     department: '产品部' },
      { username: 'W021', name: '曹文',   phone: '13800001021', position: 'Go开发',       department: '技术部' },
      { username: 'W022', name: '邓超',   phone: '13800001022', position: 'DBA',         department: '运维部' },
      { username: 'W023', name: '彭飞',   phone: '13800001023', position: '移动端开发',   department: '技术部' },
      { username: 'W024', name: '曾敏',   phone: '13800001024', position: '商务专员',     department: '商务部' },
      { username: 'W025', name: '谢军',   phone: '13800001025', position: '系统管理员',  department: '运维部' },
      { username: 'W026', name: '梁文',   phone: '13800001026', position: '测试工程师',   department: '测试部' },
      { username: 'W027', name: '董洁',   phone: '13800001027', position: 'UI工程师',     department: '设计部' },
      { username: 'W028', name: '萧然',   phone: '13800001028', position: '全栈工程师',   department: '技术部' },
      { username: 'W029', name: '白露',   phone: '13800001029', position: 'HR专员',      department: '人力部' },
      { username: 'W030', name: '蒋晨',   phone: '13800001030', position: '前端组长',      department: '技术部' },
    ]

    // 清除旧工人
    await User.deleteMany({ username: { $in: workers.map(w => w.username) } })
    console.log('已清除旧工人数据')

    const password = bcrypt.hashSync('123456', 10)
    const insertedUsers = []

    for (const w of workers) {
      const user = await User.create({
        ...w,
        password,
        role: 'worker',
        status: true,
        onlineStatus: false
      })
      insertedUsers.push(user)
      console.log(`创建工人: ${w.name} (${w.username}), 密码: 123456`)
    }

    // ============ 考勤数据 ============
    const userIds = insertedUsers.map(u => u._id)
    await Attendance.deleteMany({ workerId: { $in: userIds } })
    console.log('已清除旧考勤数据')

    const currentMonth = getCurrentMonth()
    const today = getToday()
    const TOTAL_DAYS = 24

    for (const user of insertedUsers) {
      // 随机分配24天打卡状态
      const absent = Math.floor(Math.random() * 4)          // 0~3
      const late   = Math.floor(Math.random() * (8 - absent)) // 0~(7-absent)
      const success = TOTAL_DAYS - absent - late

      // 今日打卡状态（独立随机）
      const rand = Math.random()
      let todayStatus, todayClockInTime
      if (rand < 0.7) {
        todayStatus = 'success'
        const h = String(7 + Math.floor(Math.random() * 2)).padStart(2, '0')
        const min = String(Math.floor(Math.random() * 60)).padStart(2, '0')
        todayClockInTime = new Date(`${today}T${h}:${min}:00.000Z`)
      } else if (rand < 0.9) {
        todayStatus = 'late'
        const h = String(8 + Math.floor(Math.random() * 3)).padStart(2, '0')
        const min = String(Math.floor(Math.random() * 60)).padStart(2, '0')
        todayClockInTime = new Date(`${today}T${h}:${min}:00.000Z`)
      } else {
        todayStatus = 'absent'
        todayClockInTime = null
      }

      await Attendance.create({
        workerId: user._id,
        date: currentMonth,
        clockInTime: null,
        clockInStatus: 'success',
        lateCount: 0,
        monthLateCount: late,
        monthSuccessCount: success,
        monthAbsentCount: absent,
        todayStatus,
        todayClockInTime
      })

      const rate = ((success + late) / TOTAL_DAYS * 100).toFixed(1)
      console.log(
        `  ${user.name} - 本月: 成功${success} 迟到${late} 缺勤${absent} | ` +
        `出勤率${rate}% | 今日: ${todayStatusText(todayStatus)}`
      )
    }

    console.log('\n========== 种子数据插入完成 ==========')
    console.log(`共计 ${insertedUsers.length} 名工人，每人 1 条月度记录`)
    console.log(`本月统计: 成功+迟到+缺勤=24天（随机）`)
    console.log(`今日打卡: 成功/迟到/缺勤（独立随机）`)
    console.log('登录账号: W001 ~ W030，密码: 123456')

    process.exit(0)
  } catch (error) {
    console.error('种子脚本错误:', error)
    process.exit(1)
  }
}

seed()
