<template>
  <div class="login-container">
    <div class="login-card dark-card">
      <div class="login-header">
        <div class="logo">
          <i class="el-icon-office-building"></i>
        </div>
        <h1>智工云系统</h1>
        <p class="subtitle">工人考勤与工作协同平台 v2.6</p>
      </div>

      <el-form ref="loginForm" :model="loginForm" :rules="rules" class="login-form">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入用户名"
            prefix-icon="el-icon-user"
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            show-password
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>

        <el-button 
          type="primary" 
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

    
    </div>

    <div class="login-footer">
      <p class="copyright">SYSTEM STATUS: ALL SERVICES OPERATIONAL</p>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      },
      loading: false
    }
  },
  methods: {
    ...mapActions('user', ['login']),
    
    handleLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) return
        
        this.loading = true
        try {
          await this.login(this.loginForm)
          
          // 保存用户信息
          const userInfo = this.$store.state.user.userInfo
          sessionStorage.setItem('userInfo', JSON.stringify(userInfo))
          
          this.$message.success('登录成功')
          
          // 根据角色跳转
          if (userInfo.role === 'admin') {
            this.$router.push('/admin')
          } else {
            this.$router.push('/worker')
          }
        } catch (error) {
          console.error('登录失败:', error)
        } finally {
          this.loading = false
        }
      })
    },
    
    fillAccount(username, password) {
      this.loginForm.username = username
      this.loginForm.password = password
    }
  }
}
</script>

<style lang="less" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #0a0a0a;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 48px;
  border-radius: 1.5rem;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  
  .logo {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border-radius: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 10px 40px rgba(37, 99, 235, 0.3);
    
    i {
      font-size: 36px;
      color: white;
    }
  }
  
  h1 {
    font-size: 28px;
    font-weight: 800;
    color: #e5e7eb;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
  }
  
  .subtitle {
    font-size: 13px;
    color: #6b7280;
  }
}

.login-form {
  margin-bottom: 32px;
  
  .login-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border: none;
    
    &:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    }
  }
}

.demo-accounts {
  text-align: center;
  
  > p {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .accounts-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .account-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: #1c1c1c;
    border: 1px solid #262626;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    i {
      font-size: 16px;
      color: #2563eb;
    }
    
    span {
      font-size: 13px;
      color: #9ca3af;
    }
    
    &:hover {
      border-color: #2563eb;
      background: rgba(37, 99, 235, 0.05);
    }
  }
}

.login-footer {
  margin-top: 32px;
  
  .copyright {
    font-size: 11px;
    color: #4b5563;
    font-family: monospace;
  }
}
</style>
