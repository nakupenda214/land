import { withSaTokenHeaders } from '@/utils/auth-token'

/** landcheck lc-agent：节点英文名 → 界面展示 */
export const AGENT_NODE_LABELS = {
  IntentClassifyNode: '意图识别',
  KnowledgeQaAnswerNode: '知识库生成',
  SchemaRetrieveNode: 'Schema 检索',
  MqlGenerateNode: '生成查询（MQL）',
  MqlValidateNode: '安全校验',
  MongoExecuteNode: '执行数据查询',
  MQLExecuteNode: '执行数据查询',
  python_generate: 'Python 脚本生成',
  python_execute: 'Python 执行',
  python_analyze: 'Python 结果分析',
  ChartGenerateNode: '生成图表',
  AnswerWrapNode: '组织回答',
  snapshot: '状态检查点'
}

/** 排查图表/SSE complete 用；复制控制台中带此前缀的对象发回即可 */
const CHART_DEBUG_PREFIX = '[LandAgent][chart-debug]'

function dbgChartTrunc(val, max = 280) {
  if (val == null) return null
  const s = typeof val === 'string' ? val : JSON.stringify(val)
  if (s.length <= max) return s
  return `${s.slice(0, max)}…(共${s.length}字符)`
}

function labelForNode(node) {
  if (!node) return '流程'
  return AGENT_NODE_LABELS[node] || node.replace(/Node$/, '')
}

/** 将 NODE 事件格式化为一条可读过程说明（供 UI「执行过程」使用） */
export function formatAgentNodeLine(evt) {
  if (!evt || evt.status === 'complete') return ''
  const detail = evt.payload?.detail != null ? String(evt.payload.detail) : ''
  const label = labelForNode(evt.node)
  return detail ? `${label}：${detail}` : `${label}（${evt.status || '进行中'}）`
}

/**
 * 从 trace 详情 events 中解析最近一次计划 JSON（人工复核挂起 / planner / STATE_PATCH）。
 * @param {unknown[]} events
 * @returns {string}
 */
export function extractPlanPreviewFromTraceEvents(events) {
  if (!Array.isArray(events)) return ''
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    const pl = ev?.payload && typeof ev.payload === 'object' ? ev.payload : {}
    if (ev?.type === 'TRACE_BAG') {
      const facet = String(pl.facet || '')
      const kv = pl.kv && typeof pl.kv === 'object' ? pl.kv : {}
      if (facet === 'human_review') {
        const phase = String(kv.phase || '')
        if ((phase === 'human_review_pending' || phase === '') && kv.planPreview != null) {
          const s = String(kv.planPreview).trim()
          if (s) return s
        }
      }
      if (facet === 'planner_plan') {
        const raw = kv.preview ?? kv.plan ?? kv.body ?? kv.text
        if (raw != null) {
          const s = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw)
          if (s) return s
        }
      }
    }
    if (ev?.type === 'STATE_PATCH') {
      const keys = pl.keys && typeof pl.keys === 'object' ? pl.keys : null
      if (keys && keys.planner_node_output != null) {
        const v = keys.planner_node_output
        const s = typeof v === 'string' ? v.trim() : JSON.stringify(v)
        if (s) return s
      }
    }
  }
  return ''
}

/** 旧版流式协议（kind 字段） */
function normalizeStreamKind(payloadData) {
  if (!payloadData || typeof payloadData !== 'object') return ''
  const raw = payloadData.kind
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw).toLowerCase()
  }
  return ''
}

function isLandAgentEvent(obj) {
  if (!obj || typeof obj !== 'object') return false
  const t = obj.type
  return typeof t === 'string' && ['THINK', 'NODE', 'RESULT', 'ERROR'].includes(t)
}

/**
 * 对接 lc-agent：`POST /agent/chat/stream`（开发环境经 Vite 写为 `/api/agent/chat/stream`）。
 * 事件体为 JSON：`type`, `node`, `status`, `timestamp`, `payload`。
 *
 * @param {object} options
 * @param {{
 *   query?: string,
 *   threadId?: string,
 *   humanReview?: boolean,
 *   nl2sqlOnly?: boolean,
 *   humanFeedbackContent?: string,
 *   rejectedPlan?: boolean,
 *   traceId?: string
 * }} options.payload
 * @param {AbortSignal} [options.signal]
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamChunk] — streamChannel=main 的 chunk（主答复）
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamReasoning] — streamChannel=reasoning 的 chunk（思考流）
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamTrace] — streamChannel=trace 的 chunk
 * @param {(evt: { section: 'code'|'stdout'|'analyze', chunk: string, node?: string }) => void} [options.onStreamPython] — Python 分区流（python_code / python_stdout / python_analyze）
 * @param {(evt: object) => void} [options.onThink] — THINK
 * @param {(evt: object) => void} [options.onNode] — NODE（节点阶段）
 * @param {(evt: object) => void} [options.onError] — ERROR
 * @param {(meta: { threadId?: string, traceId?: string }) => void} [options.onTraceMeta] — 响应头就绪（首包前即可拿到 thread/trace）
 * @param {(info: { threadId?: string, ok?: boolean, awaitingHumanReview?: boolean, planPreview?: string }) => void} [options.onComplete] — NODE complete
 * @param 其余 onLlm/onFinal/onEvent 等兼容旧调用方
 */
