<script setup lang="ts">
import { ref, computed } from 'vue';
import ExperimentForm from '../components/ExperimentForm.vue';
import { useExperimentStore } from '../stores/experiment';
import { useRouter } from 'vue-router';

import { startSystem, changeParam } from '@/services/api';

import type { ExperimentParams, ChainKey, AllowedParam } from '@/types';

type ChangeOp = { chain: ChainKey; param: AllowedParam; value: number };

const store = useExperimentStore();
const router = useRouter();

/* ========== 弹窗/提示状态 ========== */
const results = ref<Array<{ op: ChangeOp; ok: boolean; message: string }>>([]);
const toast = ref<{ show: boolean; text: string; color: 'success' | 'error' | 'info' }>({
  show: false,
  text: '',
  color: 'info',
});
const detailsOpen = ref(false);
const hasErrors = computed(() => results.value.some(r => !r.ok));

function isSuccess(res: any): boolean {
  if (!res) return false;

  // 字符串返回：如 "ok" / "parameter updated"
  if (typeof res === 'string') {
    return /(ok|success|updated|done)/i.test(res);
  }

  // 常见结构化返回
  const codeOk =
    res?.code === 200 || res?.code === 0 || res?.statusCode === 200;
  const boolOk = res?.ok === true || res?.success === true;
  const statusOk =
    typeof res?.status === 'string' &&
    /(ok|success|updated|done)/i.test(res.status);
  const msgOk =
    typeof res?.message === 'string' &&
    /(ok|success|updated|done)/i.test(res.message);

  return codeOk || boolOk || statusOk || msgOk;
}

function getMsg(res: any, fallback = 'OK'): string {
  if (typeof res === 'string') return res;          // 支持纯文本返回
  return res?.message || res?.msg || fallback;      // 结构化返回
}

