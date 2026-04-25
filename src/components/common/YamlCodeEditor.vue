<template>
  <div class="yaml-code-editor" :class="{ 'yaml-code-editor--fixed': isFixedHeight }" :style="rootStyle">
    <div ref="hostRef" class="editor-host" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { yaml } from '@codemirror/lang-yaml'

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  minHeight: { type: String, default: '420px' },
  /** 设置后编辑器为固定视口高度，长文档在内部滚动；未设置则仅 minHeight、随内容增高 */
  height: { type: String, default: '' }
})

const isFixedHeight = computed(() => Boolean(props.height?.trim()))
const rootStyle = computed(() => {
  const h = props.height?.trim()
  if (h) {
    return { height: h, minHeight: h, maxHeight: h }
  }
  return { minHeight: props.minHeight }
})

const emit = defineEmits(['update:modelValue'])

const hostRef = ref(null)
let editor = null
let ignoreNextEmit = false

function buildState(docText) {
  return EditorState.create({
    doc: docText || '',
    extensions: [
      lineNumbers(),
      foldGutter(),
      indentOnInput(),
      history(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      yaml(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.editable.of(!props.readonly),
      EditorView.lineWrapping,
      EditorView.updateListener.of((v) => {
        if (!v.docChanged || ignoreNextEmit) return
        emit('update:modelValue', v.state.doc.toString())
      })
    ]
  })
}

onMounted(() => {
  if (!hostRef.value) return
  editor = new EditorView({
    state: buildState(props.modelValue),
    parent: hostRef.value
  })
})

watch(
  () => props.modelValue,
  (next) => {
    if (!editor) return
    const current = editor.state.doc.toString()
    if (next === current) return
    ignoreNextEmit = true
    editor.dispatch({
      changes: { from: 0, to: current.length, insert: next || '' }
    })
    ignoreNextEmit = false
  }
)

watch(
  () => props.readonly,
  () => {
    if (!editor) return
    const docText = editor.state.doc.toString()
    editor.setState(buildState(docText))
  }
)

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>

<style scoped>
.yaml-code-editor {
  width: 100%;
  border: 1px solid #d8e4f6;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fbff;
}

.editor-host {
  min-height: inherit;
}

.editor-host :deep(.cm-editor) {
  height: 100%;
  min-height: inherit;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  background: #f8fbff;
}

.editor-host :deep(.cm-scroller) {
  min-height: inherit;
}

.yaml-code-editor--fixed {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.yaml-code-editor--fixed .editor-host {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.yaml-code-editor--fixed .editor-host :deep(.cm-editor) {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.yaml-code-editor--fixed .editor-host :deep(.cm-scroller) {
  flex: 1;
  min-height: 0 !important;
  overflow: auto !important;
}

.editor-host :deep(.cm-gutters) {
  background: #eef4ff;
  border-right: 1px solid #d8e4f6;
}
</style>
