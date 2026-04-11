<template>
  <svg
    class="agent-assistant-glyph"
    :class="sizeClass"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gid" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stop-color="#818cf8" />
        <stop offset="0.55" stop-color="#6366f1" />
        <stop offset="1" stop-color="#4338ca" />
      </linearGradient>
    </defs>
    <!-- 柔光底 -->
    <ellipse cx="12" cy="11.25" rx="8.75" ry="7.65" :fill="`url(#${gid})`" opacity="0.22" />
    <!-- 对话气泡 -->
    <path
      d="M7.25 6.5h9.5A1.75 1.75 0 0 1 18.5 8.25v6a1.75 1.75 0 0 1-1.75 1.75h-5.1l-3.15 2.65V16h-.75A1.75 1.75 0 0 1 5.5 14.25v-6A1.75 1.75 0 0 1 7.25 6.5Z"
      :stroke="`url(#${gid})`"
      stroke-width="1.35"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <!-- 文本行 -->
    <path
      d="M9 10.25h6M9 12.35h4.25"
      :stroke="`url(#${gid})`"
      stroke-width="1.05"
      stroke-linecap="round"
    />
    <!-- 星点（智能提示） -->
    <circle cx="18.35" cy="5.15" r="0.95" fill="#fbbf24" />
    <circle cx="19.55" cy="6.95" r="0.5" fill="#ea580c" opacity="0.85" />
  </svg>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  /** sm：消息头像 · md：顶栏 · lg：放大 · xl：空状态 */
  size: {
    type: String,
    default: 'md'
  }
})

const gid = `agent-glyph-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const sizeClass = computed(() => `is-${props.size}`)
</script>

<style scoped>
.agent-assistant-glyph {
  display: block;
  flex-shrink: 0;
}

.agent-assistant-glyph.is-sm {
  width: 20px;
  height: 20px;
}

.agent-assistant-glyph.is-md {
  width: 26px;
  height: 26px;
}

.agent-assistant-glyph.is-lg {
  width: 30px;
  height: 30px;
}

.agent-assistant-glyph.is-xl {
  width: 40px;
  height: 40px;
}
</style>
