import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'buffer': fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url))
    }
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    exclude: ['xlsx-populate'],
    include: ['buffer']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('element-plus')) return 'element-plus'
          if (id.includes('echarts')) return 'echarts'
          if (id.includes('exceljs')) return 'exceljs'
          if (id.includes('@vue-office')) return 'vue-office'
          if (id.includes('@vue-flow')) return 'vue-flow'
          if (id.includes('@codemirror')) return 'codemirror'
          if (id.includes('marked') || id.includes('highlight.js')) return 'markdown'
          return undefined
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // 本地开发可通过 .env.local 设置 VITE_API_PROXY_TARGET，避免将内网地址写入仓库
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
