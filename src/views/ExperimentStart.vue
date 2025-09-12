<script setup lang="ts">
import ExperimentForm from '../components/ExperimentForm.vue';
import { useExperimentStore } from '../stores/experiment';
import { useRouter } from 'vue-router';
import type { ExperimentParams, ChainKey, AllowedParam } from '@/types';
import { startSystem, changeParam} from '@/services/api';


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

    for (const op of ops) {
      // 在发送每个请求前打印日志
      console.log(`正在发送请求：链: ${op.chain}, 参数: ${op.param}, 值: ${op.value}`);

      const response = await changeParam(op);

      // 打印每次请求的响应
      console.log(`参数 ${op.param} 的响应:`, response);
    }

    
   

    // —— 全部 OK 后再写入 store，避免触发 watcher 并发写
    store.$patch({ params: p });

  } catch (e) {
    console.error('[change] 发生错误:', e);
  } finally {
    changing = false;
  }
}
/** 启动实验：设置运行状态 → 启动后端 → 伪流推送 → 跳转 /flow */
let isRequesting = false;

async function handleStart(p: ExperimentParams) {
  if (isRequesting) return;  // 防止重复提交
  isRequesting = true;

  try {
    await store.start(p);  // 只调用 store.start(p)，内部已经处理了请求
    router.push({ name: 'flow' });  // 页面跳转
  } catch (err) {
    console.error('[start] 启动流程异常：', err);
    store.finish();
  } finally {
    isRequesting = false;  // 恢复按钮状态
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
