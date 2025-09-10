<script setup lang="ts">
import ExperimentForm from '../components/ExperimentForm.vue';
import { useExperimentStore } from '../stores/experiment';
import { useRouter } from 'vue-router';
import type { ExperimentParams } from '../types';

// ✅ 调你封装好的 API（确保 /services/api.ts 用 params 传参）
import { startSystem, changeParam /*, getTxDetails */ } from '../services/api';

const store = useExperimentStore();
const router = useRouter();

/** 仅修改参数：写入 store，并逐项调用后端 changeParam */
async function handleChangeParams(p: ExperimentParams) {
  try {
    // 不改变运行状态，只更新配置
    store.$patch({ params: p });

    // 按需把 string 转 number
    await Promise.all([
      changeParam({ chain: 'src_chain', param: 'Block_Interval',      value: Number(p.blockInterval_src) }),
      changeParam({ chain: 'dst_chain', param: 'Block_Interval',      value: Number(p.blockInterval_dst) }),
      changeParam({ chain: 'src_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_src) }),
      changeParam({ chain: 'dst_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_dst) }),
      // 如果后端有这两个参数名，再放开注释即可
      changeParam({ chain: 'src_chain', param: 'InjectSpeed',        value: Number(p.injectSpeed) }),
      changeParam({ chain: 'dst_chain', param: 'TotalDataSize',     value: Number(p.totalDataSize) }),
    ]);

    console.log('[change] 参数已下发');
  } catch (err) {
    console.error('[change] 参数下发失败：', err);
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
