<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useExperimentStore } from '../stores/experiment';
import ResultsChart from '../components/ResultsChart.vue';
import { saveAs } from 'file-saver';
import { useLogStore } from '@/stores/logs';
import { useRouter } from 'vue-router';  // 导入 useRouter

const store = useExperimentStore();
const logStore = useLogStore();

const router = useRouter();
const goToResultChartPage = () => {
  router.push('/draw'); // 跳转到结果图页面
};



// ===== 统计摘要（保留你的逻辑）=====
const summary = computed(() => {
  const arr = store.data;
  if (!arr.length) return { avg: 0, p95: 0, successRate: 0 };

  const lat = arr.map(a => a.latencyMs).sort((a, b) => a - b);
  const avg = Math.round(lat.reduce((s, v) => s + v, 0) / lat.length);
  const p95 = lat[Math.floor(lat.length * 0.95) - 1] ?? lat[lat.length - 1];
  const successRate = +((arr.filter(a => a.success).length / arr.length) * 100).toFixed(2);

  return { avg, p95, successRate };
});

// ===== 下载 Tx_Details.csv（保留你的逻辑）=====
async function downloadTxDetails() {
  const res = await fetch('http://localhost:8080/download_tx_details', {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
  const raw = m?.[1] || m?.[2] || `Tx_Details_${Date.now()}.csv`;
  const filename = decodeURIComponent(raw);
  saveAs(blob, filename);
}

// ===== 日志预览（改为从 logStore 取最近 20 行）=====
const previewLogs = computed(() => logStore.previewLogs);

// 点击“刷新”时，保持最近 N 行（没有历史 REST 接口时为 no-op）
async function refreshLogs() {
  await logStore.fetchLogs(200);  // 获取最新的日志数据
}


</script>

<template>
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
      <v-btn class="mono-btn" @click="downloadTxDetails" variant="flat">
        下载 Tx_Details.csv
      </v-btn>

      <!-- 同时重置实验与日志，更干净 -->
      <v-btn class="mono-btn" @click="() => { store.reset(); logStore.reset(); }">
        重置
      </v-btn>
      
      <v-btn class="mono-btn" @click="goToResultChartPage">
        查看结果图
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
/* 修正：calc 写法 */
.page {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-rows:
    auto
    auto
    minmax(180px, 28vh)
    minmax(160px, 32vh)
    auto;
  row-gap: 12px;
  overflow: hidden;
  padding-bottom: 8px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  margin: 8px 0 0;
}

.card {
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  padding: 14px;
}

.label { opacity: 0.7; font-size: 13px; }
.val { font-size: 20px; font-weight: 800; margin-top: 6px; }

.chart-wrap {
  height: 28vh;
  min-height: 180px;
  overflow: hidden;
  border-radius: 12px;
}

.logs {
  height: 32vh;
  min-height: 160px;
  overflow: auto;
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

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

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
