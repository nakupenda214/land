import { marked } from 'marked'

let markedConfigured = false

function ensureMarkedConfigured() {
  if (markedConfigured) return
  marked.setOptions({ breaks: true, gfm: true })
  markedConfigured = true
}

/**
 * 模型常把「### 标题」与正文写在同一行，marked 会把整行当成一个标题行，列表/段落全部丢失。
 * 与 {@link GlobalAgentAssistant} 对齐的轻量修复。
 */
const RUNIN_TITLE_MARKERS = [
  '查询结果摘要',
  '结果摘要',
  '查询结果说明',
  '查询结果',
  '答复说明',
  '结果说明',
  '详细说明',
  '主要结论',
  '结论',
  '风险提示',
  '数据说明',
  '图表说明',
  '合同查询结果',
  '概述'
].sort((a, b) => b.length - a.length)

const RUNIN_BODY_START = /^[\u4e00-\u9fff0-9（(一1这那以从经根据共具如下、，：。.；\d]/

function fixRunInAtxHeadingLine(line) {
  const hm = line.match(/^(#{1,6})(\s*)(.*)$/)
  if (!hm) return null
  const hashes = hm[1]
  const rest = hm[3] ?? ''
  if (rest.length < 18) return null
  for (const title of RUNIN_TITLE_MARKERS) {
    if (!rest.startsWith(title)) continue
    const tail = rest.slice(title.length)
    const trimmed = tail.trimStart()
    if (trimmed.length >= 4 && RUNIN_BODY_START.test(trimmed)) {
      return `${hashes} ${title}\n\n${trimmed}`
    }
  }
  return null
}

export function fixRunInAtxHeadingMarkdown(markdown) {
  const s = String(markdown ?? '')
  const lines = s.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const fixed = fixRunInAtxHeadingLine(lines[i].trim())
    if (fixed) {
      lines[i] = fixed
      break
    }
  }
  return lines.join('\n')
}

/**
 * 将助手/Trace 中的 Markdown 转为可安全 {@code v-html} 的 HTML（去除 script）。
 * @param {unknown} raw
 * @returns {string}
 */
export function renderAgentMarkdownHtml(raw) {
  ensureMarkedConfigured()
  const s = raw == null ? '' : String(raw)
  if (!s.trim()) return ''
  const normalized = fixRunInAtxHeadingMarkdown(s)
  const html = marked.parse(normalized)
  return String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}