export const chatAgentStream = async ({
  payload,
  signal,
  onStreamChunk,
  onStreamReasoning,
  onStreamTrace,
  onStreamPython,
  onThink,
  onNode,
  onComplete,
  onTraceMeta,
  onFinal,
  onToolCall,
  onToolResult,
  onEvent,
  onIngress,
  onLlm,
  onError
}) => {
  const body = {
    query: payload?.query ?? payload?.message ?? '',
    threadId: payload?.threadId ?? payload?.sessionId ?? undefined
  }
  const isHitlResume = !!(payload?.humanFeedbackContent && String(payload.humanFeedbackContent).trim())
  if (!isHitlResume && !String(body.query).trim()) {
    throw new Error('query 不能为空')
  }

  const jsonBody = {
    query: body.query,
    ...(body.threadId ? { threadId: body.threadId } : {}),
    ...(payload?.humanReview === true ? { humanReview: true } : {}),
    ...(payload?.nl2sqlOnly === true ? { nl2sqlOnly: true } : {}),
    ...(isHitlResume
      ? {
        humanFeedbackContent: String(payload.humanFeedbackContent).trim(),
        rejectedPlan: !!payload.rejectedPlan,
        ...(payload?.traceId ? { traceId: String(payload.traceId).trim() } : {})
      }
      : {})
  }

  const response = await fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: withSaTokenHeaders({
      'Content-Type': 'application/json',
      // 兼容 4xx 时 Spring 返回 JSON；纯 event-stream 会导致 HttpMediaTypeNotAcceptable
      Accept: 'text/event-stream, application/json;q=0.9',
      ...(body.threadId ? { 'X-Thread-Id': String(body.threadId) } : {}),
      ...(payload?.traceId ? { 'X-Agent-Trace-Id': String(payload.traceId).trim() } : {})
    }),
    body: JSON.stringify(jsonBody),
    signal,
    credentials: 'include'
  })

  if (!response.ok || !response.body) {
    throw new Error(`智能助手请求失败: ${response.status}`)
  }

  const threadIdFromHeader = response.headers.get('X-Thread-Id')
  const traceIdFromHeader = response.headers.get('X-Agent-Trace-Id')
  onTraceMeta?.({
    threadId: threadIdFromHeader || undefined,
    traceId: traceIdFromHeader || undefined
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const releaseReader = async () => {
    try {
      await reader.cancel(signal?.aborted ? 'client abort' : 'done')
    } catch {
      /* ignore */
    }
  }

  const dispatchLand = (data) => {
    onEvent?.(data)
    const { type, status, payload: pl } = data

    switch (type) {
      case 'THINK': {
        onThink?.(data)
        break
      }
      case 'NODE': {
        onNode?.(data)
        if (status === 'complete' && pl && pl.ok === true) {
          // eslint-disable-next-line no-console
          console.info(CHART_DEBUG_PREFIX, 'SSE NODE complete 原始 payload 键', {
            keys: pl && typeof pl === 'object' ? Object.keys(pl) : [],
            awaitingHumanReview: !!(pl && pl.awaitingHumanReview),
            node: data?.node,
            status: data?.status
          })
          // eslint-disable-next-line no-console
          console.info(CHART_DEBUG_PREFIX, '图表相关字段摘要', {
            chartViewSpecLen: pl.chartViewSpec != null ? String(pl.chartViewSpec).length : 0,
            chartViewSpecHead: dbgChartTrunc(pl.chartViewSpec),
            chartDataPreviewLen: pl.chartDataPreview != null ? String(pl.chartDataPreview).length : 0,
            chartDataPreviewHead: dbgChartTrunc(pl.chartDataPreview),
            rasterChartMime: pl.rasterChartMime != null ? String(pl.rasterChartMime) : null,
            rasterChartBase64Len:
              pl.rasterChartBase64 != null ? String(pl.rasterChartBase64).length : 0
          })
          const pp = pl.planPreview != null && String(pl.planPreview).trim() !== '' ? String(pl.planPreview) : undefined
          const cvs =
            pl.chartViewSpec != null && String(pl.chartViewSpec).trim() !== ''
              ? String(pl.chartViewSpec).trim()
              : undefined
          const cdp =
            pl.chartDataPreview != null && String(pl.chartDataPreview).trim() !== ''
              ? String(pl.chartDataPreview).trim()
              : undefined
          const rb64 =
            pl.rasterChartBase64 != null && String(pl.rasterChartBase64).trim() !== ''
              ? String(pl.rasterChartBase64).trim()
              : undefined
          const rmime =
            pl.rasterChartMime != null && String(pl.rasterChartMime).trim() !== ''
              ? String(pl.rasterChartMime).trim()
              : undefined
          onComplete?.({
            threadId: threadIdFromHeader || undefined,
            ok: true,
            awaitingHumanReview: !!pl.awaitingHumanReview,
            ...(pp !== undefined ? { planPreview: pp } : {}),
            ...(cvs !== undefined ? { chartViewSpec: cvs } : {}),
            ...(cdp !== undefined ? { chartDataPreview: cdp } : {}),
            ...(rb64 !== undefined ? { rasterChartBase64: rb64 } : {}),
            ...(rmime !== undefined ? { rasterChartMime: rmime } : {})
          })
          onFinal?.({
            threadId: threadIdFromHeader,
            text: '',
            payload: {
              ok: true,
              awaitingHumanReview: !!pl.awaitingHumanReview,
              ...(pp !== undefined ? { planPreview: pp } : {}),
              ...(cvs !== undefined ? { chartViewSpec: cvs } : {}),
              ...(cdp !== undefined ? { chartDataPreview: cdp } : {}),
              ...(rb64 !== undefined ? { rasterChartBase64: rb64 } : {}),
              ...(rmime !== undefined ? { rasterChartMime: rmime } : {})
            }
          })
        }
        // 非 complete 的 NODE 仅交给 onNode，避免与 onLlm 重复刷「执行过程」
        break
      }
      case 'RESULT': {
        if (status === 'stream' && pl?.chunk != null) {
          const chunk = String(pl.chunk)
          const ch = pl.streamChannel
          const isReasoning = ch === 'reasoning'
          const isMain =
            ch === 'main' ||
            (ch == null && data.node === 'AnswerWrapNode')
          const pythonSection =
            ch === 'python_code' ? 'code' : ch === 'python_stdout' ? 'stdout' : ch === 'python_analyze' ? 'analyze' : null
          if (pythonSection) {
            onStreamPython?.({ section: pythonSection, chunk, node: data.node })
            onLlm?.({
              text: chunk,
              payload: { phase: 'stream', streamChannel: `python_${pythonSection}`, node: data.node }
            })
          } else if (isReasoning) {
            onStreamReasoning?.(chunk, { node: data.node })
            onLlm?.({ text: chunk, payload: { phase: 'stream', streamChannel: 'reasoning', node: data.node } })
          } else if (isMain) {
            onStreamChunk?.(chunk, { node: data.node })
            onLlm?.({ text: chunk, payload: { phase: 'stream', streamChannel: 'main' } })
          } else if (
            ch === 'trace' ||
            (ch == null && data.node && data.node !== 'AnswerWrapNode')
          ) {
            onStreamTrace?.(chunk, { node: data.node })
            onLlm?.({ text: chunk, payload: { phase: 'stream', streamChannel: 'trace', node: data.node } })
          }
        }
        break
      }
      case 'ERROR': {
        const msg = pl?.message != null ? String(pl.message) : '发生错误'
        onError?.({ ...data, text: msg, message: msg })
        break
      }
      default:
        break
    }
  }

  const consumeEvent = (rawEvent) => {
    if (!rawEvent) return
    const lines = rawEvent.split(/\r?\n/)
    const dataText = lines
      .filter((line) => line.trimStart().startsWith('data:'))
      .map((line) => line.trimStart().slice(5).trim())
      .join('\n')
    if (!dataText) return
    try {
      const payloadData = JSON.parse(dataText)

      if (isLandAgentEvent(payloadData)) {
        dispatchLand(payloadData)
        return
      }

      const kind = normalizeStreamKind(payloadData)
      onEvent?.(payloadData)
      switch (kind) {
        case 'ingress':
          onIngress?.(payloadData)
          break
        case 'llm':
          onLlm?.(payloadData)
          break
        case 'tool_call':
          onToolCall?.(payloadData)
          break
        case 'tool_result':
          onToolResult?.(payloadData)
          break
        case 'final_answer':
          onFinal?.(payloadData)
          break
        case 'error':
          onError?.(payloadData)
          break
        default:
          break
      }
    } catch {
      // 忽略损坏分片
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ''
      events.forEach(consumeEvent)
    }

    if (buffer.trim()) {
      consumeEvent(buffer.trim())
    }
  } finally {
    if (signal?.aborted) {
      await releaseReader()
    }
  }

  return {
    threadId: threadIdFromHeader || body.threadId || null,
    traceId: traceIdFromHeader || null
  }
}
