const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const upload = require('../utils/upload')
const config = require('../config')
const { authMiddleware, workerMiddleware } = require('../middleware/auth')
const { decodeOriginalFilename } = require('../utils/filenameEncoding')

/**
 * 由磁盘绝对路径生成对外访问 URL（兼容 Windows 反斜杠）
 */
function filePathToPublicUrl(absFilePath) {
  const uploadsRoot = path.resolve(__dirname, '..', config.uploadPath)
  const rel = path.relative(uploadsRoot, path.resolve(absFilePath))
  if (rel.startsWith('..') || rel === '') {
    throw new Error('无效的上传路径')
  }
  const posix = rel.split(path.sep).join('/')
  return `/uploads/${posix}`
}

// 上传任务附件（员工）
router.post('/task', authMiddleware, workerMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        msg: '请选择要上传的文件',
        data: null
      })
    }

    const fileUrl = filePathToPublicUrl(req.file.path)
    const originalname = decodeOriginalFilename(req.file.originalname)

    res.json({
      code: 200,
      msg: '上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalname,
        size: req.file.size
      }
    })
  } catch (error) {
    console.error('上传文件错误:', error)
    res.status(500).json({
      code: 500,
      msg: '上传失败',
      data: null
    })
  }
})

// 错误处理中间件
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      code: 400,
      msg: '文件大小超过限制',
      data: null
    })
  }
  if (err.message === '不支持的文件类型') {
    return res.status(400).json({
      code: 400,
      msg: '不支持的文件类型',
      data: null
    })
  }
  if (err.message === '仅支持 JPG/PNG/GIF/WEBP 图片') {
    return res.status(400).json({
      code: 400,
      msg: err.message,
      data: null
    })
  }
  next(err)
})

// 上传头像（员工）
router.post('/avatar', authMiddleware, workerMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, msg: '请选择图片', data: null })
    }

    const User = require('../models/User')
    const newUrl = filePathToPublicUrl(req.file.path)

    // 删除旧头像文件（仅本地文件才删，外链默认头像跳过）
    const user = await User.findById(req.userId)
    if (user?.photo && user.photo.startsWith('/uploads')) {
      const oldPath = path.join(__dirname, '..', '..', user.photo.replace(/^\//, ''))
      try { fs.unlinkSync(oldPath) } catch {}
    }

    await User.findByIdAndUpdate(req.userId, { photo: newUrl })

    res.json({ code: 200, msg: '头像更新成功', data: { photo: newUrl } })
  } catch (error) {
    console.error('头像上传错误:', error)
    res.status(500).json({ code: 500, msg: '头像更新失败', data: null })
  }
})

module.exports = router
