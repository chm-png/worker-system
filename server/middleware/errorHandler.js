/**
 * 全局异常处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  
  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      code: 400,
      msg: '文件大小超出限制（最大100MB）',
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
  
  // 默认返回 500 错误
  return res.status(500).json({
    code: 500,
    msg: err.message || '服务器内部错误',
    data: null
  })
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    code: 404,
    msg: '请求的资源不存在',
    data: null
  })
}

module.exports = {
  errorHandler,
  notFoundHandler
}
