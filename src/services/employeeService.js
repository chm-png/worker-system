import { getWorkers, addWorker } from '@/api/user'

/**
 * 员工服务 - 处理员工相关业务逻辑
 */
const employeeService = {
  /**
   * 获取员工列表
   * @returns {Promise} 员工列表
   */
  async getWorkers() {
    return await getWorkers()
  },

  /**
   * 添加员工
   * @param {Object} workerData - 员工数据
   * @returns {Promise} 添加结果
   */
  async addWorker(workerData) {
    return await addWorker(workerData)
  },

  /**
   * 格式化日期
   * @param {string|Date} date - 日期
   * @returns {string} 格式化后的日期
   */
  formatDate(date) {
    if (!date) return '暂无'
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  /**
   * 初始化Socket监听
   * @param {Function} callback - 回调函数
   * @returns {Object} 监听对象，包含移除方法
   */
  initSocket(callback) {
    import('@/utils/socket').then(({ default: socketService }) => {
      // 连接Socket
      const token = sessionStorage.getItem('token')
      if (token) {
        socketService.connect(token)
      }

      // 添加头像更新监听
      socketService.on('avatar_updated', callback)

      return {
        removeListener() {
          socketService.off('avatar_updated')
        }
      }
    })
  }
}

export default employeeService