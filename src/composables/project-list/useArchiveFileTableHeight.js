import { onBeforeUnmount, ref } from 'vue'

/** 归档文件表：按 table-wrap 可视区域动态计算 el-table height */
export function useArchiveFileTableHeight() {
  const tableWrapRef = ref(null)
  const tableBodyHeight = ref(360)
  let tableWrapResizeObserver = null

  const updateTableBodyHeight = () => {
    const wrap = tableWrapRef.value
    if (!wrap) return
    requestAnimationFrame(() => {
      const el = tableWrapRef.value
      if (!el) return
      const pager = el.querySelector('.pager-row')
      const reserve = (pager ? pager.getBoundingClientRect().height : 0) + 8
      const next = Math.floor(el.clientHeight - reserve)
      tableBodyHeight.value = Math.max(160, next)
    })
  }

  const bindTableWrapResizeObserver = () => {
    const el = tableWrapRef.value
    if (!el || typeof ResizeObserver === 'undefined') return
    if (tableWrapResizeObserver) {
      tableWrapResizeObserver.disconnect()
      tableWrapResizeObserver = null
    }
    tableWrapResizeObserver = new ResizeObserver(() => updateTableBodyHeight())
    tableWrapResizeObserver.observe(el)
    updateTableBodyHeight()
  }

  const disconnectTableWrapObserver = () => {
    if (!tableWrapResizeObserver) return
    try {
      tableWrapResizeObserver.disconnect()
    } catch {
      /* ignore */
    }
    tableWrapResizeObserver = null
  }

  onBeforeUnmount(disconnectTableWrapObserver)

  return {
    tableWrapRef,
    tableBodyHeight,
    updateTableBodyHeight,
    bindTableWrapResizeObserver,
    disconnectTableWrapObserver
  }
}
