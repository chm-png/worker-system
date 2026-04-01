const Task = require('../models/Task')
const { formatDate } = require('../utils/time')
const { decodeOriginalFilename } = require('../utils/filenameEncoding')

function mapUploadAttachments(attachments) {
  if (!Array.isArray(attachments)) return []
  return attachments.map((a) => ({
    url: a.url,
    originalName: decodeOriginalFilename(a.originalName || '')
  }))
}

/**
 * 生成任务ID
 */
function generateTaskId() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `T${formatDate().replace(/-/g, '')}${String(timestamp).slice(-6)}${random}`
}

/**
 * 创建任务（管理员用）
 */
async function createTask(req, res) {
  try {
    const { workerId, taskTitle, taskContent, deadline } = req.body
    
    if (!workerId || !taskTitle || !deadline) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必填参数',
        data: null
      })
    }
    
    const taskId = generateTaskId()
    
    const task = new Task({
      taskId,
      workerId,
      taskTitle,
      taskContent: taskContent || '',
      deadline: new Date(deadline),
      status: 'pending',
      isRead: false
    })
    
    await task.save()
    
    // 通过 Socket 推送新任务给员工
    const io = req.app.get('io')
    if (io) {
      io.to(workerId.toString()).emit('new_task', {
        taskId: task.taskId,
        taskTitle: task.taskTitle,
        taskContent: task.taskContent,
        deadline: task.deadline,
        createTime: task.createdAt
      })
    }
    
    res.json({
      code: 200,
      msg: '任务创建成功',
      data: { taskId: task.taskId }
    })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取任务列表（管理员用）
 */
async function getTaskList(req, res) {
  try {
    const { page = 1, size = 20, workerId, status } = req.query
    
    const query = {}
    if (workerId) query.workerId = workerId
    if (status) query.status = status
    
    const skip = (parseInt(page) - 1) * parseInt(size)
    
    const list = await Task.find(query)
      .populate('workerId', 'name username photo position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(size))
    
    const total = await Task.countDocuments(query)
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        total,
        list: list.map(item => ({
          _id: item._id,
          taskId: item.taskId,
          workerId: item.workerId?._id,
          workerName: item.workerId?.name,
          taskTitle: item.taskTitle,
          taskContent: item.taskContent,
          deadline: item.deadline,
          status: item.status,
          isRead: item.isRead,
          finishReport: item.finishReport,
          uploadFileUrl: item.uploadFileUrl,
          uploadAttachments: mapUploadAttachments(item.uploadAttachments),
          completedAt: item.completedAt,
          createdAt: item.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get task list error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取任务详情
 */
async function getTaskDetail(req, res) {
  try {
    const { taskId } = req.query
    
    const task = await Task.findOne({ taskId })
      .populate('workerId', 'name username photo position department')
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在',
        data: null
      })
    }
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        _id: task._id,
        taskId: task.taskId,
        workerId: task.workerId?._id,
        workerName: task.workerId?.name,
        taskTitle: task.taskTitle,
        taskContent: task.taskContent,
        deadline: task.deadline,
        status: task.status,
        isRead: task.isRead,
        finishReport: task.finishReport,
        uploadFileUrl: task.uploadFileUrl,
        uploadAttachments: mapUploadAttachments(task.uploadAttachments),
        completedAt: task.completedAt,
        createdAt: task.createdAt
      }
    })
  } catch (error) {
    console.error('Get task detail error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取我的任务（员工用）
 */
async function getMyTasks(req, res) {
  try {
    const userId = req.userId
    const today = formatDate()
    const startOfDay = new Date(today + 'T00:00:00')
    const endOfDay = new Date(today + 'T23:59:59')
    
    const tasks = await Task.find({
      workerId: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 })
    
    // 统计未读任务数
    const unreadCount = tasks.filter(t => !t.isRead && t.status === 'pending').length
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        unreadCount,
        tasks: tasks.map(item => ({
          _id: item._id,
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          taskContent: item.taskContent,
          deadline: item.deadline,
          status: item.status,
          isRead: item.isRead,
          createdAt: item.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get my tasks error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 标记任务为已读
 */
async function markTaskRead(req, res) {
  try {
    const { taskId } = req.body
    
    const task = await Task.findOneAndUpdate(
      { taskId, workerId: req.userId },
      { isRead: true },
      { new: true }
    )
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在',
        data: null
      })
    }
    
    res.json({
      code: 200,
      msg: '标记成功',
      data: { isRead: true }
    })
  } catch (error) {
    console.error('Mark task read error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 完成任务（员工用）
 */
async function finishTask(req, res) {
  try {
    const { taskId, finishReport, uploadFileUrl, uploadAttachments } = req.body

    let attachments = []
    if (Array.isArray(uploadAttachments) && uploadAttachments.length) {
      attachments = uploadAttachments
        .map((a) => ({
          url: String(a.url || '').trim(),
          originalName: decodeOriginalFilename(
            a.originalName || a.originalname || ''
          )
        }))
        .filter((a) => a.url)
    }

    const urlFromBody = uploadFileUrl != null ? String(uploadFileUrl).trim() : ''
    const urlString =
      urlFromBody ||
      (attachments.length ? attachments.map((a) => a.url).join(',') : '') ||
      null

    const task = await Task.findOneAndUpdate(
      { taskId, workerId: req.userId, status: 'pending' },
      {
        status: 'completed',
        finishReport: finishReport || '',
        uploadFileUrl: urlString,
        uploadAttachments: attachments,
        completedAt: new Date()
      },
      { new: true }
    ).populate('workerId', '_id name')
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在或已完成',
        data: null
      })
    }
    
    // 通过 Socket 推送任务完成消息给管理员
    const io = req.app.get('io')
    if (io) {
      // 找到所有管理员
      const User = require('../models/User')
      const admins = await User.find({ role: 'admin' })
      
      admins.forEach(admin => {
        io.to(admin._id.toString()).emit('task_completed', {
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          workerId: task.workerId?._id,
          workerName: task.workerId?.name,
          completedAt: task.completedAt
        })
      })
    }
    
    res.json({
      code: 200,
      msg: '任务提交成功',
      data: { status: 'completed' }
    })
  } catch (error) {
    console.error('Finish task error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

/**
 * 获取历史任务（员工用）
 */
async function getHistoricalTasks(req, res) {
  try {
    const userId = req.userId
    const { date } = req.query
    
    if (!date) {
      return res.status(400).json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      })
    }
    
    const startOfDay = new Date(date + 'T00:00:00')
    const endOfDay = new Date(date + 'T23:59:59')
    
    const tasks = await Task.find({
      workerId: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 })
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        tasks: tasks.map(item => ({
          _id: item._id,
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          taskContent: item.taskContent,
          deadline: item.deadline,
          status: item.status,
          isRead: item.isRead,
          finishReport: item.finishReport,
          uploadFileUrl: item.uploadFileUrl,
          uploadAttachments: mapUploadAttachments(item.uploadAttachments),
          completedAt: item.completedAt,
          createdAt: item.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get historical tasks error:', error)
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误',
      data: null
    })
  }
}

module.exports = {
  createTask,
  getTaskList,
  getTaskDetail,
  getMyTasks,
  markTaskRead,
  finishTask,
  getHistoricalTasks
}
