import { login as apiLogin, getUserInfo as apiGetUserInfo } from '@/api/user'

/**
 * 用户服务 - 处理用户相关业务逻辑
 */
const userService = {
  /**
   * 用户登录
   * @param {Object} loginData - 登录数据
   * @returns {Promise} 登录结果
   */
  async login(loginData) {
    const res = await apiLogin(loginData)
    // 连接Socket
    import('@/utils/socket').then(({ default: socketService }) => {
      socketService.connect(res.data.token)
    })
    return res
  },

  /**
   * 获取用户信息
   * @param {string} token - 认证token
   * @returns {Promise} 用户信息
   */
  async getUserInfo(token) {
    const res = await apiGetUserInfo()
    // 连接Socket
    import('@/utils/socket').then(({ default: socketService }) => {
      socketService.connect(token)
    })
    return res
  },

  /**
   * 处理登录成功后的操作
   * @param {Object} commit - Vuex commit方法
   * @param {Object} dispatch - Vuex dispatch方法
   * @param {Object} loginResult - 登录结果
   */
  handleLoginSuccess(commit, dispatch, loginResult) {
    commit('SET_TOKEN', loginResult.data.token)
    commit('SET_USER_INFO', loginResult.data.userInfo)
    // 初始化Socket监听
    dispatch('chat/initSocket', null, { root: true })
  },

  /**
   * 处理获取用户信息成功后的操作
   * @param {Object} commit - Vuex commit方法
   * @param {Object} dispatch - Vuex dispatch方法
   * @param {Object} userInfoResult - 用户信息结果
   * @param {string} token - 认证token
   */
  handleGetUserInfoSuccess(commit, dispatch, userInfoResult, token) {
    commit('SET_USER_INFO', userInfoResult.data)
    // 连接Socket
    import('@/utils/socket').then(({ default: socketService }) => {
      socketService.connect(token)
    })
    // 初始化Socket监听
    dispatch('chat/initSocket', null, { root: true })
  },

  /**
   * 处理登出操作
   * @param {Object} commit - Vuex commit方法
   */
  handleLogout(commit) {
    commit('CLEAR_USER')
    import('@/utils/socket').then(({ default: socketService }) => {
      socketService.disconnect()
    })
  }
}

export default userService