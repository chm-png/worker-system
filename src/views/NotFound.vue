<template>
  <div class="not-found">
    <div class="content">
      <h1>404</h1>
      <p>页面不存在</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>

<style lang="less" scoped>
.not-found {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0a0a0a;
  
  .content {
    text-align: center;
    
    h1 {
      font-size: 120px;
      font-weight: 800;
      color: #2563eb;
      margin-bottom: 16px;
    }
    
    p {
      font-size: 18px;
      color: #6b7280;
      margin-bottom: 32px;
    }
  }
}
</style>
