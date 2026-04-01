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
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem('token')
    if (token) {
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
      Message({
        message: res.msg || '请求失败',
        type: 'error',
        duration: 3000
      })
      
      // token 过期，跳转登录
      if (res.code === 401) {
        sessionStorage.clear()
        router.push('/login')
      }
      
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    
    return res
  },
  error => {
    console.error('响应错误:', error)
    
    let message = '网络错误，请稍后重试'
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '登录已过期，请重新登录'
          sessionStorage.clear()
          router.push('/login')
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
    
    Message({
      message,
      type: 'error',
      duration: 3000
    })
    
    return Promise.reject(error)
  }
)

export default service
