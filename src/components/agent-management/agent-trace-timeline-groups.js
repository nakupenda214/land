/**
 * 将时间轴事件按「节点一次执行」聚合：从 NODE_START 到同 id 的 NODE_END 之间的所有事件划入同一块，
 * 便于在 UI 上看出节点边界；其余事件为 {@code single}。
 *
 * @param {unknown[]} events 已筛选后的列表（保持时间顺序）
 * @returns {({ kind: 'node-run', nodeId: string, events: unknown[], complete: boolean } | { kind: 'single', events: unknown[] })[]}
 */
export function buildTimelineBlocks(events) {
  const list = Array.isArray(events) ? events : []
  /** @type {({ kind: 'node-run', nodeId: string, events: unknown[], complete: boolean } | { kind: 'single', events: unknown[] })[]} */
  const blocks = []

  /** @type {{ nodeId: string, events: unknown[] } | null} */
  let open = null

  const flushOpenIncomplete = () => {
    if (!open) return
    blocks.push({ kind: 'node-run', nodeId: open.nodeId, events: open.events, complete: false })
    open = null
  }

  for (const ev of list) {
    const t = ev?.type
    const phase = String(ev?.payload?.phase || '').toUpperCase()
    const nid = String(ev?.payload?.nodeId || ev?.payload?.node || '').trim()
    const src = String(ev?.source || '').trim()

    if (t === 'NODE_START' && (phase === 'START' || phase === '')) {
      const nodeId = nid || src
      if (!nodeId) {
        blocks.push({ kind: 'single', events: [ev] })
        continue
      }
      if (open) {
        flushOpenIncomplete()
      }
      open = { nodeId, events: [ev] }
      continue
    }

    if (open) {
      open.events.push(ev)
      if (t === 'NODE_END' && nid && nid === open.nodeId) {
        blocks.push({ kind: 'node-run', nodeId: open.nodeId, events: open.events, complete: true })
        open = null
      } else if (t === 'NODE_START' && (phase === 'START' || phase === '')) {
        const innerId = nid || src
        open.events.pop()
        flushOpenIncomplete()
        if (innerId) {
          open = { nodeId: innerId, events: [ev] }
        } else {
          blocks.push({ kind: 'single', events: [ev] })
        }
      }
      continue
    }

    blocks.push({ kind: 'single', events: [ev] })
  }
  if (open) {
    flushOpenIncomplete()
  }
  return blocks
}
