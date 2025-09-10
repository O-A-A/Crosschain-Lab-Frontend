// Chain 类型只包含 'PoW'（源链和目标链）
export type Chain = 'PoW';

// 修改 ExperimentParams 以反映新的固定参数
export interface ExperimentParams {
  srcChain: Chain;    // 源链（固定为 'PoW'）
  dstChain: Chain;    // 目标链（固定为 'PoW'）
  txCount: number;    // 交易数
  intervalMs: number; // 间隔时间
  protocol: 'CCP';    // 跨链协议（固定为 'CCP'）

  // 新增修改参数
  blockInterval_src: string;  // Block Interval（源链）
  blockInterval_dst: string;  // Block Interval（目标链）
  maxBlockSize_src: string;   // Max Block Size（源链）
  maxBlockSize_dst: string;   // Max Block Size（目标链）
  injectSpeed: string;        // Inject Speed（源链）
  totalDataSize: string;      // Total Data Size（源链和目标链）
}

// ExperimentStatus 状态类型，保持不变
export type ExperimentStatus = 'idle' | 'running' | 'finished' | 'error';

// ExperimentPoint 接口，保持不变
export interface ExperimentPoint {
  t: number;          // 时间戳
  latencyMs: number;  // 单笔延迟
  success: boolean;   // 成功/失败
}
