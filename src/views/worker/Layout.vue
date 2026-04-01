<template>
  <div class="worker-layout">
    <!-- 顶部导航 -->
    <header class="top-nav">
      <div class="nav-left">
        <div class="logo">
          <i class="el-icon-briefcase"></i>
        </div>
        <span class="logo-text">智工云 <span class="worker-tag">WORKER</span></span>
        
        <nav class="main-nav">
          <router-link to="/worker/tasks" class="nav-item" :class="{ active: currentPath === '/worker/tasks' }">
            工作任务
          </router-link>
          <router-link to="/worker/chat" class="nav-item" :class="{ active: currentPath === '/worker/chat' }">
            即时通讯
          </router-link>
        </nav>
      </div>
      
      <div class="nav-right">
        <!-- 聊天消息通知 -->
        <div class="chat-bell" @click="goToChat">
          <i class="el-icon-chat-dot-round"></i>
          <span class="badge" v-if="chatUnreadCount > 0">{{ chatUnreadCount > 99 ? '99+' : chatUnreadCount }}</span>
        </div>

        <!-- 任务通知 -->
        <div class="task-bell" @click="showTaskNotification">
          <i class="el-icon-message-solid"></i>
          <span class="badge" v-if="taskUnreadCount > 0">{{ taskUnreadCount }}</span>
        </div>
        
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-info">
            <div class="user-detail">
              <span class="user-name">{{ userInfo?.name }}</span>
              <span class="user-position">{{ userInfo?.position }}</span>
            </div>
            <img :src="userInfo?.photo || defaultAvatar" class="avatar" />
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="uploadAvatar">
              <i class="el-icon-camera"></i> 上传头像
            </el-dropdown-item>
            <el-dropdown-item command="changePassword">
              <i class="el-icon-lock"></i> 修改密码
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              <i class="el-icon-switch-button"></i> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </header>

    <!-- 页面内容 -->
    <main class="page-content">
      <transition name="fade" mode="out-in">
        <router-view />
      </transition>
    </main>

    <!-- 修改密码对话框 -->
    <el-dialog title="修改密码" :visible.sync="passwordDialogVisible" width="420px" :close-on-click-modal="false">
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="90px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword" :loading="submitting">确认修改</el-button>
      </span>
    </el-dialog>

    <!-- 上传头像对话框 -->
    <el-dialog title="上传头像" :visible.sync="avatarDialogVisible" width="400px" :close-on-click-modal="false">
      <div class="avatar-upload-content">
        <el-upload
          class="avatar-uploader"
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          accept="image/jpeg,image/png,image/gif,image/webp"
          :on-change="handleAvatarChange"
        >
          <img
            v-if="userInfo?.photo"
            :src="userInfo.photo"
            class="avatar-preview"
          />
          <img
            v-else
            :src="defaultAvatar"
            class="avatar-preview"
          />
          <div class="upload-overlay">
            <i class="el-icon-camera"></i>
            <span>点击更换头像</span>
          </div>
        </el-upload>
        <p class="avatar-tip">支持 JPG、PNG、GIF、WEBP 格式，文件小于 1MB</p>
      </div>
      <span slot="footer">
        <el-button @click="avatarDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import { changePassword, uploadAvatar } from '@/api/user'
import socketService from '@/utils/socket'

