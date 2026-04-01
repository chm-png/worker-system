import { io } from 'socket.io-client'
import { Message } from 'element-ui'

class SocketService {
  constructor() {
    this.socket = null
    this.callbacks = {}
    this.initCallbacks = [] // 连接成功后的初始化回调
    this.currentToken = null
  }

  // 连接 Socket（token 相同时跳过，避免重连时误清除管理端的 socket 实例监听器）
  connect(token) {
    // token 没变且已有连接，什么都不做
    if (this.socket && this.socket.connected && this.currentToken === token) {
      return
    }

    // token 变了或未连接，先断开旧的
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.callbacks = {}
    }

    this.currentToken = token

    this.socket = io('/', {
      query: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    })

    this.socket.on('connect', () => {
      console.log('Socket 已连接')
      Message({
        message: '实时连接已建立',
        type: 'success',
        duration: 2000
      })
      // 调用连接后的初始化回调
      this.initCallbacks.forEach(cb => cb(this.socket))
    })

    this.socket.on('disconnect', () => {
      console.log('Socket 已断开')
      Message({
        message: '实时连接已断开',
        type: 'warning',
        duration: 2000
      })
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket 连接错误:', error)
      Message({
        message: '实时连接失败，请检查网络',
        type: 'error',
        duration: 3000
      })
    })

    // 监听新任务
    this.socket.on('new_task', (data) => {
      console.log('收到新任务:', data)
      Message({
        message: `收到新任务：${data.taskTitle}`,
        type: 'info',
        duration: 5000
      })
      this.emit('new_task', data)
    })

    // 监听任务完成
    this.socket.on('task_completed', (data) => {
      console.log('任务完成:', data)
      Message({
        message: `${data.workerName} 完成了任务：${data.taskTitle}`,
        type: 'success',
        duration: 5000
      })
      this.emit('task_completed', data)
    })

    // 监听考勤更新
    this.socket.on('attendance_updated', (data) => {
      console.log('考勤更新:', data)
      Message({
        message: '您的考勤状态已更新',
        type: 'info',
        duration: 3000
      })
      this.emit('attendance_updated', data)
    })

    // 监听好友请求
    this.socket.on('friend_request', (data) => {
      console.log('收到好友请求:', data)
      Message({
        message: `${data.name} 请求添加您为好友`,
        type: 'info',
        duration: 5000
      })
      this.emit('friend_request', data)
    })

    // 监听好友同意
    this.socket.on('friend_agreed', (data) => {
      console.log('好友已同意:', data)
      Message({
        message: `${data.name} 已同意您的好友请求`,
        type: 'success',
        duration: 3000
      })
      this.emit('friend_agreed', data)
    })

    // 监听好友拒绝
    this.socket.on('friend_rejected', (data) => {
      console.log('好友已拒绝:', data)
      Message({
        message: '对方拒绝了您的好友请求',
        type: 'warning',
        duration: 3000
      })
      this.emit('friend_rejected', data)
    })

    // 监听聊天消息（来自对方）
    this.socket.on('chat_message', (data) => {
      console.log('Socket 收到 chat_message:', data)
      this.emit('chat_message', data)
    })

    // 监听自己发出去的消息确认（用于替换本地临时消息）
    this.socket.on('chat_message_ack', (data) => {
      console.log('Socket 收到 chat_message_ack:', data)
      this.emit('chat_message_ack', data)
    })

    // 监听消息已读
    this.socket.on('message_read', (data) => {
      console.log('消息已读:', data)
      this.emit('message_read', data)
    })

    // 监听在线状态
    this.socket.on('online_status', (data) => {
      console.log('在线状态更新:', data)
      this.emit('online_status', data)
    })

    // 监听头像更新
    this.socket.on('avatar_updated', (data) => {
      console.log('头像更新:', data)
      this.emit('avatar_updated', data)
    })
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.currentToken = null
    }
  }

  // 发送消息
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data))
    }
  }

  // 监听事件
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = []
    }
    this.callbacks[event].push(callback)
  }

  // 移除监听
  off(event, callback) {
    if (this.callbacks[event]) {
      if (callback) {
        this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback)
      } else {
        delete this.callbacks[event]
      }
    }
  }

  // 注册连接成功后的回调
  onConnect(callback) {
    // 如果已经连接，立即执行
    if (this.socket && this.socket.connected) {
      callback(this.socket)
    } else {
      this.initCallbacks.push(callback)
    }
  }

  // 发送聊天消息
  sendChatMessage(receiverId, content) {
    if (this.socket) {
      this.socket.emit('chat_message', { receiverId, content })
    }
  }

  // 标记消息已读
  markMessageRead(chatId, senderId) {
    if (this.socket) {
      this.socket.emit('message_read', { chatId, senderId })
    }
  }
}

export default new SocketService()
