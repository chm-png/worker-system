const FriendRelation = require('../models/FriendRelation')
const ChatRecord = require('../models/ChatRecord')
const User = require('../models/User')
const mongoose = require('mongoose')

/**
 * 生成聊天会话ID（两个用户ID按字典序拼接）
 */
function generateChatId(userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort()
  return `${sorted[0]}_${sorted[1]}`
}

/**
 * 搜索好友
 */
async function searchFriends(req, res) {
  try {
    const { keyword } = req.query
    const userId = req.userId

    console.log('searchFriends - userId:', userId, 'keyword:', keyword)

    // 搜索除了自己之外的所有员工
    const workers = await User.find({
      _id: { $ne: userId },
      role: 'worker',
      status: true,
      $or: [
        { username: { $regex: keyword || '', $options: 'i' } },
        { name: { $regex: keyword || '', $options: 'i' } }
      ]
    }).select('_id name username photo position department phone onlineStatus')

    console.log('searchFriends - found workers:', workers.length)

    res.json({
      code: 200,
      msg: '获取成功',
      data: workers
    })
  } catch (error) {
    console.error('Search friends error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取好友列表
 */
async function getFriends(req, res) {
  try {
    const userId = req.userId

    // 找到所有已同意的好友关系
    const relations = await FriendRelation.find({
      $or: [
        { userId: userId, status: 'agreed' },
        { friendId: userId, status: 'agreed' }
      ]
    }).populate('userId friendId', '_id name username photo position department onlineStatus')

    // 格式化好友列表（过滤掉孤立记录）
    const friends = relations
      .filter(rel => rel.userId && rel.friendId)
      .map(rel => {
        const friend = rel.userId._id.toString() === userId.toString() ? rel.friendId : rel.userId
        return {
          friendId: friend._id,
          name: friend.name,
          username: friend.username,
          photo: friend.photo,
          position: friend.position,
          department: friend.department,
          onlineStatus: friend.onlineStatus
        }
      })

    res.json({
      code: 200,
      msg: '获取成功',
      data: friends
    })
  } catch (error) {
    console.error('Get friends error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取待处理的好友请求
 */
async function getPendingRequests(req, res) {
  try {
    const userId = req.userId

    // 找到发给当前用户的好友请求（状态为 pending）
    const relations = await FriendRelation.find({
      friendId: userId,
      status: 'pending'
    }).populate('userId', '_id name username photo position department')

    const requests = relations.map(rel => ({
      requestId: rel._id,
      userId: rel.userId._id,
      name: rel.userId.name,
      username: rel.userId.username,
      photo: rel.userId.photo,
      position: rel.userId.position,
      department: rel.userId.department,
      createdAt: rel.createdAt
    }))

    res.json({
      code: 200,
      msg: '获取成功',
      data: requests
    })
  } catch (error) {
    console.error('Get pending requests error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 发送添加好友请求
 */
async function sendFriendRequest(req, res) {
  try {
    const userId = req.userId
    const { friendId } = req.body

    console.log('sendFriendRequest - userId:', userId, 'friendId:', friendId)

    if (!friendId) {
      return res.status(400).json({
        code: 400,
        msg: '好友ID不能为空',
        data: null
      })
    }

    // 验证 friendId 格式
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.log('sendFriendRequest - invalid ObjectId format')
      return res.status(400).json({
        code: 400,
        msg: '无效的好友ID',
        data: null
      })
    }

    // 转换为 ObjectId
    const targetFriendId = new mongoose.Types.ObjectId(friendId)
    const targetStr = targetFriendId.toString()
    const userStr = userId.toString()

    if (userStr === targetStr) {
      return res.status(400).json({
        code: 400,
        msg: '不能添加自己为好友',
        data: null
      })
    }

    // 检查目标用户是否存在
    const targetUser = await User.findById(targetFriendId)
    if (!targetUser) {
      return res.status(404).json({
        code: 404,
        msg: '用户不存在',
        data: null
      })
    }

    // 检查是否已存在关系
    const existingRelation = await FriendRelation.findOne({
      $or: [
        { userId: userId, friendId: targetFriendId },
        { userId: targetFriendId, friendId: userId }
      ]
    })

    console.log('sendFriendRequest - existingRelation:', existingRelation)

    if (existingRelation) {
      // 如果已经是好友
      if (existingRelation.status === 'agreed') {
        return res.status(400).json({
          code: 400,
          msg: '你们已经是好友了',
          data: null
        })
      }
      // 如果有待处理的好友请求
      if (existingRelation.status === 'pending') {
        // 检查是谁发起的请求
        if (existingRelation.userId.toString() === userStr) {
          return res.status(400).json({
            code: 400,
            msg: '已发送过好友请求，请等待对方处理',
            data: null
          })
        } else {
          return res.status(400).json({
            code: 400,
            msg: '对方已发送过好友请求，请先处理',
            data: null
          })
        }
      }
      // 如果是被拒绝的关系，更新为新的请求
      if (existingRelation.status === 'rejected') {
        existingRelation.status = 'pending'
        existingRelation.userId = userId
        existingRelation.friendId = targetFriendId
        existingRelation.agreeTime = null
        await existingRelation.save()
        
        // 获取用户信息用于推送
        const user = await User.findById(userId).select('name photo')
        
        // 通过 Socket 推送好友请求
        const io = req.app.get('io')
        if (io) {
          io.to(targetStr).emit('friend_request', {
            userId: userId,
            name: user.name,
            photo: user.photo
          })
        }
        
        return res.json({
          code: 200,
          msg: '好友请求已发送',
          data: { status: 'pending' }
        })
      }
    }

    // 创建好友关系
    const relation = new FriendRelation({
      userId,
      friendId: targetFriendId,
      status: 'pending'
    })

    await relation.save()
    console.log('sendFriendRequest - relation created:', relation._id)

    // 获取用户信息用于推送
    const user = await User.findById(userId).select('name photo')

    // 通过 Socket 推送好友请求
    const io = req.app.get('io')
    if (io) {
      io.to(targetStr).emit('friend_request', {
        userId: userId,
        name: user.name,
        photo: user.photo
      })
    }

    res.json({
      code: 200,
      msg: '好友请求已发送',
      data: { status: 'pending' }
    })
  } catch (error) {
    console.error('Send friend request error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误: ' + error.message,
      data: null
    })
  }
}

/**
 * 处理好友请求（同意/拒绝）
 */
async function handleFriendRequest(req, res) {
  try {
    const userId = req.userId
    const { requesterId, action } = req.body
    
    // 找到好友请求
    const relation = await FriendRelation.findOne({
      userId: requesterId,
      friendId: userId,
      status: 'pending'
    })
    
    if (!relation) {
      return res.status(404).json({
        code: 404,
        msg: '好友请求不存在或已处理',
        data: null
      })
    }
    
    if (action === 'agree') {
      relation.status = 'agreed'
      relation.agreeTime = new Date()
      await relation.save()
      
      // 获取用户信息用于推送
      const user = await User.findById(userId).select('name photo')
      
      // 推送同意消息
      const io = req.app.get('io')
      if (io) {
        io.to(requesterId.toString()).emit('friend_agreed', {
          friendId: userId,
          name: user.name,
          photo: user.photo
        })
      }
      
      res.json({
        code: 200,
        msg: '已同意好友请求',
        data: { status: 'agreed' }
      })
    } else if (action === 'reject') {
      relation.status = 'rejected'
      await relation.save()
      
      // 推送拒绝消息
      const io = req.app.get('io')
      if (io) {
        io.to(requesterId.toString()).emit('friend_rejected', {
          friendId: userId
        })
      }
      
      res.json({
        code: 200,
        msg: '已拒绝好友请求',
        data: { status: 'rejected' }
      })
    } else {
      res.status(400).json({
        code: 400,
        msg: '无效的操作',
        data: null
      })
    }
  } catch (error) {
    console.error('Handle friend request error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取聊天历史记录
 */
async function getChatHistory(req, res) {
  try {
    const { chatId, page = 1, size = 50 } = req.query
    const userId = req.userId
    
    const skip = (parseInt(page) - 1) * parseInt(size)
    
    const records = await ChatRecord.find({ chatId })
      .populate('senderId', 'name photo')
      .sort({ sendTime: -1 })
      .skip(skip)
      .limit(parseInt(size))
    
    // 将消息标记为已读
    await ChatRecord.updateMany(
      { chatId, receiverId: userId, isRead: false },
      { isRead: true }
    )
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: records.reverse().map(item => ({
        _id: item._id,
        chatId: item.chatId,
        senderId: item.senderId?._id,
        senderName: item.senderId?.name,
        senderPhoto: item.senderId?.photo,
        receiverId: item.receiverId,
        content: item.content,
        isRead: item.isRead,
        sendTime: item.sendTime
      }))
    })
  } catch (error) {
    console.error('Get chat history error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 发送聊天消息（通过 Socket，存储到数据库）
 */
async function sendMessage(req, res) {
  try {
    const senderId = req.userId
    const { receiverId, content } = req.body
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        code: 400,
        msg: '消息内容不能为空',
        data: null
      })
    }
    
    if (content.length > 500) {
      return res.status(400).json({
        code: 400,
        msg: '消息内容不能超过500字',
        data: null
      })
    }
    
    const chatId = generateChatId(senderId, receiverId)
    const sendTime = new Date()
    
    // 存储消息
    const chatRecord = new ChatRecord({
      chatId,
      senderId,
      receiverId,
      content: content.trim(),
      sendTime,
      isRead: false
    })
    
    await chatRecord.save()
    
    // 获取发送者信息
    const sender = await User.findById(senderId).select('name photo')
    
    // 通过 Socket 推送消息
    const io = req.app.get('io')
    if (io) {
      const messageData = {
        _id: chatRecord._id,
        chatId,
        senderId,
        senderName: sender.name,
        senderPhoto: sender.photo,
        receiverId,
        content: content.trim(),
        sendTime
      }
      
      // 发送给接收者
      io.to(receiverId.toString()).emit('chat_message', messageData)
      // 发回给发送者确认
      io.to(senderId.toString()).emit('chat_message_ack', messageData)
    }
    
    res.json({
      code: 200,
      msg: '发送成功',
      data: {
        _id: chatRecord._id,
        chatId,
        senderId,
        senderName: sender.name,
        content: content.trim(),
        sendTime
      }
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

module.exports = {
  searchFriends,
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  handleFriendRequest,
  getChatHistory,
  sendMessage
}
