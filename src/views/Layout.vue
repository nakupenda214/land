<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside no-print">
      <div class="logo">
        <span class="logo-main">国土测绘系统</span>
      </div>

      <el-menu
        router
        :default-active="$route.path"
        background-color="#1f2937"
        text-color="#c9d4e3"
        active-text-color="#ffffff"
        style="border-right: none;"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>首页</span>
        </el-menu-item>

        <el-menu-item index="/projects">
          <el-icon><DataAnalysis /></el-icon>
          <span>项目信息</span>
        </el-menu-item>

        <el-menu-item index="/fields">
          <el-icon><MapLocation /></el-icon>
          <span>土地类型管理</span>
        </el-menu-item>

        <el-menu-item index="/users">
          <el-icon><UserFilled /></el-icon>
          <span>用户权限管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header no-print">
        <div class="header-left">
          <el-breadcrumb separator=">">
            <el-breadcrumb-item :to="{ path: '/' }">国土测绘系统</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="el-dropdown-link">
              管理员（Admin）<el-icon class="el-icon--right"><ArrowDown /></el-icon>
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
        <keep-alive>
          <router-view v-if="$route.meta.keepAlive" />
        </keep-alive>
        <router-view v-if="!$route.meta.keepAlive" />
      </el-main>
      <GlobalAgentAssistant />
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { DataAnalysis, ArrowDown, Odometer, UserFilled, MapLocation } from '@element-plus/icons-vue'
import GlobalAgentAssistant from '@/components/layout/GlobalAgentAssistant.vue'

const router = useRouter()

const handleLogout = () => {
  sessionStorage.removeItem('isAuthenticated')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #1f2937;
  color: #fff;
  transition: width 0.3s;
  border-right: 1px solid #111827;
}

.logo {
  height: 60px;
  background: #111827;
  color: #e5edf8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #273244;
}

.logo-main {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

:deep(.el-menu-item) {
  height: 48px;
  font-weight: 600;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #304a6e 0%, #3c5f8f 100%) !important;
}

.header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #d7dde6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #3a4656;
  font-weight: 600;
}

.main-content {
  background-color: var(--biz-page-bg);
  padding: 12px;
}
</style>
