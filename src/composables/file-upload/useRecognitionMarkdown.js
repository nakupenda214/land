import { computed } from 'vue'
import { renderRecognitionMarkdownHtml } from '@/utils/recognitionMarkdownHtml.js'

export function useRecognitionMarkdown({ recognitionMdContent }) {
  const recognitionHtml = computed(() => renderRecognitionMarkdownHtml(recognitionMdContent.value))
  return { recognitionHtml }
}
