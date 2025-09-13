<template>
  <div class="wrap">
    <!-- 表单容器 -->
    <v-form @submit.prevent="onChangeParams" class="form">
      <!-- 外层卡片 -->
      <v-card elevation="6" rounded="lg" class="form-card">
        <!-- 卡片主体区域（表单输入控件） -->
        <v-card-text class="pa-0">
          <div class="grid">
            <!-- ===== 源链 / 目标链：同一行 ===== -->
<div class="row-2">
  <!-- 源链（PoW） -->
  <v-text-field
    label="源链"
    v-model="params.srcChain"
    variant="outlined"
    disabled
    density="default"
    hide-details
  />
  <!-- 目标链（PoW） -->
  <v-text-field
    label="目标链"
    v-model="params.dstChain"
    variant="outlined"
    disabled
    density="default"
    hide-details
  />
</div>
            <!-- 跨链协议（CCP） -->
            <v-text-field
              label="跨链协议"
              v-model="params.protocol"
              variant="outlined"
              disabled
              density="default"
              hide-details
            />

            <!-- ===== Block Interval（源/目标：同一行） ===== -->
<div class="row-2">
  <!-- 修改 Block Interval（源链） -->
  <v-text-field
    label="Block Interval（源链）"
    v-model="params.blockInterval_src"
    type="number"
    variant="outlined"
    density="default"
    hide-details
  />
  <!-- 修改 Block Interval（目标链） -->
  <v-text-field
    label="Block Interval（目标链）"
    v-model="params.blockInterval_dst"
    type="number"
    variant="outlined"
    density="default"
    hide-details
  />
</div>

<!-- ===== Max Block Size（源/目标：同一行） ===== -->
<div class="row-2">
  <!-- 修改 Max Block Size（源链） -->
  <v-text-field
    label="Max Block Size（源链）"
    v-model="params.maxBlockSize_src"
    type="number"
    variant="outlined"
    density="default"
    hide-details
  />
  <!-- 修改 Max Block Size（目标链） -->
  <v-text-field
    label="Max Block Size（目标链）"
    v-model="params.maxBlockSize_dst"
    type="number"
    variant="outlined"
    density="default"
    hide-details
  />
</div>

            <!-- 修改 Inject Speed（源链） -->
            <v-text-field
              label="Inject Speed（源链）"
              v-model="params.injectSpeed_src"
              type="number"
              variant="outlined"
              density="default"
              hide-details
            />

            <!-- 修改 Total Data Size（源链和目标链） -->
            <v-text-field
              label="Total Data Size（源链和目标链）"
              v-model="params.totalDataSize_src"
              type="number"
              variant="outlined"
              density="default"
              hide-details
            />
          </div>
        </v-card-text>

        <!-- 底部操作按钮 -->
        <v-card-actions class="actions">
          <!-- 只负责修改参数：走表单 submit -->
          <v-btn
            type="submit"
            class="mono-btn"
            block
          >
            修改参数
          </v-btn>
        </v-card-actions>

        <v-card-actions class="actions">
          <!-- 只负责启动实验：纯 click，不提交表单 -->
          <v-btn
            type="button"
            class="mono-btn"
            block
            @click="onStartExperiment"
          >
            启动实验
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref,watch , onMounted } from 'vue'
import type { ExperimentParams } from '../types'
import { getAllParams } from '@/services/api'
const syncDst = ref(true); // ✅ 勾选后把 src 值同步到 dst
const emit = defineEmits<{
  /** 修改参数事件 */
  (e: 'change', value: ExperimentParams): void
  /** 启动实验事件 */
  (e: 'start', value: ExperimentParams): void
}>()

const params = ref<ExperimentParams>({
  srcChain: 'PoW',
  dstChain: 'PoW',
  txCount: 3000,
  intervalMs: 300,
  protocol: 'CCP',

  blockInterval_src: '5000',
  blockInterval_dst: '5000',
  maxBlockSize_src: '2000',
  maxBlockSize_dst: '2000',
  injectSpeed_src: '8000',
  injectSpeed_dst: '8000',      // ✅ 补上
  totalDataSize_src: '30000',
  totalDataSize_dst: '30000',       // ✅ 补上
})
const hydrating = ref(false)

// 勾选同步时，保持 *_dst 与 *_src 一致
watch(
  [
    
    () => params.value.injectSpeed_src,
    () => params.value.totalDataSize_src,
    syncDst,
  ],
  () => {
    if (!syncDst.value) return
    const p = params.value
    
    p.injectSpeed_dst    = p.injectSpeed_src
    p.totalDataSize_dst  = p.totalDataSize_src
  },
  { immediate: true }
)
// ⬇️ 新增：从后端读取并填充
async function loadParamsFromServer() {
  try {
    hydrating.value = true
    const res = await getAllParams()
    const s = res.src_chain
    const d = res.dst_chain

    // 把 number 转为字符串喂给 v-text-field（更稳）
    params.value.blockInterval_src  = String(s.Block_Interval)
    params.value.blockInterval_dst  = String(d.Block_Interval)
    params.value.maxBlockSize_src   = String(s.MaxBlockSize_global)
    params.value.maxBlockSize_dst   = String(d.MaxBlockSize_global)
    params.value.injectSpeed_src    = String(s.InjectSpeed)
    params.value.injectSpeed_dst    = String(d.InjectSpeed)
    params.value.totalDataSize_src  = String(s.TotalDataSize)
    params.value.totalDataSize_dst  = String(d.TotalDataSize)
  } catch (e) {
    console.error('[get_all_params] 读取失败：', e)
  } finally {
    // 放开 watcher 正常工作
    hydrating.value = false
  }
}

// 提交前再同步一次，确保数据完整
function syncNow() {
  if (!syncDst.value) return
  const p = params.value
 
  p.injectSpeed_dst    = p.injectSpeed_src
  p.totalDataSize_dst  = p.totalDataSize_src
}

// 表单提交 -> 仅修改参数
function onChangeParams() {
  syncNow()
  emit('change', params.value)
}

// 单独按钮 -> 仅启动实验
function onStartExperiment() {
  emit('start', params.value)
}
// ⬇️ 新增：进入页面即加载
onMounted(loadParamsFromServer)
</script>


<style scoped>
/* 表单样式 */
.wrap {
  height: 85dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.form {
  width: 100%;
  max-width: 720px;
  align-self: start; /* 从垂直居中 -> 顶部 */
}

.form-card {
  min-height: 560px;
  display: grid;
  grid-template-rows: 1fr auto;
}

.grid {
  display: grid;
  gap: 30px;
  padding: 28px;
  padding-bottom: 12px;
}

.actions {
  padding: 0 28px 28px 28px;
}

:deep(.v-field) {
  min-height: 60px;
}

:deep(.v-field__input) {
  padding-top: 14px;
  padding-bottom: 14px;
  font-size: 1.05rem;
}

:deep(.v-field-label) {
  font-size: 0.95rem;
}

:deep(.v-btn.mono-btn) {
  padding: 14px 20px !important;
  font-size: 1.1rem;
  border-radius: 12px !important;
}
/* 两列行容器：让成对字段在同一行显示；小屏自动换行 */
.row-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px; /* 与 .grid 一致的间距体验 */
}

@media (max-width: 640px) {
  .row-2 {
    grid-template-columns: 1fr; /* 小屏堆叠 */
  }
}

</style>
