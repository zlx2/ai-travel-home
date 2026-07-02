import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
    }),
    Components({
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
    }),
  ],
  envPrefix: ['VITE_', 'AMAP_'],
  optimizeDeps: {
    include: [
      'axios',
      'pinia',
      'vue',
      'vue-router',
      '@element-plus/icons-vue',
      'element-plus/es',
      'element-plus/es/components/message/index',
      'element-plus/es/components/message-box/index',
      'element-plus/es/components/avatar/style/css',
      'element-plus/es/components/button/style/css',
      'element-plus/es/components/checkbox/style/css',
      'element-plus/es/components/collapse-transition/style/css',
      'element-plus/es/components/date-picker/style/css',
      'element-plus/es/components/dialog/style/css',
      'element-plus/es/components/dropdown/style/css',
      'element-plus/es/components/dropdown-item/style/css',
      'element-plus/es/components/dropdown-menu/style/css',
      'element-plus/es/components/empty/style/css',
      'element-plus/es/components/form/style/css',
      'element-plus/es/components/form-item/style/css',
      'element-plus/es/components/icon/style/css',
      'element-plus/es/components/input/style/css',
      'element-plus/es/components/input-number/style/css',
      'element-plus/es/components/loading/style/css',
      'element-plus/es/components/pagination/style/css',
      'element-plus/es/components/radio/style/css',
      'element-plus/es/components/radio-button/style/css',
      'element-plus/es/components/radio-group/style/css',
      'element-plus/es/components/segmented/style/css',
      'element-plus/es/components/select/style/css',
      'element-plus/es/components/skeleton/style/css',
      'element-plus/es/components/tag/style/css',
      'element-plus/es/components/time-select/style/css',
      'element-plus/es/components/tooltip/style/css',
      'element-plus/es/components/upload/style/css',
    ],
  },
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
