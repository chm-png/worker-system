import request from './request'

// 用户登录
export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserInfo() {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

// 获取所有员工列表
export function getWorkers() {
  return request({
    url: '/workers',
    method: 'get'
  })
}

// 搜索员工
export function searchWorkers(keyword) {
  return request({
    url: '/search',
    method: 'get',
    params: { keyword }
  })
}

// 添加员工（管理员）
export function addWorker(data) {
  return request({
    url: '/workers/add',
    method: 'post',
    data
  })
}

// 修改密码（员工）
export function changePassword(data) {
  return request({
    url: '/password/change',
    method: 'post',
    data
  })
}

// 上传头像（员工）
export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return request({
    url: '/upload/avatar',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
