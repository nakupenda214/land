<template>
  <div
    class="trace-node"
    :class="[
      `is-${data?.state || 'cold'}`,
      { 'is-selected': data?.selected },
      terminalPoleClass
    ]"
  >
    <div v-if="data?.selected" class="trace-node-flyout">
      <template v-if="data?.terminalKind === 'start' || data?.terminalKind === 'end'">
        <div class="flyout-cap">{{ data.terminalKind === 'start' ? '流程入口' : '流程出口' }}</div>
        <p class="flyout-pole-hint">编排桩位，无节点执行指标。</p>
      </template>
      <template v-else>
      <div class="flyout-cap">节点详情</div>
      <div class="flyout-grid">
        <div class="flyout-kv">
          <span class="k">执行次数</span>
          <span class="v">{{ data?.inspect?.visitCount ?? 0 }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">总耗时（节点）</span>
          <span class="v">{{ data?.inspect?.durationLabel || 'n/a' }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">LLM 调用</span>
          <span class="v">{{ llmHitCount }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">LLM 总耗时</span>
          <span class="v">{{ data?.inspect?.llmWallLabel || '—' }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">Token 入 / 出</span>
          <span class="v mono-nums">{{ data?.inspect?.promptTokensLabel || '—' }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">Prompt 字符</span>
          <span class="v mono-nums">{{ data?.inspect?.promptCharsLabel || '—' }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">响应字符</span>
          <span class="v mono-nums">{{ data?.inspect?.responseCharsLabel || '—' }}</span>
        </div>
        <div class="flyout-kv">
          <span class="k">入/出边</span>
          <span class="v">{{ data?.inspect?.edgeIn ?? 0 }}/{{ data?.inspect?.edgeOut ?? 0 }}</span>
        </div>
      </div>

      <div v-if="data?.inspect?.hasRag" class="flyout-block">
        <div class="flyout-block-title">RAG 检索</div>
        <div class="flyout-mini-grid">
          <span class="mk">结果</span><span class="mv">{{ ragField('outcome') }}</span>
          <span class="mk">向量检索耗时</span><span class="mv">{{ fmtMs(ragFieldRaw('vectorDurationMs')) }}</span>
          <span class="mk">TopK / 阈值</span>
          <span class="mv">{{ fmtPair(ragFieldRaw('topK'), ragFieldRaw('threshold')) }}</span>
          <span class="mk">召回条数</span><span class="mv">{{ fmtInt(ragFieldRaw('retrievedCount')) }}</span>
          <span class="mk">业务词 / 智能体知识</span>
          <span class="mv">{{ fmtPair(ragFieldRaw('businessTermCount'), ragFieldRaw('agentKnowledgeCount')) }}</span>
          <span class="mk">改写问句长度</span><span class="mv">{{ fmtInt(ragFieldRaw('rewrittenQueryChars')) }}</span>
          <span class="mk">空命中</span><span class="mv">{{ fmtBool(ragFieldRaw('emptyHit')) }}</span>
          <span class="mk">查询指纹</span><span class="mv mono-clip" :title="String(ragFieldRaw('queryHash') || '')">{{
            ragFieldRaw('queryHash') || '—'
          }}</span>
        </div>
      </div>

      <div v-if="data?.inspect?.hasSchemaRough" class="flyout-block flyout-block--amber">
        <div class="flyout-block-title">Schema 粗召回</div>
        <div class="flyout-mini-grid">
          <span class="mk">结果</span><span class="mv">{{ schemaField('outcome') }}</span>
          <span class="mk">召回路径</span><span class="mv">{{ schemaRecallSourceLabel }}</span>
          <span class="mk">耗时</span><span class="mv">{{ fmtMs(schemaFieldRaw('durationMs')) }}</span>
          <span class="mk">TopK / 阈值</span>
          <span class="mv">{{ fmtPair(schemaFieldRaw('topK'), schemaFieldRaw('threshold')) }}</span>
          <span class="mk">集合数</span><span class="mv">{{ fmtInt(schemaFieldRaw('count')) }}</span>
          <span class="mk">空命中</span><span class="mv">{{ fmtBool(schemaFieldRaw('emptyHit')) }}</span>
          <span class="mk col-span-2 collections-line" :title="collectionsTitle">{{
            collectionsPreview
          }}</span>
        </div>
      </div>

      <div v-if="data?.inspect?.hasFewShotRecall" class="flyout-block flyout-block--violet">
        <div class="flyout-block-title">Few-shot 片段召回</div>
        <div class="flyout-mini-grid">
          <span class="mk">结果</span><span class="mv">{{ fewShotField('outcome') }}</span>
          <span class="mk">向量耗时</span><span class="mv">{{ fmtMs(fewShotFieldRaw('vectorDurationMs')) }}</span>
          <span class="mk">TopK / 阈值</span>
          <span class="mv">{{ fmtPair(fewShotFieldRaw('topK'), fewShotFieldRaw('threshold')) }}</span>
          <span class="mk">最终命中</span><span class="mv">{{ fmtInt(fewShotFieldRaw('finalHits')) }}</span>
          <span class="mk">主路 / 次路命中</span>
          <span class="mv">{{ fmtPair(fewShotFieldRaw('primaryHits'), fewShotFieldRaw('secondaryHits')) }}</span>
          <span class="mk">命中来源</span><span class="mv">{{ fewShotSourceLabel }}</span>
          <span class="mk">回退主查询</span><span class="mv">{{ fmtBool(fewShotFieldRaw('fallbackUsed')) }}</span>
          <span class="mk">生效召回问句</span>
          <span class="mv mono-clip" :title="String(fewShotFieldRaw('recallQueryPreview') || '')">{{
            fewShotField('recallQueryPreview')
          }}</span>
          <span class="mk">查询指纹</span><span class="mv mono-clip" :title="String(fewShotFieldRaw('queryHash') || '')">{{
            fewShotField('queryHash')
          }}</span>
          <span class="mk">步骤指令字符</span><span class="mv">{{ fmtInt(fewShotFieldRaw('stepInstructionChars')) }}</span>
          <span class="mk">主查询字符</span><span class="mv">{{ fmtInt(fewShotFieldRaw('canonicalQueryChars')) }}</span>
          <span class="mk col-span-2 collections-line" :title="fewShotHitsTitle">{{ fewShotHitsPreview }}</span>
        </div>
      </div>

      <div class="flyout-foot" :class="{ 'is-bad': data?.inspect?.lastOk === false }">
        {{ data?.inspect?.lastOk === false ? '末次状态：失败' : '末次状态：成功' }}
      </div>
      </template>
    </div>
    <div v-if="poleIcon" class="trace-node-pole-ico" :data-pole="data?.terminalKind">
      <el-icon><component :is="poleIcon" /></el-icon>
    </div>
    <div v-if="data?.order != null" class="trace-order-tag">#{{ data.order }}</div>
    <div class="trace-node-title" :title="data?.label || ''">{{ data?.label || id }}</div>
    <div class="trace-node-sub" :title="data?.subtitle || ''">{{ data?.subtitle || '—' }}</div>
    <div v-if="!data?.terminalKind && Array.isArray(data?.runs) && data.runs.length" class="trace-run-row">
      <span v-for="step in data.runs" :key="step" class="run-chip">·{{ step }}</span>
      <span v-if="data?.moreRuns > 0" class="run-chip run-chip-more">+{{ data.moreRuns }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Flag, SwitchButton } from '@element-plus/icons-vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, default: () => ({}) }
})

const terminalPoleClass = computed(() => {
  const t = props.data?.terminalKind
  if (t === 'start') return 'trace-node--pole trace-node--pole-start'
  if (t === 'end') return 'trace-node--pole trace-node--pole-end'
  return ''
})

const poleIcon = computed(() => {
  const t = props.data?.terminalKind
  if (t === 'start') return Flag
  if (t === 'end') return SwitchButton
  return null
})

const llmHitCount = computed(() => {
  const a = Number(props.data?.inspect?.llmRequests ?? 0)
  const b = Number(props.data?.inspect?.llmCallCount ?? 0)
  return Math.max(a, b)
})

const ragKv = computed(() => (props.data?.inspect?.ragRecall && typeof props.data.inspect.ragRecall === 'object' ? props.data.inspect.ragRecall : {}))

const schemaKv = computed(() =>
  props.data?.inspect?.schemaRough && typeof props.data.inspect.schemaRough === 'object'
    ? props.data.inspect.schemaRough
    : {}
)

const fewShotKv = computed(() =>
  props.data?.inspect?.fewShotRecall && typeof props.data.inspect.fewShotRecall === 'object'
    ? props.data.inspect.fewShotRecall
    : {}
)

function ragField(key) {
  const v = ragKv.value[key]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function ragFieldRaw(key) {
  return ragKv.value[key]
}

function schemaField(key) {
  const v = schemaKv.value[key]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function schemaFieldRaw(key) {
  return schemaKv.value[key]
}

function fewShotField(key) {
  const v = fewShotKv.value[key]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function fewShotFieldRaw(key) {
  return fewShotKv.value[key]
}

function fmtInt(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

function fmtMs(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)}s`
}

function fmtPair(a, b) {
  const x = Number(a)
  const y = Number(b)
  const xs = Number.isFinite(x) ? String(x) : '—'
  const ys = Number.isFinite(y) ? String(y) : '—'
  if (xs === '—' && ys === '—') return '—'
  return `${xs} / ${ys}`
}

function fmtBool(v) {
  if (v === true) return '是'
  if (v === false) return '否'
  return '—'
}

const collectionsPreview = computed(() => {
  const c = schemaKv.value.collections
  if (!Array.isArray(c) || !c.length) return '集合：（无）'
  const max = 10
  const head = c.slice(0, max).map((x) => String(x))
  const more = c.length > max ? ` …共 ${c.length} 个` : ''
  return `集合：${head.join(', ')}${more}`
})

const collectionsTitle = computed(() => {
  const c = schemaKv.value.collections
  if (!Array.isArray(c)) return ''
  return c.join(', ')
})

const schemaRecallSourceLabel = computed(() => {
  const s = String(schemaKv.value.recallSource ?? '').trim()
  if (s === 'vector') return '向量命中'
  if (s === 'keyword') return '关键词'
  return s || '—'
})

/** 与后端 MQL few_shot trace 的 source 字段对齐 */
const fewShotSourceLabel = computed(() => {
  const s = String(fewShotKv.value.source ?? '').trim()
  if (s === 'step_instruction') return '步骤指令'
  if (s === 'canonical_query') return '主查询'
  if (s === 'none') return '无片段'
  return s || '—'
})

const fewShotHitsPreview = computed(() => {
  const hits = fewShotKv.value.hits
  if (!Array.isArray(hits) || hits.length === 0) return '命中明细：（无）'
  const max = 4
  const parts = []
  for (let i = 0; i < Math.min(hits.length, max); i++) {
    const h = hits[i] || {}
    const rk = h.recallKind != null ? String(h.recallKind) : ''
    const rkZh = rk === 'vector' ? '向量' : rk === 'supplement' ? '补齐' : rk
    const q = h.questionPreview != null ? String(h.questionPreview) : ''
    const sc = h.score != null && Number.isFinite(Number(h.score)) ? Number(h.score).toFixed(3) : ''
    const id = h.fewShotId != null ? String(h.fewShotId) : ''
    const tail = sc ? `·${sc}` : ''
    parts.push(`#${h.rank ?? i + 1} ${rkZh}${tail} ${id ? id.slice(0, 8) : ''} ${q.slice(0, 48)}${q.length > 48 ? '…' : ''}`)
  }
  const more = hits.length > max ? ` …共 ${hits.length} 条` : ''
  return `命中明细：${parts.join(' | ')}${more}`
})

const fewShotHitsTitle = computed(() => {
  const hits = fewShotKv.value.hits
  if (!Array.isArray(hits) || !hits.length) return ''
  return hits
    .map((h) => {
      const lines = [
        `rank=${h?.rank}`,
        `id=${h?.fewShotId}`,
        `kind=${h?.recallKind}`,
        h?.score != null ? `score=${h.score}` : '',
        h?.questionPreview,
        h?.mqlJsonPreview
      ].filter(Boolean)
      return lines.join('\n')
    })
    .join('\n---\n')
})
</script>

<style scoped>
.trace-node {
  position: relative;
  width: 210px;
  min-height: 84px;
  border-radius: 12px;
  padding: 10px 12px 12px;
  border: 1px solid #94a3b8;
  background: #f8fafc;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  transition: all 0.18s ease;
}

.trace-node--pole {
  width: 148px;
  min-height: 72px;
  padding-top: 12px;
  padding-left: 40px;
  border-radius: 999px 14px 14px 999px;
  border-width: 2px;
}

.trace-node--pole-start {
  border-color: #0ea5e9;
  background: linear-gradient(120deg, #ecfeff 0%, #e0f2fe 55%, #f0f9ff 100%);
}

.trace-node--pole-end {
  border-color: #6366f1;
  background: linear-gradient(120deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%);
}

.trace-node--pole.trace-node.is-visited {
  border-color: #0284c7;
  background: linear-gradient(120deg, #cffafe 0%, #bae6fd 45%, #e0f2fe 100%);
  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.22);
}

.trace-node--pole-end.trace-node.is-visited {
  border-color: #4f46e5;
  background: linear-gradient(120deg, #e0e7ff 0%, #ddd6fe 45%, #eef2ff 100%);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
}

.trace-node-pole-ico {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.trace-node--pole-start .trace-node-pole-ico {
  color: #0369a1;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #7dd3fc;
}

.trace-node--pole-end .trace-node-pole-ico {
  color: #4338ca;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #c4b5fd;
}

.flyout-pole-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: #334155;
  font-weight: 600;
}

.trace-node-flyout {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 12px);
  transform: translateX(-50%);
  width: min(320px, 92vw);
  border-radius: 12px;
  border: 1px solid #7dd3fc;
  background:
    radial-gradient(circle at 12% 0%, rgba(186, 230, 253, 0.45), transparent 55%),
    linear-gradient(160deg, #f8fdff 0%, #edf8ff 48%, #e2f2ff 100%);
  box-shadow:
    0 10px 22px rgba(14, 116, 144, 0.2),
    0 2px 0 rgba(255, 255, 255, 0.8) inset;
  padding: 8px 9px 9px;
  pointer-events: none;
  z-index: 25;
}

.trace-node-flyout::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -6px) rotate(45deg);
  border-right: 1px solid #7dd3fc;
  border-bottom: 1px solid #7dd3fc;
  background: #eaf6ff;
}

.flyout-cap {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #075985;
  margin-bottom: 6px;
}

.flyout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.flyout-kv {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 8px;
  border: 1px solid #bae6fd;
  background: rgba(255, 255, 255, 0.82);
  padding: 5px 6px;
}

.flyout-kv .k {
  font-size: 9px;
  color: #64748b;
}

.flyout-kv .v {
  font-size: 11px;
  font-weight: 800;
  color: #0c4a6e;
}

.mono-nums {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 10.5px;
}

.flyout-block {
  margin-top: 8px;
  padding: 6px 7px 7px;
  border-radius: 9px;
  border: 1px solid #a5f3fc;
  background: rgba(255, 255, 255, 0.88);
}

.flyout-block--amber {
  border-color: #fcd34d;
  background: rgba(255, 251, 235, 0.92);
}

.flyout-block-title {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #0e7490;
  margin-bottom: 5px;
}

.flyout-block--amber .flyout-block-title {
  color: #92400e;
}

.flyout-block--violet {
  border-color: #c4b5fd;
  background: rgba(245, 243, 255, 0.94);
}

.flyout-block--violet .flyout-block-title {
  color: #5b21b6;
}

.flyout-mini-grid {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 4px 8px;
  align-items: baseline;
}

.flyout-mini-grid .col-span-2 {
  grid-column: 1 / -1;
}

.mk {
  font-size: 9px;
  color: #64748b;
}

.mv {
  font-size: 10px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.collections-line {
  font-size: 9.5px;
  font-weight: 600;
  color: #334155;
  line-height: 1.35;
  max-height: 3.2em;
  overflow: hidden;
}

.mono-clip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flyout-foot {
  margin-top: 7px;
  border-radius: 7px;
  border: 1px dashed #7dd3fc;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  color: #0c4a6e;
  background: rgba(255, 255, 255, 0.65);
}

.flyout-foot.is-bad {
  border-color: #fdba74;
  color: #9a3412;
  background: #fff7ed;
}

.trace-node-title {
  font-size: 12px;
  font-weight: 800;
  color: #0f2847;
  line-height: 1.25;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trace-node-sub {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.trace-order-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-weight: 800;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #10b981;
  border-radius: 999px;
  padding: 1px 7px;
}

.trace-run-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.run-chip {
  font-size: 10px;
  font-weight: 700;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 1px 6px;
}

.run-chip-more {
  color: #334155;
  border-style: dashed;
}

.trace-node.is-visited {
  border-color: #047857;
  background: #d1fae5;
  box-shadow: 0 8px 18px rgba(5, 150, 105, 0.26);
}

.trace-node.is-warn {
  border-color: #c2410c;
  background: #ffedd5;
  box-shadow: 0 8px 18px rgba(194, 65, 12, 0.24);
}

.trace-node.is-cold {
  border-style: dashed;
  background: #f1f5f9;
  opacity: 0.9;
}

.trace-node.is-selected {
  border-color: #0b4f6c !important;
  box-shadow:
    0 0 0 2px rgba(11, 79, 108, 0.2),
    0 10px 20px rgba(11, 79, 108, 0.2);
}
</style>
