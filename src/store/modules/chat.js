import Vue from 'vue'
import { chatService } from '@/services'

const state = {
  friends: [],
  currentChat: null,
  chatList: [],
  currentMessages: [],
  pendingRequests: [],
  unreadMessages: {},  // 存储每个好友的未读消息数 { friendId: messages[] }
  socketInitialized: false,
  // 用于在 temp message → real message 替换时触发 Chat.vue 的 watch
  ackMessage: null
}

const mutations = {
  SET_FRIENDS(state, friends) {
    state.friends = friends
  },
  ADD_FRIEND(state, friend) {
    const exists = state.friends.some(f => f.friendId === friend.friendId)
    if (!exists) {
      state.friends.push(friend)
    }
  },
  UPDATE_FRIEND_STATUS(state, data) {
    const friendId = data.userId
    const friend = state.friends.find(f => f.friendId === friendId)
    if (friend) {
      friend.onlineStatus = data.onlineStatus
    }
  },
  SET_CURRENT_CHAT(state, chat) {
    state.currentChat = chat
  },
  SET_CHAT_LIST(state, list) {
    state.chatList = list
  },
  SET_CURRENT_MESSAGES(state, messages) {
    state.currentMessages = messages
  },
  ADD_MESSAGE(state, message) {
    state.currentMessages.push(message)
  },
  UPDATE_MESSAGE_READ(state, { chatId, senderId }) {
    state.currentMessages.forEach(msg => {
      if (msg.chatId === chatId && msg.senderId === senderId) {
        msg.isRead = true
      }
    })
  },
  SET_PENDING_REQUESTS(state, requests) {
    state.pendingRequests = requests
  },
  REMOVE_PENDING_REQUEST(state, requestId) {
    state.pendingRequests = state.pendingRequests.filter(r => r.requestId !== requestId)
  },
  // 添加未读消息（必须用 Vue.set，否则新 key 不触发响应式，聊天页 watcher 收不到）
  ADD_UNREAD_MESSAGE(state, { senderId, message }) {
    const key = String(senderId)
    if (!state.unreadMessages[key]) {
      Vue.set(state.unreadMessages, key, [])
    }
    const list = state.unreadMessages[key]
    // 同一消息被重复监听（socketService.on 多次注册）时只保留一条
    if (message._id != null && message._id !== '') {
      const mid = String(message._id)
      if (list.some((m) => String(m._id) === mid)) return
    }
    list.push(message)
  },
  // 清除某个好友的未读消息
  CLEAR_UNREAD(state, friendId) {
    const key = String(friendId)
    Vue.delete(state.unreadMessages, key)
  },
  // 设置离线消息（初始化未读）
  SET_UNREAD_MESSAGES(state, messages) {
    messages.forEach(msg => {
      const senderId = String(msg.senderId)
      if (!state.unreadMessages[senderId]) {
        Vue.set(state.unreadMessages, senderId, [])
      }
      state.unreadMessages[senderId].push(msg)
    })
  },
  // 标记 socket 已初始化
  SET_SOCKET_INITIALIZED(state, value) {
    state.socketInitialized = value
  },

  // 用服务端确认的消息替换本地临时消息
  SET_ACK_MESSAGE(state, ackMsg) {
    Vue.set(state, 'ackMessage', ackMsg)
  }
}

const getters = {
  // 计算总未读消息数
  totalUnreadCount: (state) => {
    let total = 0
    Object.values(state.unreadMessages).forEach(msgs => {
      total += msgs.length
    })
    return total
  },
  // 获取某个好友的未读消息数
  getUnreadCount: (state) => (friendId) => {
    return state.unreadMessages[String(friendId)]?.length || 0
  }
}

const actions = {
  // 获取好友列表
  async getFriends({ commit }) {
    const res = await chatService.getFriends()
    commit('SET_FRIENDS', res.data)
    return res
  },

  // 搜索好友
  async searchFriends(_, keyword) {
    const res = await chatService.searchFriends(keyword)
    return res
  },

  // 获取待处理的好友请求
  async getPendingRequests({ commit }) {
    const res = await chatService.getPendingRequests()
    commit('SET_PENDING_REQUESTS', res.data)
    return res
  },

  // 发送好友请求
  async sendFriendRequest(_, friendId) {
    const res = await chatService.sendFriendRequest(friendId)
    return res
  },

  // 处理好友请求
  async handleFriendRequest({ commit, dispatch }, data) {
    const res = await chatService.handleFriendRequest(data)
    if (res.code === 200) {
      commit('REMOVE_PENDING_REQUEST', data.requestId)
      if (data.action === 'agree') {
        await dispatch('getFriends')
      }
    }
    return res
  },

  // 获取聊天历史
  async getChatHistory({ commit }, chatId) {
    const res = await chatService.getChatHistory({ chatId })
    commit('SET_CURRENT_MESSAGES', res.data)
    return res
  },

  // 发送消息
  async sendMessage({ commit }, data) {
    const res = await chatService.sendMessage(data)
    // 不再自动添加到 currentMessages，由组件自行管理
    return res
  },

  // 初始化 Socket 监听
  initSocket({ commit, dispatch }) {
    chatService.initSocket(commit)

    // 监听消息确认
    import('@/utils/socket').then(({ default: socketService }) => {
      socketService.on('chat_message_ack', (data) => {
        dispatch('setAckMessage', data)
      })

      // 监听好友请求
      socketService.on('friend_request', () => {
        dispatch('getPendingRequests')
      })

      // 监听好友同意
      socketService.on('friend_agreed', () => {
        dispatch('getFriends')
      })
    })

    commit('SET_SOCKET_INITIALIZED', true)
  },

  // 清除未读消息
  clearUnread({ commit }, friendId) {
    commit('CLEAR_UNREAD', friendId)
  },

  // 记录确认消息（Chat.vue watch 读取并替换本地临时消息）
  setAckMessage({ commit }, msg) {
    commit('SET_ACK_MESSAGE', msg)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  getters,
  actions
}
