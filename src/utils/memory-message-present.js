/**
 * 会话记忆消息展示：转义、关键词高亮、时间格式化（无 Vue 依赖，便于单测）。
 */

export function escapeHtmlForMemoryMessage(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * @param {string} text
 * @param {string} keyword
 */
export function buildHighlightedMemoryMessageHtml(text, keyword) {
  const safe = escapeHtmlForMemoryMessage(text)
  const kw = String(keyword || '').trim()
  if (!kw) return safe
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reg = new RegExp(`(${escaped})`, 'ig')
  return safe.replace(reg, '<mark class="kw-highlight">$1</mark>')
}

/** 单行展示不下或含换行时显示「查看」 */
export function memoryMessageContentNeedsExpandButton(content) {
  const s = String(content ?? '')
  if (!s.trim()) return false
  if (/[\r\n]/.test(s)) return true
  return s.length > 72
}

export function formatAgentMemoryTimestamp(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date(n).toLocaleString()
}
