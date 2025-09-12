<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLogStore } from '@/stores/logs'

const logStore = useLogStore()

// 过滤与行数限制
const q = ref('')
const limit = ref(500)

function filterAndSlice(arr: string[] = []) {
  let res = arr
  const keyword = q.value.trim().toLowerCase()
  if (keyword) res = res.filter(l => l.toLowerCase().includes(keyword))
  return res.slice(-limit.value)
}

const txView   = computed(() => filterAndSlice(logStore.txLogs))
const nodeView = computed(() => filterAndSlice(logStore.nodeLogs))
const sysView  = computed(() => filterAndSlice(logStore.systemLogs))

function reconnectSSE() {
  logStore.stopSSE()
  logStore.startSSE()
}
function clearAll() {
  logStore.clearLogs()
}

// 保证进入页面时有 SSE
onMounted(() => {
  logStore.startSSE()
})
</script>

<template>
  <div class="page">
    <v-card class="rounded-lg" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-file-document-outline</v-icon>
        全部日志
        <v-spacer />
        <v-text-field
          v-model="q"
          density="comfortable"
          variant="outlined"
          hide-details
          placeholder="搜索关键字（INFO/WARN/ERROR/哈希/节点号…）"
          prepend-inner-icon="mdi-magnify"
          style="max-width: 320px"
        />
        <v-select
          class="ml-2"
          :items="[100,200,500,1000,2000]"
          v-model="limit"
          density="comfortable"
          variant="outlined"
          hide-details
          style="width: 110px"
          label="每栏行数"
        />
        <v-btn class="ml-2" size="small" variant="text" @click="reconnectSSE">
          重连日志流
          <v-icon end size="small">mdi-connection</v-icon>
        </v-btn>
        <v-btn class="ml-1" size="small" variant="text" color="error" @click="clearAll">
          清空
          <v-icon end size="small">mdi-delete-outline</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div class="logs3">
          <!-- TX -->
          <section class="log-col">
            <div class="col-title">
              <v-icon size="16" class="mr-1">mdi-swap-horizontal</v-icon>
              交易（tx）
            </div>
            <div class="log-list">
              <template v-if="txView.length">
                <div
                  v-for="(line, i) in txView"
                  :key="'tx-'+i"
                  :class="[
                    'log-line',
                    line.includes('ERROR') ? 'log-error' :
                    line.includes('WARN')  ? 'log-warn'  :
                    line.includes('INFO')  ? 'log-info'  : ''
                  ]"
                >{{ line }}</div>
              </template>
              <div v-else class="log-empty">暂无 tx 日志</div>
            </div>
          </section>

          <!-- NODE -->
          <section class="log-col">
            <div class="col-title">
              <v-icon size="16" class="mr-1">mdi-lan</v-icon>
              节点（node）
            </div>
            <div class="log-list">
              <template v-if="nodeView.length">
                <div
                  v-for="(line, i) in nodeView"
                  :key="'node-'+i"
                  :class="[
                    'log-line',
                    line.includes('ERROR') ? 'log-error' :
                    line.includes('WARN')  ? 'log-warn'  :
                    line.includes('INFO')  ? 'log-info'  : ''
                  ]"
                >{{ line }}</div>
              </template>
              <div v-else class="log-empty">暂无 node 日志</div>
            </div>
          </section>

          <!-- SYSTEM -->
          <section class="log-col">
            <div class="col-title">
              <v-icon size="16" class="mr-1">mdi-cog</v-icon>
              系统（system）
            </div>
            <div class="log-list">
              <template v-if="sysView.length">
                <div
                  v-for="(line, i) in sysView"
                  :key="'sys-'+i"
                  :class="[
                    'log-line',
                    line.includes('ERROR') ? 'log-error' :
                    line.includes('WARN')  ? 'log-warn'  :
                    line.includes('INFO')  ? 'log-info'  : ''
                  ]"
                >{{ line }}</div>
              </template>
              <div v-else class="log-empty">暂无 system 日志</div>
            </div>
          </section>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.page {
  min-height: calc(100dvh - 56px);
  overflow-y: auto;
  display: grid;
  grid-auto-rows: auto;
  row-gap: 12px;
  padding-bottom: 12px;
}

/* 三栏网格容器 */
.logs3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* 单栏外框（与结果页风格一致） */
.log-col {
  background: #0b1020;
  color: #e6e8ee;
  border-radius: 12px;
  overflow: hidden;
}

/* 栏目标题 */
.col-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
  border-bottom: 1px solid rgba(255,255,255,.06);
}

/* 列表区域 */
.log-list {
  max-height: 70vh;
  min-height: 240px;
  overflow: auto;
  padding: 10px 12px;
  line-height: 1.4;
}

/* 复用等级颜色 */
.log-line { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
.log-error { color: #ff6b6b; }
.log-warn  { color: #fbc531; }
.log-info  { color: #4cd137; }
.log-empty { opacity: 0.7; font-size: 12px; }

/* 响应式：窄屏折列 */
@media (max-width: 1200px) {
  .logs3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .logs3 { grid-template-columns: 1fr; }
}
</style>
