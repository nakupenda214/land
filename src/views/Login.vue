<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="card-header">
          <div class="logo-text">国土房产测绘数据归档系统</div>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="0px"
        size="large"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入管理员账号"
            :prefix-icon="User" 
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin" 
          />
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            class="login-btn" 
            :loading="isLoading" 
            @click="handleLogin"
          >
            {{ isLoading ? '登录中...' : '立即登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="tips">
        <span>测试账号: admin / 123456</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
// 引入图标组件
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const loginFormRef = ref(null)
const isLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 3, message: '密码长度不能小于3位', trigger: 'blur' }
  ]
}

const handleLogin = () => {
  if (!loginFormRef.value) return
  
  loginFormRef.value.validate((valid) => {
    if (valid) {
      isLoading.value = true
      setTimeout(() => {
        isLoading.value = false
        if (loginForm.username === 'admin' && loginForm.password === '123456') {
          ElMessage.success('登录成功')
          
          // 【修改点】改为 sessionStorage
          sessionStorage.setItem('isAuthenticated', 'true') 
          
          router.push('/') 
        } else {
          ElMessage.error('账号或密码错误 (admin/123456)')
        }
      }, 1000)
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 保持你刚才截图里那个好看的背景 */
  background: linear-gradient(to bottom right, #2c3e50, #4ca1af); 
}
.login-card { width: 400px; border-radius: 8px; }
.card-header { text-align: center; }
.logo-text { font-size: 20px; font-weight: bold; color: #303133; }
.login-btn { width: 100%; font-weight: bold; }
.tips { text-align: center; font-size: 12px; color: #909399; margin-top: 10px; }
</style>