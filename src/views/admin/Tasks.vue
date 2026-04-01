<template>
  <div class="tasks-page">
    <div class="tasks-layout">
      <!-- 左侧：创建任务 -->
      <div class="task-form-section">
        <div class="form-card dark-card">
          <h3><i class="el-icon-plus"></i> 发布新工作令</h3>
          
          <el-form :model="taskForm" label-position="top">
            <el-form-item label="执行员工">
              <el-select v-model="taskForm.workerId" placeholder="请选择执行员工" class="full-width">
                <el-option-group
                  v-for="group in groupedWorkers"
                  :key="group.department"
                  :label="group.department"
                >
                  <el-option
                    v-for="worker in group.workers"
                    :key="worker._id"
                    :label="`${worker.name} (${worker.username})`"
                    :value="worker._id"
                  ></el-option>
                </el-option-group>
              </el-select>
            </el-form-item>
            
            <el-form-item label="任务标题">
              <el-input v-model="taskForm.taskTitle" placeholder="简述任务目的" maxlength="50" show-word-limit></el-input>
            </el-form-item>
            
            <el-form-item label="详细说明">
              <el-input
                v-model="taskForm.taskContent"
                type="textarea"
                :rows="4"
                placeholder="任务的具体执行标准、要求及注意事项..."
              ></el-input>
            </el-form-item>
            
            <el-form-item label="限时截止">
              <el-date-picker
                v-model="taskForm.deadline"
                type="datetime"
                placeholder="选择截止时间"
                format="yyyy-MM-dd HH:mm"
                value-format="yyyy-MM-dd HH:mm:ss"
                class="full-width"
              ></el-date-picker>
            </el-form-item>
            
            <el-button type="primary" class="submit-btn" @click="handleCreateTask" :loading="submitting">
              <i class="el-icon-s-promotion"></i>
              下达指令
            </el-button>
          </el-form>
        </div>
      </div>

      <!-- 右侧：任务列表 -->
      <div class="task-list-section">
        <div class="section-header">
          <h3>活跃任务清单</h3>
          <div class="status-tabs">
            <span
              class="tab"
              :class="{ active: taskTab === 'pending' }"
              @click="taskTab = 'pending'"
            >进行中 {{ taskStats.pending }}</span>
            <span
              class="tab"
              :class="{ active: taskTab === 'completed' }"
              @click="taskTab = 'completed'"
            >已完成 {{ taskStats.completed }}</span>
          </div>
        </div>

        <div class="task-list">
          <div
            v-for="task in displayedTasks"
            :key="task._id"
            class="task-card dark-card"
            :class="{ completed: task.status === 'completed' }"
          >
            <div class="task-header">
              <div class="task-icon" :class="task.status">
                <i :class="task.status === 'completed' ? 'el-icon-circle-check' : 'el-icon-document'"></i>
              </div>
              <div class="task-info">
                <h4>{{ task.taskTitle }}</h4>
                <p>任务人：{{ task.workerName }} | {{ formatDate(task.createdAt) }}</p>
              </div>
              <span class="task-status" :class="task.status">
                {{ task.status === 'completed' ? '已完成' : '进行中' }}
              </span>
            </div>
            
            <div class="task-content" v-if="task.taskContent">
              {{ task.taskContent }}
            </div>
            
            <div class="task-footer">
              <span class="deadline">
                <i class="el-icon-time"></i>
                截止: {{ formatDateTime(task.deadline) }}
              </span>
              <div class="task-actions" v-if="task.status === 'completed'">
                <el-button type="text" size="small" @click="openTaskDetail(task)">查看详情</el-button>
              </div>
            </div>
          </div>

          <div v-if="displayedTasks.length === 0" class="empty-state">
            <i class="el-icon-document-copy"></i>
            <p>暂无任务数据</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务详情（含提交文件下载） -->
    <el-dialog
      title="任务详情"
      :visible.sync="detailDialogVisible"
      width="640px"
      append-to-body
      custom-class="admin-task-detail-dialog"
    >
      <div class="report-content" v-if="currentTask">
        <div class="report-header">
          <h4>{{ currentTask.taskTitle }}</h4>
          <p>执行人：{{ currentTask.workerName }}</p>
          <p>完成时间：{{ formatDateTime(currentTask.completedAt) }}</p>
        </div>
        <div class="report-body">
          <h5>工作说明</h5>
          <p>{{ currentTask.finishReport || '无' }}</p>
        </div>
        <div class="report-attachments">
          <h5>提交的文件</h5>
          <div v-if="attachmentFiles.length" class="file-list">
            <div
              v-for="(file, idx) in attachmentFiles"
              :key="idx"
              class="file-card"
            >
              <div v-if="file.isImage" class="file-thumb-wrap">
                <img :src="file.fullUrl" :alt="file.name" class="file-thumb" />
              </div>
              <div v-else class="file-icon-wrap">
                <i class="el-icon-document"></i>
              </div>
              <div class="file-info">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <a
                  :href="file.fullUrl"
                  :download="file.name"
                  class="file-download"
                >
                  <i class="el-icon-download"></i>
                  下载
                </a>
              </div>
            </div>
          </div>
          <p v-else class="no-file">未提交附件</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getTaskList, createTask } from '@/api/task'
