<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <i class="el-icon-office-building"></i>
        </div>
        <div class="logo-text">
          <h2>智工云管理</h2>
          <span>Enterprise v2.6</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-title">主控制台</p>
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: currentPath === item.path }"
        >
          <i :class="item.icon"></i>
          <span>{{ item.title }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <i class="el-icon-user-solid avatar-icon"></i>
          <div class="user-detail">
            <p class="user-name">{{ userInfo?.name }}</p>
            <p class="user-role">Administrator</p>
          </div>
        </div>
        <el-button type="text" class="logout-btn" @click="handleLogout">
          <i class="el-icon-switch-button"></i>
          退出登录
        </el-button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="page-title">
          <h2>{{ pageTitle }}</h2>
          <span class="date">{{ currentDate }}</span>
        </div>
        <div class="top-actions">
          <div class="search-box">
            <i class="el-icon-search"></i>
            <input type="text" placeholder="搜索员工或工号..." />
          </div>
          <div class="notification-badge" @click="openNotificationPanel">
            <el-badge :value="notificationCount" :hidden="notificationCount === 0">
              <i class="el-icon-bell"></i>
            </el-badge>
          </div>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-content">
        <router-view />
      </div>
    </main>

    <el-dialog
      title="消息通知"
      :visible.sync="notificationVisible"
      width="420px"
      append-to-body
      custom-class="admin-notification-dialog"
      @open="refreshNotifications"
    >
      <div class="notification-list">
        <div
          v-for="item in notifications"
          :key="item._id"
          class="notification-item"
        >
          <div class="notification-dot"></div>
          <div class="notification-body">
            <p class="notification-title">{{ item.title }}</p>
            <p class="notification-meta">{{ item.meta }}</p>
          </div>
        </div>
        <div v-if="notifications.length === 0" class="notification-empty">
          暂无任务相关通知
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { getTaskList } from '@/api/task'
import socketService from '@/utils/socket'

export default {
  name: 'AdminLayout',
  data() {
    return {
      notificationVisible: false,
      notifications: [],
      navItems: [
        { path: '/admin/attendance', icon: 'el-icon-calendar', title: '考勤统计' },
        { path: '/admin/tasks', icon: 'el-icon-document', title: '任务派发' },
        { path: '/admin/employees', icon: 'el-icon-user', title: '员工档案' }
      ]
    }
  },
  computed: {
    currentPath() {
      return this.$route.path
    },
    pageTitle() {
      return this.$route.meta?.title || '考勤统计'
    },
    userInfo() {
      return this.$store.state.user.userInfo
    },
    currentDate() {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]}`
    },
    notificationCount() {
      const saved = JSON.parse(localStorage.getItem('adminReadTasks') || '[]')
      return this.notifications.filter(n => !saved.includes(n._id)).length
    }
  },
  mounted() {
    this.refreshNotifications()
    window.addEventListener('focus', this.refreshNotifications)
    // 监听任务完成事件，实时更新通知
    socketService.on('task_completed', this.handleTaskCompleted)
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.refreshNotifications)
    socketService.off('task_completed', this.handleTaskCompleted)
  },
  methods: {
    ...mapActions('user', ['logout']),

    openNotificationPanel() {
      this.notificationVisible = true
      const readIds = this.notifications.map(n => n._id)
      const saved = JSON.parse(localStorage.getItem('adminReadTasks') || '[]')
      const merged = [...new Set([...saved, ...readIds])]
      localStorage.setItem('adminReadTasks', JSON.stringify(merged))
    },

    async refreshNotifications() {
      try {
        const res = await getTaskList({ size: 80 })
        const list = res.data.list || []
        const completed = list
          .filter(t => t.status === 'completed')
          .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0))
          .slice(0, 20)
        this.notifications = completed.map(t => ({
          _id: t._id,
          title: `任务「${t.taskTitle || '未命名'}」已完成`,
          meta: `执行人：${t.workerName || '—'} · ${this.formatNotifyTime(t.completedAt || t.updatedAt)}`
        }))
      } catch (e) {
        console.error('加载通知失败:', e)
        this.notifications = []
      }
    },

    formatNotifyTime(date) {
      if (!date) return ''
      const d = new Date(date)
      return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },

    // 处理任务完成事件
    handleTaskCompleted(data) {
      console.log('Layout 监听到任务完成:', data)
      // 实时刷新通知列表
      this.refreshNotifications()
      // 显示通知提示
      this.$notify({
        title: '任务完成通知',
        message: `${data.workerName} 完成了任务：${data.taskTitle}`,
        type: 'success',
        duration: 5000
      })
    },
    
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
.admin-layout {
  display: flex;
  height: 100vh;
  background-color: #0a0a0a;
}

.sidebar {
  width: 280px;
  background-color: #111;
  border-right: 1px solid #262626;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;

  .logo {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);

    i {
      font-size: 22px;
      color: white;
    }
  }

  .logo-text {
    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #e5e7eb;
    }

    span {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
  }
}

.sidebar-nav {
  flex: 1;
  padding: 16px 24px;

  .nav-title {
    font-size: 10px;
    font-weight: 700;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 12px;
    padding-left: 16px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    color: #6b7280;
    text-decoration: none;
    border-radius: 12px;
    margin-bottom: 4px;
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: 500;

    i {
      font-size: 18px;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #e5e7eb;
    }

    &.active {
      background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
  }
}

.sidebar-footer {
  padding: 20px 24px;
  border-top: 1px solid #262626;

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 2px solid #2563eb;
    }

    .user-detail {
      .user-name {
        font-size: 14px;
        font-weight: 600;
        color: #e5e7eb;
      }

      .user-role {
        font-size: 10px;
        color: #2563eb;
        font-weight: 600;
        text-transform: uppercase;
      }
    }
  }

  .logout-btn {
    width: 100%;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    i {
      font-size: 16px;
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-bar {
  height: 80px;
  background: rgba(22, 22, 22, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #262626;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;

  .page-title {
    display: flex;
    align-items: center;
    gap: 16px;

    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #e5e7eb;
    }

    .date {
      font-size: 11px;
      color: #2563eb;
      background: rgba(37, 99, 235, 0.1);
      padding: 4px 10px;
      border-radius: 6px;
      font-family: monospace;
    }
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 20px;

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1a1a1a;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #333;

      i {
        color: #6b7280;
        font-size: 16px;
      }

      input {
        background: transparent;
        border: none;
        outline: none;
        color: #e5e7eb;
        font-size: 14px;
        width: 180px;
      }
    }

    .notification-badge {
      cursor: pointer;

      i {
        font-size: 22px;
        color: #6b7280;

        &:hover {
          color: #e5e7eb;
        }
      }

      :deep(.el-badge__content) {
        background-color: #ef4444;
      }
    }
  }
}

.page-content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.notification-list {
  max-height: 360px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #262626;

  &:last-of-type {
    border-bottom: none;
  }
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  margin-top: 6px;
  flex-shrink: 0;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
  margin: 0 0 6px;
  line-height: 1.4;
}

.notification-meta {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.notification-empty {
  text-align: center;
  padding: 40px 16px;
  color: #6b7280;
  font-size: 14px;
}
</style>

<style lang="less">
/* el-dialog 挂载到 body，需非 scoped */
.admin-notification-dialog {
  background: #141414 !important;
  border: 1px solid #333 !important;
  border-radius: 12px !important;

  .el-dialog__header {
    padding: 18px 20px 12px;
    border-bottom: 1px solid #262626;
  }

  .el-dialog__title {
    color: #e5e7eb;
    font-size: 16px;
    font-weight: 700;
  }

  .el-dialog__headerbtn .el-dialog__close {
    color: #9ca3af;
  }

  .el-dialog__body {
    padding: 8px 20px 20px;
    color: #e5e7eb;
  }
}
</style>