let changing = false;
async function handleChangeParams(p: ExperimentParams) {
  if (changing) return;
  changing = true;

  try {
    const ops: ChangeOp[] = [
  { chain: 'src_chain', param: 'Block_Interval',      value: Number(p.blockInterval_src) },
  { chain: 'dst_chain', param: 'Block_Interval',      value: Number(p.blockInterval_dst) },
  { chain: 'src_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_src) },
  { chain: 'dst_chain', param: 'MaxBlockSize_global', value: Number(p.maxBlockSize_dst) },
  { chain: 'src_chain', param: 'InjectSpeed',         value: Number(p.injectSpeed_src) },
  { chain: 'dst_chain', param: 'InjectSpeed',         value: Number(p.injectSpeed_dst) },
  { chain: 'src_chain', param: 'TotalDataSize',       value: Number(p.totalDataSize_src) },
  { chain: 'dst_chain', param: 'TotalDataSize',       value: Number(p.totalDataSize_dst) },
];

    results.value = []; // 清空历史结果

    for (const op of ops) {
      try {
        console.log(`正在发送请求：链: ${op.chain}, 参数: ${op.param}, 值: ${op.value}`);
        const res = await changeParam(op as ChangeOp);
        const ok = isSuccess(res);
        const message = getMsg(res, ok ? '已应用' : '失败');
        console.log(`参数 ${op.param} 的响应:`, res);
        results.value.push({ op, ok, message });
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          '网络或服务器异常';
        console.error(`参数 ${op.param} 的异常响应:`, e);
        results.value.push({ op, ok: false, message: msg });
      }
    }

    const total = results.value.length;
    const okCount = results.value.filter(r => r.ok).length;

    if (okCount === total) {
      // 全部成功再写入 store，避免视图与后端不一致
      store.$patch({ params: p });
      toast.value = {
        show: true,
        text: `参数更新成功（${okCount}/${total}）`,
        color: 'success',
      };
      detailsOpen.value = false;
    } else {
      toast.value = {
        show: true,
        text: `部分参数更新失败（${okCount}/${total}），点击右侧“详情”查看失败项`,
        color: 'error',
      };
      detailsOpen.value = true; // 自动打开详情
    }
  } catch (e) {
    console.error('[change] 发生错误:', e);
    toast.value = { show: true, text: '修改参数时发生异常', color: 'error' };
    detailsOpen.value = true;
  } finally {
    changing = false;
  }
}

/** 启动实验：设置运行状态 → 启动后端 → 跳转 /flow */
let isRequesting = false;
async function handleStart(p: ExperimentParams) {
  if (isRequesting) return;
  isRequesting = true;
  try {
    await store.start(p);
    router.push({ name: 'flow' });
  } catch (err) {
    console.error('[start] 启动流程异常：', err);
    store.finish();
  } finally {
    isRequesting = false;
  }
}


</script>

<template>
  <div>
    <!-- 标题 -->
    <header class="hero">
      <h1 class="title">
        <span class="title__eyebrow">Cross-Chain Lab</span>
        <span class="title__main">跨链实验 · 启动</span>
      </h1>
      <p class="title__sub">轻量模拟 · 可视化 · 模块化</p>
    </header>

    <ExperimentForm
      @change="handleChangeParams"
      @start="handleStart"
    />

    <!-- ✅ 结果详情弹窗（Vuetify v3） -->
    <v-dialog v-model="detailsOpen" max-width="720">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">
          参数更新结果
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="hasErrors"
            type="error"
            variant="tonal"
            class="mb-4"
            text="部分参数更新失败，请查看下表失败原因。"
          />
          <v-table density="comfortable">
            <thead>
              <tr>
                <th style="width: 110px;">链</th>
                <th style="width: 220px;">参数</th>
                <th style="width: 120px;">值</th>
                <th style="width: 90px;">状态</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in results" :key="idx">
                <td>{{ r.op.chain }}</td>
                <td>{{ r.op.param }}</td>
                <td>{{ r.op.value }}</td>
                <td>
                  <v-chip :color="r.ok ? 'success' : 'error'" size="small" variant="flat">
                    {{ r.ok ? '成功' : '失败' }}
                  </v-chip>
                </td>
                <td>{{ r.message }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn v-if="hasErrors" variant="text" @click="detailsOpen = false">知道了</v-btn>
          <v-btn v-else color="primary" variant="flat" @click="detailsOpen = false">完成</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ 顶部提示条 -->
    <v-snackbar
      v-model="toast.show"
      :timeout="3000"
      location="top"
      :color="toast.color"
    >
      {{ toast.text }}
      <template #actions>
        <v-btn variant="text" @click="toast.show = false">关闭</v-btn>
        <v-btn
          v-if="hasErrors"
          variant="text"
          @click="detailsOpen = true"
        >
          详情
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>


<style scoped>
:root{
  --accent: 222 100% 60%;
  --fg: 222 20% 12%;
  --muted: 222 8% 42%;
  --border: 222 20% 88%;
  --bg: 0 0% 100%;
}
@media (prefers-color-scheme: dark){
  :root{
    --fg: 0 0% 98%;
    --muted: 0 0% 70%;
    --border: 0 0% 18%;
    --bg: 0 0% 7%;
  }
}

/* 版心更窄、更高级；整体居中 */
.page{
  max-width: 820px;
  margin: 48px auto 64px;
  padding: 0 18px;
  color: hsl(var(--fg));
  text-align: center;
}

/* 高级 hero：细边+柔和渐变+轻微玻璃感 */
.hero{
  position: relative;
  padding: 36px 28px;
  border-radius: 18px;
  border: 1px solid hsl(var(--border));
  background:
    radial-gradient(900px 300px at 50% -20%, hsl(var(--accent) / .10), transparent 60%),
    linear-gradient(to bottom, hsl(0 0% 100% / .06), transparent 50%),
    hsl(var(--bg));
  backdrop-filter: saturate(120%) blur(4px);
  box-shadow:
    0 1px 0 hsl(0 0% 100% / .6) inset,
    0 10px 30px hsl(0 0% 0% / .06);
}

/* 渐变描边环绕（高级细节） */


.title {
  display: grid;
  gap: 8px;
  margin: 0;
  text-align: center; /* ⭐ 关键：文字居中 */
  justify-items: center; /* ⭐ Grid 内部元素居中 */
}

.title__eyebrow {
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: hsl(var(--muted));
  opacity: .9;
  text-align: center; /* 补充保证居中 */
}

.title__main {
  font-size: clamp(24px, 5vw, 34px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: .2px;
  position: relative;
  padding-bottom: 10px;
  text-align: center; /* 主标题居中 */
}

.title__sub {
  margin: 10px 0 0;
  font-size: 14px;
  color: hsl(var(--muted));
  text-align: center; /* 副标题居中 */
}

.title__main::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 200px;
  height: 2px;
  border-radius: 2px;

  /* 橙金 + 蓝紫 渐变 */
  background: linear-gradient(
    90deg,
    transparent,
    #F4A63C,  /* 橙金 */
    #4B64D6,  /* 蓝紫 */
    transparent
  );

  /* 两色柔光阴影 */
  box-shadow:
    0 0 12px #F4A63C88,
    0 0 18px #4B64D688;
}

/* 表单卡片：窄、居中、干净 */
.panel{
  margin: 22px auto 0;
  padding: 22px 20px;
  max-width: 700px;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--bg));
  box-shadow: 0 6px 18px hsl(0 0% 0% / .05);
}

/* 微交互：悬浮轻起、阴影更柔 */
.hero:hover, .panel:hover{
  transition: transform 160ms ease, box-shadow 160ms ease;
  transform: translateY(-1px);
  box-shadow: 0 14px 30px hsl(0 0% 0% / .08);
}
@media (prefers-reduced-motion: reduce){
  .hero:hover, .panel:hover{ transform:none; box-shadow:none; }
}
</style>
