const mongoose = require('mongoose')

const chatRecordSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  isRead: {
    type: Boolean,
    default: false
  },
  sendTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 复合索引
chatRecordSchema.index({ chatId: 1, sendTime: -1 })
chatRecordSchema.index({ receiverId: 1, isRead: 1 })

module.exports = mongoose.model('ChatRecord', chatRecordSchema)
