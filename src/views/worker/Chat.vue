<template>
  <div class="chat-page">
    <!-- 好友列表 -->
    <div class="friends-panel">
      <div class="panel-header">
        <h3>即时团队协作</h3>
        <el-button type="text" icon="el-icon-plus" @click="showAddFriendDialog"></el-button>
      </div>

      <!-- 待处理好友请求 -->
      <div class="pending-requests" v-if="pendingRequests.length > 0">
        <div class="pending-header" @click="showPendingRequests = !showPendingRequests">
          <i class="el-icon-user-add"></i>
          <span>好友请求</span>
          <span class="pending-badge">{{ pendingRequests.length }}</span>
          <i :class="showPendingRequests ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
        </div>
        <div class="pending-list" v-show="showPendingRequests">
          <div v-for="request in pendingRequests" :key="request.requestId" class="pending-item">
            <img :src="getAvatarUrl(request.userId, request.photo)" class="avatar" />
            <div class="request-info">
              <span class="name">{{ request.name }}</span>
              <span class="position">{{ request.position }} / {{ request.department }}</span>
            </div>
            <div class="request-actions">
              <el-button type="success" size="mini" @click="handleRequest(request, 'agree')">同意</el-button>
              <el-button size="mini" @click="handleRequest(request, 'reject')">拒绝</el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="search-box">
        <i class="el-icon-search"></i>
        <input v-model="searchKeyword" placeholder="搜索联系人..." @input="handleSearch" />
      </div>

      <div class="friends-list">
        <div
          v-for="friend in filteredFriends"
          :key="friend.friendId"
          class="friend-item"
          :class="{ active: currentChatId === friend.friendId }"
          @click="selectFriend(friend)"
        >
          <div class="avatar-wrapper">
            <img :src="getAvatarUrl(friend.friendId, friend.photo)" class="avatar" />
            <span class="online-dot" :class="{ online: friend.onlineStatus }"></span>
            <span class="unread-badge" v-if="getUnreadCount(friend.friendId) > 0">
              {{ getUnreadCount(friend.friendId) > 99 ? '99+' : getUnreadCount(friend.friendId) }}
            </span>
          </div>
          <div class="friend-info">
            <span class="name">{{ friend.name }}</span>
            <span class="position">{{ friend.position }}</span>
          </div>
        </div>

        <div v-if="filteredFriends.length === 0" class="empty-friends">
          <p>暂无联系人</p>
          <el-button size="small" @click="showAddFriendDialog">添加好友</el-button>
        </div>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-panel">
      <template v-if="currentChat">
        <div class="chat-header">
          <div class="chat-user">
            <img :src="getAvatarUrl(currentChat.friendId, currentChat.photo)" class="avatar" />
            <span class="name">{{ currentChat.name }}</span>
            <span class="status" :class="{ online: currentChat.onlineStatus }">
              {{ currentChat.onlineStatus ? '在线' : '离线' }}
            </span>
          </div>
        </div>

        <div class="messages-area" ref="messagesArea">
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-container">
            <el-icon class="loading-icon"><i class="el-icon-loading"></i></el-icon>
            <span>加载中...</span>
          </div>
          
          <div
            v-for="msg in currentMessages"
            :key="msg._id || msg.tempId"
            class="message"
            :class="{ self: isSelfMessage(msg) }"
          >
            <img :src="getAvatarUrl(msg.senderId, msg.senderPhoto)" class="avatar" v-if="!isSelfMessage(msg)" />
            <div class="message-bubble">
              <p>{{ msg.content }}</p>
              <span class="time">{{ formatTime(msg.sendTime) }}</span>
              <span class="read-status" v-if="isSelfMessage(msg) && msg.isRead">已读</span>
            </div>
          </div>
        </div>

        <div class="input-area">
          <div class="toolbar">
            <i class="el-icon-circle-plus-outline"></i>
            <i class="el-icon-picture-outline"></i>
          </div>
          <div class="input-box">
            <textarea
              v-model="messageInput"
              placeholder="输入协作指令或反馈..."
              rows="2"
              @keydown.enter.exact.prevent="handleSend"
            ></textarea>
            <el-button type="success" @click="handleSend" :disabled="!messageInput.trim()">
              发送
            </el-button>
          </div>
        </div>
      </template>

      <div v-else class="no-chat">
        <i class="el-icon-chat-dot-square"></i>
        <p>选择一个联系人开始聊天</p>
      </div>
    </div>

    <!-- 添加好友对话框 -->
    <el-dialog title="寻找工友" :visible.sync="addFriendDialogVisible" width="450px">
      <div class="search-friend">
        <el-input
          v-model="friendSearchKeyword"
          placeholder="输入姓名或工号..."
          prefix-icon="el-icon-search"
          @input="handleFriendSearch"
        ></el-input>
      </div>

      <div class="search-results">
        <div
          v-for="user in searchResults"
          :key="user._id"
          class="result-item"
        >
          <img :src="getAvatarUrl(user._id, user.photo)" class="avatar" />
          <div class="user-info">
            <span class="name">{{ user.name }}</span>
            <span class="position">{{ user.position }} / {{ user.department }}</span>
          </div>
          <el-button type="success" size="small" @click="handleAddFriend(user._id)">
            添加
          </el-button>
        </div>

        <div v-if="searchResults.length === 0 && friendSearchKeyword" class="no-results">
          未找到相关用户
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'
import socketService from '@/utils/socket'
import { getAvatarUrl } from '@/utils/avatar'

