/** 单步 instruction 在列表中的展示上限 */
const INSTRUCTION_PREVIEW_MAX = 220

/**
 * @param {string} s
 * @param {number} max
 */
function truncate(s, max) {
  const t = String(s || '')
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * 解析 planner 产出的计划 JSON，用于 HITL 预览 / 计划推进 Todo。
 * @param {string} planText
 * @returns {{ mode: 'empty'|'steps'|'pretty'|'raw', thoughtProcess: string, steps: Array<{ step: number, toolToUse: string, instruction: string }>, pretty: string }}
 */
export function parsePlanPreviewModel(planText) {
  const raw = String(planText || '').trim()
  if (!raw) return { mode: 'empty', thoughtProcess: '', steps: [], pretty: '' }
  try {
    const obj = JSON.parse(raw)
    if (obj == null || typeof obj !== 'object') {
      return { mode: 'raw', thoughtProcess: '', steps: [], pretty: raw }
    }
    const ep = obj.execution_plan ?? obj.executionPlan
    if (!Array.isArray(ep) || ep.length === 0) {
      const pretty = JSON.stringify(obj, null, 2)
      return {
        mode: 'pretty',
        thoughtProcess: String(obj.thought_process ?? obj.thoughtProcess ?? '').trim(),
        steps: [],
        pretty
      }
    }
    const steps = ep.map((s, i) => {
      const stepNum = Number(s?.step)
      const step = Number.isFinite(stepNum) && stepNum > 0 ? stepNum : i + 1
      const toolToUse = String(s?.tool_to_use ?? s?.toolToUse ?? '').trim() || '?'
      const instr =
        s?.tool_parameters?.instruction ??
        s?.toolParameters?.instruction ??
        s?.instruction ??
        ''
      return {
        step,
        toolToUse,
        instruction: truncate(String(instr || '').trim(), INSTRUCTION_PREVIEW_MAX)
      }
    })
    return {
      mode: 'steps',
      thoughtProcess: String(obj.thought_process ?? obj.thoughtProcess ?? '').trim(),
      steps,
      pretty: ''
    }
  } catch {
    return { mode: 'raw', thoughtProcess: '', steps: [], pretty: raw }
  }
}

/**
 * 从 trace events 取最近一次 planner 原始 JSON 字符串（STATE_PATCH / TRACE_BAG）。
 * @param {unknown[]} events
 * @returns {string}
 */
export function extractPlannerNodeOutputFromEvents(events) {
  if (!Array.isArray(events)) return ''
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    const pl = ev?.payload && typeof ev.payload === 'object' ? ev.payload : {}
    if (ev?.type === 'STATE_PATCH') {
      const keys = pl.keys && typeof pl.keys === 'object' ? pl.keys : null
      if (keys && keys.planner_node_output != null) {
        const v = keys.planner_node_output
        return typeof v === 'string' ? v : JSON.stringify(v)
      }
    }
    if (ev?.type === 'TRACE_BAG') {
      const facet = String(pl.facet || '')
      const kv = pl.kv && typeof pl.kv === 'object' ? pl.kv : {}
      if (facet === 'human_review' && kv.planPreview != null) {
        const s = String(kv.planPreview).trim()
        if (s) return s
      }
    }
  }
  return ''
}

/**
 * 从 events 中解析最后一次 plan_outline（重规划时以后出现的为准）。
 * @param {unknown[]} events
 * @returns {Array<{ step: number, toolToUse: string }>|null}
 */
export function extractLastPlanOutlineSteps(events) {
  if (!Array.isArray(events)) return null
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type !== 'TRACE_BAG' || String(ev?.payload?.facet || '') !== 'plan_outline') continue
    const kv = ev.payload?.kv && typeof ev.payload.kv === 'object' ? ev.payload.kv : {}
    const steps = kv.steps
    if (!Array.isArray(steps) || !steps.length) continue
    const out = []
    for (const s of steps) {
      const step = Number(s?.index ?? s?.step)
      const tool = String(s?.tool ?? s?.toolToUse ?? '').trim() || '?'
      if (Number.isFinite(step) && step > 0) out.push({ step, toolToUse: tool })
    }
    return out.length ? out.sort((a, b) => a.step - b.step) : null
  }
  return null
}

