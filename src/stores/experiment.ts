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

    logs: [] as string[],           // 日志
    logsLoading: false as boolean,  // 日志加载状态
    logsError: null as string | null, // 日志错误信息

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

    // 生成一行模拟日志
    _makeMockLine(): string {
      const levels = ['INFO', 'WARN', 'ERROR'] as const;
      const level = levels[Math.random() < 0.75 ? 0 : (Math.random() < 0.6 ? 1 : 2)];
      const now = new Date().toISOString();
      const msgs = {
        INFO: [
          'Experiment tick ok',
          'Sending tx to dst chain',
          'Batch committed',
          'Peer heartbeat',
          'Latency sampled',
        ],
        WARN: [
          'High latency detected',
          'Peer #3 slow response',
          'Retrying request',
          'Queue depth increasing',
        ],
        ERROR: [
          'RPC timeout',
          'Signature verify failed',
          'Tx dropped',
          'Storage write error',
        ],
      };
      const msg = level === 'INFO'
        ? msgs.INFO[Math.floor(Math.random() * msgs.INFO.length)]
        : level === 'WARN'
          ? msgs.WARN[Math.floor(Math.random() * msgs.WARN.length)]
          : msgs.ERROR[Math.floor(Math.random() * msgs.ERROR.length)];
      const extra = `lat=${(Math.random() * 200 + 20).toFixed(1)}ms node=${Math.ceil(Math.random() * 5)}`;
      return `[${now}] ${level} ${msg} (${extra})`;
    },

    // 仅前端：开始持续产生日志
    startMockLogs(intervalMs = 300) {
      if (this._mockTimer) return;
      this._mockTimer = window.setInterval(() => {
        this.appendLog(this._makeMockLine());
      }, intervalMs);
    },

    // 仅前端：停止产生日志
    stopMockLogs() {
      if (this._mockTimer) {
        clearInterval(this._mockTimer);
        this._mockTimer = null;
      }
    },

    // 仅前端：一次性“拉取”一些日志（供“刷新”按钮用）
    async fetchLogs(limit = 200) {
      this.logsLoading = true;
      this.logsError = null;
      try {
        const lines: string[] = [];
        for (let i = 0; i < limit; i++) lines.push(this._makeMockLine());
        this.setLogs(lines);
      } catch (e: any) {
        this.logsError = e?.message || '获取日志失败';
      } finally {
        this.logsLoading = false;
      }
    },

    // 本地操作：设置/追加/清空
    setLogs(lines: string[]) {
      this.logs = Array.isArray(lines) ? lines.slice(-5000) : [];
    },
    appendLog(line: string) {
      this.logs.push(line);
      const MAX = 5000;
      if (this.logs.length > MAX) this.logs.splice(0, this.logs.length - MAX);
    },
    clearLogs() { this.logs = []; },

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
