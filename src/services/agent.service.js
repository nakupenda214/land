import axios from 'axios'
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
  ChartGenerateNode: '生成图表',
  AnswerWrapNode: '组织回答',
  snapshot: '状态检查点'
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
 * @param {{ query: string, threadId?: string }} options.payload
 * @param {AbortSignal} [options.signal]
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamChunk] — streamChannel=main 的 chunk（主答复）
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamReasoning] — streamChannel=reasoning 的 chunk（思考流）
 * @param {(chunk: string, meta: { node?: string }) => void} [options.onStreamTrace] — streamChannel=trace 的 chunk
 * @param {(evt: object) => void} [options.onThink] — THINK
 * @param {(evt: object) => void} [options.onNode] — NODE（节点阶段）
 * @param {(evt: object) => void} [options.onError] — ERROR
 * @param {(meta: { threadId?: string, traceId?: string }) => void} [options.onTraceMeta] — 响应头就绪（首包前即可拿到 thread/trace）
 * @param {(info: { threadId?: string, ok?: boolean }) => void} [options.onComplete] — NODE complete
 * @param 其余 onLlm/onFinal/onEvent 等兼容旧调用方
 */
export const chatAgentStream = async ({
  payload,
  signal,
  onStreamChunk,
  onStreamReasoning,
  onStreamTrace,
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
  if (!String(body.query).trim()) {
    throw new Error('query 不能为空')
  }

  const response = await fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: withSaTokenHeaders({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    }),
    body: JSON.stringify({
      query: body.query,
      ...(body.threadId ? { threadId: body.threadId } : {})
    }),
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
    const { type, node, status, payload: pl } = data

    switch (type) {
      case 'THINK': {
        onThink?.(data)
        break
      }
      case 'NODE': {
        onNode?.(data)
        if (status === 'complete' && pl && pl.ok === true) {
          onComplete?.({ threadId: threadIdFromHeader || undefined, ok: true })
          onFinal?.({
            threadId: threadIdFromHeader,
            text: '',
            payload: { ok: true }
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
          const isTrace = ch === 'trace' || (ch == null && data.node && data.node !== 'AnswerWrapNode')
          if (isReasoning) {
            onStreamReasoning?.(chunk, { node: data.node })
            onLlm?.({ text: chunk, payload: { phase: 'stream', streamChannel: 'reasoning', node: data.node } })
          } else if (isMain) {
            onStreamChunk?.(chunk, { node: data.node })
            onLlm?.({ text: chunk, payload: { phase: 'stream', streamChannel: 'main' } })
          } else if (isTrace) {
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

/**
 * 同步兜底（若后端未提供非流式接口会失败；保留以兼容旧代码）。
 */
export const chatAgent = (payload) =>
  axios.post('/api/agent/chat', {
    query: payload?.message ?? payload?.query,
    threadId: payload?.sessionId ?? payload?.threadId
  })
