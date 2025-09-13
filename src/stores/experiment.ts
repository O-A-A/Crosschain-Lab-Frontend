import { defineStore } from 'pinia';
import type { ExperimentParams, ExperimentStatus, ExperimentPoint } from '../types';
import * as api from '../services/api.ts';
import axios from 'axios';

// 固定 8 个键（与 UI 一致）
const TS_FIELDS = ['ccTIS', 'ccTL', 'ccTLC', 'ccTLS', 'ccTSD', 'ccTID', 'ccTM', 'ccTMC'] as const;
type TsKey = typeof TS_FIELDS[number];

function safeNum(x: string | number | null | undefined): number {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : NaN;
}

export const useExperimentStore = defineStore('experiment', {
  state: () => ({
    status: 'idle' as ExperimentStatus,
    params: null as ExperimentParams | null,
    data: [] as ExperimentPoint[],
    error: '' as string,
    // 记录系统启动/停止的提示信息（来自后端的 message 字段）
    systemMessage: '' as string,

    // 让页面轮询条件生效
    runId: '' as string,

    // 从接口获取的时间戳
    timestamps: null as null | Record<string, number>,
    timestampsError: null as null | string,
    
    // 内部计时器（仅前端mock用）
    _mockTimer: null as number | null,



    // 修改后的实验参数
    blockInterval_src: '',  // 源链 Block Interval
    blockInterval_dst: '',  // 目标链 Block Interval
    maxBlockSize_src: '',   // 源链 Max Block Size
    maxBlockSize_dst: '',   // 目标链 Max Block Size
    injectSpeed: '',        // 源链 Inject Speed
    totalDataSize: '',      // Total Data Size（源链和目标链）
  }),

  getters: {
    isRunning: (s) => s.status === 'running',
  },

  actions: {
    /**
     * 启动系统
     */
    // 启动实验时，将 isRunning 设置为 true
    async start(p?: ExperimentParams) {
      this.status = 'running';
      this.params = p ?? null;
      this.data = [];
      this.error = '';
      this.systemMessage = '';
      this.runId = 'local'; // 本地 runId
    
      try {
        const res = await api.startSystem();  // 这里会触发一次 /start 请求
        this.systemMessage = res?.message ?? 'System started';
        this.status = 'running';
      } catch (e: any) {
        this.status = 'error';
        this.error = e?.message || 'start failed';
      }
    },

    /**
     * 收集实验点
     */
    pushPoint(point: ExperimentPoint) {
      this.data.push(point);
    },

    /**
     * 停止系统
     */
    async finish() {
      try {
        const res = await api.stopSystem();
        this.systemMessage = res?.message ?? 'System stopped';
        this.status = 'finished';
      } catch (e: any) {
        this.status = 'error';
        this.error = e?.message || 'stop failed';
      }
    },

    /**
     * 修改链参数
     */
    async updateChainParam(
      chain: 'src_chain' | 'dst_chain',
      param: 'Block_Interval' | 'MaxBlockSize_global' | 'InjectSpeed' | 'TotalDataSize',
      value: number | string,
    ) {
      try {
        const res = await api.changeParam({ chain, param, value });
        this.systemMessage = res?.message ?? 'parameter updated';
      } catch (e: any) {
        this.error = e?.message || 'change param failed';
        this.status = 'error';
      }
    },

    /**
     * 根据交易哈希获取时间戳详情
     */
    async fetchTimestamps(txHash: string) {
      if (!txHash) {
        this.timestampsError = '缺少交易哈希';
        return;
      }
      try {
        const raw = await api.getTxDetails(txHash);

        // 仅保留 UI 需要的 8 个字段
        const filtered: Record<string, number> = {};
        for (const k of TS_FIELDS) {
          if (k in raw) filtered[k] = safeNum(raw[k] as any);
        }

        this.timestamps = filtered;
        this.timestampsError = null;
      } catch (error: any) {
        this.timestamps = null;
        this.timestampsError = error?.message || '读取交易时间戳失败';
      }
    },

    // experiment.ts
handleSystemLog(msg: string) {
  if (!msg) return;
  if (msg.includes('All transactions are completed. Now to shut down.')) {
    if (this.status === 'running') {
      // ✅ 仅前端置为 finished，不去调 stopSystem
      this.status = 'finished';
      this.systemMessage = 'System self-stopped';
    }
  }
}
,

    reset() {
      this.status = 'idle';
      this.params = null;
      this.data = [];
      this.error = '';
      this.systemMessage = '';
      this.runId = '';
      this.timestamps = null;
      this.timestampsError = null;
    },
  },
});
