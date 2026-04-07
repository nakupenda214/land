import { computed, onUnmounted, ref } from 'vue'

const MIN_PCT = 22
const MAX_PCT = 78

/**
 * 审核类全屏弹窗左右分栏可拖拽调节宽度（与 window.resize 无联动，PDF/表格需各自处理 onSplitEnd）。
 * @param {{ defaultLeftPercent?: number, onSplitEnd?: () => void }} [options]
 */
export function useAuditSplitPanel(options = {}) {
  const { defaultLeftPercent = 45, onSplitEnd } = options

  const auditLayoutRef = ref(null)
  const leftPanelPercent = ref(defaultLeftPercent)

  const leftPanelStyle = computed(() => ({
    width: `${leftPanelPercent.value}%`,
    flexShrink: 0
  }))

  let splitterListenersCleanup = null

  const onSplitterMouseDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const layout = auditLayoutRef.value
    if (!layout) return

    splitterListenersCleanup?.()
    const startX = e.clientX
    const startPct = leftPanelPercent.value
    const rect0 = layout.getBoundingClientRect()
    const totalW = rect0.width || 1

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const deltaPct = (dx / totalW) * 100
      let next = startPct + deltaPct
      next = Math.max(MIN_PCT, Math.min(MAX_PCT, next))
      leftPanelPercent.value = next
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      splitterListenersCleanup = null
      onSplitEnd?.()
    }

    splitterListenersCleanup = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  onUnmounted(() => {
    splitterListenersCleanup?.()
  })

  return {
    auditLayoutRef,
    leftPanelPercent,
    leftPanelStyle,
    onSplitterMouseDown
  }
}
