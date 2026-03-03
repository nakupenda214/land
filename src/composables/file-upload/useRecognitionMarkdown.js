import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.error('代码高亮失败:', err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  gfm: true,
  breaks: true,
  sanitize: false,
  sanitizer: (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const allowedTags = ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'pre', 'code', 'div', 'img']
    const allowedAttrs = {
      img: ['src', 'alt', 'width', 'style'],
      div: ['style'],
      pre: ['style']
    }

    doc.body.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName.toLowerCase()
      if (!allowedTags.includes(tag)) {
        el.remove()
        return
      }
      Array.from(el.attributes).forEach((attr) => {
        if (!allowedAttrs[tag]?.includes(attr.name)) {
          el.removeAttribute(attr.name)
        }
      })

      if (tag === 'img') {
        const src = el.getAttribute('src')
        if (src) {
          const imgName = src.split('/').pop()
          el.setAttribute('src', `/api/file/download/imgs/${imgName}`)
        }
      }
    })

    return doc.body.innerHTML
  }
})

export function useRecognitionMarkdown({ recognitionMdContent }) {
  const recognitionHtml = computed(() => marked(recognitionMdContent.value || ''))
  return { recognitionHtml }
}
