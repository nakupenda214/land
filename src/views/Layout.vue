<template>
  <el-container class="layout-container">
    <el-aside :width="asideWidth" class="aside no-print" :class="{ 'aside--collapsed': isAsideCollapsed }">
      <div class="logo">
        <span v-if="!isAsideCollapsed" class="logo-main">国土测绘系统</span>
        <el-button class="aside-toggle" link @click="toggleAside">
          <el-icon><Fold v-if="!isAsideCollapsed" /><Expand v-else /></el-icon>
        </el-button>
      </div>

      <el-menu
        router
        :default-active="$route.path"
        :collapse="isAsideCollapsed"
        :collapse-transition="false"
        background-color="#1f2937"
        text-color="#c9d4e3"
        active-text-color="#ffffff"
        class="aside-menu"
      >
        <el-menu-item-group>
          <template #title>业务功能</template>
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/projects">
            <el-icon><DataAnalysis /></el-icon>
            <span>项目信息</span>
          </el-menu-item>
        </el-menu-item-group>

        <el-menu-item-group>
          <template #title>系统管理</template>
          <el-menu-item index="/fields">
            <el-icon><MapLocation /></el-icon>
            <span>土地类型管理</span>
          </el-menu-item>
          <el-menu-item v-if="canAccessUserManagement()" index="/users">
            <el-icon><UserFilled /></el-icon>
            <span>用户权限管理</span>
          </el-menu-item>
        </el-menu-item-group>
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
                <el-dropdown-item @click="goAgentManagement">Agent 管理中心</el-dropdown-item>
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
      <FloatingTaskPoolStatus v-if="route.path === '/projects'" />
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { DataAnalysis, ArrowDown, Odometer, UserFilled, MapLocation, Fold, Expand } from '@element-plus/icons-vue'
import GlobalAgentAssistant from '@/components/layout/GlobalAgentAssistant.vue'
import FloatingTaskPoolStatus from '@/components/layout/FloatingTaskPoolStatus.vue'
import { clearAuth } from '@/utils/auth-token'
import { canAccessUserManagement } from '@/utils/auth-session.js'

const route = useRoute()
const router = useRouter()
const ASIDE_COLLAPSE_KEY = 'layout_aside_collapsed'
const isAsideCollapsed = ref(false)
const asideWidth = computed(() => (isAsideCollapsed.value ? '72px' : '220px'))

const toggleAside = () => {
  isAsideCollapsed.value = !isAsideCollapsed.value
  localStorage.setItem(ASIDE_COLLAPSE_KEY, isAsideCollapsed.value ? '1' : '0')
}

onMounted(() => {
  isAsideCollapsed.value = localStorage.getItem(ASIDE_COLLAPSE_KEY) === '1'
})

const handleLogout = async () => {
  try {
    await axios.post('/api/auth/logout')
  } catch {
    /* 忽略网络错误，仍清理本地态 */
  }
  clearAuth()
  router.push('/login')
}

const goAgentManagement = () => {
  router.push('/agent-management')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  --app-aside-w: 220px;
}

.aside {
  background: linear-gradient(180deg, #1f2937 0%, #1a2332 100%);
  color: #fff;
  transition: width 0.24s ease;
  border-right: 1px solid #111827;
  overflow: hidden;
}

.logo {
  height: 56px;
  background: #111827;
  color: #e5edf8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 14px;
  border-bottom: 1px solid #273244;
}

.logo-main {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.aside-toggle {
  color: #cbd5e1;
  padding: 2px;
}

.aside-menu {
  border-right: none;
}

:deep(.aside-menu .el-menu-item-group__title) {
  padding: 12px 18px 6px !important;
  color: #8391a7;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.aside--collapsed :deep(.el-menu-item-group__title) {
  display: none;
}

:deep(.el-menu-item) {
  height: 46px;
  font-weight: 500;
  position: relative;
  border-radius: 8px;
  margin: 2px 8px;
}

:deep(.el-menu-item:hover) {
  background: rgba(86, 116, 154, 0.24) !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #304a6e 0%, #3c5f8f 100%) !important;
}

:deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: -8px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 3px;
  background: #93c5fd;
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
  overflow-y: scroll;
  scrollbar-gutter: stable;
}
</style>
