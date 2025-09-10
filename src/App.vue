<script setup>
import { ref, computed } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()

// 暗黑模式
const isDarkTheme = computed(() => theme.global.current.value.dark)

// 切换主题
const toggleTheme = () => {
  theme.global.name.value = isDarkTheme.value ? 'light' : 'dark'
}
</script>

<template>
  <v-app>
    <!-- 顶部应用栏 -->
    <v-app-bar flat height="64">
      <v-container class="d-flex align-center px-4 py-0 mx-auto">
        <!-- Logo 和标题 -->
        <div class="d-flex align-center">
          <img src="@/assets/blockchain.png" alt="Logo" class="mr-3" style="width: 32px; height: 32px;">
          <v-app-bar-title class="font-weight-bold text-body-1">Crosschain Lab</v-app-bar-title>
        </div>

        <!-- 新的路由导航 -->
        <nav class="d-none d-md-flex ml-8 nav">
          <RouterLink to="/" class="text-body-2 mr-4">启动实验</RouterLink>
          <RouterLink to="/flow" class="text-body-2 mr-4">流程可视化</RouterLink>
          <RouterLink to="/results" class="text-body-2">结果</RouterLink>
        </nav>

        <v-spacer></v-spacer>

        <!-- 主题切换按钮 -->
        <v-btn icon class="mr-2" @click="toggleTheme" size="small">
          <v-icon size="small">
            {{ isDarkTheme ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}
          </v-icon>
        </v-btn>
      </v-container>
    </v-app-bar>

    <!-- 路由内容 -->
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>

<style>
.nav a {
  text-decoration: none;
  color: inherit;
}
.nav a.router-link-active {
  font-weight: bold;
  border-bottom: 2px solid currentColor;
}

/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
/* 深色模式滚动条 */
.v-theme--dark ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.v-theme--dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
.v-theme--dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
