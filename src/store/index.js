import Vue from 'vue'
import Vuex from 'vuex'

import user from './modules/user'
import task from './modules/task'
import chat from './modules/chat'
import attendance from './modules/attendance'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user,
    task,
    chat,
    attendance
  }
})
