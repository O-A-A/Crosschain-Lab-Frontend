<template>
  <v-container>
    <v-card class="rounded-lg" elevation="2">
      <v-toolbar color="primary" dark>
        <v-btn icon to="/results" class="mr-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-toolbar-title>实验日志</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="refreshLogs">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="log-container">
        <div class="log-output" ref="logBox">
          <div
            v-for="(line, idx) in logStore.logs"
            :key="idx"
            :class="['log-line', getLineClass(line)]"
          >
            {{ line }}
          </div>
          <div v-if="!logStore.logs.length" class="log-empty">暂无日志</div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useLogStore } from '@/stores/logs';

const logStore = useLogStore();

async function refreshLogs() {
  await logStore.fetchLogs(500);  // 获取更多日志数据
}

// 用于日志行的样式处理
function getLineClass(line: string) {
  if (/\[ERR\]|\bERROR\b/i.test(line)) return 'log-error';
  if (/\bWARN\b/i.test(line)) return 'log-warn';
  if (/\bINFO\b/i.test(line)) return 'log-info';
  return '';
}

onMounted(() => {
  // 页面加载时获取完整日志
  logStore.fetchLogs(500);  // 调整 limit 根据需要
});
</script>

<style scoped>
.log-container {
  max-height: 600px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #e0e0e0;
  font-family: monospace;
  border-radius: 8px;
  padding: 12px;
}

.log-output { white-space: pre-wrap; word-wrap: break-word; }

.log-line { font-size: 12px; line-height: 1.4; }
.log-error { color: #ff6b6b; }
.log-warn  { color: #fbc531; }
.log-info  { color: #4cd137; }
.log-empty { opacity: .7; font-size: 12px; }
</style>
