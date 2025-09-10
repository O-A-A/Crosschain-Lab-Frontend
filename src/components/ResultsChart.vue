<script setup lang="ts">
import * as echarts from 'echarts';
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import type { ExperimentPoint } from '../types';

const props = defineProps<{ data: ExperimentPoint[] }>();
const el = ref<HTMLDivElement|null>(null);
let chart: echarts.ECharts | null = null;

onMounted(() => {
  chart = echarts.init(el.value!);
  render();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  chart?.dispose();
});

watch(() => props.data, render, { deep: true });

function render() {
  if (!chart) return;
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'latency(ms)' },
    series: [
      {
        type: 'line',
        showSymbol: false,
        name: 'Latency',
        encode: { x: 't', y: 'latencyMs' },
        data: props.data.map(d => ({ t: d.t, latencyMs: d.latencyMs })),
        smooth: true,
      }
    ],
    grid: { left: 50, right: 20, top: 30, bottom: 40 }
  });
}

function resize() { chart?.resize(); }
</script>

<template>
  <div ref="el" style="height: 340px; width: 100%;"></div>
</template>
