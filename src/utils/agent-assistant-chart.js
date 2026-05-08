/**
 * 智能助手抽屉内：根据后端 chart_view_spec + 预览行渲染 ECharts（动态 import，按需加载）。
 */

const RASTER_MIME_RE = /^image\/(png|jpeg|jpg|webp)$/i

/**
 * @param {string} mime
 * @param {string} base64
 * @returns {string | null} data URL 或校验失败时 null
 */
export function buildRasterChartDataUrl(mime, base64) {
  const m = String(mime || '').trim().toLowerCase()
  if (!RASTER_MIME_RE.test(m) || base64 == null || !String(base64).trim()) return null
  const norm = m === 'image/jpg' ? 'image/jpeg' : m
  return `data:${norm};base64,${String(base64).trim()}`
}

function toNum(v) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickKeys(spec, firstRow) {
  const xList = Array.isArray(spec?.x) ? spec.x : []
  const yList = Array.isArray(spec?.y) ? spec.y : []
  let xKey = xList[0]
  let yKey = yList[0]
  const keys = firstRow && typeof firstRow === 'object' ? Object.keys(firstRow) : []
  if (!xKey && keys.length) xKey = keys[0]
  if (!yKey && keys.length > 1) yKey = keys[1]
  else if (!yKey && keys.length === 1) yKey = keys[0]
  return { xKey, yKey }
}

/**
 * 后端 ChartViewSpec 默认 type=table；LLM 也可能输出 table 或漏写 type。
 * 在已有预览行且能推断 x/y 时，将 table/空 改为 line 或 bar，避免前端直接跳过渲染。
 */
function inferCategorySeriesChartType(rows, xKey) {
  const vals = rows.slice(0, 24).map((r) => r?.[xKey])
  if (!vals.length) return 'bar'
  const allNumericX = vals.every((v) => v != null && v !== '' && Number.isFinite(Number(v)))
  if (allNumericX) return 'line'
  const yearish = vals.every((v) => {
    if (v == null || v === '') return false
    const s = String(v).trim()
    return /^(19|20)\d{2}$/.test(s)
  })
  if (yearish) return 'line'
  return 'bar'
}

/**
 * @param {object | null | undefined} spec
 * @param {unknown[]} rows
 * @returns {object | null}
 */
export function coerceChartSpecForRender(spec, rows) {
  if (!spec || typeof spec !== 'object') return null
  const rowArr = Array.isArray(rows) ? rows : []
  const t0 = String(spec.type ?? '').trim().toLowerCase()
  if (t0 && t0 !== 'table') return spec
  const first = rowArr.length && typeof rowArr[0] === 'object' ? rowArr[0] : null
  if (!first) return spec
  const { xKey, yKey } = pickKeys(spec, first)
  if (!xKey || !yKey || xKey === yKey) return spec
  const inferred = inferCategorySeriesChartType(rowArr, xKey)
  return { ...spec, type: inferred }
}

/** ECharts 6 对 option 校验更严：勿写入 undefined；series 勿混入非法子类型字段（如 bar 上带 smooth） */
function withOptionalTitle(out, titleText) {
  const t = titleText != null ? String(titleText).trim() : ''
  if (t) {
    out.title = { text: t, left: 'center', top: 4, textStyle: { fontSize: 13 } }
  }
  return out
}

function buildOption(spec, rows, type) {
  const titleText = spec?.title != null ? String(spec.title) : ''
  const first = rows[0]
  const { xKey, yKey } = pickKeys(spec, first)
  if (!xKey || !yKey) {
    return withOptionalTitle(
      {
        graphic: {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: { text: '无法从预览数据推断坐标字段', fill: '#64748b', fontSize: 13 }
        }
      },
      titleText
    )
  }

  let work = rows
  if (type === 'ranking') {
    work = [...rows].sort((a, b) => toNum(b?.[yKey]) - toNum(a?.[yKey])).slice(0, 20)
  }

  if (type === 'pie') {
    const data = work.map((r) => ({
      name: String(r?.[xKey] ?? ''),
      value: toNum(r?.[yKey])
    }))
    return withOptionalTitle(
      {
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['32%', '62%'], data, emphasis: { itemStyle: { shadowBlur: 8 } } }]
      },
      titleText
    )
  }

  if (type === 'scatter') {
    const data = work.map((r) => [toNum(r?.[xKey]), toNum(r?.[yKey])])
    const hasTitle = !!(titleText && String(titleText).trim())
    return withOptionalTitle(
      {
        tooltip: { trigger: 'item' },
        grid: { left: 48, right: 16, bottom: 48, top: hasTitle ? 40 : 28 },
        xAxis: { type: 'value', name: xKey },
        yAxis: { type: 'value', name: yKey },
        series: [{ type: 'scatter', data, symbolSize: 8 }]
      },
      titleText
    )
  }

  const categories = work.map((r) => String(r?.[xKey] ?? ''))
  const values = work.map((r) => toNum(r?.[yKey]))
  const seriesType = type === 'line' ? 'line' : 'bar'
  const series =
    seriesType === 'line'
      ? [{ type: 'line', data: values, smooth: true }]
      : [{ type: 'bar', data: values, barMaxWidth: 42 }]
  const hasTitle = !!(titleText && String(titleText).trim())
  return withOptionalTitle(
    {
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, bottom: categories.length > 8 ? 64 : 40, top: hasTitle ? 40 : 28 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { rotate: categories.length > 8 ? 30 : 0, interval: 0 }
      },
      yAxis: { type: 'value', name: yKey },
      series
    },
    titleText
  )
}

