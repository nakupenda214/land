<template>
  <div class="observe-hub">
    <section class="panel snapshot-panel">
      <section class="sub-panel">
        <div class="sub-panel-head">
          <h4 class="snap-h4">全链路指标</h4>
          <div class="panel-actions">
            <el-select v-model="snapHours" style="width: 130px" @change="loadSnapshot">
              <el-option :value="24" label="近 24h" />
              <el-option :value="72" label="近 72h" />
              <el-option :value="168" label="近 7d" />
            </el-select>
            <el-button type="primary" plain :loading="snapLoading" @click="loadSnapshot">刷新快照</el-button>
          </div>
        </div>
        <div class="kqa-grid kqa-grid--core">
          <div class="stat-card">
            <div class="stat-label">请求总成功率</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.successRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">端到端时延（data_query avg / p95）</div>
            <div class="stat-value">{{ routeLatencySecText('data_query') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">LLM 调用成功率</div>
            <div class="stat-value">{{ percentText(llmOverall.successRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">最终答复正确率（人工）</div>
            <div class="stat-value">{{ finalAnswerCorrectnessText }}</div>
          </div>
        </div>
        <div class="metric-toggle-row">
          <el-button size="small" text type="primary" @click="showAdvancedChainMetrics = !showAdvancedChainMetrics">
            {{ showAdvancedChainMetrics ? '收起高级指标' : '展开高级指标' }}
          </el-button>
        </div>
        <div v-if="showAdvancedChainMetrics" class="kqa-grid kqa-grid--detail">
          <div class="stat-card">
            <div class="stat-label">时间窗内 trace 数</div>
            <div class="stat-value">{{ snap?.traceRoot?.totalStarted ?? '—' }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">SUCCESS / FAILED</div>
            <div class="stat-value">
              {{ traceStatusCount('SUCCESS') }} / {{ traceStatusCount('FAILED') }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">粗算完成率 SUCCESS/(S+F)</div>
            <div class="stat-value">{{ traceFinishRate }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">人工评审（correct / partial / wrong）</div>
            <div class="stat-value">
              {{ snap?.chainSummary?.finalAnswerCorrectCount ?? 0 }} / {{ snap?.chainSummary?.finalAnswerPartialCount ?? 0 }} / {{ snap?.chainSummary?.finalAnswerWrongCount ?? 0 }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">答复正确率（data_query）</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.finalAnswerByRoute?.data_query?.correctRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">答复正确率（knowledge_qa）</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.finalAnswerByRoute?.knowledge_qa?.correctRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">语义一致性一次性通过率</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.semanticFirstPassRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">语义一致性最终通过率</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.semanticFinalPassRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">MQL 生成成功率</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.mqlGenerateSuccessRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mongo 执行有效率（按调用）</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.mongoExecCallSuccessRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mongo 执行有效率（按 trace）</div>
            <div class="stat-value">{{ percentText(snap?.chainSummary?.mongoExecTraceSuccessRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">knowledge_qa 端到端 avg / p95</div>
            <div class="stat-value">{{ routeLatencySecText('knowledge_qa') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">MQL 重试平均次数</div>
            <div class="stat-value">{{ Number(snap?.chainSummary?.mqlRetryAvg || 0).toFixed(2) }}</div>
          </div>
        </div>
      </section>

      <section class="sub-panel">
        <h4 class="snap-h4">全局 RAG 指标</h4>
        <div class="rag-mode-switch">
          <span class="rag-mode-label">统计口径</span>
          <el-segmented
            v-model="ragAggregateMode"
            :options="ragAggregateModeOptions"
            size="small"
            class="beauty-segmented mode-segmented"
          />
          <span class="mode-note">当前分母：{{ ragAggregateMode === 'call' ? `调用 ${ragTrendOverall.calls || 0}` : `trace ${ragTrendSeriesFilteredTop.length}` }}</span>
        </div>
        <div class="rag-grid rag-grid--overall">
          <div class="stat-card">
            <div class="stat-label">Trace 数</div>
            <div class="stat-value">{{ ragTrendOverall.traceCount || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总召回调用</div>
            <div class="stat-value">{{ ragTrendOverall.calls || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">命中率</div>
            <div class="stat-value">{{ percentText(ragTrendDisplayOverall.hitRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">空召回率</div>
            <div class="stat-value">{{ percentText(ragTrendDisplayOverall.emptyRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">错误率</div>
            <div class="stat-value">{{ percentText(ragTrendDisplayOverall.errorRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">平均耗时 / P95</div>
            <div class="stat-value">{{ Math.round(Number(ragTrendDisplayOverall.avgDurationMs || 0)) }} / {{ Math.round(Number(ragTrendDisplayOverall.p95DurationMs || 0)) }}ms</div>
          </div>
        </div>
        <el-table
          v-loading="ragTrendLoading"
          :data="ragLaneRows"
          stripe
          empty-text="暂无 lane 聚合"
          class="snap-table rag-lane-table"
          @row-click="onLaneRowClick"
        >
          <el-table-column prop="lane" label="lane（点击可筛选下方趋势）" min-width="220" />
          <el-table-column prop="calls" label="调用" width="80" align="right" />
          <el-table-column label="命中率" width="100" align="right">
            <template #default="{ row }">{{ percentText(row.hitRate) }}</template>
          </el-table-column>
          <el-table-column label="空召回率" width="110" align="right">
            <template #default="{ row }">{{ percentText(row.emptyRate) }}</template>
          </el-table-column>
          <el-table-column label="错误率" width="90" align="right">
            <template #default="{ row }">{{ percentText(row.errorRate) }}</template>
          </el-table-column>
        </el-table>
        <div class="lane-filter-bar">
          <span class="snap-note">lane 筛选：{{ selectedLane || '全部' }}</span>
          <div class="lane-actions">
            <el-segmented
              v-model="ragQuickFilter"
              :options="ragQuickFilterOptions"
              size="small"
              class="beauty-segmented lane-segmented"
            />
            <el-button v-if="selectedLane" link type="primary" @click="selectedLane = ''">清除 lane</el-button>
          </div>
        </div>
        <el-table
          v-loading="ragTrendLoading"
          :data="ragTrendSeriesPageRows"
          stripe
          empty-text="暂无趋势数据"
          class="snap-table session-table"
          table-layout="auto"
          :max-height="420"
        >
          <el-table-column prop="startedAt" label="时间" width="170">
            <template #default="{ row }">{{ formatTs(row.startedAt) }}</template>
          </el-table-column>
          <el-table-column prop="inputPreview" label="摘要" min-width="180" show-overflow-tooltip />
          <el-table-column prop="calls" label="调用" width="74" align="right" />
          <el-table-column label="lane 分布" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ laneCallsText(row.callsByLane) || '—' }}</template>
          </el-table-column>
          <el-table-column label="命中率" width="100" align="right">
            <template #default="{ row }">{{ percentText(row.hitRate) }}</template>
          </el-table-column>
          <el-table-column label="空召回率" width="110" align="right">
            <template #default="{ row }">{{ percentText(row.emptyRate) }}</template>
          </el-table-column>
          <el-table-column label="错误率" width="90" align="right">
            <template #default="{ row }">{{ percentText(row.errorRate) }}</template>
          </el-table-column>
          <el-table-column label="P95" width="86" align="right">
            <template #default="{ row }">{{ Math.round(Number(row.p95DurationMs || 0)) }}ms</template>
          </el-table-column>
        </el-table>
        <div class="table-pager">
          <el-pagination
            v-model:current-page="ragTrendPage"
            v-model:page-size="ragTrendPageSize"
            :page-sizes="[20, 40, 60]"
            layout="total, sizes, prev, pager, next"
            :total="ragTrendSeriesDiagnosedTop.length"
            @current-change="onRagTrendPageChange"
            @size-change="onRagTrendPageSizeChange"
          />
        </div>
      </section>

      <section class="sub-panel">
        <h4 class="snap-h4">LLM 指标</h4>
        <div class="rag-mode-switch">
          <span class="rag-mode-label">筛选</span>
          <el-input v-model.trim="llmModelFilter" placeholder="按模型过滤" size="small" style="width: 220px" />
          <el-input v-model.trim="llmNodeFilter" placeholder="按节点过滤" size="small" style="width: 220px" />
          <el-button size="small" type="primary" plain :loading="llmLoading" @click="loadLlmSummaryData">应用</el-button>
          <el-button size="small" link @click="resetLlmFilters">重置</el-button>
        </div>
        <el-alert
          v-for="(warn, idx) in llmWarnings"
          :key="idx"
          :title="warn"
          type="warning"
          :closable="false"
          show-icon
          class="snap-alert"
        />
        <div class="rag-grid rag-grid--overall">
          <div class="stat-card">
            <div class="stat-label">LLM 调用数</div>
            <div class="stat-value">{{ llmOverall.llmCalls || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">调用成功率</div>
            <div class="stat-value">{{ percentText(llmOverall.successRate) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总 Tokens</div>
            <div class="stat-value">{{ llmOverall.totalTokens || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">平均耗时 / P95</div>
            <div class="stat-value">{{ Math.round(Number(llmOverall.avgDurationMs || 0)) }} / {{ Math.round(Number(llmOverall.p95DurationMs || 0)) }}ms</div>
          </div>
        </div>

        <el-table v-loading="llmLoading" :data="llmByModelRows" stripe empty-text="暂无按模型分布" class="snap-table">
          <el-table-column prop="key" label="模型" min-width="220" show-overflow-tooltip />
          <el-table-column prop="calls" label="调用" width="90" align="right" />
          <el-table-column prop="totalTokens" label="总 Tokens" width="120" align="right" />
          <el-table-column label="Token 占比" min-width="220">
            <template #default="{ row }">
              <div class="share-wrap">
                <div class="share-bar">
                  <div class="share-fill" :style="{ width: `${Math.max(0, Math.min(100, Number(row.tokenSharePct || 0)))}%` }"></div>
                </div>
                <span class="share-text">{{ Number(row.tokenSharePct || 0).toFixed(1) }}%</span>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-table v-loading="llmLoading" :data="llmByNodeRows" stripe empty-text="暂无节点 Token 消耗" class="snap-table">
          <el-table-column prop="node" label="节点" min-width="180" />
          <el-table-column prop="calls" label="调用数" width="100" align="right" />
          <el-table-column prop="totalTokens" label="总 Tokens" width="130" align="right" />
          <el-table-column label="Token 占比" min-width="220">
            <template #default="{ row }">
              <div class="share-wrap">
                <div class="share-bar">
                  <div class="share-fill" :style="{ width: `${Math.max(0, Math.min(100, Number(row.tokenSharePct || 0)))}%` }"></div>
                </div>
                <span class="share-text">{{ Number(row.tokenSharePct || 0).toFixed(1) }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="平均单次 Token" width="130" align="right">
            <template #default="{ row }">{{ Math.round(row.avgTokensPerCall) }}</template>
          </el-table-column>
          <el-table-column prop="promptTokens" label="Prompt Tokens" width="130" align="right" />
          <el-table-column prop="completionTokens" label="Completion Tokens" width="150" align="right" />
        </el-table>
      </section>
    </section>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAgentObservabilitySnapshot, getAgentRagSummary, getAgentLlmSummary } from '@/services/agent-management.service.js'

const snapHours = ref(72)
const snap = ref(null)
const snapLoading = ref(false)
const showAdvancedChainMetrics = ref(false)
const ragTrend = ref({ overall: {}, series: [] })
const ragTrendLoading = ref(false)
const ragTrendPage = ref(1)
const ragTrendPageSize = ref(20)
const ragTrendLoadedLimit = ref(80)
const selectedLane = ref('')
const ragQuickFilter = ref('all')
const ragQuickFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '仅空召回', value: 'empty' },
  { label: '仅错误', value: 'error' },
  { label: '仅慢查询', value: 'slow' }
]
const ragAggregateMode = ref('call')
const ragAggregateModeOptions = [
  { label: '按调用', value: 'call' },
  { label: '按 trace', value: 'trace' }
]

const llmSummary = ref({})
const llmLoading = ref(false)
const llmModelFilter = ref('')
const llmNodeFilter = ref('')

const ragTrendOverall = computed(() => ragTrend.value?.overall || {})
const ragTrendSeriesTop = computed(() => {
  const arr = Array.isArray(ragTrend.value?.series) ? ragTrend.value.series : []
  return arr.slice(0, 60)
})
const ragLaneRows = computed(() => {
  const m = ragTrendOverall.value?.laneStats
  if (!m || typeof m !== 'object') return []
  return Object.entries(m)
    .map(([lane, stats]) => ({
      lane,
      calls: Number(stats?.calls || 0),
      hitRate: Number(stats?.hitRate || 0),
      emptyRate: Number(stats?.emptyRate || 0),
      errorRate: Number(stats?.errorRate || 0),
      avgDurationMs: Number(stats?.avgDurationMs || 0),
      avgRetrievedCount: Number(stats?.avgRetrievedCount || 0)
    }))
    .sort((a, b) => b.calls - a.calls)
})
const ragTrendSeriesFilteredTop = computed(() => {
  const lane = selectedLane.value
  if (!lane) return ragTrendSeriesTop.value
  return ragTrendSeriesTop.value.filter((row) => Number(row?.callsByLane?.[lane] || 0) > 0)
})
const ragTrendSeriesDiagnosedTop = computed(() => {
  const mode = ragQuickFilter.value
  const base = ragTrendSeriesFilteredTop.value
  const p95Line = Number(ragTrendDisplayOverall.value?.p95DurationMs || 0)
  if (mode === 'empty') return base.filter((row) => Number(row.emptyCalls || 0) > 0)
  if (mode === 'error') return base.filter((row) => Number(row.errorCalls || 0) > 0)
  if (mode === 'slow') {
    const threshold = p95Line > 0 ? p95Line : 200
    return base.filter((row) => Number(row.p95DurationMs || 0) >= threshold)
  }
  return base
})
const ragTrendSeriesPageRows = computed(() => {
  const page = Math.max(1, Number(ragTrendPage.value || 1))
  const size = Math.max(1, Number(ragTrendPageSize.value || 20))
  const start = (page - 1) * size
  return ragTrendSeriesDiagnosedTop.value.slice(start, start + size)
})
const ragTrendDisplayOverall = computed(() => {
  if (ragAggregateMode.value === 'call') return ragTrendOverall.value
  const arr = ragTrendSeriesFilteredTop.value
  if (!arr.length) return { hitRate: 0, emptyRate: 0, errorRate: 0, avgDurationMs: 0, p95DurationMs: 0 }
  let hitTrace = 0
  let emptyTrace = 0
  let errorTrace = 0
  let sumAvgDur = 0
  const p95List = []
  for (const row of arr) {
    if (Number(row.hitCalls || 0) > 0) hitTrace += 1
    if (Number(row.emptyCalls || 0) > 0) emptyTrace += 1
    if (Number(row.errorCalls || 0) > 0) errorTrace += 1
    sumAvgDur += Number(row.avgDurationMs || 0)
    const p95 = Number(row.p95DurationMs || 0)
    if (Number.isFinite(p95) && p95 > 0) p95List.push(p95)
  }
  p95List.sort((a, b) => a - b)
  const n = arr.length
  return {
    hitRate: n ? hitTrace / n : 0,
    emptyRate: n ? emptyTrace / n : 0,
    errorRate: n ? errorTrace / n : 0,
    avgDurationMs: n ? sumAvgDur / n : 0,
    p95DurationMs: percentileFromSorted(p95List, 0.95)
  }
})
const llmOverall = computed(() => llmSummary.value?.overall || {})
const llmByNodeRows = computed(() => {
  const rows = Array.isArray(llmSummary.value?.byNode) ? llmSummary.value.byNode : []
  const baseRows = rows.map((r) => ({
    node: r?.key || 'unknown',
    calls: Number(r?.calls || 0),
    totalTokens: Number(r?.totalTokens || 0),
    avgTokensPerCall: Number(r?.calls || 0) > 0 ? Number(r?.totalTokens || 0) / Number(r?.calls || 0) : 0,
    promptTokens: Number(r?.promptTokens || 0),
    completionTokens: Number(r?.completionTokens || 0)
  }))
  const totalTok = baseRows.reduce((acc, r) => acc + Number(r.totalTokens || 0), 0)
  return baseRows
    .map((r) => ({
      ...r,
      tokenSharePct: totalTok > 0 ? (Number(r.totalTokens || 0) / totalTok) * 100 : 0
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
})
const llmByModelRows = computed(() => {
  const rows = Array.isArray(llmSummary.value?.byModel) ? llmSummary.value.byModel : []
  const totalTok = rows.reduce((acc, r) => acc + Number(r?.totalTokens || 0), 0)
  return rows.map((r) => {
    const tok = Number(r?.totalTokens || 0)
    return {
      ...r,
      tokenSharePct: totalTok > 0 ? (tok / totalTok) * 100 : 0
    }
  })
})
const llmWarnings = computed(() => {
  const rows = []
  const successRate = Number(llmOverall.value?.successRate || 0)
  if (llmOverall.value?.llmCalls > 0 && successRate < 0.9) {
    rows.push(`LLM 成功率偏低：${percentText(successRate)}（阈值 90%）`)
  }
  return rows
})
const finalAnswerCorrectnessText = computed(() => {
  const annotated = Number(snap.value?.chainSummary?.finalAnswerAnnotatedCount || 0)
  if (annotated <= 0) return '待标注'
  return percentText(snap.value?.chainSummary?.finalAnswerCorrectRate)
})

function traceStatusCount(key) {
  const m = snap.value?.traceRoot?.byStatus
  if (!m || typeof m !== 'object') return 0
  const v = m[key]
  return typeof v === 'number' ? v : Number(v) || 0
}

const traceFinishRate = computed(() => {
  const s = traceStatusCount('SUCCESS')
  const f = traceStatusCount('FAILED')
  if (s + f === 0) return '—'
  return `${((s / (s + f)) * 100).toFixed(1)}%`
})

async function loadSnapshot() {
  snapLoading.value = true
  try {
    snap.value = await getAgentObservabilitySnapshot(snapHours.value)
  } catch (e) {
    ElMessage.error(e?.message || '快照加载失败')
  } finally {
    snapLoading.value = false
  }
  loadLlmSummaryData()
}

async function loadRagTrend() {
  ragTrendLoading.value = true
  try {
    ragTrend.value = (await getAgentRagSummary(ragTrendLoadedLimit.value)) || { overall: {}, series: [] }
  } catch (e) {
    ElMessage.error(e?.message || 'RAG 全局趋势加载失败')
    ragTrend.value = { overall: {}, series: [] }
  } finally {
    ragTrendLoading.value = false
  }
}

function onRagTrendPageSizeChange() {
  ragTrendPage.value = 1
}

async function onRagTrendPageChange(page) {
  const target = Number(page || 1)
  const needed = target * Number(ragTrendPageSize.value || 20)
  if (needed <= ragTrendLoadedLimit.value) return
  ragTrendLoadedLimit.value = Math.max(needed, ragTrendLoadedLimit.value + 80)
  await loadRagTrend()
}

async function loadLlmSummaryData() {
  llmLoading.value = true
  try {
    llmSummary.value = (await getAgentLlmSummary(snapHours.value, llmModelFilter.value, llmNodeFilter.value)) || {}
  } catch (e) {
    ElMessage.error(e?.message || 'LLM 指标加载失败')
    llmSummary.value = {}
  } finally {
    llmLoading.value = false
  }
}

function resetLlmFilters() {
  llmModelFilter.value = ''
  llmNodeFilter.value = ''
  loadLlmSummaryData()
}

function percentText(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function routeLatencySecText(route) {
  const row = snap.value?.chainSummary?.latencyByRouteSec?.[route]
  const avgSec = Number(row?.avgSec || 0)
  const p95Sec = Number(row?.p95Sec || 0)
  return `${avgSec.toFixed(2)} / ${p95Sec.toFixed(2)}s`
}

function laneCallsText(v) {
  if (!v || typeof v !== 'object') return ''
  const entries = Object.entries(v).filter(([k, n]) => k && Number(n) > 0)
  if (!entries.length) return ''
  return entries
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([k, n]) => `${k}:${n}`)
    .join(' | ')
}

function percentileFromSorted(arr, p) {
  if (!arr.length) return 0
  const idx = Math.min(arr.length - 1, Math.max(0, Math.ceil(arr.length * p) - 1))
  return arr[idx]
}

function onLaneRowClick(row) {
  const lane = row?.lane ? String(row.lane) : ''
  if (!lane) return
  selectedLane.value = selectedLane.value === lane ? '' : lane
}

function formatTs(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'number') return new Date(v).toLocaleString()
  if (typeof v === 'string' && /^\d+$/.test(v)) return new Date(Number(v)).toLocaleString()
  return String(v)
}

onMounted(() => {
  loadSnapshot()
  loadRagTrend()
  loadLlmSummaryData()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600;700&display=swap');

.observe-hub {
  --ink: #142132;
  --ink-soft: #3d4f66;
  --paper: #fdfbf7;
  --paper-2: #f3efe6;
  --stripe-a: #2c5282;
  --stripe-b: #276749;
  --stripe-c: #744210;
  --radius: 20px;
  font-family: 'Source Sans 3', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--ink-soft);
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel {
  border-radius: var(--radius);
  padding: 18px 20px 22px;
  background: linear-gradient(180deg, #ffffff 0%, var(--paper-2) 100%);
  border: 1px solid #e0d8ca;
  box-shadow: 0 12px 30px rgba(55, 48, 35, 0.06);
}

.sub-panel {
  margin-top: 14px;
  padding: 12px 12px 10px;
  border-radius: 14px;
  border: 1px solid #e6ddce;
  background: rgba(255, 255, 255, 0.72);
}

.sub-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.snap-alert {
  margin-bottom: 14px;
}

.alert-title {
  font-size: 13px;
  line-height: 1.5;
}

.kqa-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.kqa-grid--core {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kqa-grid--detail {
  margin-top: 8px;
}

.metric-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin: 2px 0 4px;
}

.compact-note {
  margin-bottom: 10px;
}

@media (max-width: 900px) {
  .kqa-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kqa-grid--core {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e5dfd3;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.snap-h4 {
  margin: 0;
  font-size: 14px;
  color: var(--ink);
}

.snap-note {
  margin: 0 0 10px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.snap-table {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
}

.session-table :deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

.table-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.rag-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e4dccf;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 242, 232, 0.88) 100%);
}

.rag-mode-label {
  font-size: 11px;
  font-weight: 700;
  color: #5c6f8d;
}

.mode-note {
  font-size: 11px;
  color: #64748b;
}

.rag-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.rag-grid--overall {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .rag-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rag-grid--overall {
    grid-template-columns: 1fr;
  }
}

.lane-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e6ddcf;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 240, 231, 0.86) 100%);
}

.lane-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.beauty-segmented :deep(.el-segmented) {
  padding: 3px;
  border-radius: 11px;
  border: 1px solid #d9cfbd;
  background: linear-gradient(180deg, #fbf8f2 0%, #f2ecdf 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.beauty-segmented :deep(.el-segmented__item) {
  border-radius: 8px;
  color: #5d6372;
  font-weight: 600;
  min-height: 28px;
  transition: all 0.18s ease;
}

.beauty-segmented :deep(.el-segmented__item:hover) {
  color: #2c3e5d;
  background: rgba(108, 133, 173, 0.1);
}

.beauty-segmented :deep(.el-segmented__item-selected) {
  color: #1e3554;
  background: linear-gradient(135deg, #d8ecff 0%, #bedffc 100%);
  box-shadow:
    0 2px 7px rgba(47, 85, 128, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

code {
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #eef2f7;
  color: #1e3a5f;
}

.share-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.share-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
}

.share-text {
  width: 48px;
  text-align: right;
  font-size: 12px;
  color: #475569;
}
</style>
