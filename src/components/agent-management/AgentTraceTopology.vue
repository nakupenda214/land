<template>
  <div class="topo-wrap">
    <div class="topo-head">
      <div class="topo-head-left">
        <span class="topo-title">拓扑概览</span>
      </div>
      <div class="topo-toolbar">
        <el-button-group size="small" class="zoom-btns">
          <el-button :disabled="zoom <= ZOOM_MIN + 1e-6" @click="zoomOut">
            <el-icon><Minus /></el-icon>
          </el-button>
          <el-button class="zoom-readout" @click="resetZoom">{{ zoomPct }}%</el-button>
          <el-button :disabled="zoom >= ZOOM_MAX - 1e-6" @click="zoomIn">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-button-group>
        <el-button size="small" @click="fitToView">适配视图</el-button>
        <el-button size="small" type="primary" plain @click="fitEntireGraph">查看整图</el-button>
        <el-button size="small" @click="setCurrentAsDefaultLayout">设为默认布局</el-button>
        <el-button size="small" text @click="clearDefaultLayout">清除默认布局</el-button>
        <el-button v-if="selectedNodeId" size="small" text type="primary" @click="$emit('clear-node')">清除节点筛选</el-button>
      </div>
    </div>

    <div class="topo-flow-wrap">
      <VueFlow
        class="topo-flow"
        :nodes="flowNodes"
        :edges="flowEdges"
        :node-types="nodeTypes"
        :min-zoom="ZOOM_MIN"
        :max-zoom="ZOOM_MAX"
        :default-viewport="{ x: 0, y: 0, zoom: 1 }"
        :fit-view-on-init="true"
        :fit-view-on-init-options="{ padding: 0.16 }"
        :nodes-draggable="true"
        :nodes-connectable="false"
        :elements-selectable="false"
        :pan-on-scroll="true"
        :zoom-on-scroll="false"
        :zoom-on-pinch="true"
        :zoom-on-double-click="false"
        @pane-ready="onPaneReady"
        @move="onMove"
        @node-click="onNodeClick"
        @node-drag-stop="onNodeDragStop"
        @edge-click="onEdgeClick"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, ref, watch } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'
import { VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { edgeKey } from './agent-trace-topology-layout.js'
import AgentTraceFlowNode from './AgentTraceFlowNode.vue'

const props = defineProps({
  layoutNodes: { type: Array, default: () => [] },
  skeletonEdges: { type: Array, default: () => [] },
  traceId: { type: String, default: '' },
  observedGraphEdges: { type: Array, default: () => [] },
  observedEdgeKeys: { type: Object, default: null },
  selectedNodeId: { type: String, default: '' },
  nodeMetrics: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['select-node', 'clear-node', 'select-edge'])

const ZOOM_MIN = 0.1
const ZOOM_MAX = 2.6
const DEFAULT_LAYOUT_STORAGE_KEY = 'agent_trace_topology_default_layout_v1'
const zoom = ref(1)
const flowIns = ref(null)
const positionOverride = ref({})

const nodeTypes = {
  traceNode: markRaw(AgentTraceFlowNode)
}

const visitedSet = computed(() => {
  const s = new Set()
  const obs = props.observedEdgeKeys
  if (obs instanceof Set && obs.size) {
    s.add('__START__')
    for (const k of obs) {
      const parts = String(k).split('→')
      if (parts[0]) s.add(parts[0])
      if (parts[1]) s.add(parts[1])
    }
  }
  const metrics = props.nodeMetrics && typeof props.nodeMetrics === 'object' ? props.nodeMetrics : {}
  for (const [nodeId, row] of Object.entries(metrics)) {
    const m = row && typeof row === 'object' ? row : {}
    const hasActivity =
      Number(m.durationMs || 0) > 0 ||
      Number(m.llmRequests || 0) > 0 ||
      Number(m.llmCallCount || 0) > 0 ||
      Number(m.responseCharsTotal || 0) > 0 ||
      (m.ragRecall && typeof m.ragRecall === 'object' && Object.keys(m.ragRecall).length > 0) ||
      (m.schemaRough && typeof m.schemaRough === 'object' && Object.keys(m.schemaRough).length > 0) ||
      (m.fewShotRecall && typeof m.fewShotRecall === 'object' && Object.keys(m.fewShotRecall).length > 0)
    if (hasActivity) {
      s.add(String(nodeId))
    }
  }
  return s
})

const zoomPct = computed(() => Math.round(zoom.value * 100))

function formatDurationMs(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1000) return `${Math.round(n)}ms`
  if (n < 60_000) return `${(n / 1000).toFixed(n < 10_000 ? 2 : 1)}s`
  return `${(n / 60_000).toFixed(1)}min`
}

function formatInt(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return String(Math.round(v))
}

function formatChars(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return '—'
  if (v < 10_000) return `${Math.round(v)}`
  return `${Math.round(v).toLocaleString('zh-CN')}`
}

/**
 * @param {string} nodeId
 * @param {Record<string, unknown>} m
 * @param {{ inCount: number, outCount: number }} edgeHit
 * @param {number[]} seq
 */
function buildNodeInspect(nodeId, m, edgeHit, seq) {
  const pr = Number(m?.promptCharsFromRequest || 0)
  const pc = Number(m?.promptCharsFromCall || 0)
  const promptChars = pr > 0 ? pr : pc
  const resp = Number(m?.responseCharsTotal || 0)
  const pt = Number(m?.promptTokensTotal || 0)
  const ct = Number(m?.completionTokensTotal || 0)
  const rag = m?.ragRecall && typeof m.ragRecall === 'object' ? m.ragRecall : null
  const sch = m?.schemaRough && typeof m.schemaRough === 'object' ? m.schemaRough : null
  const fs = m?.fewShotRecall && typeof m.fewShotRecall === 'object' ? m.fewShotRecall : null
  return {
    nodeId,
    visitCount: seq.length,
    durationLabel: formatDurationMs(m?.durationMs),
    llmRequests: Number(m?.llmRequests || 0),
    llmCallCount: Number(m?.llmCallCount || 0),
    edgeIn: edgeHit.inCount,
    edgeOut: edgeHit.outCount,
    lastOk: m?.lastOk !== false,
    llmWallLabel: formatDurationMs(m?.llmWallMsTotal),
    promptTokensLabel: pt > 0 || ct > 0 ? `${formatInt(pt)} / ${formatInt(ct)}` : '—',
    promptCharsLabel: formatChars(promptChars),
    responseCharsLabel: formatChars(resp),
    hasRag: !!(rag && Object.keys(rag).length),
    ragRecall: rag,
    hasSchemaRough: !!(sch && Object.keys(sch).length),
    schemaRough: sch,
    hasFewShotRecall: !!(fs && Object.keys(fs).length),
    fewShotRecall: fs
  }
}

/** 拓扑「起点 / 终点」桩节点：不参与耗时与 LLM 指标展示 */
function graphTerminalKind(nodeId, label) {
  const id = String(nodeId ?? '').trim()
  if (id === '__START__') return 'start'
  const compact = id.replace(/_/g, '').toLowerCase()
  if (compact === 'end') return 'end'
  if (String(label ?? '').trim() === '结束') return 'end'
  return null
}

function buildSubtitle(nodeId, label) {
  const pole = graphTerminalKind(nodeId, label)
  const vis = visitedSet.value.has(nodeId)
  if (pole === 'start') {
    return vis ? '流程入口' : '未经过'
  }
  if (pole === 'end') {
    return vis ? '流程出口' : '未经过'
  }
  const m = props.nodeMetrics?.[nodeId]
  const bits = []
  if (m?.durationMs > 0) {
    bits.push(formatDurationMs(m.durationMs))
  } else if (vis) {
    bits.push('耗时 n/a')
  }
  const llmHits = Math.max(Number(m?.llmRequests || 0), Number(m?.llmCallCount || 0))
  if (llmHits > 0) {
    bits.push(`LLM×${llmHits}`)
  }
  if (vis && m && m.lastOk === false) {
    bits.push('末次失败')
  }
  const fs = m?.fewShotRecall && typeof m.fewShotRecall === 'object' ? m.fewShotRecall : null
  if (vis && fs && Object.keys(fs).length) {
    const fh = Number(fs.finalHits)
    const hitOk = Number.isFinite(fh) && fh > 0
    bits.push(hitOk ? `Few-shot·${Math.round(fh)}条` : 'Few-shot·空')
  }
  if (!vis) return '未经过'
  return bits.join(' · ') || '已执行'
}

const flowNodes = computed(() => {
  return (props.layoutNodes || []).map((n) => {
    const vis = visitedSet.value.has(n.id)
    const m = props.nodeMetrics?.[n.id]
    const pole = graphTerminalKind(n.id, n.label)
    const state = !vis ? 'cold' : m?.lastOk === false && !pole ? 'warn' : 'visited'
    const seq = nodeVisitSeqMap.value.get(n.id) || []
    const order = seq.length ? seq[0] : null
    const edgeHit = nodeEdgeHitStats.value.get(n.id) || { inCount: 0, outCount: 0 }
    const p = positionOverride.value[n.id]
    return {
      id: n.id,
      type: 'traceNode',
      position: p ? { x: p.x, y: p.y } : { x: n.x, y: n.y },
      data: {
        label: n.label,
        subtitle: buildSubtitle(n.id, n.label),
        terminalKind: pole,
        state,
        selected: n.id === props.selectedNodeId,
        order,
        runs: pole ? [] : seq.slice(0, 6),
        moreRuns: pole ? 0 : Math.max(0, seq.length - 6),
        inspect: buildNodeInspect(n.id, m, edgeHit, seq)
      },
      sourcePosition: 'right',
      targetPosition: 'left'
    }
  })
})

function normalizePositionMap(input) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  for (const [id, p] of Object.entries(input)) {
    const x = Number(p?.x)
    const y = Number(p?.y)
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue
    out[id] = { x, y }
  }
  return out
}

