<template>
  <div class="tasks-page">
    <!-- 左侧日期选择侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>历史任务</h3>
      </div>
      <div class="date-selector">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          :disabled-date="disabledDate"
          @change="fetchHistoricalTasks"
          class="date-picker"
        ></el-date-picker>
      </div>
      <div class="date-info">
        <p>注册日期: {{ formatDate(registrationDate) }}</p>
        <p>当前选择: {{ formatDate(selectedDate) }}</p>
      </div>
    </div>

    <!-- 右侧任务内容 -->
    <div class="content-area">
      <div class="page-header">
        <div>
          <h2>{{ isHistoricalView ? selectedDate ? formatDate(selectedDate) + ' 任务' : '历史任务' : '今日待办任务' }}</h2>
          <p class="date-info">
            <span class="socket-status">
              <i class="el-icon-circle-check"></i>
              {{ currentDate }} 已连接
            </span>
          </p>
        </div>
      </div>

      <div class="tasks-list">
        <div
          v-for="task in displayTasks"
          :key="task._id"
          class="task-card dark-card"
          :class="{ completed: task.status === 'completed', unread: !task.isRead && task.status === 'pending' }"
        >
          <div class="task-badge" v-if="!task.isRead && task.status === 'pending'">
            <span class="unread-dot"></span>
          </div>
          
          <div class="task-priority" v-if="task.status === 'pending'">
            <span class="badge" :class="getPriority(task.deadline)">{{ getPriority(task.deadline) === 'urgent' ? '紧急' : '常规' }}</span>
          </div>
          
          <div class="task-content">
            <h3>{{ task.taskTitle }}</h3>
            <p v-if="task.taskContent">{{ task.taskContent }}</p>
            
            <div class="task-meta">
              <span><i class="el-icon-time"></i> 截止: {{ formatDateTime(task.deadline) }}</span>
            </div>
          </div>
          
          <div class="task-actions">
            <span class="task-status" :class="task.status">
              {{ task.status === 'completed' ? '已完成' : (task.status === 'pending' ? '待完成' : '未开始') }}
            </span>
            <el-button
              v-if="task.status === 'pending' && !isHistoricalView"
              type="primary"
              size="small"
              @click="openSubmitDialog(task)"
            >
              提交报告
            </el-button>
          </div>
        </div>

        <div v-if="displayTasks.length === 0" class="empty-state">
          <i class="el-icon-document-checked"></i>
          <p>{{ isHistoricalView ? selectedDate ? '该日期暂无任务' : '请选择日期查看历史任务' : '今日暂无任务' }}</p>
        </div>
      </div>
    </div>

    <!-- 提交报告对话框 -->
    <el-dialog title="提交任务报告" :visible.sync="dialogVisible" width="500px" :close-on-click-modal="false">
      <el-form :model="reportForm" label-position="top">
        <el-form-item label="任务名称">
          <p class="task-title-preview">{{ reportForm.taskTitle }}</p>
        </el-form-item>
        
        <el-form-item label="工作描述 (必填)">
          <el-input
            v-model="reportForm.finishReport"
            type="textarea"
            :rows="5"
            placeholder="请详细描述已完成的工作内容及检测结果..."
          ></el-input>
        </el-form-item>
        
        <el-form-item label="附件/照片">
          <el-upload
            class="upload-area"
            ref="uploadRef"
            :auto-upload="false"
            :limit="10"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
            :headers="uploadHeaders"
            :on-change="handleFileChange"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            action="/api/upload/task"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">点击上传或拖拽文件到此处<br><small>支持图片、PDF、Word（可多选）</small></div>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="success" @click="handleSubmit" :loading="submitting">确认提交</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { finishTask, markTaskRead } from '@/api/task'
import request from '@/api/request'

