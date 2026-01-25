


import { createApp } from 'vue'
import App from './App.vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs' 
// 1. 引入路由
import router from './router'

// 2. 引入 Element Plus 及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'


const app = createApp(App)

app.use(router)      // 挂载路由
app.use(ElementPlus) // 挂载UI库

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}


app.mount('#app')