function loadDefaultLayout() {
  try {
    const raw = localStorage.getItem(DEFAULT_LAYOUT_STORAGE_KEY)
    if (!raw) return {}
    return normalizePositionMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

function saveDefaultLayout(map) {
  try {
    localStorage.setItem(DEFAULT_LAYOUT_STORAGE_KEY, JSON.stringify(normalizePositionMap(map)))
  } catch {
    // ignore storage failure
  }
}

const edgeSeqInfo = computed(() => {
  const m = new Map()
  let idx = 1
  for (const ge of props.observedGraphEdges || []) {
    const k = edgeKey(ge.from, ge.to)
    const item = m.get(k) || { first: idx, last: idx, count: 0 }
    item.last = idx
    item.count += 1
    m.set(k, item)
    idx += 1
  }
  return m
})

const nodeVisitSeqMap = computed(() => {
  const m = new Map()
  if ((props.observedGraphEdges || []).length) {
    m.set('__START__', [0])
  }
  let idx = 1
  for (const ge of props.observedGraphEdges || []) {
    const from = ge?.from
    const to = ge?.to
    if (from) {
      const arr = m.get(from) || []
      arr.push(idx)
      m.set(from, arr)
    }
    if (to) {
      const arr = m.get(to) || []
      arr.push(idx)
      m.set(to, arr)
    }
    idx += 1
  }
  return m
})

const nodeEdgeHitStats = computed(() => {
  const m = new Map()
  for (const ge of props.observedGraphEdges || []) {
    const from = ge?.from
    const to = ge?.to
    if (from) {
      const row = m.get(from) || { inCount: 0, outCount: 0 }
      row.outCount += 1
      m.set(from, row)
    }
    if (to) {
      const row = m.get(to) || { inCount: 0, outCount: 0 }
      row.inCount += 1
      m.set(to, row)
    }
  }
  return m
})

const flowEdges = computed(() => {
  return (props.skeletonEdges || []).map((e) => {
    const k = edgeKey(e.from, e.to)
    const hot = props.observedEdgeKeys instanceof Set && props.observedEdgeKeys.has(k)
    const seq = edgeSeqInfo.value.get(k)
    const label = seq ? `#${seq.first}${seq.count > 1 ? `×${seq.count}` : ''}` : ''
    return {
      id: k,
      source: e.from,
      target: e.to,
      selectable: false,
      animated: hot,
      interactionWidth: 30,
      label,
      labelStyle: hot
        ? { fill: '#065f46', fontWeight: 800, fontSize: 11 }
        : { fill: '#64748b', fontWeight: 700, fontSize: 10.5 },
      labelBgStyle: hot
        ? { fill: '#d1fae5', fillOpacity: 0.98, stroke: '#10b981', strokeWidth: 1 }
        : { fill: '#e2e8f0', fillOpacity: 0.96, stroke: '#94a3b8', strokeWidth: 1 },
      labelBgPadding: [2, 4],
      labelBgBorderRadius: 5,
      style: hot
        ? {
            stroke: '#059669',
            strokeWidth: 4,
            filter: 'drop-shadow(0 0 6px rgba(5,150,105,.35))'
          }
        : {
            stroke: '#8aa2bf',
            strokeWidth: 2.2,
            strokeDasharray: '8 5',
            opacity: 0.95
          }
    }
  })
})

function onPaneReady(instance) {
  flowIns.value = instance
  syncZoomFromInstance()
}

function onMove(evt) {
  const z =
    evt?.viewport?.zoom ??
    evt?.zoom ??
    evt?.flowTransform?.[2] ??
    evt?.transform?.[2]
  if (Number.isFinite(z)) {
    zoom.value = z
  } else {
    syncZoomFromInstance()
  }
}

function fitToView() {
  flowIns.value?.fitView({ padding: 0.16, duration: 280 })
  scheduleZoomSync()
}

function fitEntireGraph() {
  flowIns.value?.fitView({ padding: 0.05, duration: 320 })
  scheduleZoomSync()
}

function zoomIn() {
  flowIns.value?.zoomIn({ duration: 180 })
  scheduleZoomSync()
}

function zoomOut() {
  flowIns.value?.zoomOut({ duration: 180 })
  scheduleZoomSync()
}

function resetZoom() {
  flowIns.value?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })
  scheduleZoomSync()
}

