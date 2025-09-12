import axios, { AxiosError } from 'axios';
import type { ChainKey, AllowedParam } from '@/types';
// 定义链类型，源链和目标链


// 创建一个 axios 实例，用于请求
const http = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 15_000,
});

// 错误处理函数，提取错误信息
function toErrorMessage(err: unknown): string {
  const e = err as AxiosError<any>;
  if (e.response?.data?.error) return e.response.data.error;
  if (e.message) return e.message;
  return 'Unknown error';
}

/**
 * 启动比赛所需区块链系统
 * POST /start
 * 成功: { message: "System started" }
 * 失败: { error: "System already running" }
 */
export async function startSystem(): Promise<{ message: string }> {
  try {
    const { data } = await http.post('/start');
    return data;
  } catch (err) {
    throw new Error(toErrorMessage(err));
  }
}
/**
 * 停止所有链节点
 * POST /stop
 * 成功: { message: "System stopped" }
 * 失败: { error: "System not running" }
 */
export async function stopSystem(): Promise<{ message: string }> {
  try {
    const { data } = await http.post('/stop');
    return data;
  } catch (err) {
    throw new Error(toErrorMessage(err));
  }
}

/**
 * 修改链参数
 * POST /change_param?chain=dst_chain&param=Block_Interval&value=5000
 * 成功: { message: "parameter updated", chain, param, value }
 * 失败: { error: "..." }
 */
export async function changeParam(opts: {
  chain: ChainKey;
  param: AllowedParam;
  value: string | number;
}) {
  const { chain, param, value } = opts;
  try {
    // 和你手工测试保持一致：POST + query string
    const { data } = await http.post('/change_param', null, {
      params: { chain, param, value },
    });
    return data;
  } catch (err) {
    throw new Error(toErrorMessage(err));
  }
}
/**
 * 根据交易哈希获取时间戳详情
 * GET /tx_details?tx_hash=0x123abc
 * 响应示例：
 * {
 *   "tx_id": "0x1234567890abcdef",
 *   "ccTIS": 1000,
 *   "ccTL": 1200,
 *   "ccTLC": 1500,
 *   "ccTLS": 1800,
 *   "ccTSD": 2100,
 *   "ccTID": 2300,
 *   "ccTM": 2500,
 *   "ccTMC": 2700
 * }
 */
export async function getTxDetails(tx_hash: string): Promise<Record<string, number>> {
  try {
    const { data } = await http.get('/tx_details', { params: { tx_hash } });
    return data;
  } catch (err) {
    throw new Error(toErrorMessage(err));
  }
}

