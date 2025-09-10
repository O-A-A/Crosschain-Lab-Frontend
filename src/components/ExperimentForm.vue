<template>
  <div class="wrap">
    <!-- 表单容器 -->
    <v-form @submit.prevent="onChangeParams" class="form">
      <!-- 外层卡片 -->
      <v-card elevation="6" rounded="lg" class="form-card">
        <!-- 卡片主体区域（表单输入控件） -->
        <v-card-text class="pa-0">
          <div class="grid">
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
            <!-- 跨链协议（CCP） -->
            <v-text-field
              label="跨链协议"
              v-model="params.protocol"
              variant="outlined"
              disabled
              density="default"
              hide-details
            />

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

            <!-- 修改 Inject Speed（源链） -->
            <v-text-field
              label="Inject Speed（源链）"
              v-model="params.injectSpeed"
              type="number"
              variant="outlined"
              density="default"
              hide-details
            />

            <!-- 修改 Total Data Size（源链和目标链） -->
            <v-text-field
              label="Total Data Size（源链和目标链）"
              v-model="params.totalDataSize"
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
import { ref } from 'vue'
import type { ExperimentParams } from '../types'

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
  injectSpeed: '8000',
  totalDataSize: '1',
})

// 表单提交 -> 仅修改参数
function onChangeParams() {
  emit('change', params.value)
}

// 单独按钮 -> 仅启动实验
function onStartExperiment() {
  emit('start', params.value)
}
</script>


<style scoped>
/* 表单样式 */
.wrap {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 32px;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.form {
  width: 100%;
  max-width: 720px;
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
</style>