export default {
  name: 'WorkerChat',
  data() {
    return {
      defaultAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      searchKeyword: '',
      friendSearchKeyword: '',
      messageInput: '',
      addFriendDialogVisible: false,
      searchResults: [],
      currentChatId: null,
      currentChat: null,
      showPendingRequests: true,
      localMessages: [],
      lastProcessedMsgId: null, // 记录上一次处理的消息ID
      processedMsgIds: new Set(), // 用于追踪已处理的消息ID
      loading: false // 加载状态
    }
  },
  computed: {
    ...mapState('chat', ['friends', 'pendingRequests', 'unreadMessages', 'ackMessage']),
    ...mapGetters('user', ['userId']),

    currentMessages() {
      if (this.localMessages.length > 0) {
        return this.localMessages
      }
      return this.$store.state.chat.currentMessages || []
    },

    filteredFriends() {
      if (!this.searchKeyword) return this.friends
      const keyword = this.searchKeyword.toLowerCase()
      return this.friends.filter(f =>
        f.name.toLowerCase().includes(keyword) ||
        f.username.toLowerCase().includes(keyword)
      )
    }
  },
  watch: {
    // 监听未读消息变化，把当前会话对方发来的消息并入 localMessages（依赖 Vue.set 的响应式）
    unreadMessages: {
      handler(newUnread) {
        this.handleCurrentChatMessages(newUnread)
      },
      deep: true,
      immediate: true
    },

    // 监听 ackMessage 变化：用服务端确认替换本地临时消息（防止发送时本地临时消息与 socket 确认消息重复）
    ackMessage: {
      handler(ackMsg) {
        if (!ackMsg) return
        const tempKey = ackMsg.tempId || String(ackMsg._id)
        const idx = this.localMessages.findIndex(
          (m) => String(m._id) === tempKey || String(m.tempId) === tempKey
        )
        if (idx !== -1) {
          this.localMessages.splice(idx, 1, {
            ...this.localMessages[idx],
            ...ackMsg,
            _id: ackMsg._id || this.localMessages[idx]._id,
            tempId: undefined
          })
        }
        // 清除 store 中的 ackMessage，避免重复触发
        this.$store.commit('chat/SET_ACK_MESSAGE', null)
        this.processedMsgIds.add(String(ackMsg._id))
      }
    }
  },
  created() {
    this.fetchFriends()
    this.fetchPendingRequests()
    this.loadLocalMessages()
    // 初始化 Socket 监听
    this.$store.dispatch('chat/initSocket')
    // 监听头像更新
    socketService.on('avatar_updated', () => {
      this.fetchFriends()
    })
  },
  beforeDestroy() {
    this.syncLocalMessagesToServer()
    this.saveLocalMessages()
    // 移除头像更新监听
    socketService.off('avatar_updated')
  },
  mounted() {
    // 监听页面关闭事件，确保在关闭浏览器时同步聊天记录
    window.addEventListener('beforeunload', this.syncLocalMessagesToServer)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.syncLocalMessagesToServer)
  },
  methods: {
    getAvatarUrl,

    ...mapActions('chat', ['getFriends', 'searchFriends', 'sendFriendRequest', 'getChatHistory', 'sendMessage', 'getPendingRequests', 'handleFriendRequest', 'clearUnread']),

    async fetchFriends() {
      await this.getFriends()
    },

    async fetchPendingRequests() {
      await this.getPendingRequests()
    },

    messageDedupeKey(msg) {
      if (msg._id != null && msg._id !== '') return String(msg._id)
      if (msg.tempId) return String(msg.tempId)
      const t = msg.sendTime ? new Date(msg.sendTime).getTime() : ''
      return `${msg.senderId}_${t}_${msg.content}`
    },

    // 处理当前聊天的消息（Socket → ADD_UNREAD_MESSAGE → 此处并入展示列表）
    handleCurrentChatMessages(newUnread) {
      if (this.currentChatId == null || this.currentChatId === '') return
      const currentFriendId = String(this.currentChatId)
      const messages = newUnread[currentFriendId]
      if (!messages || messages.length === 0) return

      let appended = false
      messages.forEach((msg) => {
        const msgId = this.messageDedupeKey(msg)
        if (this.processedMsgIds.has(msgId)) return
        const exists = this.localMessages.some(
          (m) => this.messageDedupeKey(m) === msgId
        )
        if (!exists) {
          this.localMessages.push(msg)
          this.processedMsgIds.add(msgId)
          appended = true
        }
      })

      if (appended) {
        this.$nextTick(() => this.scrollToBottom())
      }
    },

    // 注意：Socket 监听器已在 store 中统一管理

    getChatId(userId, friendId) {
      const sorted = [String(userId), String(friendId)].sort()
      return `${sorted[0]}_${sorted[1]}`
    },

    async selectFriend(friend) {
      // 防止重复点击
      if (this.loading) return
      
      // 保存当前聊天记录
      this.saveLocalMessages()

      // 清除未读消息（Vue.delete 确保响应式）
      this.clearUnread(friend.friendId)

      // 重置消息处理状态
      this.lastProcessedMsgId = null
      this.processedMsgIds = new Set()

      this.currentChatId = friend.friendId
      this.currentChat = friend
      this.loading = true

      try {
        // 生成 chatId
        const chatId = this.getChatId(this.userId, friend.friendId)

        // 先显示本地存储的消息，提升用户体验
        this.loadLocalMessages()

        // 加载聊天记录
        await this.getChatHistory(chatId)

        // 从 Vuex 获取消息并与本地消息合并
        const storedMessages = this.$store.state.chat.currentMessages || []
        
        // 合并消息，去重，按时间排序
        const allMessages = [...this.localMessages, ...storedMessages]
        const uniqueMessages = []
        const messageIds = new Set()
        
        allMessages.forEach(msg => {
          const msgId = msg._id || msg.tempId
          if (msgId && !messageIds.has(msgId)) {
            messageIds.add(msgId)
            uniqueMessages.push(msg)
          }
        })
        
        // 按时间排序
        uniqueMessages.sort((a, b) => {
          const timeA = new Date(a.sendTime).getTime()
          const timeB = new Date(b.sendTime).getTime()
          return timeA - timeB
        })
        
        this.localMessages = uniqueMessages

        // 将消息ID加入已处理集合，防止重复
        uniqueMessages.forEach(msg => {
          if (msg._id) {
            this.processedMsgIds.add(String(msg._id))
          }
          if (msg.tempId) {
            this.processedMsgIds.add(String(msg.tempId))
          }
        })

        // 标记消息已读
        if (this.localMessages.length > 0) {
          const lastMsg = this.localMessages[this.localMessages.length - 1]
          if (String(lastMsg.senderId) !== String(this.userId) && !lastMsg.isRead) {
            socketService.markMessageRead(chatId, lastMsg.senderId)
          }
        }

        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('加载聊天记录失败:', error)
      } finally {
        this.loading = false
      }
    },

    isSelfMessage(msg) {
      return String(msg.senderId) === String(this.userId)
    },

    async handleSend() {
      if (!this.messageInput.trim() || !this.currentChatId) return

      const content = this.messageInput.trim()
      this.messageInput = ''

      // 生成临时消息ID用于本地显示
      const tempId = 'temp_' + Date.now()
      const tempMessage = {
        _id: tempId,
        tempId,
        senderId: this.userId,
        senderPhoto: this.$store.state.user.userInfo?.photo,
        content,
        sendTime: new Date(),
        isRead: false
      }
      
      // 先添加到本地显示
      this.localMessages.push(tempMessage)
      this.$nextTick(() => this.scrollToBottom())

      try {
        const res = await this.sendMessage({
          receiverId: this.currentChatId,
          content
        })
        // 用真实消息替换临时消息
        const index = this.localMessages.findIndex(m => m._id === tempId)
        if (index !== -1) {
          this.localMessages[index] = {
            ...res.data,
            senderPhoto: this.$store.state.user.userInfo?.photo
          }
          // 标记消息已处理，防止 socket 回显重复添加
          if (res.data._id) {
            this.processedMsgIds.add(String(res.data._id))
          }
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        // 发送失败，移除临时消息
        this.localMessages = this.localMessages.filter(m => m._id !== tempId)
        this.$message.error('发送失败')
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.messagesArea) {
          this.$refs.messagesArea.scrollTop = this.$refs.messagesArea.scrollHeight
        }
      })
    },

    formatTime(time) {
      if (!time) return ''
      const d = new Date(time)
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    },

    showAddFriendDialog() {
      this.addFriendDialogVisible = true
      this.friendSearchKeyword = ''
      this.searchResults = []
    },

    async handleFriendSearch() {
      if (!this.friendSearchKeyword.trim()) {
        this.searchResults = []
        return
      }

      try {
        const res = await this.searchFriends(this.friendSearchKeyword)
        this.searchResults = res.data
      } catch (error) {
        console.error('搜索失败:', error)
      }
    },

    async handleAddFriend(friendId) {
      try {
        await this.sendFriendRequest(friendId)
        this.$message.success('好友请求已发送')
        this.searchResults = this.searchResults.filter(u => u._id !== friendId)
      } catch (error) {
        console.error('添加好友失败:', error)
        if (error.response?.data?.msg) {
          this.$message.error(error.response.data.msg)
        }
      }
    },

    async handleRequest(request, action) {
      try {
        await this.handleFriendRequest({
          requestId: request.requestId,
          requesterId: request.userId,
          action
        })
        this.$message.success(action === 'agree' ? '已同意好友请求' : '已拒绝好友请求')
      } catch (error) {
        console.error('处理好友请求失败:', error)
        if (error.response?.data?.msg) {
          this.$message.error(error.response.data.msg)
        }
      }
    },

    handleSearch() {
      // 搜索过滤在计算属性中处理
    },

    // 获取某个好友的未读消息数
    getUnreadCount(friendId) {
      return this.$store.getters['chat/getUnreadCount'](friendId)
    },

    // 本地存储聊天记录
    saveLocalMessages() {
      if (this.currentChatId && this.localMessages.length > 0) {
        const key = `chat_${this.getChatId(this.userId, this.currentChatId)}`
        // 限制存储的消息数量，只保存最近的50条
        const messagesToSave = this.localMessages.slice(-50)
        // 简化消息结构，只保存必要字段
        const simplifiedMessages = messagesToSave.map(msg => ({
          _id: msg._id,
          tempId: msg.tempId,
          senderId: msg.senderId,
          content: msg.content,
          sendTime: msg.sendTime,
          isRead: msg.isRead
        }))
        try {
          localStorage.setItem(key, JSON.stringify(simplifiedMessages))
        } catch (e) {
          console.error('存储聊天记录失败:', e)
          // 如果存储失败，尝试清除所有旧的聊天记录
          this.clearAllChatData()
          try {
            localStorage.setItem(key, JSON.stringify(simplifiedMessages))
          } catch (e) {
            console.error('再次存储聊天记录失败:', e)
          }
        }
      }
    },
    // 清除所有聊天数据
    clearAllChatData() {
      try {
        // 获取所有聊天记录的键
        const keys = Object.keys(localStorage).filter(key => key.startsWith('chat_'))
        // 删除所有聊天记录
        keys.forEach(key => {
          localStorage.removeItem(key)
        })
        console.log('已清除所有聊天记录数据')
      } catch (e) {
        console.error('清除聊天数据失败:', e)
      }
    },

    loadLocalMessages() {
      // 如果有当前聊天对象，加载其聊天记录
      if (this.currentChatId) {
        const key = `chat_${this.getChatId(this.userId, this.currentChatId)}`
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            this.localMessages = JSON.parse(saved)
          } catch (e) {
            console.error('加载聊天记录失败:', e)
          }
        }
      }
    },

    // 将本地存储的聊天记录同步到服务器
    async syncLocalMessagesToServer() {
      try {
        // 获取所有聊天记录的键
        const keys = Object.keys(localStorage).filter(key => key.startsWith('chat_'))
        
        for (const key of keys) {
          const saved = localStorage.getItem(key)
          if (saved) {
            try {
              const messages = JSON.parse(saved)
              
              // 过滤出需要同步的消息（没有真实的_id或包含tempId）
              const messagesToSync = messages.filter(msg => 
                !msg._id || msg._id.startsWith('temp_') || msg.tempId
              )
              
              if (messagesToSync.length > 0) {
                // 从键中提取聊天对象ID
                const chatId = key.replace('chat_', '')
                const [userId1, userId2] = chatId.split('_')
                const friendId = String(userId1) === String(this.userId) ? userId2 : userId1
                
                // 逐个发送消息到服务器
                for (const msg of messagesToSync) {
                  if (String(msg.senderId) === String(this.userId)) {
                    try {
                      await this.sendMessage({
                        receiverId: friendId,
                        content: msg.content
                      })
                    } catch (error) {
                      console.error('同步消息失败:', error)
                    }
                  }
                }
              }
            } catch (e) {
              console.error('解析聊天记录失败:', e)
            }
          }
        }
        
        console.log('本地聊天记录已同步到服务器')
      } catch (e) {
        console.error('同步聊天记录失败:', e)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.chat-page {
  height: 100%;
  display: flex;
}

.friends-panel {
  width: 320px;
  background: #111;
  border-right: 1px solid #262626;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #262626;

  h3 {
    font-size: 15px;
    font-weight: 700;
    color: #e5e7eb;
  }
}

// 待处理好友请求样式
.pending-requests {
  border-bottom: 1px solid #262626;
}

.pending-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  cursor: pointer;
  background: rgba(16, 185, 129, 0.05);
  transition: background 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.1);
  }

  i:first-child {
    color: #10b981;
    font-size: 16px;
  }

  span:first-of-type {
    flex: 1;
    font-size: 13px;
    color: #e5e7eb;
  }

  .pending-badge {
    background: #ef4444;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  i:last-child {
    color: #6b7280;
    font-size: 12px;
  }
}

