import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard', // 登录后默认去首页
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
        meta: { title: '项目/文件上传' ,keepAlive: true}
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：严格检查 sessionStorage
router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated')
  if (to.name !== 'Login' && !isAuthenticated) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router