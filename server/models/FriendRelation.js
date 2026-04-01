const mongoose = require('mongoose')

const friendRelationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'agreed', 'rejected'],
    default: 'pending'
  },
  agreeTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// 普通索引（不使用唯一约束，因为 A-B 和 B-A 会被视为不同关系）
friendRelationSchema.index({ userId: 1 })
friendRelationSchema.index({ friendId: 1 })
friendRelationSchema.index({ status: 1 })

module.exports = mongoose.model('FriendRelation', friendRelationSchema)
