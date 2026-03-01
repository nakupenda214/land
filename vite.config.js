import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'buffer': fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url))
    }
  },
  define: {
    'process.env': {},
    // 优化：不仅暴露 Buffer，还直接绑定到 window.Buffer，确保全局可访问
    'Buffer': 'window.Buffer',
    'window.Buffer': 'window.Buffer'
  },
  optimizeDeps: {
    exclude: ['xlsx-populate'],
    include: ['buffer']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://10.123.69.140:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})