export function disposeAgentAssistantChart(msg) {
  if (!msg) return
  if (msg.chartDispose) {
    try {
      msg.chartDispose()
    } catch {
      /* ignore */
    }
    msg.chartDispose = null
  }
  msg.rasterChartDataUrl = null
}

export function shouldShowAssistantChartSlot(item) {
  if (!item || item.role !== 'assistant') return false
  const rows = Array.isArray(item.chartPreviewRows) ? item.chartPreviewRows : []
  const eff = coerceChartSpecForRender(item.chartViewSpec, rows)
  if (!eff) return false
  const t = String(eff.type || '').toLowerCase()
  return !!t && t !== 'table'
}

/**
 * @param {import('vue').Ref | { id: string, chartViewSpec?: object, chartPreviewRows?: unknown[] }} msg
 */
export async function mountAgentAssistantChart(msg) {
  const dbg = '[LandAgent][chart-debug]'
  if (!msg?.chartViewSpec) {
    // eslint-disable-next-line no-console
    console.info(dbg, 'mountAgentAssistantChart 跳过: 无 chartViewSpec', { msgId: msg?.id })
    return
  }
  const rows = Array.isArray(msg.chartPreviewRows) ? msg.chartPreviewRows : []
  const specEff = coerceChartSpecForRender(msg.chartViewSpec, rows) || msg.chartViewSpec
  if (!shouldShowAssistantChartSlot({ role: 'assistant', chartViewSpec: specEff, chartPreviewRows: rows })) {
    // eslint-disable-next-line no-console
    console.info(dbg, 'mountAgentAssistantChart 跳过: type 为 table 或空（推断后仍不可渲染）', {
      msgId: msg?.id,
      typeRaw: msg?.chartViewSpec?.type,
      typeEffective: specEff?.type
    })
    return
  }
  const type = String(specEff.type || '').toLowerCase()
  if (typeof document === 'undefined') {
    // eslint-disable-next-line no-console
    console.info(dbg, 'mountAgentAssistantChart 跳过: 无 document', { msgId: msg?.id })
    return
  }
  const expectedId = `agent-chart-${msg.id}`
  let el = document.getElementById(expectedId)
  if (!el) {
    // 与 v-if（streaming→false、chartViewSpec 刚写入）或抽屉布局同一帧竞态时，双 nextTick 仍可能早于 DOM
    for (let i = 0; i < 24 && !el; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      el = document.getElementById(expectedId)
    }
  }
  if (!el) {
    // eslint-disable-next-line no-console
    console.warn(dbg, 'mountAgentAssistantChart 跳过: 找不到 #agent-chart DOM', {
      msgId: msg?.id,
      expectedId,
      hint: '确认智能助手抽屉已打开；控制台应有 attachChartFromComplete 解析后且 showEchartsSlot 为 true'
    })
    return
  }

  disposeAgentAssistantChart(msg)
  /** ECharts 6：入口为命名导出，无 default；Vite 动态 import 下 `.default` 常为 undefined */
  let echarts
  try {
    const mod = await import('echarts')
    const d = mod?.default
    echarts = d && typeof d.init === 'function' ? d : mod
    if (typeof echarts?.init !== 'function') {
      // eslint-disable-next-line no-console
      console.error(dbg, 'ECharts 模块无 init（请检查 echarts 版本与打包）', {
        msgId: msg?.id,
        keys: mod && typeof mod === 'object' ? Object.keys(mod).slice(0, 12) : []
      })
      return
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(dbg, 'ECharts 动态加载失败', { msgId: msg?.id, err: String(e), stack: e?.stack })
    return
  }

  // 同一 DOM 上残留实例（快速重复 mount / 多入口）会导致 init 抛错
  try {
    const existed = typeof echarts.getInstanceByDom === 'function' ? echarts.getInstanceByDom(el) : null
    if (existed) existed.dispose()
  } catch {
    /* ignore */
  }

  // 抽屉/折叠未展开时常见 0 尺寸，init 在 ECharts 6 下可能失败
  for (let i = 0; i < 8 && (el.clientWidth < 2 || el.clientHeight < 2); i++) {
    await new Promise((r) => requestAnimationFrame(r))
  }

  let chart
  try {
    const option = buildOption(specEff, rows, type)
    chart = echarts.init(el, null, { renderer: 'canvas' })
    chart.setOption(option, { notMerge: true })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(dbg, 'ECharts init/setOption 失败', {
      msgId: msg?.id,
      type,
      rowCount: rows.length,
      elSize: { w: el?.clientWidth, h: el?.clientHeight },
      err: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    })
    return
  }
  // eslint-disable-next-line no-console
  console.info(dbg, 'mountAgentAssistantChart ECharts 已 init/setOption', {
    msgId: msg.id,
    type,
    rowCount: rows.length,
    specTitle: specEff?.title
  })

  const ro = new ResizeObserver(() => {
    try {
      chart.resize()
    } catch {
      /* ignore */
    }
  })
  ro.observe(el)

  msg.chartDispose = () => {
    try {
      ro.disconnect()
    } catch {
      /* ignore */
    }
    try {
      chart.dispose()
    } catch {
      /* ignore */
    }
  }
}
