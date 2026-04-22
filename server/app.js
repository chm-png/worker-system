const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')

// 加载环境变量
dotenv.config()

const config = require('./config')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const User = require('./models/User')
const { encryptPwd } = require('./utils/password')
const { verifyAccessToken } = require('./utils/jwt')

// 导入路由
const userRoutes = require('./routes/user')
const attendanceRoutes = require('./routes/attendance')
const taskRoutes = require('./routes/task')
const chatRoutes = require('./routes/chat')
const uploadRoutes = require('./routes/upload')

// 创建 Express 应用
const app = express()
const server = http.createServer(app)

// Socket.io 配置
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// 将 io 实例挂载到 app 上，供控制器使用
app.set('io', io)

// 中间件
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use('/uploads', express.static(config.uploadPath))

// API 路由
app.use('/api', userRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/upload', uploadRoutes)

// 根路由
app.get('/', (req, res) => {
  res.json({
    code: 200,
    msg: '智工云系统 API 服务运行中',
    data: {
      version: '1.0.0',
      time: new Date().toISOString()
    }
  })
})

// 错误处理
app.use(notFoundHandler)
app.use(errorHandler)

// Socket.io 连接处理
io.on('connection', async (socket) => {
  console.log('新的 Socket 连接:', socket.id)
  
  try {
    // 获取 token 并验证
    const token = socket.handshake.query.token
    if (!token) {
      console.log('Socket 连接缺少 token')
      socket.disconnect()
      return
    }
    
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      console.log('Socket token 无效')
      socket.disconnect()
      return
    }
    
    // 将用户信息挂载到 socket
    socket.userId = decoded.userId
    socket.role = decoded.role
    
    // 加入用户房间
    socket.join(decoded.userId)
    
    // 更新用户在线状态
    await User.findByIdAndUpdate(decoded.userId, { onlineStatus: true })
    
    console.log(`用户 ${decoded.userId} (${decoded.role}) 已连接`)
    
    // 推送在线状态给好友
    const FriendRelation = require('./models/FriendRelation')
    const ChatRecord = require('./models/ChatRecord')
    
    // 找到该用户的所有好友
    const relations = await FriendRelation.find({
      $or: [
        { userId: decoded.userId, status: 'agreed' },
        { friendId: decoded.userId, status: 'agreed' }
      ]
    })
    
    relations.forEach(rel => {
      const friendId = rel.userId.toString() === decoded.userId 
        ? rel.friendId 
        : rel.userId
      io.to(friendId.toString()).emit('online_status', {
        userId: decoded.userId,
        friendId: friendId,
        onlineStatus: true
      })
    })
    
    // 推送离线消息
    const unreadMessages = await ChatRecord.find({
      receiverId: decoded.userId,
      isRead: false
    }).sort({ sendTime: 1 })
    
    if (unreadMessages.length > 0) {
      socket.emit('offline_messages', unreadMessages)
    }
    
  } catch (error) {
    console.error('Socket 认证错误:', error)
    socket.disconnect()
  }
  
  // 断开连接
  socket.on('disconnect', async () => {
    console.log(`用户 ${socket.userId} 已断开连接`)
    
    if (socket.userId) {
      try {
        // 更新离线状态
        await User.findByIdAndUpdate(socket.userId, { onlineStatus: false })
        
        // 推送离线状态给好友
        const FriendRelation = require('./models/FriendRelation')
        const relations = await FriendRelation.find({
          $or: [
            { userId: socket.userId, status: 'agreed' },
            { friendId: socket.userId, status: 'agreed' }
          ]
        })
        
        relations.forEach(rel => {
          const friendId = rel.userId.toString() === socket.userId 
            ? rel.friendId 
            : rel.userId
          io.to(friendId.toString()).emit('online_status', {
            userId: socket.userId,
            friendId: friendId,
            onlineStatus: false
          })
        })
      } catch (error) {
        console.error('更新离线状态错误:', error)
      }
    }
  })
  
  // 标记消息已读
  socket.on('message_read', async (data) => {
    try {
      const { chatId, senderId } = data
      const receiverId = socket.userId
      
      const ChatRecord = require('./models/ChatRecord')
      await ChatRecord.updateMany(
        { chatId, senderId, receiverId, isRead: false },
        { isRead: true }
      )
      
      // 通知发送者
      io.to(senderId.toString()).emit('message_read', {
        chatId,
        readerId: receiverId
      })
    } catch (error) {
      console.error('标记已读错误:', error)
    }
  })
})

// 数据库连接
mongoose.connect(config.mongoUrl)
  .then(() => {
    console.log('MongoDB 连接成功')
    
    // 启动服务器
    server.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`)
    })
  })
  .catch(err => {
    console.error('MongoDB 连接失败:', err)
    process.exit(1)
  })

// 优雅退出
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭...')
  await mongoose.connection.close()
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})
