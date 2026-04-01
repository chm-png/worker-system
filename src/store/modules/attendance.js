import { getTodayAttendance } from '@/api/attendance'
import socketService from '@/utils/socket'

const state = {
  todayAttendance: null
}

const mutations = {
  SET_TODAY_ATTENDANCE(state, attendance) {
    state.todayAttendance = attendance
  }
}

const actions = {
  // 获取今日考勤
  async getTodayAttendance({ commit }) {
    const res = await getTodayAttendance()
    commit('SET_TODAY_ATTENDANCE', res.data)
    return res
  },

  // 监听考勤更新
  initSocket({ commit }) {
    socketService.on('attendance_updated', (data) => {
      commit('SET_TODAY_ATTENDANCE', data)
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
