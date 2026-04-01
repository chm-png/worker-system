<template>
  <div class="employees-page">
    <div class="page-header">
      <div>
        <h3>全体员工名册</h3>
        <p>当前共有 {{ totalCount }} 名员工在职</p>
      </div>
      <el-button type="primary" icon="el-icon-plus" @click="showAddDialog">录入员工</el-button>
    </div>

    <div class="employees-grid">
      <div
        v-for="worker in workers"
        :key="worker._id"
        class="employee-card dark-card"
        :class="{ expanded: expandedId === worker._id }"
      >
        <div class="card-header" @click="toggleExpand(worker._id)">
          <div class="avatar-wrapper">
            <img :src="worker.photo || defaultAvatar" class="avatar" />
            <span class="online-status" :class="{ online: worker.onlineStatus }"></span>
          </div>
          <h4>{{ worker.name }}</h4>
          <p class="position">{{ worker.position }}</p>
          <i class="expand-icon el-icon-arrow-right" :class="{ rotated: expandedId === worker._id }"></i>
        </div>
        <div class="card-info">
          <div class="info-item">
            <span class="label">工号</span>
            <span class="value">{{ worker.username }}</span>
          </div>
          <div class="info-item">
            <span class="label">部门</span>
            <span class="value">{{ worker.department }}</span>
          </div>
        </div>

        <!-- 展开的详情 -->
        <div class="card-detail" v-show="expandedId === worker._id">
          <div class="info-item">
            <span class="label">联系电话</span>
            <span class="value">{{ worker.phone || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="label">入职时间</span>
            <span class="value">{{ formatDate(worker.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">账号状态</span>
            <span class="value" :class="worker.status ? 'text-success' : 'text-danger'">
              {{ worker.status ? '启用' : '禁用' }}
            </span>
          </div>
        </div>

        <el-button class="detail-btn" size="small" @click="toggleExpand(worker._id)">
          {{ expandedId === worker._id ? '收起详情' : '查看详情' }}
        </el-button>
      </div>
    </div>

    <!-- 录入员工对话框 -->
    <el-dialog title="录入新员工" :visible.sync="addDialogVisible" width="500px" :close-on-click-modal="false">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="90px">
        <el-form-item label="员工姓名" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入员工姓名"></el-input>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="addForm.phone" placeholder="请输入手机号码" maxlength="11"></el-input>
        </el-form-item>
        <el-form-item label="所属部门" prop="department">
          <el-select v-model="addForm.department" placeholder="请选择部门" class="full-width">
            <el-option label="工程一部" value="工程一部"></el-option>
            <el-option label="工程二部" value="工程二部"></el-option>
            <el-option label="行政部" value="行政部"></el-option>
            <el-option label="质检组" value="质检组"></el-option>
            <el-option label="综合管理部" value="综合管理部"></el-option>
            <el-option label="财务部" value="财务部"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="岗位" prop="position">
          <el-input v-model="addForm.position" placeholder="请输入岗位名称"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="submitting">确认录入</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getWorkers, addWorker } from '@/api/user'
import socketService from '@/utils/socket'
import { getAvatarUrl } from '@/utils/avatar'

export default {
  name: 'AdminEmployees',
  data() {
    const validatePhone = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入手机号'))
      } else if (!/^1[3-9]\d{9}$/.test(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    }
    return {
      defaultAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      workers: [],
      totalCount: 0,
      expandedId: null,
      addDialogVisible: false,
      submitting: false,
      addForm: {
        name: '',
        phone: '',
        department: '',
        position: ''
      },
      addRules: {
        name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
        phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
        department: [{ required: true, message: '请选择部门', trigger: 'change' }],
        position: [{ required: true, message: '请输入岗位', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchData()
    this.initSocket()
  },
  beforeDestroy() {
    this.removeSocketListeners()
  },
  methods: {
    getAvatarUrl,

    initSocket() {
      // 连接Socket
      socketService.connect(this.$store.state.user.token)
      // 添加头像更新监听
      this.addSocketListeners()
    },
    addSocketListeners() {
      // 监听头像更新事件
      socketService.on('avatar_updated', () => {
        // 重新获取员工列表，更新头像显示
        this.fetchData()
      })
    },
    removeSocketListeners() {
      // 移除监听
      socketService.off('avatar_updated')
    },
    async fetchData() {
      try {
        const res = await getWorkers()
        this.workers = res.data
        this.totalCount = res.data.length
      } catch (error) {
        console.error('获取员工列表失败:', error)
      }
    },

    toggleExpand(id) {
      this.expandedId = this.expandedId === id ? null : id
    },

    formatDate(date) {
      if (!date) return '暂无'
      const d = new Date(date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    showAddDialog() {
      this.addDialogVisible = true
      this.addForm = {
        name: '',
        phone: '',
        department: '',
        position: ''
      }
      if (this.$refs.addFormRef) {
        this.$refs.addFormRef.clearValidate()
      }
    },

    async handleAdd() {
      try {
        await this.$refs.addFormRef.validate()
        this.submitting = true
        await addWorker(this.addForm)
        this.$message.success('员工录入成功！初始密码为123456')
        this.addDialogVisible = false
        this.fetchData()
      } catch (error) {
        if (error !== false) {
          console.error('录入失败:', error)
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.employees-page {
  animation: fadeIn 0.3s ease-out;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #e5e7eb;
    margin-bottom: 4px;
  }

  p {
    font-size: 13px;
    color: #6b7280;
  }

  .el-button--primary {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border: none;
  }
}

.employees-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.employee-card {
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #2563eb;
  }

  &.expanded {
    border-color: #10b981;
  }
}

.card-header {
  text-align: center;
  margin-bottom: 20px;
  cursor: pointer;
  position: relative;

  .avatar-wrapper {
    position: relative;
    display: inline-block;
    margin-bottom: 12px;

    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      border: 3px solid #262626;
      transition: border-color 0.3s;
    }

    .online-status {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: #6b7280;
      border: 3px solid #161616;
      border-radius: 50%;

      &.online {
        background: #10b981;
      }
    }
  }

  h4 {
    font-size: 16px;
    font-weight: 700;
    color: #e5e7eb;
    margin-bottom: 4px;
  }

  .position {
    font-size: 13px;
    color: #2563eb;
    font-weight: 500;
  }

  .expand-icon {
    position: absolute;
    top: 10px;
    right: 10px;
    color: #6b7280;
    transition: transform 0.3s ease;

    &.rotated {
      transform: rotate(90deg);
      color: #10b981;
    }
  }
}

.card-info {
  background: #1c1c1c;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;

    &:not(:last-child) {
      border-bottom: 1px solid #262626;
    }

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .value {
      font-size: 12px;
      color: #e5e7eb;
      font-weight: 500;
    }
  }
}

.card-detail {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #262626;
  animation: slideDown 0.3s ease;

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;

    &:not(:last-child) {
      border-bottom: 1px solid #333;
    }

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .value {
      font-size: 12px;
      color: #e5e7eb;
      font-weight: 500;

      &.text-success {
        color: #10b981;
      }

      &.text-danger {
        color: #ef4444;
      }
    }
  }
}

.detail-btn {
  width: 100%;
  background: #222;
  border: none;
  color: #9ca3af;

  &:hover {
    background: #10b981;
    color: white;
  }
}

.full-width {
  width: 100%;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 200px;
    transform: translateY(0);
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
