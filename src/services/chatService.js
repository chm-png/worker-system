import { getFriends, searchFriends, sendFriendRequest, getChatHistory, sendMessage, getPendingRequests, handleFriendRequest } from '@/api/chat'

/**
 * 聊天服务 - 处理聊天相关业务逻辑
 */
const chatService = {
  /**
   * 获取好友列表
   * @returns {Promise} 好友列表
   */
  async getFriends() {
    return await getFriends()
  },

  /**
   * 搜索好友
   * @param {string} keyword - 搜索关键词
   * @returns {Promise} 搜索结果
   */
  async searchFriends(keyword) {
    return await searchFriends(keyword)
  },

  /**
   * 发送好友请求
   * @param {Object} data - 请求数据
   * @returns {Promise} 请求结果
   */
  async sendFriendRequest(data) {
    return await sendFriendRequest(data)
  },

  /**
   * 获取聊天历史
   * @param {Object} params - 查询参数
   * @returns {Promise} 聊天历史
   */
  async getChatHistory(params) {
    return await getChatHistory(params)
  },

  /**
   * 发送消息
   * @param {Object} data - 消息数据
   * @returns {Promise} 发送结果
   */
  async sendMessage(data) {
    return await sendMessage(data)
  },

  /**
   * 获取待处理好友请求
   * @returns {Promise} 待处理请求列表
   */
  async getPendingRequests() {
    return await getPendingRequests()
  },

  /**
   * 处理好友请求
   * @param {Object} data - 处理数据
   * @returns {Promise} 处理结果
   */
  async handleFriendRequest(data) {
    return await handleFriendRequest(data)
  },



  /**
   * 初始化Socket监听
   * @param {Object} commit - Vuex commit方法
   */
  initSocket(commit) {
    // 动态导入socketService以避免循环依赖
    import('@/utils/socket').then(({ default: socketService }) => {
      // 监听新消息
      socketService.on('new_message', (message) => {
        commit('ADD_UNREAD_MESSAGE', message)
      })

      // 监听消息已读
      socketService.on('message_read', (data) => {
        commit('UPDATE_MESSAGE_READ_STATUS', data)
      })

      // 监听在线状态变化
      socketService.on('online_status', (data) => {
        commit('UPDATE_FRIEND_STATUS', data)
      })

      // 监听好友请求
      socketService.on('friend_request', (data) => {
        commit('ADD_PENDING_REQUEST', data)
      })

      // 监听好友请求处理结果
      socketService.on('request_processed', (data) => {
        commit('UPDATE_PENDING_REQUEST', data)
      })

      // 监听离线消息
      socketService.on('offline_messages', (messages) => {
        messages.forEach(message => {
          commit('ADD_UNREAD_MESSAGE', message)
        })
      })
    })
  },

  /**
   * 生成聊天ID
   * @param {string} userId - 用户ID
   * @param {string} friendId - 好友ID
   * @returns {string} 聊天ID
   */
  generateChatId(userId, friendId) {
    const sorted = [String(userId), String(friendId)].sort()
    return `${sorted[0]}_${sorted[1]}`
  },

  /**
   * 处理当前聊天的消息
   * @param {Array} localMessages - 本地消息列表
   * @param {Object} newUnread - 新未读消息
   * @param {string} currentChatId - 当前聊天ID
   * @param {Set} processedMsgIds - 已处理消息ID集合
   * @returns {boolean} 是否有新消息添加
   */
  handleCurrentChatMessages(localMessages, newUnread, currentChatId, processedMsgIds) {
    if (!currentChatId) return false

    const currentFriendId = String(currentChatId)
    const messages = newUnread[currentFriendId]
    if (!messages || messages.length === 0) return false

    let appended = false
    messages.forEach((msg) => {
      const msgId = msg._id || msg.tempId
      if (msgId && processedMsgIds.has(msgId)) return

      const exists = localMessages.some(
        (m) => (m._id === msgId || m.tempId === msgId)
      )

      if (!exists) {
        localMessages.push(msg)
        if (msgId) {
          processedMsgIds.add(msgId)
        }
        appended = true
      }
    })

    return appended
  }
}

export default chatService