<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside no-print">
      <div class="logo">
        
        <span>国土测绘系统</span>
      </div>
      
      <el-menu
        router
        :default-active="$route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#A0C4FF"
        style="border-right: none;"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>首页</span>
        </el-menu-item>
        
        <el-menu-item index="/upload">
          <el-icon><UploadFilled /></el-icon>
          <span>项目/文件上传</span>
        </el-menu-item>

        <el-menu-item index="/projects">
          <el-icon><DataAnalysis /></el-icon>
          <span>项目信息</span>
        </el-menu-item>
    
        <el-menu-item index="/users">
          <el-icon><UserFilled /></el-icon>
          <span>用户权限管理</span>
        </el-menu-item>
        <el-menu-item index="/fields">
          <el-icon><MapLocation /></el-icon>
          <span>土地类型管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header no-print">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">国土测绘系统</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="el-dropdown-link">
              管理员 (Admin) <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出系统</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
          <!-- 缓存标记了 keepAlive: true 的组件 -->
          <keep-alive>
            <router-view v-if="$route.meta.keepAlive" />
          </keep-alive>
          <!-- 不缓存的组件（比如首页、项目信息等） -->
          <router-view v-if="!$route.meta.keepAlive" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
// 引入新图标
import { DataAnalysis, UploadFilled, ArrowDown, Odometer, UserFilled } from '@element-plus/icons-vue'

const router = useRouter()

const handleLogout = () => {
  // 【修改点】清除 sessionStorage
  sessionStorage.removeItem('isAuthenticated')
  router.push('/login')
}
</script>

<style scoped>
/* 保持之前的样式不变，直接复制之前的 style */
.layout-container { height: 100vh; }
.aside { background-color: #304156; color: white; transition: width 0.3s; }
.logo { height: 60px; line-height: 60px; text-align: center; font-size: 18px; font-weight: bold; background: #263445; color: #fff; display: flex; align-items: center; justify-content: center; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e6e6e6; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-shadow: 0 1px 4px rgba(0,21,41,.08); }
.el-dropdown-link { cursor: pointer; display: flex; align-items: center; color: #606266; }
.main-content { background-color: #f0f2f5; padding: 20px; }
</style>