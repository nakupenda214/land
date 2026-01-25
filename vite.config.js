import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 【新增】核心配置：服务器代理
  server: {
    host: '0.0.0.0', // 绑定到所有网络接口
    port: 5173, // 保持原端口或自定义
    proxy: {
      
      // 意思：只要看到请求是以 /api 开头的，就转发给后端
      '/api': {
        target: 'http://10.123.86.68:8082', // 后端真实地址
        changeOrigin: true, // 允许跨域
        rewrite: (path) => path.replace(/^\/api/, '') // 去掉 /api 前缀再发给后端
        // 注意：如果后端接口本身就带有 /api，就把上面这行 rewrite 注释掉
      }
    }
  }
})