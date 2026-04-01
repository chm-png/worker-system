import request from './request'

// 创建任务（管理员）
export function createTask(data) {
  return request({
    url: '/tasks/create',
    method: 'post',
    data
  })
}

// 获取任务列表（管理员）
export function getTaskList(params) {
  return request({
    url: '/tasks/list',
    method: 'get',
    params
  })
}

// 获取任务详情
export function getTaskDetail(taskId) {
  return request({
    url: '/tasks/detail',
    method: 'get',
    params: { taskId }
  })
}

// 获取我的任务（员工）
export function getMyTasks() {
  return request({
    url: '/tasks/my',
    method: 'get'
  })
}

// 标记任务为已读
export function markTaskRead(taskId) {
  return request({
    url: '/tasks/read',
    method: 'post',
    data: { taskId }
  })
}

// 完成任务
export function finishTask(data) {
  return request({
    url: '/tasks/finish',
    method: 'post',
    data
  })
}
