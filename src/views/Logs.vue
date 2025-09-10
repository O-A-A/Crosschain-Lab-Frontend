<template>
  <v-container>
    <v-card class="rounded-lg" elevation="2">
      <v-toolbar color="primary" dark>
        <!-- 返回按钮 -->
        <v-btn icon to="/results" class="mr-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        
        <v-toolbar-title>实验日志</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="refreshLogs">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="log-container">
        <div class="log-output">
          <div
            v-for="(line, idx) in logs"
            :key="idx"
            :class="['log-line', getLineClass(line)]"
          >
            {{ line }}
          </div>
          <div v-if="!logs.length" class="log-empty">暂无日志</div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'

const logs = ref<string[]>([])
const errorMsg = ref('')
const logBox = ref<HTMLElement | null>(null)

function makeMockLine() {
  const now = new Date().toISOString()
  const pool = [
    'Experiment tick ok',
    'Sending tx to dst chain',
    'Batch committed',
    'Peer heartbeat',
    'Latency sampled',
    'High latency detected',
    'Retrying request',
    'RPC timeout',
  ]
  const lv = Math.random() < 0.75 ? 'INFO' : (Math.random() < 0.5 ? 'WARN' : 'ERROR')
  const msg = pool[Math.floor(Math.random() * pool.length)]
  const extra = `lat=${(Math.random()*200+20).toFixed(1)}ms node=${Math.ceil(Math.random()*5)}`
  return `[${now}] ${lv} ${msg} (${extra})`
}

function makeMockLines(n = 100) {
  return Array.from({ length: n }, () => makeMockLine())
}

function isHtml(str: string) {
  return /<!DOCTYPE html>|<html[\s>]/i.test(str)
}

async function refreshLogs() {
  try {
    const res = await axios.get('/api/logs', {
      params: { limit: 200 },
      responseType: 'text',
      transformResponse: [d => d],
    })
    const raw = res.data as string

    if (typeof raw === 'string' && isHtml(raw)) {
      errorMsg.value = '未连接后端或代理未生效，已显示本地模拟日志'
      logs.value = makeMockLines(200)
    } else {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.lines)) {
          logs.value = parsed.lines
        } else {
          logs.value = String(raw).split(/\r?\n/).filter(Boolean)
        }
      } catch {
        logs.value = String(raw).split(/\r?\n/).filter(Boolean)
      }
    }
  } catch (e: any) {
    errorMsg.value = `获取日志失败：${e?.message || e}`
    if (!logs.value.length) logs.value = makeMockLines(60)
  } finally {
    await nextTick()
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
  }
}

function getLineClass(line: string) {
  if (line.includes('ERROR')) return 'log-error'
  if (line.includes('WARN')) return 'log-warn'
  if (line.includes('INFO')) return 'log-info'
  return ''
}

onMounted(refreshLogs)
</script>

<style scoped>
.log-container {
  max-height: 600px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #e0e0e0;
  font-family: monospace;
  border-radius: 8px;
  padding: 12px;
}

.log-output { white-space: pre-wrap; word-wrap: break-word; }

.log-line { font-size: 12px; line-height: 1.4; }
.log-error { color: #ff6b6b; }
.log-warn  { color: #fbc531; }
.log-info  { color: #4cd137; }
.log-empty { opacity: .7; font-size: 12px; }
</style>
