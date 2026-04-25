/** 时间轴内联 JSON：长文本字段改为占位，避免撑爆版面 */
export function payloadForTimelineCompact(ev) {
  const raw = ev?.payload
  if (raw == null || typeof raw !== 'object') return raw
  if (ev.type === 'LLM_REQUEST') {
    return sanitizePayload({
      template: raw.template,
      varKeys: raw.varKeys,
      promptChars: raw.promptChars
    })
  }
  if (ev.type === 'LLM_RESPONSE') {
    const tu = raw.tokenUsage && typeof raw.tokenUsage === 'object' ? raw.tokenUsage : null
    return sanitizePayload({
      rawChars: raw.rawChars,
      extra: raw.extra,
      promptTokens: tu ? Number(tu.promptTokens || 0) : undefined,
      completionTokens: tu ? Number(tu.completionTokens || 0) : undefined
    })
  }
  return sanitizePayload(raw)
}

/**
 * 时间轴展示层统一剔除 preview / note 类字段，避免“预览语义”污染诊断视图。
 */
function sanitizePayload(value) {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizePayload(v))
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const key = String(k || '')
      const lower = key.toLowerCase()
      if (lower.includes('preview') || lower === 'note') continue
      const sanitized = sanitizePayload(v)
      if (sanitized !== undefined) out[key] = sanitized
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

export function prettyJson(obj) {
  if (obj == null) return ''
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

export function edgeHintLines(ev) {
  const h = ev?.payload?.hints
  if (!h || typeof h !== 'object') return []
  const lines = []
  const names = h.collectionNames
  if (Array.isArray(names) && names.length) {
    lines.push(`粗召集合: ${names.join(', ')}`)
  }
  if (h.roughCollectionCount != null) lines.push(`粗召数量: ${h.roughCollectionCount}`)
  return lines
}

export function traceBagKvEntries(ev) {
  const kv = ev?.payload?.kv
  if (!kv || typeof kv !== 'object') return []
  const entries = Object.entries(kv).filter(([k]) => k && k !== '__proto__')
  const facet = ev?.payload?.facet
  if (facet === 'rag_recall') {
    const first = [
      'outcome',
      'vectorDurationMs',
      'retrievedCount',
      'hits',
      'businessTermCount',
      'agentKnowledgeCount',
      'topK',
      'threshold',
      'emptyHit'
    ]
    const rank = new Map(first.map((k, i) => [k, i]))
    entries.sort((a, b) => (rank.get(a[0]) ?? 999) - (rank.get(b[0]) ?? 999))
  }
  return entries
}

export function formatTraceBagValue(v) {
  if (v == null) return ''
  if (Array.isArray(v)) {
    if (
      v.length > 0 &&
      typeof v[0] === 'object' &&
      v[0] !== null &&
      !Array.isArray(v[0])
    ) {
      try {
        return JSON.stringify(v, null, 2)
      } catch {
        return String(v)
      }
    }
    return v.join(', ')
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  const s = String(v)
  return s.length > 4000 ? `${s.slice(0, 4000)}…` : s
}

export function dotClassForEventType(type) {
  switch (type) {
    case 'GRAPH_EDGE':
      return 'dot-edge'
    case 'NODE_START':
    case 'NODE_END':
      return 'dot-node'
    case 'STATE_PATCH':
      return 'dot-state'
    case 'LLM_CALL':
    case 'LLM_REQUEST':
    case 'LLM_RESPONSE':
      return 'dot-llm'
    case 'TOOL_CALL':
      return 'dot-tool'
    case 'TRACE_BAG':
      return 'dot-bag'
    default:
      return 'dot-default'
  }
}
