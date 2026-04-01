<template>
  <div class="attendance-page">
    <!-- 统计数据概览 -->
    <div class="stats-grid">
      <div class="stat-card dark-card">
        <div class="stat-icon blue">
          <i class="el-icon-user"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">本月出勤率</p>
          <p class="stat-value">{{ statsData.attendanceRate || 0 }}%</p>
        </div>
      </div>
      <div class="stat-card dark-card">
        <div class="stat-icon green">
          <i class="el-icon-circle-check"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">本日成功打卡</p>
          <p class="stat-value">{{ statsData.successCount || 0 }} 人</p>
        </div>
      </div>
      <div class="stat-card dark-card">
        <div class="stat-icon yellow">
          <i class="el-icon-warning"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">本日迟到人次</p>
          <p class="stat-value">{{ statsData.lateCount || 0 }} 人</p>
        </div>
      </div>
      <div class="stat-card dark-card">
        <div class="stat-icon red">
          <i class="el-icon-user-solid"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">本日缺勤人次</p>
          <p class="stat-value">{{ statsData.absentCount || 0 }} 人</p>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar dark-card">
      <div class="filter-items">
        <el-input
          v-model="filterForm.name"
          placeholder="搜索员工姓名或工号"
          prefix-icon="el-icon-search"
          class="filter-input search"
          clearable
          @clear="handleSearch"
          @keyup.enter.native="handleSearch"
        ></el-input>
      </div>
      <el-button type="primary" icon="el-icon-download" @click="handleExport">导出日报表</el-button>
    </div>

    <!-- 考勤表格 -->
    <div class="attendance-table dark-card">
      <el-table :data="attendanceList" v-loading="loading" class="dark-table">
        <el-table-column label="员工信息" min-width="180">
          <template slot-scope="scope">
            <div class="user-cell">
              <img :src="scope.row.photo || defaultAvatar" class="avatar" />
              <div class="user-info">
                <span class="name">{{ scope.row.name }}</span>
                <span class="username">#{{ scope.row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="position" label="岗位/部门" min-width="110">
          <template slot-scope="scope">
            {{ scope.row.position }} / {{ scope.row.department }}
          </template>
        </el-table-column>

        <el-table-column label="今日打卡" width="130">
          <template slot-scope="scope">
            <span :class="['status-tag', scope.row.todayStatus || 'absent']">
              <i :class="statusIcon(scope.row.todayStatus || 'absent')"></i>
              {{ statusText(scope.row.todayStatus || 'absent') }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="todayClockInTime" label="签到时间" width="120">
          <template slot-scope="scope">
            <span :class="{ 'text-muted': !scope.row.todayClockInTime }">
              {{ scope.row.todayClockInTime || '--:--:--' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="monthLateCount" label="本月迟到" width="110">
          <template slot-scope="scope">
            <span :class="{ 'text-warning': scope.row.monthLateCount > 0 }">
              {{ scope.row.monthLateCount || 0 }} 次
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="monthAbsentCount" label="本月缺勤" width="110">
          <template slot-scope="scope">
            <span :class="{ 'text-danger': scope.row.monthAbsentCount > 0 }">
              {{ scope.row.monthAbsentCount || 0 }} 次
            </span>
          </template>
        </el-table-column>

        <el-table-column label="管理操作" width="120" align="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="handleEdit(scope.row)">
              修改状态
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          @current-change="handlePageChange"
          :current-page="pagination.page"
          :page-size="pagination.size"
          layout="total, prev, pager, next"
          :total="pagination.total"
        ></el-pagination>
      </div>
    </div>

    <!-- 修改状态对话框 -->
    <el-dialog title="修改考勤状态" :visible.sync="dialogVisible" width="400px" class="dark-dialog">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="当前状态">
          <span class="status-tag" :class="editForm.clockInStatus">
            {{ statusText(editForm.clockInStatus) }}
          </span>
        </el-form-item>
        <el-form-item label="修改为">
          <el-radio-group v-model="editForm.newStatus" class="dark-radio-group">
            <el-radio label="success">正常打卡</el-radio>
            <el-radio label="late">迟到</el-radio>
            <el-radio label="absent">缺勤</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getAttendanceStats, getAttendanceList, updateAttendance, exportAttendance } from '@/api/attendance'
import socketService from '@/utils/socket'
import { getAvatarUrl } from '@/utils/avatar'

export default {
  name: 'AdminAttendance',
  data() {
    return {
      defaultAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      filterForm: {
        name: ''
      },
      statsData: {
        attendanceRate: 0,
        successCount: 0,
        lateCount: 0,
        absentCount: 0
      },
      attendanceList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      dialogVisible: false,
      editForm: {
        workerId: '',
        clockInStatus: '',
        newStatus: ''
      }
    }
  },
  created() {
    this.fetchStats()
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
        // 重新获取考勤列表，更新头像显示
        this.fetchData()
      })
    },
    removeSocketListeners() {
      // 移除监听
      socketService.off('avatar_updated')
    },
    async fetchStats() {
      try {
        const res = await getAttendanceStats()
        this.statsData = res.data
      } catch (error) {
        console.error('获取考勤统计失败:', error)
      }
    },

    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          name: this.filterForm.name
        }
        const res = await getAttendanceList(params)
        this.attendanceList = res.data.list
        this.pagination.total = res.data.total
      } catch (error) {
        console.error('获取考勤列表失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    statusIcon(status) {
      const icons = {
        success: 'el-icon-circle-check',
        late: 'el-icon-warning',
        absent: 'el-icon-close',
        none: 'el-icon-minus'
      }
      return icons[status] || ''
    },

    statusText(status) {
      const texts = {
        success: '正常打卡',
        late: '迟到',
        absent: '缺勤',
        none: '未打卡'
      }
      return texts[status] || '未知'
    },
    
    handleEdit(row) {
      this.editForm = {
        workerId: row.workerId,
        clockInStatus: row.todayStatus || 'none',
        newStatus: row.todayStatus || 'none'
      }
      this.dialogVisible = true
    },
    
    async handleSave() {
      if (this.editForm.newStatus === this.editForm.clockInStatus) {
        this.$message.warning('状态未改变')
        return
      }

      try {
        await updateAttendance({
          workerId: this.editForm.workerId,
          clockInStatus: this.editForm.newStatus
        })
        this.$message.success('修改成功')
        this.dialogVisible = false
        this.fetchStats()
        this.fetchData()
      } catch (error) {
        console.error('修改失败:', error)
      }
    },
    
    handlePageChange(page) {
      this.pagination.page = page
      this.fetchData()
    },

    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },

    handleExport() {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      exportAttendance(month)
    }
  }
}
</script>

