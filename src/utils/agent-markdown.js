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
 * 对常见“挤成一坨”的模型输出做轻量结构化：
 * - 标题与正文粘连时拆分
 * - 编号列表/短横线子项补换行
 * - 中文语句后的“1. 2. ...”补段落换行
 */
export function normalizeAgentMarkdownText(markdown) {
  let s = String(markdown ?? '')
  if (!s.trim()) return ''

  s = fixRunInAtxHeadingMarkdown(s)

  // 通用标题粘连：# 标题后面直接跟正文（无换行）
  s = s.replace(/^(#{1,6}\s*[^\n#]{2,48}?)(?=(?:本次|以下|其中|此外|1[.、]|一、|二、|三、))/m, '$1\n\n')

  // 中文句号后直接进入编号列表
  s = s.replace(/([。；：!?])\s*(\d+[.、]\s*)/g, '$1\n\n$2')

  // 行内出现“ 1. ”这种编号时，尽量改为新段落
  s = s.replace(/([^\n])\s+(\d+[.、]\s+)/g, '$1\n\n$2')

  // 行内短横线子项转为换行列表
  s = s.replace(/([。；：])\s*-\s+/g, '$1\n- ')
  s = s.replace(/([^\n])\s-\s+/g, '$1\n- ')

  return s
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
  const normalized = normalizeAgentMarkdownText(s)
  const html = marked.parse(normalized)
  return String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}
