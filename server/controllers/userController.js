const User = require('../models/User')
const { encryptPwd, comparePwd } = require('../utils/password')
const { generateToken } = require('../utils/jwt')

/**
 * 用户登录
 */
async function login(req, res) {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        msg: '用户名和密码不能为空',
        data: null
      })
    }
    
    // 查找用户
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({
        code: 400,
        msg: '用户名或密码错误',
        data: null
      })
    }
    
    // 检查账号状态
    if (!user.status) {
      return res.status(403).json({
        code: 403,
        msg: '账号已被禁用，请联系管理员',
        data: null
      })
    }
    
    // 验证密码
    const isMatch = await comparePwd(password, user.password)
    if (!isMatch) {
      return res.status(400).json({
        code: 400,
        msg: '用户名或密码错误',
        data: null
      })
    }
    
    // 生成 token
    const token = generateToken({
      userId: user._id,
      role: user.role
    })
    
    // 返回用户信息（不含密码）
    const userInfo = {
      userId: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      photo: user.photo ? `/api/upload/avatar/${user._id}?t=${Date.now()}` : '',
      position: user.position,
      department: user.department,
      createdAt: user.createdAt
    }
    
    res.json({
      code: 200,
      msg: '登录成功',
      data: { token, userInfo }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取当前用户信息
 */
async function getUserInfo(req, res) {
  try {
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        userId: req.user._id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role,
        photo: req.user.photo ? `/api/upload/avatar/${req.user._id}?t=${Date.now()}` : '',
        phone: req.user.phone,
        position: req.user.position,
        department: req.user.department,
        createdAt: req.user.createdAt
      }
    })
  } catch (error) {
    console.error('Get user info error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 注册用户（仅用于初始化演示数据）
 */
async function register(req, res) {
  try {
    const { username, password, role, name, phone, position, department } = req.body
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        msg: '用户名已存在',
        data: null
      })
    }
    
    // 加密密码
    const encryptedPassword = await encryptPwd(password)
    
    // 创建用户
    const user = new User({
      username,
      password: encryptedPassword,
      role: role || 'worker',
      name,
      phone: phone || '',
      position: position || '',
      department: department || ''
    })
    
    await user.save()
    
    res.json({
      code: 200,
      msg: '注册成功',
      data: { userId: user._id }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取所有员工列表（管理员用）
 */
async function getWorkers(req, res) {
  try {
    const workers = await User.find({ role: 'worker' })
      .select('_id name username photo phone position department onlineStatus status createdAt')
      .sort({ createdAt: -1 })

    // 转换头像为URL
    const workersWithAvatarUrl = workers.map(worker => ({
      ...worker.toObject(),
      photo: worker.photo ? `/api/upload/avatar/${worker._id}?t=${Date.now()}` : ''
    }))

    res.json({
      code: 200,
      msg: '获取成功',
      data: workersWithAvatarUrl
    })
  } catch (error) {
    console.error('Get workers error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 添加员工（管理员用）
 */
async function addWorker(req, res) {
  try {
    const { name, phone, department, position } = req.body

    if (!name || !phone || !department || !position) {
      return res.status(400).json({
        code: 400,
        msg: '请填写完整信息',
        data: null
      })
    }

    // 生成工号（用户名）：使用姓名拼音首字母 + 随机数
    const pinyin = name.charAt(0)
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const username = `${pinyin}${randomNum}`

    // 检查工号是否已存在
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        msg: '工号生成冲突，请重试',
        data: null
      })
    }

    // 创建员工，初始密码为 123456
    const user = new User({
      username,
      password: await encryptPwd('123456'),
      role: 'worker',
      name,
      phone,
      department,
      position,
      status: true
    })

    await user.save()

    res.json({
      code: 200,
      msg: '员工录入成功',
      data: {
        userId: user._id,
        username: user.username
      }
    })
  } catch (error) {
    console.error('Add worker error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 修改密码（员工用）
 */
async function changePassword(req, res) {
  try {
    const userId = req.userId
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        msg: '请填写完整信息',
        data: null
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        msg: '新密码长度不能少于6位',
        data: null
      })
    }

    // 验证旧密码
    const user = await User.findById(userId)
    const isMatch = await comparePwd(oldPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({
        code: 400,
        msg: '原密码错误',
        data: null
      })
    }

    // 更新密码
    user.password = await encryptPwd(newPassword)
    await user.save()

    res.json({
      code: 200,
      msg: '密码修改成功',
      data: null
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 搜索员工（用于好友搜索）
 */
async function searchWorkers(req, res) {
  try {
    const { keyword } = req.query
    
    const workers = await User.find({
      role: 'worker',
      status: true,
      username: { $regex: keyword || '', $options: 'i' }
    }).select('_id name username photo position department')
    
    // 转换头像为URL
    const workersWithAvatarUrl = workers.map(worker => ({
      ...worker.toObject(),
      photo: worker.photo ? `/api/upload/avatar/${worker._id}?t=${Date.now()}` : ''
    }))
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: workersWithAvatarUrl
    })
  } catch (error) {
    console.error('Search workers error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

module.exports = {
  login,
  getUserInfo,
  register,
  getWorkers,
  searchWorkers,
  addWorker,
  changePassword
}
