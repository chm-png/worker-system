import { login, getUserInfo } from '@/api/user'
import socketService from '@/utils/socket'

const state = {
  token: sessionStorage.getItem('token') || '',
  userInfo: null,
  role: null
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
    sessionStorage.setItem('token', token)
  },
  SET_USER_INFO(state, userInfo) {
    state.userInfo = userInfo
    state.role = userInfo.role
    // 将用户信息存储到sessionStorage中
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo))
  },
  CLEAR_USER(state) {
    state.token = ''
    state.userInfo = null
    state.role = null
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')
  },
  SET_PHOTO(state, photo) {
    if (state.userInfo) {
      state.userInfo.photo = photo
      // 更新sessionStorage中的用户信息
      sessionStorage.setItem('userInfo', JSON.stringify(state.userInfo))
    }
  }
}

const actions = {
  // 用户登录
  async login({ commit, dispatch }, loginData) {
    const res = await login(loginData)
    commit('SET_TOKEN', res.data.token)
    commit('SET_USER_INFO', res.data.userInfo)
    // 连接 Socket
    socketService.connect(res.data.token)
    // 初始化 Socket 监听
    dispatch('chat/initSocket', null, { root: true })
    return res
  },

  // 获取用户信息
  async getUserInfo({ commit, state, dispatch }) {
    if (!state.token) return
    try {
      const res = await getUserInfo()
      commit('SET_USER_INFO', res.data)
      // 连接 Socket
      socketService.connect(state.token)
      // 初始化 Socket 监听
      dispatch('chat/initSocket', null, { root: true })
      return res
    } catch (error) {
      commit('CLEAR_USER')
      throw error
    }
  },

  // 退出登录
  logout({ commit }) {
    commit('CLEAR_USER')
    socketService.disconnect()
  }
}

const getters = {
  isAdmin: state => state.role === 'admin',
  isWorker: state => state.role === 'worker',
  userId: state => state.userInfo?.userId
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
