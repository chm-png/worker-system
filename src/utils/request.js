import axios from 'axios'
import { Message } from 'element-ui'
import router from '@/router'

// 环境变量：开发环境走 devServer 代理，生产环境走实际 API
const BASE_URL = process.env.VUE_APP_API_BASE_URL || '/api'

// 创建 axios 实例
const service = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  // 确保中文等非 ASCII 字符正确编码
  paramsSerializer: (params) => {
    return Object.keys(params)
      .map((key) => {
        const value = params[key]
        if (value == null) return ''
        if (Array.isArray(value)) {
          return value
            .map((v) => `${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`)
            .join('&')
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      })
      .filter(Boolean)
      .join('&')
  },
  // 允许携带凭证（cookies）
  withCredentials: true
})

// 用于存储刷新token的Promise
let refreshTokenPromise = null

// 解析token过期时间
function getTokenExpiration(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 // 转换为毫秒
  } catch (error) {
    return 0
  }
}

// 检查token是否即将过期（提前30秒）或已过期
function isTokenExpiring() {
  const token = sessionStorage.getItem('token')
  if (!token) return false // 没有token时，不认为需要刷新
  
  const expirationTime = getTokenExpiration(token)
  const now = Date.now()
  const timeLeft = expirationTime - now
  
  // 如果token已过期或在30秒内过期，返回true
  return timeLeft <= 0 || timeLeft < 30 * 1000
}

// 检查是否为单点登录错误
function isSSOError(message) {
  return message && message.includes('已在其他设备登录')
}

// 处理单点登录错误
function handleSSOError() {
  sessionStorage.clear()
  // 清除cookie中的refreshToken
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  Message({
    message: '您的账号已在其他设备登录，请重新登录',
    type: 'error',
    duration: 5000
  })
  if (router.currentRoute.path !== '/login') {
    router.push('/login')
  }
}

// 刷新token
async function refreshToken() {
  try {
    const response = await axios.post(`${BASE_URL}/refresh`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    })
    if (response.data.code === 200) {
      const newToken = response.data.data.token
      sessionStorage.setItem('token', newToken)
      return newToken
    } else {
      // 检查是否为单点登录错误
      if (isSSOError(response.data.msg)) {
        handleSSOError()
        throw new Error(response.data.msg)
      }
      throw new Error('刷新token失败')
    }
  } catch (error) {
    // 检查响应数据中的单点登录错误
    const errorMsg = error.response?.data?.msg || error.message
    if (isSSOError(errorMsg)) {
      handleSSOError()
    } else {
      sessionStorage.clear()
      if (router.currentRoute.path !== '/login') {
        router.push('/login')
      }
    }
    throw error
  }
}

// 请求拦截器
service.interceptors.request.use(
  async config => {
    const token = sessionStorage.getItem('token')
    // 只有在有token且token即将过期时才刷新
    if (token && isTokenExpiring()) {
      // 如果没有正在进行的刷新token请求，发起新的请求
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshToken().finally(() => {
          // 刷新完成后清除Promise
          refreshTokenPromise = null
        })
      }
      
      // 等待token刷新完成
      const newToken = await refreshTokenPromise
      if (newToken) {
        config.headers['Authorization'] = `Bearer ${newToken}`
      }
    } else if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    if (res.code !== 200) {
      // 只有当不是401错误时才显示错误消息
      if (res.code !== 401) {
        Message({
          message: res.msg || '请求失败',
          type: 'error',
          duration: 3000
        })
      }
      
      // token 过期或单点登录错误
      if (res.code === 401) {
        // 检查是否为单点登录错误
        if (isSSOError(res.msg)) {
          handleSSOError()
          return Promise.reject(new Error(res.msg))
        }
        
        // 只有在非登录页面时才尝试刷新token
        if (router.currentRoute.path !== '/login') {
          return refreshToken().then(newToken => {
            const config = response.config
            config.headers['Authorization'] = `Bearer ${newToken}`
            return service(config)
          }).catch(() => {
            sessionStorage.clear()
            router.push('/login')
            return Promise.reject(new Error('登录已过期，请重新登录'))
          })
        }
      }
      
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    
    return res
  },
  error => {
    console.error('响应错误:', error)
    
    let message = '网络错误，请稍后重试'
    let shouldShowMessage = true
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 检查是否为单点登录错误
          if (isSSOError(error.response.data?.msg)) {
            message = error.response.data.msg
            handleSSOError()
          } else {
            message = '登录已过期，请重新登录'
            // 只有在非登录页面时才尝试刷新token
            if (router.currentRoute.path !== '/login') {
              shouldShowMessage = false
              return refreshToken().then(newToken => {
                const config = error.config
                config.headers['Authorization'] = `Bearer ${newToken}`
                return service(config)
              }).catch(() => {
                sessionStorage.clear()
                router.push('/login')
                return Promise.reject(new Error('登录已过期，请重新登录'))
              })
            }
          }
          break
        case 403:
          message = '没有权限访问该资源'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = error.response.data?.msg || '请求失败'
      }
    }
    
    // 只有当需要显示错误消息时才显示
    if (shouldShowMessage) {
      Message({
        message,
        type: 'error',
        duration: 3000
      })
    }
    
    return Promise.reject(error)
  }
)

export default service
