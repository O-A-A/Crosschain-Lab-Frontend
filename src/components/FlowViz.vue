<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import { useExperimentStore } from '../stores/experiment';

const store = useExperimentStore();
const srcRef = ref<HTMLElement | null>(null);
const dstRef = ref<HTMLElement | null>(null);
const pipeRef = ref<HTMLElement | null>(null);

onMounted(() => {
  drawOnce();
});

watch(() => store.data.length, (n, p) => {
  if (n > p) animatePacket();
});

// 初始入场动画
function drawOnce() {
  gsap.from([srcRef.value, dstRef.value, pipeRef.value], {
    opacity: 0,
    y: 20,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power3.out',
  });
}

// 每条交易的动画
function animatePacket() {
  // 创建一个新的光点
  const dot = document.createElement('div');
  dot.className = 'dot';
  pipeRef.value!.appendChild(dot);

  const width = pipeRef.value!.clientWidth;
  const randomOffset = Math.random() * 30 - 15; // 随机偏移量，模拟不同的起始点

  gsap.fromTo(dot, {
    x: 0 + randomOffset,
    scale: 1,
    opacity: 1,
  }, {
    x: width - 8 + randomOffset,
    scale: 1.2,
    opacity: 0.7,
    duration: 0.8,
    ease: 'power1.inOut',
    onComplete: () => {
      dot.remove();  // 动画完成后移除光点
    },
  });
}
</script>

<template>
  <div class="flow">
    <div class="node" ref="srcRef">
      <div class="title">源链</div>
      <div class="badge">{{ store.params?.srcChain || '-' }}</div>
    </div>

    <div class="pipe" ref="pipeRef"></div>

    <div class="node" ref="dstRef">
      <div class="title">目标链</div>
      <div class="badge">{{ store.params?.dstChain || '-' }}</div>
    </div>
  </div>
</template>

<style scoped>
.flow {
  display: grid;
  grid-template-columns: 160px 1fr 160px;
  align-items: center;
  gap: 16px;
}

.node {
  background: #0f172a;
  color: #fff;
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.title {
  font-size: 14px;
  opacity: 0.8;
}

.badge {
  margin-top: 6px;
  font-weight: 700;
}

.pipe {
  position: relative;
  height: 8px;
  border-radius: 8px;
  background: linear-gradient(90deg, #e5e7eb, #c7d2fe);
  overflow: hidden;
}

.dot {
  position: absolute;
  top: 1px;
  width: 8px;
  height: 6px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 12px #22c55e;
  opacity: 0;
}
</style>
