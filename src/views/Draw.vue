<script setup lang="ts">
import { ref } from 'vue'

const PIC_BASE: string =
  ((import.meta as any)?.env?.VITE_PIC_BASE as string | undefined) ??
  'http://localhost:8080/drawpic'

// ✅ 你的图片文件名（需要时直接改这里即可）
const FILES = [
  'avg_latency_tt_20250911_113652_8171.png',
  'latency_CTXNum_20250911_113730_0063.png',
  'srt_tps_20250911_113806_2145.png',
  'tps_latency_20250911_114059_4374.png',
]

const base = PIC_BASE.replace(/\/+$/, '')
const urls = ref<string[]>(FILES.map(n => `${base}/${encodeURIComponent(n)}`))
const loading = ref(false)

// 手动刷新：加时间戳避免缓存
function refresh() {
  loading.value = true
  const t = Date.now()
  urls.value = FILES.map(n => `${base}/${encodeURIComponent(n)}?t=${t}`)
  setTimeout(() => (loading.value = false), 150)
}

// 某张图加载失败就从列表移除（避免破图）
function onImgError(u: string) {
  const i = urls.value.indexOf(u)
  if (i >= 0) urls.value.splice(i, 1)
}
</script>

<template>
  <div class="page">
    <v-card class="rounded-lg" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-image-multiple</v-icon>
        结果图片
        <v-spacer />
        <v-btn size="small" variant="text" @click="refresh" :loading="loading">
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
            <v-img :src="u" aspect-ratio="16/9" cover @error="onImgError(u)">
              <template #placeholder>
                <div class="ph">加载中…</div>
              </template>
            </v-img>
            <div class="img-actions">
              <!-- 原图按钮 -->
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
  </div>
</template>

<style scoped>
.page {
  padding: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.img-card {
  border-radius: 12px;
  overflow: hidden;
  background: #0b1020;
}
.img-actions {
  display: flex;
  justify-content: flex-end;
  padding: 6px 8px 8px;
  font-size: 12px;
}
.ph {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.6;
  font-size: 12px;
}
.empty {
  opacity: 0.8;
}
</style>
