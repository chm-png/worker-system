import { createTask, getTaskList, getTaskDetail, getMyTasks, markTaskRead, finishTask } from '@/api/task'

/**
 * 任务服务 - 处理任务相关业务逻辑
 */
const taskService = {
  /**
   * 创建任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise} 创建结果
   */
  async createTask(taskData) {
    return await createTask(taskData)
  },

  /**
   * 获取任务列表（管理员）
   * @param {Object} params - 查询参数
   * @returns {Promise} 任务列表
   */
  async getTaskList(params) {
    return await getTaskList(params)
  },

  /**
   * 获取任务详情
   * @param {Object} params - 查询参数
   * @returns {Promise} 任务详情
   */
  async getTaskDetail(params) {
    return await getTaskDetail(params)
  },

  /**
   * 获取我的任务（员工）
   * @param {Object} params - 查询参数
   * @returns {Promise} 我的任务列表
   */
  async getMyTasks(params) {
    return await getMyTasks(params)
  },

  /**
   * 标记任务为已读
   * @param {Object} data - 标记数据
   * @returns {Promise} 标记结果
   */
  async markTaskRead(data) {
    return await markTaskRead(data)
  },

  /**
   * 完成任务
   * @param {Object} data - 完成数据
   * @returns {Promise} 完成结果
   */
  async finishTask(data) {
    return await finishTask(data)
  },



  /**
   * 处理任务统计
   * @param {Array} tasks - 任务列表
   * @returns {Object} 任务统计数据
   */
  processTaskStats(tasks) {
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length
    }
  },

  /**
   * 处理任务列表显示
   * @param {Array} tasks - 任务列表
   * @param {string} tab - 当前标签
   * @returns {Array} 过滤后的任务列表
   */
  processDisplayedTasks(tasks, tab) {
    return tasks.filter(task => task.status === tab)
  },

  /**
   * 处理通知列表
   * @param {Array} tasks - 任务列表
   * @param {Function} formatNotifyTime - 时间格式化函数
   * @returns {Array} 通知列表
   */
  processNotifications(tasks, formatNotifyTime) {
    const completed = tasks
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0))
      .slice(0, 20)

    return completed.map(t => ({
      _id: t._id,
      title: `任务「${t.taskTitle || '未命名'}」已完成`,
      meta: `执行人：${t.workerName || '—'} · ${formatNotifyTime(t.completedAt || t.updatedAt)}`
    }))
  }
}

export default taskService