function syncZoomFromInstance() {
  const z = flowIns.value?.getViewport?.()?.zoom
  if (Number.isFinite(z)) {
    zoom.value = z
  }
}

function scheduleZoomSync() {
  // 动画结束前后各补一次，避免 readout 卡在旧值
  requestAnimationFrame(() => syncZoomFromInstance())
  setTimeout(() => syncZoomFromInstance(), 240)
}

function onNodeClick({ node }) {
  emit('select-node', node?.id)
}

function onNodeDragStop({ node }) {
  if (!node?.id || !node?.position) return
  const merged = {
    ...positionOverride.value,
    [node.id]: { x: node.position.x, y: node.position.y }
  }
  positionOverride.value = merged
  // 你拖到哪里就默认记到哪里，下一次默认布局直接复用。
  saveDefaultLayout(merged)
}

function onEdgeClick({ edge }) {
  if (!edge) return
  emit('select-edge', {
    from: edge.source,
    to: edge.target,
    key: edge.id || edgeKey(edge.source, edge.target)
  })
}

function setCurrentAsDefaultLayout() {
  const nodes = flowIns.value?.getNodes?.()
  if (!Array.isArray(nodes) || !nodes.length) {
    saveDefaultLayout(positionOverride.value)
    return
  }
  const m = { ...positionOverride.value }
  for (const n of nodes) {
    const x = Number(n?.position?.x)
    const y = Number(n?.position?.y)
    if (!n?.id || !Number.isFinite(x) || !Number.isFinite(y)) continue
    m[n.id] = { x, y }
  }
  positionOverride.value = m
  saveDefaultLayout(m)
}

function clearDefaultLayout() {
  positionOverride.value = {}
  try {
    localStorage.removeItem(DEFAULT_LAYOUT_STORAGE_KEY)
  } catch {
    // ignore storage failure
  }
}

watch(
  () => props.traceId,
  () => {
    positionOverride.value = loadDefaultLayout()
  }
)

watch(
  () => props.layoutNodes,
  () => {
    // 首次或图骨架变化时，尝试加载已保存的默认布局。
    if (!Object.keys(positionOverride.value).length) {
      positionOverride.value = loadDefaultLayout()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.topo-wrap {
  --topo-ink: #0f2847;
  border-radius: 16px;
  border: 1px solid #c5d4ec;
  background: linear-gradient(165deg, #fbfdff 0%, #f0f5fb 55%, #e8f1fa 100%);
  margin-bottom: 14px;
  /* 贝塞尔边控制点可能高于节点盒，hidden 会裁掉看起来像「断边」 */
  overflow: visible;
}

.topo-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #dce7f8;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.92), rgba(248, 251, 255, 0.65));
}

.topo-head-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.topo-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--topo-ink);
  line-height: 1.25;
}

.topo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.zoom-btns :deep(.el-button) {
  padding: 6px 10px;
}

.zoom-readout {
  min-width: 56px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--topo-ink);
}

.topo-flow-wrap {
  position: relative;
  width: 100%;
  height: min(52vh, 600px);
  min-height: 280px;
  background-color: #f6f9fc;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(15, 40, 71, 0.07) 1px, transparent 0),
    linear-gradient(180deg, rgba(255, 255, 255, 0.55), transparent 36px);
  background-size: 22px 22px, 100% 100%;
}

.topo-flow {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__pane) {
  cursor: grab;
}

:deep(.vue-flow__transformationpane) {
  overflow: visible;
}

:deep(.vue-flow__edge-path) {
  cursor: pointer;
}

:deep(.vue-flow__edge.animated path) {
  stroke-dasharray: 12 8;
}

:deep(.vue-flow__attribution) {
  display: none;
}
</style>
