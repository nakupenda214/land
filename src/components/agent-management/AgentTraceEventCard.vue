<template>
  <article
    class="tec"
    :class="['tec--' + variant, { 'tec--edge-picked': edgePicked }]"
    :data-edge-key="edgeKey || ''"
  >
    <aside class="tec-pillar" aria-label="事件类型与来源">
      <span class="tec-dot" :class="dotClassForEventType(ev?.type)" />
      <div class="tec-pillar-text">
        <span class="tec-type">{{ ev?.type || 'UNKNOWN' }}</span>
        <span class="tec-src mono-clip">{{ ev?.source || '—' }}</span>
        <time class="tec-time">{{ formatTime(ev?.ts) }}</time>
      </div>
    </aside>
    <div class="tec-core">
      <ul v-if="ev?.type === 'GRAPH_EDGE' && edgeHintLines(ev).length" class="hint-lines">
        <li v-for="(ln, hi) in edgeHintLines(ev)" :key="hi">{{ ln }}</li>
      </ul>
      <div v-if="ev?.type === 'LLM_REQUEST'" class="llm-inline-actions">
        <span class="llm-meta-chip mono-clip">{{ ev.payload?.template || '—' }}</span>
        <span class="llm-meta-chip">{{ ev.payload?.promptChars ?? 0 }} 字符</span>
        <el-button size="small" type="primary" plain @click="$emit('openPrompt', ev)">查看提示词全文</el-button>
      </div>
      <div v-if="ev?.type === 'LLM_RESPONSE'" class="llm-inline-actions">
        <span class="llm-meta-chip">响应 {{ ev.payload?.rawChars ?? 0 }} 字符</span>
        <el-button
          v-if="hasLlmResponseBody(ev)"
          size="small"
          type="primary"
          plain
          @click="$emit('openResponse', ev)"
        >
          查看响应全文
        </el-button>
      </div>
      <div v-if="ev?.type === 'TRACE_BAG'" class="trace-bag-bar">
        <span class="tbf">{{ ev?.payload?.facet || 'unknown_facet' }}</span>
        <span class="tbn">{{ traceBagLaneLabel(ev) }}</span>
        <span v-if="traceBagErrorCodeLabel(ev)" class="tbn">{{ traceBagErrorCodeLabel(ev) }}</span>
      </div>
      <div v-if="isVerificationReplayBag(ev)" class="verification-replay">
        <div class="verification-replay-head">
          <span class="verification-replay-badge">验证重跑</span>
          <span class="verification-replay-stage">{{ verificationStageLabel(verificationReplayKv(ev)?.stage) }}</span>
          <span class="verification-replay-progress">
            {{ verificationReplayKv(ev)?.index ?? '?' }} / {{ verificationReplayKv(ev)?.total ?? '?' }}
          </span>
          <el-tag :type="verificationReplayKv(ev)?.ok ? 'success' : 'danger'" size="small" effect="plain">
            {{ verificationReplayKv(ev)?.ok ? '通过' : '失败' }}
          </el-tag>
          <span class="verification-replay-ms">{{ verificationReplayMs(ev) }}</span>
        </div>
        <p v-if="verificationReplayKv(ev)?.queryPreview" class="verification-replay-query">
          {{ verificationReplayKv(ev)?.queryPreview }}
        </p>
        <div v-if="verificationReplayKv(ev)?.childTraceId" class="verification-replay-actions">
          <el-button size="small" type="primary" plain @click="emitOpenChildTrace(verificationReplayKv(ev).childTraceId)">
            打开子 Trace
          </el-button>
          <span class="verification-replay-traceid mono-clip">{{ verificationReplayKv(ev).childTraceId }}</span>
        </div>
      </div>
      <div v-if="showMongoResultButton(ev)" class="llm-inline-actions">
        <span class="llm-meta-chip">rowCount {{ ev?.payload?.detail?.rowCount ?? 0 }}</span>
        <el-button size="small" type="primary" plain @click="$emit('openQueryResult', ev)">查看查询结果</el-button>
      </div>
      <div v-if="showPythonExecuteSummary(ev)" class="python-tool-call">
        <div class="llm-inline-actions">
          <span class="llm-meta-chip" :data-py-ok="pythonExecuteOk(ev) ? '1' : '0'">
            {{ pythonExecuteOk(ev) ? '执行成功' : '执行失败' }}
          </span>
          <span v-if="pythonExecuteExit(ev) != null && pythonExecuteExit(ev) !== ''" class="llm-meta-chip">
            exit {{ pythonExecuteExit(ev) }}
          </span>
          <span class="llm-meta-chip">stdin {{ Number(pythonExecuteDetail(ev)?.stdinChars ?? 0) }} chars</span>
        </div>
        <el-collapse v-if="pythonHasIoPanels(ev)" v-model="pythonIoOpen" class="python-io-collapse">
          <el-collapse-item
            v-if="pythonExecuteCode(ev)"
            title="代码摘要（审计）"
            name="py-code"
          >
            <pre class="python-io-pre">{{ pythonExecuteCode(ev) }}</pre>
          </el-collapse-item>
          <el-collapse-item
            v-if="pythonExecuteStdout(ev)"
            title="stdout 摘要"
            name="py-out"
          >
            <pre class="python-io-pre">{{ pythonExecuteStdout(ev) }}</pre>
          </el-collapse-item>
          <el-collapse-item
            v-if="pythonExecuteStderr(ev)"
            title="stderr 摘要"
            name="py-err"
          >
            <pre class="python-io-pre">{{ pythonExecuteStderr(ev) }}</pre>
          </el-collapse-item>
          <el-collapse-item
            v-if="pythonExecuteException(ev)"
            title="异常信息"
            name="py-ex"
          >
            <pre class="python-io-pre">{{ pythonExecuteException(ev) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
      <pre
        class="ev-json"
        :class="{ 'ev-json--tight': ev?.type === 'LLM_REQUEST' || ev?.type === 'LLM_RESPONSE' }"
        >{{ prettyJson(payloadForTimelineCompact(ev)) }}</pre
      >
    </div>
  </article>
</template>

<script setup>
import { ref } from 'vue'
import {
  dotClassForEventType,
  edgeHintLines,
  payloadForTimelineCompact,
  prettyJson
} from './agent-trace-event-present.js'

defineProps({
  ev: { type: Object, required: true },
  /** standalone：时间轴单行；nested：节点聚合内子行 */
  variant: { type: String, default: 'standalone' },
  formatTime: { type: Function, required: true },
  edgePicked: { type: Boolean, default: false },
  edgeKey: { type: String, default: '' }
})

const emit = defineEmits(['openPrompt', 'openResponse', 'openQueryResult', 'openTrace'])

/** 同一卡片内折叠面板展开项（与 mongo_execute 行内操作区风格对齐） */
const pythonIoOpen = ref(['py-out', 'py-err'])

function pythonExecuteDetail(ev) {
  if (ev?.type !== 'TOOL_CALL') return null
  const d = ev?.payload?.detail
  if (!d || typeof d !== 'object') return null
  return d
}

function showPythonExecuteSummary(ev) {
  return ev?.type === 'TOOL_CALL' && String(ev?.payload?.tool || '') === 'python_execute'
}

function pythonHasIoPanels(ev) {
  return !!(
    pythonExecuteCode(ev) ||
    pythonExecuteStdout(ev) ||
    pythonExecuteStderr(ev) ||
    pythonExecuteException(ev)
  )
}

function pythonExecuteOk(ev) {
  const d = pythonExecuteDetail(ev)
  return d?.ok === true || d?.ok === 'true'
}

function pythonExecuteExit(ev) {
  const d = pythonExecuteDetail(ev)
  if (d == null || d.exitCode === undefined || d.exitCode === null) return ''
  return d.exitCode
}

function pythonExecuteCode(ev) {
  return String(pythonExecuteDetail(ev)?.codePreview || '').trim()
}

function pythonExecuteStdout(ev) {
  return String(pythonExecuteDetail(ev)?.stdoutPreview || '').trim()
}

function pythonExecuteStderr(ev) {
  return String(pythonExecuteDetail(ev)?.stderrPreview || '').trim()
}

function pythonExecuteException(ev) {
  return String(pythonExecuteDetail(ev)?.exceptionMsg || '').trim()
}

function hasLlmResponseBody(ev) {
  const p = ev?.payload
  if (!p || typeof p !== 'object') return false
  const full = p.responseFull != null ? String(p.responseFull) : ''
  if (full.length > 0) return true
  const legacy = p.responsePreview != null ? String(p.responsePreview) : ''
  return legacy.length > 0
}

function showMongoResultButton(ev) {
  if (ev?.type !== 'TOOL_CALL') return false
  if (String(ev?.payload?.tool || '') !== 'mongo_execute') return false
  const id = ev?.payload?.detail?.queryResultId
  return id != null && String(id).trim().length > 0
}

function traceBagLaneLabel(ev) {
  const facet = String(ev?.payload?.facet || '')
  if (facet === 'node_governance') return '治理分区（历史）'
  if (facet === 'trace_annotation') return '标注分区'
  if (facet === 'llm_reasoning') return '思考分区'
  return '业务分区'
}

function traceBagErrorCodeLabel(ev) {
  const facet = String(ev?.payload?.facet || '')
  if (facet !== 'node_governance' && facet !== 'trace_annotation') return ''
  const code = String(ev?.payload?.kv?.errorCode || '').trim().toUpperCase()
  if (!code) return ''
  if (code.includes('TIMEOUT')) return `超时：${code}`
  if (code.includes('RETRY')) return `重试：${code}`
  if (code.includes('ERROR')) return `异常：${code}`
  return code
}

function verificationReplayKv(ev) {
  if (ev?.type !== 'TRACE_BAG') return null
  const kv = ev?.payload?.kv
  if (!kv || typeof kv !== 'object') return null
  if (String(kv.phase || '') !== 'VERIFICATION_REPLAY') return null
  return kv
}

function isVerificationReplayBag(ev) {
  return verificationReplayKv(ev) != null
}

function verificationStageLabel(stage) {
  const s = String(stage || '')
  if (s.includes('STAGE_1')) return '阶段1·当前 Bad'
  if (s.includes('STAGE_2')) return '阶段2·同类历史'
  if (s.includes('STAGE_3')) return '阶段3·基准'
  return s || '—'
}

function verificationReplayMs(ev) {
  const kv = verificationReplayKv(ev)
  const ms = Number(kv?.elapsedMs)
  if (!Number.isFinite(ms) || ms < 0) return ''
  return `${ms} ms`
}

function emitOpenChildTrace(id) {
  const tid = String(id || '').trim()
  if (!tid) return
  emit('openTrace', tid)
}
</script>

<style scoped>
.tec {
  --tec-ink: #0c1f3a;
  --tec-mist: #e8eef7;
  --tec-line: #c5d4ec;
  display: grid;
  grid-template-columns: minmax(132px, 17%) minmax(0, 1fr);
  gap: 0 14px;
  align-items: stretch;
  border-radius: 12px;
  padding: 0;
  background: #fffefb;
  border: 1px solid var(--tec-line);
  box-shadow: 0 4px 14px rgba(15, 40, 71, 0.06);
  overflow: hidden;
}

.tec--nested {
  border-radius: 10px;
  box-shadow: none;
  background: linear-gradient(105deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%);
  border-color: #d7e4f6;
}

.tec--edge-picked {
  border-color: #059669;
  box-shadow:
    0 0 0 2px rgba(5, 150, 105, 0.2),
    0 8px 20px rgba(5, 150, 105, 0.12);
}

.tec-pillar {
  display: flex;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  border-right: 1px solid rgba(197, 212, 236, 0.85);
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.9), rgba(241, 246, 252, 0.65));
}

