/**
 * 从 __START__ 做 BFS 最短 hop 分层（跳过自环），避免在含环骨架上做「最长路径松弛」导致层数爆炸、SVG 宽上万像素。
 * @param {{ id: string, label?: string }[]} nodes
 * @param {{ from: string, to: string }[]} edges
 * @returns {{ id: string, label: string, x: number, y: number, layer: number }[]}
 */
export function layoutGraphLr(nodes, edges) {
  const rawNodes = nodes || []
  const idSet = new Set(rawNodes.map((n) => n.id).filter(Boolean))
  if (!idSet.size) return []

  if (!idSet.has('__START__')) {
    idSet.add('__START__')
  }

  const adj = new Map()
  for (const e of edges || []) {
    if (!e || !e.from || !e.to) continue
    if (e.from === e.to) continue
    if (!idSet.has(e.from) || !idSet.has(e.to)) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    adj.get(e.from).push(e.to)
  }

  const depth = new Map()
  const q = []
  if (idSet.has('__START__')) {
    depth.set('__START__', 0)
    q.push('__START__')
  }

  const cap = Math.max(8, idSet.size + 2)
  while (q.length) {
    const u = q.shift()
    const du = depth.get(u) ?? 0
    for (const v of adj.get(u) || []) {
      const next = Math.min(du + 1, cap)
      if (!depth.has(v)) {
        depth.set(v, next)
        q.push(v)
      }
    }
  }

  let maxD = 0
  for (const v of depth.values()) {
    if (v > maxD) maxD = v
  }

  for (const id of idSet) {
    if (!depth.has(id)) {
      depth.set(id, maxD + 1)
    }
  }

  const byLayer = new Map()
  for (const id of idSet) {
    const L = depth.get(id) ?? maxD + 1
    if (!byLayer.has(L)) byLayer.set(L, [])
    byLayer.get(L).push(id)
  }
  for (const ids of byLayer.values()) {
    ids.sort((a, b) => a.localeCompare(b))
  }

  const layerW = 362
  const nodeH = 156
  /** 与拓扑节点盒半宽约对齐（前端 rect 宽≈154），避免最左列圆角矩形画出负 x */
  const GRAPH_ORIGIN_PAD_X = 96
  const GRAPH_ORIGIN_PAD_Y = 26
  const labelById = new Map(rawNodes.map((n) => [n.id, n.label || n.id]))
  if (!labelById.has('__START__')) labelById.set('__START__', '起点')

  // 针对当前 LandAgent 图的关键环路做“水平 + 上下”混合排布，避免 plan/mql/semantic/mongo 重叠在一条直线上。
  const rowHint = new Map([
    ['__START__', 0],
    ['intent_classify', 0],
    ['common_chat', 1],
    ['knowledge_qa_answer', 1],
    ['evidence_recall', 0],
    ['query_enhance', 0],
    ['schema_recall', 0],
    ['mix_selector', 0],
    ['feasibility_assessment', 0],
    ['feasibility_answer', 1],
    ['planner', 1],
    ['plan_executor', 2],
    ['mql_generate', 3],
    ['mql_validate', 2],
    ['semantic_mql', 1],
    ['mongo_execute', 3],
    ['answer_wrap', 1]
  ])

  // END 作为全局汇点，强制放到底部的终点位，避免落在中上层造成“第三列结束”。
  let endId = null
  for (const id of idSet) {
    const compact = String(id).replace(/_/g, '').toLowerCase()
    if (compact === 'end') {
      endId = id
      break
    }
  }

  const out = []
  let maxY = GRAPH_ORIGIN_PAD_Y
  const sortedLayers = [...byLayer.entries()].sort((a, b) => a[0] - b[0])
  for (const [L, ids] of sortedLayers) {
    let freeRow = 0
    ids.forEach((id) => {
      if (id === endId) {
        return
      }
      const hinted = rowHint.has(id) ? rowHint.get(id) : null
      const row = hinted != null ? hinted : freeRow++
      const y = row * nodeH + GRAPH_ORIGIN_PAD_Y
      maxY = Math.max(maxY, y)
      out.push({
        id,
        label: labelById.get(id) || id,
        layer: L,
        x: L * layerW + 28 + GRAPH_ORIGIN_PAD_X,
        y
      })
    })
  }

  if (endId != null) {
    const endLayer = (maxD + 1) * layerW + 28 + GRAPH_ORIGIN_PAD_X
    out.push({
      id: endId,
      label: labelById.get(endId) || endId,
      layer: maxD + 1,
      x: endLayer,
      y: maxY + Math.round(nodeH * 0.95)
    })
  }
  return out
}

/** 与骨架里的终点 id 对齐，便于 GRAPH_EDGE 高亮 */
export function resolveCanonicalEndId(nodes) {
  const list = nodes || []
  const endNode = list.find((n) => n && n.label === '结束')
  if (endNode?.id) return String(endNode.id)
  return 'END'
}

export function normalizeGraphEndpoint(id, canonicalEndId) {
  const s = String(id ?? '').trim()
  if (!s) return s
  const c = canonicalEndId || s
  const compact = s.replace(/_/g, '').toLowerCase()
  if (compact === 'end') return c
  return s
}

/**
 * @param {unknown[]} events
 * @param {string} [canonicalEndId]
 * @returns {{ from: string, to: string, reason?: string }[]}
 */
