


import { createApp } from 'vue'
import App from './App.vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs' 
// 1. 引入路由
import router from './router'

// 2. 引入 Element Plus 及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 新增：引入并挂载 Buffer
import { Buffer } from 'buffer'
window.Buffer = Buffer // 挂载到 window 全局，让所有组件都能访问


const app = createApp(App)

app.use(router)      // 挂载路由
app.use(ElementPlus) // 挂载UI库

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}


app.mount('#app')