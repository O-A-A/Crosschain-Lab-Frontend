<script setup lang="ts">
import ExperimentForm from '../components/ExperimentForm.vue';
import { useExperimentStore } from '../stores/experiment';
import { useRouter } from 'vue-router';
import type { ExperimentParams, ChainKey, AllowedParam } from '@/types';
import { startSystem, changeParam ,getParams} from '@/services/api';


const store = useExperimentStore();
const router = useRouter();

let changing = false;

async function handleChangeParams(p: ExperimentParams) {
  if (changing) return;
  changing = true;
  try {
    // —— 先发请求（已经顺序/串行）
    const ops = [
      { chain: 'src_chain', param: 'Block_Interval',      value: Number(p.blockInterval_src) },
      { chain: 'dst_chain', param: 'Block_Interval',      value: Number(p.blockInterval_dst) },
      { chain: 'src_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_src) },
      { chain: 'dst_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_dst) },
      { chain: 'src_chain', param: 'InjectSpeed',         value: Number(p.injectSpeed_src) },
      { chain: 'dst_chain', param: 'InjectSpeed',         value: Number(p.injectSpeed_dst) },
      { chain: 'src_chain', param: 'TotalDataSize',       value: Number(p.totalDataSize_src) },
      { chain: 'dst_chain', param: 'TotalDataSize',       value: Number(p.totalDataSize_dst) },
    ] as const;

    for (const op of ops) await changeParam(op);

    // —— 读回确认（强烈建议先做一次）
    const [srcNow, dstNow] = await Promise.all([
      getParams('src_chain'),
      getParams('dst_chain'),
    ]);
    console.log('[verify]', srcNow.data, dstNow.data);

    // —— 全部 OK 后再写入 store，避免触发 watcher 并发写
    store.$patch({ params: p });

  } catch (e) {
    console.error('[change] fail:', e);
  } finally {
    changing = false;
  }
}
/** 启动实验：设置运行状态 → 启动后端 → 伪流推送 → 跳转 /flow */
async function handleStart(p: ExperimentParams) {
  try {
    store.start(p);        // 标记运行中 & 保存参数
    await startSystem();   // 真正启动后端（连上 WS 后替换 mock）

    // 这里开始发“伪实时数据”，等你接上后端/WS后替换
    mockStream();

    router.push('/flow');
  } catch (err) {
    console.error('[start] 启动失败：', err);
    store.finish();
  }
}

// —— 演示：每 intervalMs 推入一条数据 —— //
function mockStream() {
  const params = store.params!;
  let i = 0;
  const timer = setInterval(() => {
    if (i >= params.txCount || !store.isRunning) {
      clearInterval(timer);
      store.finish();
      return;
    }
    store.pushPoint({
      t: Date.now(),
      latencyMs: Math.round(100 + Math.random() * 400),
      success: Math.random() > 0.05,
    });
    i++;
  }, params.intervalMs);
}
</script>

<template>
  <div>
    <h1 class="title">跨链实验 — 启动</h1>
    <!-- 🔀 分别监听两个事件 -->
    <ExperimentForm
      @change="handleChangeParams"
      @start="handleStart"
    />
  </div>
</template>

<style scoped>
.title {
  text-align: center;
}
</style>