export function extractGraphEdgesFromTrace(events, canonicalEndId) {
  const list = []
  if (!Array.isArray(events)) return list
  for (const ev of events) {
    if (!ev || ev.type !== 'GRAPH_EDGE') continue
    const p = ev.payload || {}
    let from = p.from != null ? String(p.from) : ''
    let to = p.to != null ? String(p.to) : ''
    if (canonicalEndId) {
      from = normalizeGraphEndpoint(from, canonicalEndId)
      to = normalizeGraphEndpoint(to, canonicalEndId)
    }
    if (from || to) {
      list.push({ from, to, reason: p.reason != null ? String(p.reason) : '' })
    }
  }
  return list
}

export function edgeKey(from, to) {
  return `${from}→${to}`
}

/**
 * 事件是否与某图节点 id 相关（时间轴下钻）。
 * @param {object} ev
 * @param {string} nodeId
 */
export function eventTouchesNode(ev, nodeId) {
  if (!ev || !nodeId) return true
  if (ev.source === nodeId) return true
  const p = ev.payload || {}
  if (p.nodeId === nodeId || p.node === nodeId) return true
  if (ev.type === 'GRAPH_EDGE' && (p.from === nodeId || p.to === nodeId)) return true
  if (ev.type === 'TRACE_BAG' && p.nodeId === nodeId) return true
  return false
}

/**
 * 从 {@code LLM_CALL.payload.label} 解析图节点 id（与 {@code AgentConstants#N_*} 对齐）。
 * 例如 {@code mql_generate:mql_repair} → {@code mql_generate}。
 * @param {string} label
 */
export function nodeIdFromLlmCallLabel(label) {
  const s = String(label ?? '').trim()
  if (!s) return ''
  const i = s.indexOf(':')
  return i > 0 ? s.slice(0, i) : s
}

function defaultNodeMetricsRow() {
  return {
    durationMs: 0,
    llmRequests: 0,
    lastOk: true,
    llmCallCount: 0,
    llmWallMsTotal: 0,
    promptTokensTotal: 0,
    completionTokensTotal: 0,
    promptCharsFromRequest: 0,
    promptCharsFromCall: 0,
    responseCharsTotal: 0,
    /** @type {Record<string, unknown> | null} 末次 rag_recall TRACE_BAG.kv */
    ragRecall: null,
    /** @type {Record<string, unknown> | null} 末次 schema_rough TRACE_BAG.kv */
    schemaRough: null,
    /** @type {Record<string, unknown> | null} 末次 few_shot_recall TRACE_BAG.kv（MQL 生成） */
    fewShotRecall: null
  }
}

/**
 * 从 trace 事件聚合拓扑节点：节点耗时、LLM 次数、Token、Prompt/响应字符、LLM 墙钟耗时、RAG/Schema 摘要袋。
 * @param {unknown[]} events
 * @returns {Record<string, ReturnType<typeof defaultNodeMetricsRow>>}
 */
export function buildNodeMetricsFromEvents(events) {
  /** @type {Record<string, ReturnType<typeof defaultNodeMetricsRow>>} */
  const out = {}
  if (!Array.isArray(events)) return out

  function row(id) {
    if (!id) return null
    if (!out[id]) {
      out[id] = defaultNodeMetricsRow()
    }
    return out[id]
  }

  for (const ev of events) {
    const p = ev?.payload || {}
    if (ev.type === 'NODE_END') {
      const id = p.nodeId || p.node
      const r = row(id)
      if (!r) continue
      const dur = Number(p.durationMs)
      if (Number.isFinite(dur) && dur > 0) {
        r.durationMs += dur
      }
      if (p.ok === false) {
        r.lastOk = false
      }
    } else if (ev.type === 'LLM_REQUEST') {
      const id = ev.source
      const r = row(id)
      if (!r) continue
      r.llmRequests += 1
      const pc = Number(p.promptChars)
      if (Number.isFinite(pc) && pc > 0) {
        r.promptCharsFromRequest += pc
      }
    } else if (ev.type === 'LLM_RESPONSE') {
      const id = ev.source
      const r = row(id)
      if (!r) continue
      const rc = Number(p.rawChars)
      if (Number.isFinite(rc) && rc >= 0) {
        r.responseCharsTotal += rc
      }
    } else if (ev.type === 'LLM_CALL') {
      const nid = nodeIdFromLlmCallLabel(p.label)
      const r = row(nid)
      if (!r) continue
      r.llmCallCount += 1
      const wall = Number(p.durationMs)
      if (Number.isFinite(wall) && wall >= 0) {
        r.llmWallMsTotal += wall
      }
      const pt = Number(p.promptTokens)
      if (Number.isFinite(pt) && pt > 0) {
        r.promptTokensTotal += pt
      }
      const ct = Number(p.completionTokens)
      if (Number.isFinite(ct) && ct > 0) {
        r.completionTokensTotal += ct
      }
      const pch = Number(p.promptChars)
      if (Number.isFinite(pch) && pch >= 0) {
        r.promptCharsFromCall += pch
      }
    } else if (ev.type === 'TRACE_BAG') {
      const nid = String(p.nodeId || ev.source || '').trim()
      if (!nid) continue
      const facet = String(p.facet || '')
      const r = row(nid)
      if (!r) continue
      const kv = p.kv && typeof p.kv === 'object' && !Array.isArray(p.kv) ? { ...p.kv } : {}
      if (facet === 'rag_recall') {
        r.ragRecall = kv
      } else if (facet === 'schema_rough') {
        r.schemaRough = kv
      } else if (facet === 'few_shot_recall') {
        r.fewShotRecall = kv
      }
    }
  }
  return out
}
