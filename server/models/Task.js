const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskTitle: {
    type: String,
    required: true,
    trim: true
  },
  taskContent: {
    type: String,
    default: ''
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  finishReport: {
    type: String,
    default: null
  },
  uploadFileUrl: {
    type: String,
    default: null
  },
  /** 附件列表：存储对外 URL 与工人上传时的原始文件名 */
  uploadAttachments: [{
    url: { type: String, required: true },
    originalName: { type: String, default: '' }
  }],
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// 索引
taskSchema.index({ taskId: 1 }, { unique: true })
taskSchema.index({ workerId: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model('Task', taskSchema)
