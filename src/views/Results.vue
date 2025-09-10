<script setup lang="ts">
import { computed,onMounted, onUnmounted } from 'vue';
import { useExperimentStore } from '../stores/experiment';
import ResultsChart from '../components/ResultsChart.vue';
import { saveAs } from 'file-saver';

const store = useExperimentStore();

const summary = computed(() => {
  const arr = store.data;
  if (!arr.length) return { avg: 0, p95: 0, successRate: 0 };

  const lat = arr.map(a => a.latencyMs).sort((a, b) => a - b);
  const avg = Math.round(lat.reduce((s, v) => s + v, 0) / lat.length);
  const p95 = lat[Math.floor(lat.length * 0.95) - 1] ?? lat[lat.length - 1];
  const successRate = +((arr.filter(a => a.success).length / arr.length) * 100).toFixed(2);

  return { avg, p95, successRate };
});

function exportCSV() {
  const header = 't,latencyMs,success\n';
  const rows = store.data
    .map(d => `${new Date(d.t).toISOString()},${d.latencyMs},${d.success}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `experiment_${store.runId || 'data'}.csv`);
}

// —— 日志预览（最近 20 行），store.logs 不存在也不报错 ——
const previewLogs = computed(() => {
  const lines = (store as any).logs ?? [];
  return lines.slice(-20);
});

// 可选：从后端拉日志（需要在 experimentStore 里实现 fetchLogs）
async function refreshLogs() {
  try {
    if (typeof (store as any).fetchLogs === 'function') {
      await (store as any).fetchLogs();
    }
  } catch (e) {
    console.error('刷新日志失败：', e);
  }
}

onMounted(() => {
  // 页面打开就开始产生日志，并拉一批初始日志
  (store as any).startMockLogs?.()
  ;(store as any).fetchLogs?.()
})
onUnmounted(() => {
  // 离开页面停止
  (store as any).stopMockLogs?.()
})


</script>

<template>
  <!-- ✅ 改 1：给根节点加 .page，配合 100vh 布局 -->
  <div class="page">
    <h1>实验结果</h1>

    <div class="cards">
      <div class="card">
        <div class="label">平均延迟</div>
        <div class="val">{{ summary.avg }} ms</div>
      </div>

      <div class="card">
        <div class="label">P95</div>
        <div class="val">{{ summary.p95 }} ms</div>
      </div>

      <div class="card">
        <div class="label">成功率</div>
        <div class="val">{{ summary.successRate }} %</div>
      </div>
    </div>

    <!-- ✅ 改 2：给图表包一层固定高度容器，防止撑高页面 -->
    <div class="chart-wrap">
      

      <ResultsChart :data="store.data" />
    </div>

    <!-- 日志预览（最近 20 行） -->
    <v-card class="rounded-lg mt-2" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-file-document-outline</v-icon>
        实验日志（最近 20 行）
        <v-spacer />
        <v-btn size="small" variant="text" @click="refreshLogs">
          刷新
          <v-icon end size="small">mdi-refresh</v-icon>
        </v-btn>
        <v-btn size="small" variant="text" color="primary" to="/logs">
          查看全部
          <v-icon end size="small">mdi-chevron-right</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div class="logs">
          <template v-if="previewLogs.length">
            <div
              v-for="(line, i) in previewLogs"
              :key="i"
              :class="[
                'log-line',
                line.includes('ERROR') ? 'log-error' :
                line.includes('WARN')  ? 'log-warn'  :
                line.includes('INFO')  ? 'log-info'  : ''
              ]"
            >
              {{ line }}
            </div>
          </template>

          <div v-else class="log-empty">暂无日志</div>
        </div>
      </v-card-text>
    </v-card>

    <div class="actions">
      <v-btn class="mono-btn" @click="exportCSV" :disabled="!store.data.length">
        导出 CSV
      </v-btn>

      <v-btn class="mono-btn" @click="store.reset()">
        重置
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
/* ✅ 用 100vh 网格布局，控制各区块高度，确保一屏展示 */
.page {
  height: 100vh - 56px;
  display: grid;
  grid-template-rows:
    auto               /* 标题 */
    auto               /* 统计卡片 */
    minmax(180px, 28vh)/* 图表区：随屏高变化 */
    minmax(160px, 32vh)/* 日志区：内部滚动 */
    auto;              /* 操作按钮 */
  row-gap: 12px;
  overflow: hidden;     /* 禁止整页滚动，由子块自己处理 */
  padding-bottom: 8px;  /* 给底部按钮留点空间 */
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  margin: 8px 0 0; /* 稍微收紧，减少总高度 */
}

.card {
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  padding: 14px;
}

.label { opacity: 0.7; font-size: 13px; }
.val { font-size: 20px; font-weight: 800; margin-top: 6px; }

/* ✅ 图表容器固定高度，内部由图表自适应 */
.chart-wrap {
  height: 28vh;              /* 与上面的 grid 行一致 */
  min-height: 180px;
  overflow: hidden;          /* 防止图表溢出触发整页滚动 */
  border-radius: 12px;
}

/* ✅ 日志区域：固定高度 + 内部滚动，不撑高页面 */
.logs {
  height: 32vh;              /* 与上面的 grid 行一致 */
  min-height: 160px;
  overflow: auto;            /* 只在日志里滚动 */
  background: #0b1020;
  color: #e6e8ee;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  border-radius: 12px;
  padding: 12px;
  line-height: 1.4;
}

.log-line { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
.log-error { color: #ff6b6b; }
.log-warn  { color: #fbc531; }
.log-info  { color: #4cd137; }
.log-empty { opacity: 0.7; font-size: 12px; }

/* 操作区 */
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ✅ 小屏/矮屏优化，自动收紧图表 & 日志高度，避免溢出 */
@media (max-height: 740px) {
  .page {
    grid-template-rows:
      auto auto
      minmax(160px, 24vh)
      minmax(140px, 28vh)
      auto;
  }
  .chart-wrap { height: 24vh; min-height: 160px; }
  .logs       { height: 28vh; min-height: 140px; }
}
</style>
