<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ---------------- 基础配置 ----------------
const PIC_BASE: string =
  ((import.meta as any)?.env?.VITE_PIC_BASE as string | undefined) ?? 'http://localhost:8080/drawpic'

// 你的图片文件名（可动态替换成后端返回的列表）
const FILES = [
  'avg_latency_tt_20250911_113652_8171.png',
  'latency_CTXNum_20250911_113730_0063.png',
  'srt_tps_20250911_113806_2145.png',
  'tps_latency_20250911_114059_4374.png',
]

// 同时加载数量（可调 2~4）
const CONCURRENCY = 2

// ---------------- 状态 ----------------
const base = PIC_BASE.replace(/\/+$/, '')
const allUrls = ref<string[]>(FILES.map(n => `${base}/${encodeURIComponent(n)}`)) // 原始 URL（不带 t）
const urls = ref<string[]>([])                         // 实际渲染的 URL（分批推入）
const loading = ref(false)                             // 刷新按钮 loading
const busy = ref(false)                                // 正在 stagedLoad

// ---------------- 工具 ----------------
function preload(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    ;(img as any).decoding = 'async'
    ;(img as any).loading = 'lazy'
    img.onload = () => resolve()
    img.onerror = () => reject()
    img.src = src
  })
}

function idle(): Promise<void> {
  return new Promise(r => {
    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(() => r())
    } else {
      setTimeout(() => r(), 0)
    }
  })
}

// 分批预加载后再展示，体验更顺滑
async function stagedLoad(list: string[]) {
  if (busy.value) return
  busy.value = true
  urls.value = [] // 先清空，再逐批塞入
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(preload)) // 先把这一批预加载
    urls.value.push(...batch)                    // 再展示
    await idle()                                 // 给浏览器渲染的喘息时间
  }
  busy.value = false
}

// 手动刷新：加时间戳避免缓存，然后重走 stagedLoad
async function refresh() {
  loading.value = true
  const t = Date.now()
  const withTs = allUrls.value.map(u => `${u}?t=${t}`)
  await stagedLoad(withTs)
  loading.value = false
}

// 某张图加载失败就从列表移除（避免破图）
function onImgError(u: string) {
  const i = urls.value.indexOf(u)
  if (i >= 0) urls.value.splice(i, 1)
}

// 首次挂载：不带时间戳（充分利用缓存）
onMounted(() => stagedLoad(allUrls.value))
</script>

<template>
  <div class="page">
    <v-card class="rounded-lg" elevation="1">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-image-multiple</v-icon>
        结果图片
        <v-spacer />
        <v-btn size="small" variant="text" @click="refresh" :loading="loading || busy">
          刷新
          <v-icon end size="small">mdi-refresh</v-icon>
        </v-btn>
        <v-btn size="small" variant="text" :href="PIC_BASE" target="_blank">
          打开目录
          <v-icon end size="small">mdi-open-in-new</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div v-if="!urls.length && !busy" class="empty">暂无可显示图片</div>

        <div class="grid">
          <v-card v-for="u in urls" :key="u" class="img-card" elevation="0">
            <!-- v-img 懒加载 + 异步解码 + 固定比例 -->
            <v-img
              :src="u"
              :eager="false"
              loading="lazy"
              aspect-ratio="ASPECT"
              cover
              @error="onImgError(u)"
            >
              <template #placeholder>
                <div class="ph">加载中…</div>
              </template>
            </v-img>

            <div class="img-actions">
              <a :href="u" target="_blank" rel="noreferrer">原图</a>
            </div>
          </v-card>

          <!-- 骨架占位：加载中的批次 -->
          <v-card v-if="busy && urls.length === 0" class="img-card" elevation="0">
            <div class="skeleton"></div>
          </v-card>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.page { padding: 12px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
  display:flex; align-items:center; justify-content:center;
  height:100%; opacity:.6; font-size:12px;
}
/* 骨架屏（首批加载时的占位） */
.skeleton {
  width: 100%;
  aspect-ratio: 16/9;
  background: linear-gradient(90deg, #1a2238 25%, #233055 37%, #1a2238 63%);
  background-size: 400% 100%;
  animation: shine 1.4s ease infinite;
}
@keyframes shine {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
.empty { opacity:.8; }
</style>