import { getWorkers } from '@/api/user'
import socketService from '@/utils/socket'

export default {
  name: 'AdminTasks',
  data() {
    return {
      taskForm: {
        workerId: '',
        taskTitle: '',
        taskContent: '',
        deadline: ''
      },
      workers: [],
      pendingTasks: [],
      completedTasks: [],
      taskTab: 'pending',
      taskStats: {
        pending: 0,
        completed: 0
      },
      submitting: false,
      detailDialogVisible: false,
      currentTask: null
    }
  },
  computed: {
    displayedTasks() {
      return this.taskTab === 'pending' ? this.pendingTasks : this.completedTasks
    },
    /** 优先使用工人上传时的原始文件名；旧数据仍从 URL 解析 */
    attachmentFiles() {
      if (!this.currentTask) return []
      const meta = this.currentTask.uploadAttachments
      if (Array.isArray(meta) && meta.length) {
        return meta.map((a) => {
          const url = a.url
          const fullUrl = this.getFileUrl(url)
          const name =
            (a.originalName && String(a.originalName).trim()) ||
            this.fileNameFromUrl(url)
          return {
            url,
            fullUrl,
            name,
            isImage: this.isImageUrl(url)
          }
        })
      }
      const raw = String(this.currentTask.uploadFileUrl || '').trim()
      if (!raw) return []
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
      return parts.map((url) => {
        const fullUrl = this.getFileUrl(url)
        const name = this.fileNameFromUrl(url)
        return {
          url,
          fullUrl,
          name,
          isImage: this.isImageUrl(url)
        }
      })
    },
    groupedWorkers() {
      const groups = {}
      for (const w of this.workers) {
        const dept = w.department || '未分配部门'
        if (!groups[dept]) groups[dept] = []
        groups[dept].push(w)
      }
      return Object.keys(groups).sort().map(department => ({
        department,
        workers: groups[department].sort((a, b) => a.name.localeCompare(b.name))
      }))
    }
  },
  created() {
    this.fetchWorkers()
    this.fetchTasks()
    // 监听任务完成事件，实时刷新任务列表
    socketService.on('task_completed', this.handleTaskCompleted)
  },
  beforeDestroy() {
    socketService.off('task_completed', this.handleTaskCompleted)
  },
  methods: {
    async fetchWorkers() {
      try {
        const res = await getWorkers()
        this.workers = res.data
      } catch (error) {
        console.error('获取员工列表失败:', error)
      }
    },
    
    async fetchTasks() {
      try {
        const res = await getTaskList({ size: 50 })
        const list = res.data.list || []
        const newPending = list.filter(t => t.status === 'pending')
        const newCompleted = list.filter(t => t.status === 'completed')
        // 使用 splice 替换确保 Vue 响应式检测到数组变化
        this.pendingTasks.splice(0, this.pendingTasks.length, ...newPending)
        this.completedTasks.splice(0, this.completedTasks.length, ...newCompleted)
        this.taskStats.pending = this.pendingTasks.length
        this.taskStats.completed = this.completedTasks.length
      } catch (error) {
        console.error('获取任务列表失败:', error)
      }
    },
    
    async handleCreateTask() {
      if (!this.taskForm.workerId || !this.taskForm.taskTitle || !this.taskForm.deadline) {
        this.$message.warning('请填写完整信息')
        return
      }
      
      this.submitting = true
      try {
        await createTask(this.taskForm)
        this.$message.success('任务创建成功，已通过 Socket 推送至员工端')
        this.taskForm = {
          workerId: '',
          taskTitle: '',
          taskContent: '',
          deadline: ''
        }
        this.fetchTasks()
      } catch (error) {
        console.error('创建任务失败:', error)
      } finally {
        this.submitting = false
      }
    },
    
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    
    formatDateTime(date) {
      if (!date) return ''
      const d = new Date(date)
      return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    
    openTaskDetail(task) {
      this.currentTask = task
      this.detailDialogVisible = true
    },

    getFileUrl(url) {
      if (!url) return ''
      if (url.startsWith('http')) return url
      return `${location.origin}${url}`
    },

    fileNameFromUrl(url) {
      if (!url) return '附件'
      try {
        const path = url.split('?')[0]
        const seg = path.split('/').pop() || '附件'
        return decodeURIComponent(seg)
      } catch {
        return '附件'
      }
    },

    isImageUrl(url) {
      if (!url) return false
      return /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(url)
    },

    // 处理任务完成事件
    handleTaskCompleted(data) {
      console.log('监听到任务完成:', data)
      // 如果当前在"进行中"标签，自动切换到"已完成"
      if (this.taskTab === 'pending') {
        this.$message.info(`${data.workerName} 完成了任务：${data.taskTitle}，已自动刷新`)
      }
      // 刷新任务列表
      this.fetchTasks()
    }
  }
}
</script>

<style lang="less" scoped>
.tasks-page {
  animation: fadeIn 0.3s ease-out;
}

.tasks-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 32px;
}

