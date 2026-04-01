<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <router-view />
    </transition>
  </div>
</template>

<script>
export default {
  name: 'App',
  created() {
    // 恢复登录状态
    const token = sessionStorage.getItem('token')
    const userInfoStr = sessionStorage.getItem('userInfo')
    
    if (token && userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr)
        this.$store.commit('user/SET_TOKEN', token)
        this.$store.commit('user/SET_USER_INFO', userInfo)
        // 连接 Socket
        const socketService = require('@/utils/socket').default
        socketService.connect(token)
        // 初始化 Socket 监听
        this.$store.dispatch('chat/initSocket')
      } catch (error) {
        console.error('恢复登录状态失败:', error)
      }
    }
  }
}
</script>

<style lang="less">
#app {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