export default {
  name: 'WorkerTasks',
  data() {
    return {
      currentDate: this.getCurrentDate(),
      dialogVisible: false,
      reportForm: {
        taskId: '',
        taskTitle: '',
        finishReport: '',
        uploadFileUrl: ''
      },
      submitting: false,
      uploadUrl: '/api/upload/task',
      uploadHeaders: {
        Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`
      },
      fileList: [],
      uploadingFiles: [],
      selectedDate: null,
      registrationDate: null, // 从用户信息中获取注册日期
      historicalTasks: []
    }
  },
  computed: {
    ...mapState('task', ['tasks']),
    ...mapState('attendance', ['todayAttendance']),
    ...mapState('user', ['userInfo']),
    isHistoricalView() {
      return this.selectedDate !== null
    },
    displayTasks() {
      return this.isHistoricalView ? this.historicalTasks : this.tasks
    }
  },
  created() {
    this.fetchData()
    this.initRegistrationDate()
  },
  methods: {
    ...mapActions('task', ['getMyTasks']),
    
    async fetchData() {
      await this.getMyTasks()
      await this.$store.dispatch('attendance/getTodayAttendance')
    },
    
    initRegistrationDate() {
      // 从用户信息中获取注册日期
      if (this.userInfo?.createdAt) {
        this.registrationDate = new Date(this.userInfo.createdAt)
      } else {
        // 如果用户信息中没有注册日期，使用一个合理的默认值（例如当前日期的30天前）
        const defaultDate = new Date()
        defaultDate.setDate(defaultDate.getDate() - 30)
        this.registrationDate = defaultDate
      }
    },
    
    getCurrentDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    
    getPriority(deadline) {
      if (!deadline) return 'normal'
      const now = new Date()
      const deadlineDate = new Date(deadline)
      const diffHours = (deadlineDate - now) / (1000 * 60 * 60)
      return diffHours < 8 ? 'urgent' : 'normal'
    },
    
    formatDateTime(date) {
      if (!date) return ''
      const d = new Date(date)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hours = d.getHours()
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${month}月${day}日 ${hours}:${minutes}`
    },
    
    disabledDate(time) {
      // 禁用注册日期之前的日期
      return time.getTime() < this.registrationDate.getTime()
    },
    
    async fetchHistoricalTasks() {
      if (!this.selectedDate) {
        this.historicalTasks = []
        return
      }
      
      try {
        // 调用历史任务接口
        const res = await request.get('/tasks/history', {
          params: {
            date: this.formatDate(this.selectedDate)
          }
        })
        this.historicalTasks = res.data.tasks || []
      } catch (error) {
        console.error('获取历史任务失败:', error)
        // 提供更友好的错误提示
        if (error.response && error.response.status === 404) {
          this.$message.info('历史任务查询功能暂未开放')
        } else if (error.response && error.response.status === 400) {
          this.$message.warning('请选择有效的日期')
        } else {
          this.$message.error('获取历史任务失败，请稍后重试')
        }
        this.historicalTasks = []
      }
    },
    
    async openSubmitDialog(task) {
      // 先标记为已读
      if (!task.isRead) {
        await markTaskRead(task.taskId)
        task.isRead = true
      }
      
      this.reportForm = {
        taskId: task.taskId,
        taskTitle: task.taskTitle,
        finishReport: '',
        uploadFileUrl: ''
      }
      this.fileList = []
      this.uploadingFiles = []
      this.dialogVisible = true
    },
    
    beforeUpload(file) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      const isWord = file.type === 'application/msword' ||
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      if (!isImage && !isPdf && !isWord) {
        this.$message.error('只支持上传图片、PDF、Word文件')
        return false
      }

      const isLt100M = file.size / 1024 / 1024 < 100
      if (!isLt100M) {
        this.$message.error('文件大小不能超过 100MB')
        return false
      }

      return true
    },
    
    handleUploadSuccess(response, file) {
      this.reportForm.uploadFileUrl = response.data?.url || ''
      this.$message.success('文件上传成功')
    },
    
    handleFileChange(file, list) {
      // 过滤类型不匹配的文件（前端兜底）
      this.fileList = list.filter(f => {
        const ok = this.validateFileType(f.raw)
        if (!ok) this.$message.warning(`文件 "${f.name}" 类型不支持，已忽略`)
        return ok
      })
    },

    handleFileRemove(file, list) {
      this.fileList = list
    },

    validateFileType(file) {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      return allowed.includes(file.type)
    },

    /** 手动上传文件列表，返回 URL 串与原始文件名元数据（供管理端展示） */
    async uploadFiles() {
      if (this.fileList.length === 0) {
        return { uploadFileUrl: '', uploadAttachments: [] }
      }
      const attachments = []
      for (const item of this.fileList) {
        const formData = new FormData()
        formData.append('file', item.raw)
        try {
          const res = await request.post('/upload/task', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          const url = res.data.url
          const originalName = (res.data.originalname || item.name || '').trim()
          attachments.push({ url, originalName })
        } catch (err) {
          console.error('文件上传失败:', err)
          throw new Error(`文件 "${item.name}" 上传失败`)
        }
      }
      return {
        uploadFileUrl: attachments.map((a) => a.url).join(','),
        uploadAttachments: attachments
      }
    },

    handleUploadError() {
      this.$message.error('文件上传失败')
    },
    
    async handleSubmit() {
      if (!this.reportForm.finishReport.trim()) {
        this.$message.warning('请填写工作描述')
        return
      }

      this.submitting = true
      try {
        // 先上传所有附件，再提交任务（附带原始文件名）
        const { uploadFileUrl, uploadAttachments } = await this.uploadFiles()
        await finishTask({
          taskId: this.reportForm.taskId,
          finishReport: this.reportForm.finishReport,
          uploadFileUrl,
          uploadAttachments
        })
        this.$message.success('报告提交成功！管理员将收到实时推送。')
        this.dialogVisible = false
        await this.getMyTasks()
      } catch (error) {
        if (error.message) this.$message.error(error.message)
        console.error('提交失败:', error)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.tasks-page {
  height: 100%;
  display: flex;
  overflow: hidden;
}

/* 左侧侧边栏 */
.sidebar {
  width: 280px;
  background: #111;
  border-right: 1px solid #262626;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  .sidebar-header {
    h3 {
      font-size: 16px;
      font-weight: 700;
      color: #e5e7eb;
      margin: 0;
    }
  }
  
  .date-selector {
    .date-picker {
      width: 100%;
      
      :deep(.el-date-editor) {
        width: 100%;
        
        .el-input__inner {
          background: #1a1a1a;
          border: 1px solid #333;
          color: #e5e7eb;
          
          &:focus {
            border-color: #10b981;
          }
        }
        
        .el-input__suffix-inner {
          color: #6b7280;
          
          i {
            &:hover {
              color: #10b981;
            }
          }
        }
      }
    }
  }
  
  .date-info {
    margin-top: auto;
    
    p {
      font-size: 12px;
      color: #6b7280;
      margin: 8px 0;
      
      &:first-child {
        color: #10b981;
      }
    }
  }
}

/* 右侧内容区域 */
.content-area {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-header,
.tasks-list {
  width: 100%;
  max-width: 800px;
}

.page-header {
  margin-bottom: 32px;
  
  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #e5e7eb;
    margin-bottom: 8px;
  }
  
  .date-info {
    .socket-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 12px;
      border-radius: 16px;
      
      i {
        font-size: 14px;
      }
    }
  }
}

.tasks-list {
  max-width: 800px;
}

.task-card {
  position: relative;
  padding: 24px;
  margin-bottom: 16px;
  border-left: 4px solid #2563eb;
  transition: all 0.2s ease;
  
  &.completed {
    border-left-color: #10b981;
    opacity: 0.7;
    
    .task-content h3 {
      text-decoration: line-through;
      color: #6b7280;
    }
  }
  
  &.unread {
    background: rgba(37, 99, 235, 0.03);
  }
}

.task-badge {
  position: absolute;
  top: 24px;
  right: 24px;
  
  .unread-dot {
    width: 10px;
    height: 10px;
    background: #ef4444;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  }
}

.task-priority {
  margin-bottom: 12px;
  
  .badge {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    
    &.urgent {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    &.normal {
      background: rgba(107, 114, 128, 0.1);
      color: #6b7280;
      border: 1px solid rgba(107, 114, 128, 0.2);
    }
  }
}

.task-content {
  margin-bottom: 20px;
  
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #e5e7eb;
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 16px;
  }
  
  .task-meta {
    display: flex;
    gap: 20px;
    
    span {
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

.task-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .task-status {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    
    &.pending {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
    
    &.completed {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
  }
  
  .el-button--primary {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border: none;
  }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  
  i {
    font-size: 64px;
    color: #10b981;
    margin-bottom: 16px;
  }
  
  p {
    font-size: 16px;
    color: #6b7280;
  }
}

.task-title-preview {
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
  padding: 12px;
  background: #1c1c1c;
  border-radius: 8px;
}

.upload-area {
  width: 100%;
  
  :deep(.el-upload-dragger) {
    background: #1c1c1c;
    border-color: #333;
    
    &:hover {
      border-color: #10b981;
    }
  }
  
  i {
    font-size: 40px;
    color: #6b7280;
    margin-bottom: 8px;
  }
}

.el-button--success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}
</style>
