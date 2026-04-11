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

// 刷新token
async function refreshToken() {
  try {
    const response = await axios.post(`${BASE_URL}/refresh`, {}, {
      // 不使用拦截器，避免循环调用
      headers: {
        'Content-Type': 'application/json'
      },
      // 允许携带凭证（cookies）
      withCredentials: true
    })
    if (response.data.code === 200) {
      const newToken = response.data.data.token
      sessionStorage.setItem('token', newToken)
      return newToken
    } else {
      throw new Error('刷新token失败')
    }
  } catch (error) {
      // 刷新token失败，清除token并跳转到登录页
      sessionStorage.clear()
      // 避免重复导航到登录页面
      if (router.currentRoute.path !== '/login') {
        router.push('/login')
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
      
      // token 过期，尝试刷新token
      if (res.code === 401) {
        // 只有在非登录页面时才尝试刷新token
        if (router.currentRoute.path !== '/login') {
          // 尝试刷新token
          return refreshToken().then(newToken => {
            // 刷新成功，重新发起请求
            const config = response.config
            config.headers['Authorization'] = `Bearer ${newToken}`
            return service(config)
          }).catch(() => {
            // 刷新token失败，清除sessionStorage并跳转登录
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
          message = '登录已过期，请重新登录'
          // 只有在非登录页面时才尝试刷新token
          if (router.currentRoute.path !== '/login') {
            shouldShowMessage = false // 不显示错误消息，因为会尝试刷新token
            // 尝试刷新token
            return refreshToken().then(newToken => {
              // 刷新成功，重新发起请求
              const config = error.config
              config.headers['Authorization'] = `Bearer ${newToken}`
              return service(config)
            }).catch(() => {
              // 刷新token失败，清除sessionStorage并跳转登录
              sessionStorage.clear()
              router.push('/login')
              return Promise.reject(new Error('登录已过期，请重新登录'))
            })
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
