import '@/utils/axios-auth'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'dayjs/locale/zh-cn'
import 'element-plus/dist/index.css'
import '@/styles/app-button-system.css'
import '@/styles/audit-split-layout.css'
import '@/styles/project-tab-tables.css'
import '@/styles/project-home-modern.css'
import { Buffer } from 'buffer'

globalThis.Buffer = globalThis.Buffer || Buffer

const app = createApp(App)

app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
