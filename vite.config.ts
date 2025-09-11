import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/change_param': {
        target: 'http://localhost:8080',  // 你的后端 API 地址
        changeOrigin: true,  // 是否改变请求的原始主机头为目标地址
        secure: false,  // 如果是 HTTPS 请求，需要设置为 true
        rewrite: (path) => path.replace(/^\/change_param/, '')  // 可选的路径重写
      }
    }
  }
})
