import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth-token'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'projects',
        name: 'ProjectList',
        component: () => import('../views/ProjectList.vue'),
        meta: { title: '项目信息', keepAlive: true }
      },
      {
        path: 'upload',
        name: 'FileUpload',
        component: () => import('../views/FileUpload.vue'),
        meta: { title: '项目/文件上传', keepAlive: true }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/UserList.vue'),
        meta: { title: '用户权限管理' }
      },
      {
        path: 'fields',
        name: 'FieldManagement',
        component: () => import('../views/FieldManagement.vue'),
        meta: { title: '土地类型管理' }
      },
      {
        path: 'notifications',
        name: 'NotificationManagement',
        component: () => import('../views/NotificationManagement.vue'),
        meta: { title: '通知订阅管理' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const PUBLIC_ROUTE_NAMES = ['Login', 'Register']

// 路由守卫：以 Sa-Token 是否存在于 sessionStorage 为准（登录、注册页除外）
router.beforeEach((to, from, next) => {
  if (!PUBLIC_ROUTE_NAMES.includes(to.name) && !isLoggedIn()) {
    next({ name: 'Login' })
    return
  }
  next()
})

export default router
