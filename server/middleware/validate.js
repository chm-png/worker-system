/**
 * 参数校验中间件
 */
const validate = (rules) => {
  return (req, res, next) => {
    const errors = []
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field] || req.query[field] || req.params[field]
      
      // 必填校验
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field}不能为空`)
        continue
      }
      
      // 类型校验
      if (value !== undefined && value !== null && value !== '') {
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(`${field}必须是字符串`)
        }
        if (rule.type === 'number' && typeof value !== 'number') {
          errors.push(`${field}必须是数字`)
        }
        if (rule.type === 'array' && !Array.isArray(value)) {
          errors.push(`${field}必须是数组`)
        }
        
        // 长度校验
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field}长度不能少于${rule.minLength}个字符`)
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field}长度不能超过${rule.maxLength}个字符`)
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        code: 400,
        msg: errors.join('；'),
        data: null
      })
    }
    
    next()
  }
}

module.exports = validate