.task-form-section {
  .form-card {
    padding: 24px;
    position: sticky;
    top: 0;
    
    h3 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e5e7eb;
      
      i {
        color: #2563eb;
      }
    }
  }
  
  .full-width {
    width: 100%;
  }
  
  .submit-btn {
    width: 100%;
    height: 44px;
    font-size: 15px;
    font-weight: 600;
    margin-top: 8px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border: none;
  }
}

.task-list-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h3 {
      font-size: 16px;
      font-weight: 700;
      color: #e5e7eb;
    }
    
    .status-tabs {
      display: flex;
      gap: 8px;
      
      .tab {
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        background: #1c1c1c;
        color: #6b7280;
        transition: background 0.2s, color 0.2s;

        &.active {
          background: rgba(37, 99, 235, 0.15);
          color: #2563eb;
        }

        &:hover:not(.active) {
          color: #9ca3af;
        }
      }
    }
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  padding: 20px;
  transition: all 0.2s ease;
  border-left: 4px solid #2563eb;
  
  &:hover {
    border-color: #2563eb;
  }
  
  &.completed {
    border-left-color: #10b981;
    opacity: 0.8;
  }
  
  .task-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    
    .task-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      
      &.completed {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }
    }
    
    .task-info {
      flex: 1;
      
      h4 {
        font-size: 15px;
        font-weight: 600;
        color: #e5e7eb;
        margin-bottom: 4px;
      }
      
      p {
        font-size: 12px;
        color: #6b7280;
      }
    }
    
    .task-status {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      
      &.pending {
        background: rgba(37, 99, 235, 0.1);
        color: #2563eb;
      }
      
      &.completed {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }
    }
  }
  
  .task-content {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 12px;
    line-height: 1.6;
  }
  
  .task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .deadline {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
      
      i {
        color: #2563eb;
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #4b5563;
  
  i {
    font-size: 48px;
    margin-bottom: 12px;
  }
  
  p {
    font-size: 14px;
  }
}

.report-content {
  .report-header {
    margin-bottom: 20px;
    
    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 8px;
    }
    
    p {
      font-size: 13px;
      color: #6b7280;
    }
  }
  
  .report-body {
    background: #1c1c1c;
    border-radius: 12px;
    padding: 16px;
    
    h5 {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    p {
      font-size: 14px;
      color: #e5e7eb;
      line-height: 1.6;
    }
  }

  .report-attachments {
    margin-top: 16px;

    h5 {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 10px;
    }

    .no-file {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }

    .file-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .file-card {
      display: flex;
      align-items: stretch;
      gap: 14px;
      padding: 12px 14px;
      background: #1c1c1c;
      border-radius: 10px;
      border: 1px solid #2a2a2a;
    }

    .file-thumb-wrap {
      flex-shrink: 0;
      width: 72px;
      height: 72px;
      border-radius: 8px;
      overflow: hidden;
      background: #111;
    }

    .file-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .file-icon-wrap {
      flex-shrink: 0;
      width: 72px;
      height: 72px;
      border-radius: 8px;
      background: #252525;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 32px;
        color: #6b7280;
      }
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }

    .file-name {
      font-size: 14px;
      color: #e5e7eb;
      font-weight: 500;
      word-break: break-all;
      line-height: 1.4;
    }

    .file-download {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #10b981;
      text-decoration: none;
      font-weight: 600;

      &:hover {
        color: #34d399;
      }

      i {
        font-size: 14px;
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style lang="less">
.admin-task-detail-dialog {
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
    padding: 16px 20px 24px;
    color: #e5e7eb;
  }
}
</style>
