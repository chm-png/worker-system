const path = require('path')
const fs = require('fs')
const multer = require('multer')
const config = require('../config')

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', config.uploadPath, 'tasks')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 头像上传目录
const avatarDir = path.join(__dirname, '..', config.uploadPath, 'avatars')
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true })
}

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase()
    cb(null, `${req.userId}-${Date.now()}${ext}`)
  }
})

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WEBP 图片'), false)
    }
  },
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB
})

// 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    const dateDir = path.join(uploadDir, `${year}`, `${month}`, `${day}`)

    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true })
    }

    cb(null, dateDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname || 'file')
    cb(null, `${req.body.taskId || 'file'}-${uniqueSuffix}${ext}`)
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

// 创建 multer 实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.maxFileSize
  }
})

module.exports = upload
