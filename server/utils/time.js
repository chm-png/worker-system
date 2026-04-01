/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date = new Date()) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:mm:ss 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date = new Date()) {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(date = new Date()) {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 格式化时间为友好的显示格式（刚刚、几分钟前等）
 * @param {Date|string} date - 日期
 * @returns {string} 友好时间字符串
 */
function formatTimeAgo(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前'
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前'
  } else if (diff < 2 * day) {
    return '昨天'
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前'
  } else {
    return formatDate(d)
  }
}

/**
 * 获取今天剩余的秒数
 * @returns {number} 今天剩余秒数
 */
function getTodayRemainingSeconds() {
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
  return Math.floor((endOfDay - now) / 1000)
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatTimeAgo,
  getTodayRemainingSeconds
}