.pending-list {
  padding: 8px 0;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }

  .request-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    .name {
      font-size: 13px;
      color: #e5e7eb;
      font-weight: 500;
    }

    .position {
      font-size: 11px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .request-actions {
    display: flex;
    gap: 4px;

    .el-button--success {
      background: #10b981;
      border-color: #10b981;
    }

    .el-button--mini {
      padding: 4px 8px;
    }
  }
}

.search-box {
  margin: 16px;
  padding: 10px 14px;
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #6b7280;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e5e7eb;
    font-size: 13px;
  }
}

.friends-list {
  flex: 1;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  &.active {
    background: rgba(16, 185, 129, 0.05);
    border-left-color: #10b981;
  }
}

.avatar-wrapper {
  position: relative;

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .online-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #6b7280;
    border: 2px solid #111;
    border-radius: 50%;

    &.online {
      background: #10b981;
    }
  }

  .unread-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: bold;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid #111;
  }
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .name {
    font-size: 14px;
    font-weight: 600;
    color: #e5e7eb;
  }
  
  .position {
    font-size: 12px;
    color: #6b7280;
  }
}

.empty-friends {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  
  p {
    margin-bottom: 12px;
  }
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

.chat-header {
  padding: 16px 24px;
  background: #111;
  border-bottom: 1px solid #262626;
  
  .chat-user {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }
    
    .name {
      font-size: 15px;
      font-weight: 600;
      color: #e5e7eb;
    }
    
    .status {
      font-size: 11px;
      color: #6b7280;
      
      &.online {
        color: #10b981;
      }
    }
  }
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  
  &.self {
    flex-direction: row-reverse;
    
    .message-bubble {
      background: #2563eb;
      border-radius: 16px 4px 16px 16px;
      align-items: flex-end;
      
      p {
        color: white;
      }
    }
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  
  .message-bubble {
    max-width: 60%;
    background: #262626;
    border-radius: 4px 16px 16px 16px;
    padding: 12px 16px;
    
    p {
      font-size: 14px;
      color: #e5e7eb;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    
    .time {
      font-size: 10px;
      color: #6b7280;
    }
    
    .read-status {
      font-size: 10px;
      color: #10b981;
      margin-left: 8px;
    }
  }
}

.input-area {
  padding: 16px 24px;
  background: #111;
  border-top: 1px solid #262626;
  
  .toolbar {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding-left: 4px;
    
    i {
      font-size: 22px;
      color: #6b7280;
      cursor: pointer;
      
      &:hover {
        color: #e5e7eb;
      }
    }
  }
  
  .input-box {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    
    textarea {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #262626;
      border-radius: 12px;
      padding: 12px 16px;
      color: #e5e7eb;
      font-size: 14px;
      resize: none;
      outline: none;
      
      &:focus {
        border-color: #10b981;
      }
    }
    
    .el-button {
      height: 40px;
      padding: 0 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
    }
  }
}

.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  
  i {
    font-size: 64px;
    margin-bottom: 16px;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #6b7280;
  
  .loading-icon {
    font-size: 32px;
    margin-bottom: 12px;
    animation: spin 1s linear infinite;
  }
  
  span {
    font-size: 14px;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-friend {
  margin-bottom: 20px;
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: #1a1a1a;
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }
  
  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .name {
      font-size: 13px;
      font-weight: 600;
      color: #e5e7eb;
    }
    
    .position {
      font-size: 11px;
      color: #6b7280;
    }
  }
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}
</style>
