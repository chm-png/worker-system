import request from './request'

// 获取考勤统计（管理员）
export function getAttendanceStats(params) {
  return request({
    url: '/attendance/stats',
    method: 'get',
    params
  })
}

// 获取考勤列表（管理员）
export function getAttendanceList(params) {
  return request({
    url: '/attendance/list',
    method: 'get',
    params
  })
}

// 修改考勤状态（管理员）
export function updateAttendance(data) {
  return request({
    url: '/attendance/update',
    method: 'post',
    data
  })
}

// 员工打卡
export function clockIn() {
  return request({
    url: '/attendance/clock',
    method: 'post'
  })
}

// 获取今日考勤
export function getTodayAttendance() {
  return request({
    url: '/attendance/today',
    method: 'get'
  })
}

// 导出考勤日报表
export function exportAttendance(date) {
  const token = sessionStorage.getItem('token')
  window.open(`/api/attendance/export?date=${date}&token=${token}`, '_blank')
}