export default {
  name: 'WorkerLayout',
  data() {
    const validateConfirm = (rule, value, callback) => {
      if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }
    return {
      defaultAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      submitting: false,
      passwordDialogVisible: false,
      avatarDialogVisible: false,
      avatarUploading: false,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordRules: {
        oldPassword: [
          { required: true, message: '请输入原密码', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          { validator: validateConfirm, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    currentPath() {
      return this.$route.path
    },
    userInfo() {
      return this.$store.state.user.userInfo
    },
    taskUnreadCount() {
      return this.$store.state.task.unreadCount
    },
    chatUnreadCount() {
      return this.$store.getters['chat/totalUnreadCount']
    }
  },
  created() {
    this.initSocket()
    // 立即注册监听器
    this.addSocketListeners()
  },
  beforeDestroy() {
    this.removeSocketListeners()
  },
  methods: {
    ...mapActions(['task/initSocket']),

    initSocket() {
      this.$store.dispatch('task/initSocket')
      this.$store.dispatch('chat/initSocket')
      this.$store.dispatch('chat/getFriends')
      this.$store.dispatch('task/getMyTasks')
    },

    /** 先 off 再 on，避免重复 connect / HMR 导致 chat_message 被注册多次、同一条消息进两次 */
    removeSocketListeners() {
      socketService.off('chat_message')
      socketService.off('friend_agreed')
      socketService.off('friend_request')
      socketService.off('online_status')
      socketService.off('offline_messages')
      socketService.off('message_read')
    },

    addSocketListeners() {
      this.removeSocketListeners()
      console.log('=== 添加 Socket 监听器 ===')

      // 监听聊天消息
      socketService.on('chat_message', (data) => {
        console.log('>>> Layout 收到聊天消息:', data)
        const senderId = String(data.senderId)
        // 添加到未读消息
        this.$store.commit('chat/ADD_UNREAD_MESSAGE', { senderId, message: data })

        // 显示通知
        const friends = this.$store.state.chat.friends
        const friend = friends.find(f => String(f.friendId) === senderId)
        const friendName = friend?.name || '有人'
        this.$notify({
          title: '新消息',
          message: `${friendName}: ${data.content}`,
          position: 'bottom-right',
          duration: 3000
        })
      })

      // 监听好友同意
      socketService.on('friend_agreed', () => {
        console.log('>>> 收到好友同意')
        this.$store.dispatch('chat/getFriends')
      })

      // 监听好友请求
      socketService.on('friend_request', () => {
        console.log('>>> 收到好友请求')
        this.$store.dispatch('chat/getPendingRequests')
      })

      // 监听在线状态
      socketService.on('online_status', (data) => {
        console.log('>>> 收到在线状态:', data)
        this.$store.commit('chat/UPDATE_FRIEND_STATUS', data)
      })

      // 监听离线消息
      socketService.on('offline_messages', (messages) => {
        console.log('>>> 收到离线消息:', messages)
        this.$store.commit('chat/SET_UNREAD_MESSAGES', messages)
      })

      // 监听消息已读
      socketService.on('message_read', (data) => {
        console.log('>>> 消息已读:', data)
        this.$store.commit('chat/UPDATE_MESSAGE_READ', data)
      })

      // 监听自己发出去的消息确认（替换本地临时消息）
      socketService.on('chat_message_ack', (data) => {
        console.log('>>> Layout 收到 chat_message_ack:', data)
        this.$store.dispatch('chat/setAckMessage', data)
      })
    },
    
    showTaskNotification() {
      if (this.$route.path !== '/worker/tasks') {
        this.$router.push('/worker/tasks')
      }
    },

    goToChat() {
      if (this.$route.path !== '/worker/chat') {
        this.$router.push('/worker/chat')
      }
    },

    getAvatarUrl(userId) {
      if (!userId) return ''
      return `/api/upload/avatar/${userId}?t=${new Date().getTime()}`
    },

    handleCommand(command) {
      if (command === 'logout') {
        this.handleLogout()
      } else if (command === 'changePassword') {
        this.showPasswordDialog()
      } else if (command === 'uploadAvatar') {
        this.avatarDialogVisible = true
      }
    },
    
    showPasswordDialog() {
      this.passwordDialogVisible = true
      this.passwordForm = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      if (this.$refs.passwordFormRef) {
        this.$refs.passwordFormRef.clearValidate()
      }
    },

    async handleAvatarChange(file) {
      const raw = file.raw
      if (!raw) return
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(raw.type)) {
        this.$message.error('仅支持 JPG/PNG/GIF/WEBP 图片')
        return
      }
      if (raw.size > 1 * 1024 * 1024) {
        this.$message.error('图片大小不能超过 1MB')
        return
      }
      this.avatarUploading = true
      try {
        const res = await uploadAvatar(raw)
        // 头像已存储到数据库，刷新用户信息
        await this.$store.dispatch('user/getUserInfo')
        this.$message.success('头像更新成功')
        this.avatarDialogVisible = false
      } catch (e) {
        this.$message.error(e.response?.data?.msg || '上传失败')
      } finally {
        this.avatarUploading = false
      }
    },
    
    async handleChangePassword() {
      try {
        await this.$refs.passwordFormRef.validate()
        this.submitting = true
        await changePassword({
          oldPassword: this.passwordForm.oldPassword,
          newPassword: this.passwordForm.newPassword
        })
        this.$message.success('密码修改成功')
        this.passwordDialogVisible = false
      } catch (error) {
        if (error !== false) {
          console.error('修改密码失败:', error)
        }
      } finally {
        this.submitting = false
      }
    },
    
    ...mapActions('user', ['logout']),
    
    handleLogout() {
      this.$confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.logout()
        this.$router.push('/login')
      }).catch(() => {})
    }
  }
}
</script>

<style lang="less" scoped>
.worker-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0a0a0a;
}

.top-nav {
  height: 80px;
  background: rgba(22, 22, 22, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #262626;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: relative;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);

  i {
    font-size: 22px;
    color: white;
  }
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #e5e7eb;
  
  .worker-tag {
    font-size: 10px;
    color: #10b981;
    margin-left: 6px;
    font-family: monospace;
  }
}

.main-nav {
  display: flex;
  height: 80px;
  margin-left: 32px;
  
  .nav-item {
    display: flex;
    align-items: center;
    padding: 0 24px;
    color: #6b7280;
    text-decoration: none;
    font-weight: 600;
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    
    &:hover {
      color: #e5e7eb;
    }
    
    &.active {
      color: white;
      border-bottom-color: #10b981;
    }
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chat-bell {
  position: relative;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  i {
    font-size: 26px;
    color: #6b7280;
  }

  .badge {
    position: absolute;
    top: 0;
    right: 0;
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
    border: 2px solid #161616;
  }
}

.task-bell {
  position: relative;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  i {
    font-size: 26px;
    color: #6b7280;
  }
  
  .badge {
    position: absolute;
    top: 0;
    right: 0;
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
    border: 2px solid #161616;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1a1a1a;
  padding: 6px 16px 6px 6px;
  border-radius: 24px;
  border: 1px solid #333;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #10b981;
    background: #1f1f1f;
  }
  
  .user-detail {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #e5e7eb;
    }
    
    .user-position {
      font-size: 10px;
      color: #10b981;
    }
  }
  
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(16, 185, 129, 0.5);
  }
}

.page-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.el-dropdown-menu__item {
  font-size: 13px;

  i {
    margin-right: 8px;
  }
}

.avatar-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.avatar-uploader {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px dashed #3f3f46;
  transition: border-color 0.2s;

  &:hover {
    border-color: #10b981;

    .upload-overlay {
      opacity: 1;
    }
  }
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;
  font-size: 12px;

  i {
    font-size: 24px;
  }
}

.avatar-tip {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
</style>