.tec-pillar-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.tec-dot {
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  margin-top: 3px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.55);
}

.tec-type {
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: #1d4ed8;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.tec-src {
  font-size: 10.5px;
  color: #5c6f8d;
}

.tec-time {
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 10px;
  color: #64748b;
}

.tec-core {
  min-width: 0;
  padding: 10px 12px 10px 4px;
}

.dot-edge {
  background: conic-gradient(from 180deg, #38bdf8, #6366f1);
}
.dot-node {
  background: linear-gradient(135deg, #fbbf24, #f97316);
}
.dot-state {
  background: linear-gradient(135deg, #a78bfa, #ec4899);
}
.dot-llm {
  background: linear-gradient(135deg, #34d399, #14b8a6);
}
.dot-tool {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}
.dot-default {
  background: #94a3b8;
}
.dot-bag {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
}

.hint-lines {
  margin: 0 0 8px;
  padding-left: 16px;
  font-size: 11.5px;
  line-height: 1.45;
  color: #334155;
}

.trace-bag-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tbf {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
  padding: 2px 7px;
  border-radius: 6px;
  background: #ccfbf1;
}

.tbn {
  font-size: 10px;
  color: #64748b;
}

.kv-dl {
  display: grid;
  grid-template-columns: minmax(88px, 120px) 1fr;
  gap: 3px 8px;
  margin: 0 0 8px;
  font-size: 11px;
}

.kv-dl dt {
  margin: 0;
  color: #64748b;
  font-weight: 700;
}

.kv-dl dd {
  margin: 0;
  color: #1e293b;
  word-break: break-word;
}

.llm-inline-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.llm-meta-chip {
  font-size: 10.5px;
  font-weight: 600;
  color: #475569;
  padding: 3px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  max-width: min(340px, 42vw);
}

.ev-json {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 10.5px;
  line-height: 1.42;
  color: #1e293b;
  background: #f4f7fb;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 280px;
  overflow: auto;
}

.ev-json--tight {
  max-height: 120px;
}

.mono-clip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verification-replay {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #c7d2fe;
  background: linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(250, 245, 255, 0.9));
}

.verification-replay-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.verification-replay-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e0e7ff;
}

.verification-replay-stage {
  font-size: 11.5px;
  font-weight: 700;
  color: #312e81;
}

.verification-replay-progress {
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  color: #475569;
}

.verification-replay-ms {
  font-size: 10px;
  color: #64748b;
}

.verification-replay-query {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.verification-replay-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.verification-replay-traceid {
  font-size: 10px;
  color: #64748b;
  max-width: min(420px, 55vw);
}

.python-tool-call {
  margin: 0 0 10px;
}

.python-io-collapse {
  margin-top: 6px;
  border: none;
}

.python-io-collapse :deep(.el-collapse-item__header) {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: transparent;
}

.python-io-pre {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 10.5px;
  line-height: 1.42;
  color: #1e293b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow: auto;
}

.llm-meta-chip[data-py-ok='0'] {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
</style>
