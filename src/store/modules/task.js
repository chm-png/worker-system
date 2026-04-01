import { getMyTasks, markTaskRead } from '@/api/task'
import socketService from '@/utils/socket'

const state = {
  tasks: [],
  unreadCount: 0
}

const mutations = {
  SET_TASKS(state, tasks) {
    state.tasks = tasks
  },
  SET_UNREAD_COUNT(state, count) {
    state.unreadCount = count
  },
  UPDATE_TASK(state, task) {
    const index = state.tasks.findIndex(t => t.taskId === task.taskId)
    if (index !== -1) {
      state.tasks[index] = { ...state.tasks[index], ...task }
    } else {
      state.tasks.unshift(task)
    }
  },
  DECREASE_UNREAD(state) {
    if (state.unreadCount > 0) {
      state.unreadCount--
    }
  }
}

const actions = {
  // 获取我的任务
  async getMyTasks({ commit }) {
    const res = await getMyTasks()
    commit('SET_TASKS', res.data.tasks)
    commit('SET_UNREAD_COUNT', res.data.unreadCount)
    return res
  },

  // 标记任务已读
  async markTaskRead({ commit }, taskId) {
    await markTaskRead(taskId)
    commit('DECREASE_UNREAD')
  },

  // 监听新任务
  initSocket({ dispatch }) {
    socketService.on('new_task', (data) => {
      dispatch('getMyTasks')
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