<style lang="less" scoped>
.attendance-page {
  animation: fadeIn 0.3s ease-out;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  
  &.blue {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }
  &.green {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  &.yellow {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  &.red {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.stat-info {
  .stat-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #e5e7eb;
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 24px;
  
  .filter-items {
    display: flex;
    gap: 12px;
  }
  
  .filter-input {
    width: 160px;
    
    &.search {
      width: 220px;
    }
  }
}

.attendance-table {
  overflow: hidden;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
    
    .name {
      font-weight: 600;
      color: #e5e7eb;
    }
    
    .username {
      font-size: 11px;
      color: #6b7280;
      font-family: monospace;
    }
  }
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  
  &.success {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  
  &.late {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
  
  &.absent {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
}

.text-muted {
  color: #4b5563;
}

.text-warning {
  color: #f59e0b;
  font-weight: 600;
}

.text-danger {
  color: #ef4444;
  font-weight: 600;
}

.pagination-wrapper {
  padding: 16px 20px;
  border-top: 1px solid #262626;
  display: flex;
  justify-content: flex-end;
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

// 对话框黑色主题
.dark-dialog {
  /deep/ .el-dialog {
    background: #1a1a1a;
    border: 1px solid #333;
  }

  /deep/ .el-dialog__header {
    border-bottom: 1px solid #333;
  }

  /deep/ .el-dialog__title {
    color: #e5e7eb;
  }

  /deep/ .el-dialog__body {
    color: #d1d5db;
  }

  /deep/ .el-dialog__footer {
    border-top: 1px solid #333;
  }

  /deep/ .el-form-item__label {
    color: #d1d5db;
  }

  /deep/ .el-form-item {
    margin-bottom: 18px;
  }
}

// 单选框黑色主题
.dark-radio-group {
  /deep/ .el-radio {
    color: #d1d5db;
    margin-right: 16px;
  }

  /deep/ .el-radio__input.is-checked .el-radio__inner {
    background: #2563eb;
    border-color: #2563eb;
  }

  /deep/ .el-radio__input.is-checked + .el-radio__label {
    color: #60a5fa;
  }

  /deep/ .el-radio__inner {
    background: #2d2d2d;
    border-color: #444;
  }

  /deep/ .el-radio__inner:hover {
    border-color: #60a5fa;
  }
}

// 表格黑色主题
.dark-table {
  /deep/ .el-table__header-wrapper th {
    background: #1a1a1a !important;
    color: #9ca3af;
    border-bottom: 1px solid #333;
  }

  /deep/ .el-table__body-wrapper {
    background: #141414;
  }

  /deep/ .el-table__body tr {
    background: #1a1a1a;
    &:hover > td {
      background: #252525 !important;
    }
  }

  /deep/ .el-table__body td {
    border-bottom: 1px solid #262626;
    color: #e5e7eb;
  }

  /deep/ .el-table__empty-block {
    background: #1a1a1a;
  }

  /deep/ .el-table__empty-text {
    color: #6b7280;
  }
}
</style>
