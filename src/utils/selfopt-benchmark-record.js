/**
 * 自优化基准用例：本地追加记录（与 {@link SelfOptimizeBenchmarkPanel} 一致）。
 * @param {{ benchmarks?: unknown[] }|null|undefined} stateObj
 * @param {Record<string, unknown>} record
 */
export function addBenchmarkRecordToState(stateObj, record) {
  const list = [{ ...record, updateTime: Date.now() }, ...(stateObj?.benchmarks || [])]
  return { ...stateObj, benchmarks: list.slice(0, 200) }
}

export function formatBenchmarkUpdateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}
