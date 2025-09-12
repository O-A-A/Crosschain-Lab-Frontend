<template>
  <div>
    <h1>跨链流程 — 可视化</h1>

    <FlowViz /> <!-- 可视化组件 -->

    <div style="margin-top:16px; display:flex; gap:8px;">
      <!-- 结束实验按钮：只有在实验运行时才可点击 -->
      <v-btn class="mono-btn" @click="stop" >
        结束实验
      </v-btn>

      <!-- 查看结果按钮：只有在实验完成时才可点击 -->
      <v-btn class="mono-btn" @click="toResults" :disabled="store.status !== 'finished'">
        查看结果
      </v-btn>
    </div>
  </div>

  <!-- 时间戳卡片网格：固定 8 个卡片，失败/加载时右侧留空 -->
  <div class="timestamps-panel" style="margin-top:16px;">
    <v-row dense>
      <v-col
        v-for="box in tsBoxes"
        :key="box.key"
        cols="12" sm="6" md="4" lg="3"
        class="ts-col"
      >
        <v-card variant="tonal" class="mono-card pa-3 h-100">
          <div class="ts-row">
            <span class="ts-label">{{ box.label }}</span>
            <span class="ts-value">{{ box.text }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import FlowViz from '../components/FlowViz.vue';
import { useExperimentStore } from '../stores/experiment';

const store = useExperimentStore();
const router = useRouter();

function stop() {
  store.finish();
}

function toResults() {
  router.push('/results');
}

// 将 Unix 毫秒 -> 本地时间字符串；无效/无数据时返回空串（保持空白展示）
const formatTime = (ms: number): string => {
  if (!ms || Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleString();
};
/*
// 进入页面先拉一次，并开启轮询；离开页面清理轮询
let pollTimer: number | undefined;

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(() => {
    if (store.runId) store.fetchTimestamps(store.runId); // 确保传入 runId
  }, 3000);
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

onMounted(() => {
  store.fetchTimestamps(store.runId); // 初始调用
  startPolling();
  console.log('status=', store.status, 'runId=', store.runId, 'error=', store.error);
});

onUnmounted(() => {
  stopPolling();
});
*/
// 固定 8 个字段，始终渲染 8 个框
const TS_FIELDS = ['ccTIS', 'ccTL', 'ccTLC', 'ccTLS', 'ccTSD', 'ccTID', 'ccTM', 'ccTMC'] as const;
type TsKey = typeof TS_FIELDS[number];

// 计算展示用的数据：成功则显示格式化时间，否则为 ''
const tsBoxes = computed(() => {
  const ts = store.timestamps as Record<string, number | string> | null;
  return TS_FIELDS.map((k: TsKey) => {
    const raw = ts ? ts[k] : undefined;
    const val = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    return {
      key: k,
      label: `${k}: `,
      text: !Number.isNaN(val) ? formatTime(val) : '',
    };
  });
});
</script>

<style scoped>
.ts-row {
  display: flex;
  align-items: center;
  min-height: 40px;
}
.ts-label {
  min-width: 88px;      /* 左侧固定宽度，统一对齐 */
  font-weight: 700;
  color: #475569;       /* slate-600 */
}
.ts-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* 时间太长时省略号 */
}
.ts-col {
  padding: 50px; /* 让列间距更大 */
}

.ts-card {
  min-height: 10px; /* 控制卡片变短 */
}
</style>
