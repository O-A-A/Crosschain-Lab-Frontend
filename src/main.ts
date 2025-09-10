import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/mono-btn.css' // 引入全局按钮样式
import './assets/mono-card.css'

import App from './App.vue'

// ✅ 按你项目结构引入
import router from './router'
import vuetify from './plugins/vuetify'

// 可选：使用 mdi 图标字体（若需图标）
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify) // ✅ 一定要 use
  .mount('#app')
