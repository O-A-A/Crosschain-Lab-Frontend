// src/stores/logs.ts
import { defineStore } from 'pinia';
import { useExperimentStore } from './experiment';
export type LogKind = 'tx' | 'node' | 'system';
const MAX_KEEP = 5000;
const API_BASE: string =
  ((import.meta as any)?.env?.VITE_API_BASE as string | undefined) ?? 'http://localhost:8080';

export interface LogsState {
  logs: string[];
  logsLoading: boolean;
  logsError: string | null;
  txLogs: string[];
  nodeLogs: string[];
  systemLogs: string[];

  _sse: {
    tx: EventSource | null;
    node: EventSource | null;
    system: EventSource | null;
  };

  jwtToken: string;
}

export const useLogStore = defineStore('logs', {
  state: (): LogsState => ({
    logs: [],
    logsLoading: false,
    logsError: null,
    txLogs: [],
    nodeLogs: [],
    systemLogs: [],
    _sse: { tx: null, node: null, system: null },
    jwtToken: '',
  }),

  getters: {
    previewLogs(state): string[] {
      return (state.logs ?? []).slice(-20);
    },
  },

  actions: {
    // ========== 移除模拟数据相关方法 ==========

    // 去掉模拟数据的创建方法
    // _makeMockLine(): string {
    //   const levels = ['INFO', 'WARN', 'ERROR'] as const;
    //   const level = levels[Math.random() < 0.75 ? 0 : (Math.random() < 0.6 ? 1 : 2)];
    //   const now = new Date().toISOString();
    //   const msgs = {
    //     INFO: ['Experiment tick ok','Sending tx to dst chain','Batch committed','Peer heartbeat','Latency sampled'],
    //     WARN: ['High latency detected','Peer #3 slow response','Retrying request','Queue depth increasing'],
    //     ERROR: ['RPC timeout','Signature verify failed','Tx dropped','Storage write error'],
    //   };
    //   const pool = (msgs as any)[level] as string[];
    //   const msg = pool[Math.floor(Math.random() * pool.length)];
    //   const extra = `lat=${(Math.random() * 200 + 20).toFixed(1)}ms node=${Math.ceil(Math.random() * 5)}`;
    //   return `[${now}] ${level} ${msg} (${extra})`;
    // }

    // 移除模拟日志的启动和停止
    // startMockLogs(intervalMs = 300) {
    //   if (this._mockTimer) return;
    //   this._mockTimer = window.setInterval(() => this.appendLog(this._makeMockLine()), intervalMs);
    // }
    // stopMockLogs() {
    //   if (this._mockTimer) {
    //     clearInterval(this._mockTimer);
    //     this._mockTimer = null;
    //   }
    // }

    // ========== 本地操作 ==========
    
    // ✅ 新增/保留：系统日志到来时，先喂给实验仓库做结束检测，再入库
onSystemLog(line: string) {
  const expStore = useExperimentStore();
  expStore.handleSystemLog(line);   // 让 experiment store 有机会切到 finished
  this.systemLogs.push(line);       // 保留原始系统日志
},


    setLogs(lines: string[]) {
      this.logs = Array.isArray(lines) ? lines.slice(-MAX_KEEP) : [];
    },
    appendLog(line: string) {
      this.logs.push(line);
      if (this.logs.length > MAX_KEEP) this.logs.splice(0, this.logs.length - MAX_KEEP);
    },
    clearLogs() {
      this.logs = [];
      this.txLogs = [];
      this.nodeLogs = [];
      this.systemLogs = [];
    },
    reset() {
      this.stopSSE();
      this.clearLogs();
      this.logsError = null;
    },

    // ========== SSE 对接 ==========
  
    // ✅ startSSE：把 system.onmessage 改成同时调用 onSystemLog + 入库（带格式）
startSSE(opts?: { base?: string; token?: string; withCredentials?: boolean }) {
  if (this._sse.tx || this._sse.node || this._sse.system) return;

  const base = opts?.base ?? API_BASE;
  const token = opts?.token ?? this.jwtToken ?? '';
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  const mk = (path: string) =>
    new EventSource(`${base}${path}${qs}`, { withCredentials: !!opts?.withCredentials });

  this._sse.tx = mk('/tx_stream');
  this._sse.tx.onmessage = (ev) => this._appendKind('tx', this._formatTx(ev.data));
  this._sse.tx.onerror   = (err) => { console.error('[SSE tx] error', err); this.logsError = '交易日志流中断'; };

  this._sse.node = mk('/node_log_stream');
  this._sse.node.onmessage = (ev) => this._appendKind('node', this._formatNode(ev.data));
  this._sse.node.onerror   = (err) => { console.error('[SSE node] error', err); this.logsError = '节点日志流中断'; };

  // ⬇️ 这行原来只有 _appendKind，现在先走 onSystemLog 做“结束识别”
  this._sse.system = mk('/system_log_stream');
  this._sse.system.onmessage = (ev) => {
    this.onSystemLog(ev.data);                 // 🔴 触发 handleSystemLog → finish()
    this._appendKind('system', this._formatSystem(ev.data)); // 再把带时间戳的行放到界面
  };
  this._sse.system.onerror   = (err) => { console.error('[SSE system] error', err); this.logsError = '系统日志流中断'; };
}
,

    stopSSE() {
      try { this._sse.tx?.close(); } catch {}
      try { this._sse.node?.close(); } catch {}
      try { this._sse.system?.close(); } catch {}
      this._sse.tx = this._sse.node = this._sse.system = null;
    },

    // 兼容“刷新”按钮（没有历史接口时，当 no-op）
    async fetchLogs(limit = 200) {
      try {
        this.logsLoading = true;
        const qs = new URLSearchParams({
          limit: String(limit),
          ...(this.jwtToken ? { token: this.jwtToken } : {}),
        }).toString();
    
        const res = await fetch(`${API_BASE}/logs_tail?${qs}`);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const body = await res.json();
        
        // 存储所有日志数据
        this.setLogs(body.lines); // 保证完整日志的存储
      } catch (error) {
        this.logsError = '从服务器获取日志失败';
        console.error('获取日志错误:', error);
      } finally {
        this.logsLoading = false;
      }
    },

    

    // ========== 内部工具 ==========

    _appendKind(kind: LogKind, line: string) {
      const cap = (arr: string[]) => { arr.push(line); if (arr.length > MAX_KEEP) arr.splice(0, arr.length - MAX_KEEP); };
      if (kind === 'tx') cap(this.txLogs);
      if (kind === 'node') cap(this.nodeLogs);
      if (kind === 'system') cap(this.systemLogs);
      this.appendLog(line);
    },
    _formatTx(raw: string): string {
      try {
        const d = JSON.parse(raw);
        const now = new Date().toISOString();
        const hash = String(d.tx_hash ?? 'N/A');
        const short = hash.length > 10 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
        const blk = d.block_info?.number ?? 'N/A';
        return `[${now}] TX   hash=${short}  block=${blk}  timestamps=${JSON.stringify(d.timestamps)}`;
      } catch { return raw; }
    },
    _formatNode(line: string): string {
      return `[${new Date().toISOString()}] NODE ${line}`;
    },
    _formatSystem(line: string): string {
      return `[${new Date().toISOString()}] SYS  ${line}`;
    },
  },
});

export type LogStore = ReturnType<typeof useLogStore>;
