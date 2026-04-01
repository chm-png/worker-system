// 统一的头像获取函数
export function getAvatarUrl(userId, photo) {
  // 如果提供了photo且不是对象，直接使用
  if (photo && typeof photo === 'string') {
    return photo
  }
  // 如果提供了userId，生成头像URL
  if (userId) {
    return `/api/upload/avatar/${userId}?t=${Date.now()}`
  }
  // 默认头像
  return 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
}
