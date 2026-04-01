import request from './request'

// 搜索好友
export function searchFriends(keyword) {
  return request({
    url: '/chat/search',
    method: 'get',
    params: { keyword }
  })
}

// 获取好友列表
export function getFriends() {
  return request({
    url: '/chat/list',
    method: 'get'
  })
}

// 获取待处理的好友请求
export function getPendingRequests() {
  return request({
    url: '/chat/pending',
    method: 'get'
  })
}

// 发送好友请求
export function sendFriendRequest(friendId) {
  return request({
    url: '/chat/add',
    method: 'post',
    data: { friendId }
  })
}

// 处理好友请求
export function handleFriendRequest(data) {
  return request({
    url: '/chat/handle',
    method: 'post',
    data
  })
}

// 获取聊天历史
export function getChatHistory(params) {
  return request({
    url: '/chat/history',
    method: 'get',
    params
  })
}

// 发送消息
export function sendMessage(data) {
  return request({
    url: '/chat/send',
    method: 'post',
    data
  })
}
