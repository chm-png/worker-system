const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'worker'],
    required: true,
    default: 'worker'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: true
  },
  onlineStatus: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// 创建索引
userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ role: 1 })
userSchema.index({ onlineStatus: 1 })

module.exports = mongoose.model('User', userSchema)