/**
 * 计划推进 Todo：合并 plan_outline / planner JSON / plan_step 事件。
 * @param {unknown[]} events
 * @returns {{ todos: Array<{ step: number, toolToUse: string, instruction: string, status: 'done'|'running'|'pending' }>, source: string }}
 */
export function buildPlanSpineTodos(events) {
  if (!Array.isArray(events) || !events.length) return { todos: [], source: 'none' }

  let planDone = false
  /** @type {{ currentStep?: number, totalSteps?: number, toolToUse?: string }|null} */
  let lastPlanStep = null
  for (const ev of events) {
    if (ev?.type !== 'TRACE_BAG' || String(ev?.payload?.facet || '') !== 'plan_step') continue
    const kv = ev.payload?.kv && typeof ev.payload.kv === 'object' ? ev.payload.kv : {}
    if (kv.phase === 'plan_done') {
      planDone = true
      continue
    }
    const cs = Number(kv.currentStep)
    const ts = Number(kv.totalSteps)
    lastPlanStep = {
      currentStep: Number.isFinite(cs) ? cs : undefined,
      totalSteps: Number.isFinite(ts) ? ts : undefined,
      toolToUse: String(kv.toolToUse || '')
    }
  }

  let outline = extractLastPlanOutlineSteps(events)
  let source = 'outline'
  /** @type {Array<{ step: number, toolToUse: string, instruction: string }>} */
  let base = []
  if (outline?.length) {
    base = outline.map((o) => ({ step: o.step, toolToUse: o.toolToUse, instruction: '' }))
  } else {
    const raw = extractPlannerNodeOutputFromEvents(events)
    const model = parsePlanPreviewModel(raw)
    if (model.mode === 'steps' && model.steps.length) {
      base = model.steps.map((s) => ({
        step: s.step,
        toolToUse: s.toolToUse,
        instruction: s.instruction || ''
      }))
      source = 'json'
    }
  }

  if (!base.length) {
    /** 仅 plan_step 事件时的退化列表 */
    const stepRows = []
    for (const ev of events) {
      if (ev?.type !== 'TRACE_BAG' || String(ev?.payload?.facet || '') !== 'plan_step') continue
      const kv = ev.payload?.kv && typeof ev.payload.kv === 'object' ? ev.payload.kv : {}
      if (kv.phase === 'plan_done') continue
      const cs = Number(kv.currentStep)
      if (!Number.isFinite(cs) || cs < 1) continue
      const tool = String(kv.toolToUse || '?')
      const instr = String(kv.instructionPreview || '').trim()
      stepRows.push({
        step: cs,
        toolToUse: tool,
        instruction: truncate(instr, INSTRUCTION_PREVIEW_MAX)
      })
    }
    if (!stepRows.length) return { todos: [], source: 'none' }
    const byStep = new Map()
    for (const r of stepRows) byStep.set(r.step, r)
    const maxStep = Math.max(...stepRows.map((r) => r.step), lastPlanStep?.totalSteps || 0)
    const total = maxStep > 0 ? maxStep : stepRows.length
    for (let s = 1; s <= total; s++) {
      const row = byStep.get(s)
      base.push({
        step: s,
        toolToUse: row?.toolToUse || `step_${s}`,
        instruction: row?.instruction || ''
      })
    }
    source = 'plan_step_only'
  }

  const cur = lastPlanStep?.currentStep
  const todos = base.map((row) => {
    let status = 'pending'
    if (planDone) status = 'done'
    else if (Number.isFinite(cur)) {
      if (row.step < cur) status = 'done'
      else if (row.step === cur) status = 'running'
    }
    return { ...row, status }
  })

  return { todos, source }
}

/**
 * Trace 仍为 RUNNING 且事件链末态为「待人审挂起」（human_review_pending 可被 human_review_resumed 覆盖）。
 * @param {unknown} detail getAgentTrace 根文档
 * @returns {boolean}
 */
export function traceAwaitingHumanReviewFromDetail(detail) {
  if (!detail || String(detail.status || '').toUpperCase() !== 'RUNNING') return false
  const evs = detail.events
  if (!Array.isArray(evs) || !evs.length) return false
  let pending = false
  for (const ev of evs) {
    if (ev?.type !== 'TRACE_BAG') continue
    if (String(ev?.payload?.facet || '') !== 'human_review') continue
    const phase = String(ev?.payload?.kv?.phase || '')
    if (phase === 'human_review_pending') pending = true
    else if (phase === 'human_review_resumed') pending = false
  }
  return pending
}
