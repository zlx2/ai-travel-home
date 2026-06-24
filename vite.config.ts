import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  envPrefix: ['VITE_', 'AMAP_'],
  server: {
    proxy: {
      // 浏览器始终请求同源 /api，开发服务器再转发给后端，避免跨域问题。
      '/api': {
        target: process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
