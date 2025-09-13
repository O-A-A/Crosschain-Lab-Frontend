<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch} from 'vue';
import { useExperimentStore } from '../stores/experiment';
import ResultsChart from '../components/ResultsChart.vue';
import { saveAs } from 'file-saver';
import { useLogStore } from '@/stores/logs';
import { useRouter } from 'vue-router';

const store = useExperimentStore();
const logStore = useLogStore();

const router = useRouter();

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

// 图表是否有数据
const hasChartData = computed(() => (store.data?.length ?? 0) > 0);

// ===== 下载 Tx_Details.csv（保留你的逻辑）=====
async function downloadTxDetails() {
  const res = await fetch('http://localhost:8080/download_tx_details', { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
  const raw = m?.[1] || m?.[2] || `Tx_Details_${Date.now()}.csv`;
  const filename = decodeURIComponent(raw);
  saveAs(blob, filename);
}

// ===== 日志预览（改为从 logStore 取最近 20 行）=====
//const previewLogs = computed(() => logStore.previewLogs);
// 分类预览：各取最近 20 行
const previewTxLogs = computed(() => (logStore.txLogs ?? []).slice(-20));
const previewNodeLogs = computed(() => (logStore.nodeLogs ?? []).slice(-20));
const previewSystemLogs = computed(() => (logStore.systemLogs ?? []).slice(-20));

// 点击“刷新”时，保持最近 N 行
async function refreshLogs() {
  await logStore.fetchLogs(200);
}


// —— 假定 store 里有 running / isRunning 标志；兼容两种命名 —— 
const isRunning = computed<boolean>(() =>
  (store as any).running ?? (store as any).isRunning ?? false
)

// —— 监听“运行中 -> 非运行”，在结束时延迟 500ms 拉图（给后端落盘时间）——
watch(isRunning, (now, prev) => {
  if (prev && !now) {
    setTimeout(() => refreshPics(), 500)
  }
})

// —— 如果进入页面时实验已结束，也自动拉一次 —— 
onMounted(() => {
  if (!isRunning.value) {
    setTimeout(() => refreshPics(), 100)
  }
})
// ====== 图片展示逻辑 ======
const PIC_BASE: string =
  ((import.meta as any)?.env?.VITE_PIC_BASE as string | undefined) ??
  'http://localhost:8080/drawpic';

const FILES = [
  'avg_latency_tt.png',
  'latency_CTXNum.png',
  'srt_tps.png',
  'tps_latency.png',
];

const base = PIC_BASE.replace(/\/+$/, '');
const urls = ref<string[]>(FILES.map(n => `${base}/${encodeURIComponent(n)}`));
const loading = ref(false);

function refreshPics() {
  loading.value = true;
  const t = Date.now();
  urls.value = FILES.map(n => `${base}/${encodeURIComponent(n)}?t=${t}`);
  setTimeout(() => (loading.value = false), 150);
}

function onImgError(u: string) {
  const i = urls.value.indexOf(u);
  if (i >= 0) urls.value.splice(i, 1);
}
</script>

<template>
  <div class="page">
    <!-- ▼ 实验结果：改为 card + 图标的板块 -->
    <v-card class="rounded-lg" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-chart-box</v-icon>
        实验结果
      </v-card-title>

      <v-card-text>
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

        <div v-if="hasChartData" class="chart-wrap">
          <ResultsChart :data="store.data" />
        </div>
        <div v-else class="chart-placeholder">暂无图表数据</div>
      </v-card-text>
    </v-card>
    <!-- ▲ 实验结果 -->

    <!-- 结果图片 -->
    <v-card class="rounded-lg mt-1 img-section" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-image-multiple</v-icon>
        结果图片
        <v-spacer />
        <v-btn size="small" variant="text" @click="refreshPics" :loading="loading">
          刷新
          <v-icon end size="small">mdi-refresh</v-icon>
        </v-btn>
        <v-btn size="small" variant="text" :href="PIC_BASE" target="_blank">
          打开目录
          <v-icon end size="small">mdi-open-in-new</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div v-if="!urls.length" class="empty">暂无可显示图片</div>
        <div v-else class="grid">
          <v-card v-for="u in urls" :key="u" class="img-card" elevation="0">
            <div class="img-wrap">
            <v-img
              :src="u"
              height="220"
              contain
              position="center"
              @error="onImgError(u)"
            >
              <template #placeholder>
                <div class="ph">加载中…</div>
              </template>
            </v-img>
            </div>
            <div class="img-actions">
              <v-btn
                size="x-small"
                color="primary"
                variant="outlined"
                :href="u"
                target="_blank"
                rel="noreferrer"
              >
                <v-icon start size="14">mdi-magnify-plus</v-icon>
                原图
              </v-btn>
            </div>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

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
    <div class="logs3">
      <!-- TX -->
      <section class="log-col">
        <div class="col-title">
          <v-icon size="16" class="mr-1">mdi-swap-horizontal</v-icon> 交易（tx）
        </div>
        <div class="log-list">
          <template v-if="previewTxLogs.length">
            <div
              v-for="(line, i) in previewTxLogs"
              :key="'tx-'+i"
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
          <div v-else class="log-empty">暂无 tx 日志</div>
        </div>
      </section>

      <!-- NODE -->
      <section class="log-col">
        <div class="col-title">
          <v-icon size="16" class="mr-1">mdi-lan</v-icon> 节点（node）
        </div>
        <div class="log-list">
          <template v-if="previewNodeLogs.length">
            <div
              v-for="(line, i) in previewNodeLogs"
              :key="'node-'+i"
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
          <div v-else class="log-empty">暂无 node 日志</div>
        </div>
      </section>

      <!-- SYSTEM -->
      <section class="log-col">
        <div class="col-title">
          <v-icon size="16" class="mr-1">mdi-cog</v-icon> 系统（system）
        </div>
        <div class="log-list">
          <template v-if="previewSystemLogs.length">
            <div
              v-for="(line, i) in previewSystemLogs"
              :key="'sys-'+i"
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
          <div v-else class="log-empty">暂无 system 日志</div>
        </div>
      </section>
    </div>
  </v-card-text>
</v-card>


    <div class="actions">
      <v-btn class="mono-btn" @click="downloadTxDetails" variant="flat">
        下载 Tx_Details.csv
      </v-btn>
      <v-btn class="mono-btn" @click="() => { store.reset(); logStore.reset(); }">
        重置
      </v-btn>
    </div>
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

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  margin: 4px 0 0; /* 更紧凑一点 */
}

.card {
  background: #0f172a;
  color: #fff;
  border-radius: 16px;
  padding: 14px;
}

.label { opacity: 0.7; font-size: 13px; }
.val { font-size: 20px; font-weight: 800; margin-top: 6px; }

/* 图表容器：有数据时占建议高度；无数据时由占位文本撑开 */
.chart-wrap {
  max-height: 28vh;
  min-height: 180px;
  overflow: hidden;
  border-radius: 12px;
  margin-top: 8px;
}
.chart-placeholder {
  opacity: .6;
  font-size: 12px;
  margin-top: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
/* 原来的 .img-card 改成这样 */
.img-card {
  border-radius: 12px;
  overflow: hidden;
  background: #fff;          /* 白底 */
  border: 1px solid #000;    /* 黑色边框 */
}

/* 可选：确保图片未铺满时底色仍是白的 */
.img-wrap {
  background: #fff;
}
.img-actions {
  display: flex;
  justify-content: flex-end;
  padding: 6px 8px 8px;
  font-size: 12px;
}
.ph {
  display:flex;
  align-items:center;
  justify-content:center;
  height:100%;
  opacity:.6;
  font-size:12px;
}
.empty { opacity:.8; }

.logs {
  max-height: 32vh;
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

.img-section { margin-top: 4px !important; }

@media (max-height: 740px) {
  .chart-wrap { max-height: 24vh; min-height: 160px; }
  .logs       { max-height: 28vh; min-height: 140px; }
}

/* 三栏网格容器 */
.logs3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* 单栏外框（复用深色风格） */
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

/* 列表区域（高度与原来一致） */
.log-list {
  max-height: 32vh;
  min-height: 160px;
  overflow: auto;
  padding: 10px 12px;
  line-height: 1.4;
}

/* 响应式：窄屏自动折行 */
@media (max-width: 1200px) {
  .logs3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .logs3 { grid-template-columns: 1fr; }
}
</style>
