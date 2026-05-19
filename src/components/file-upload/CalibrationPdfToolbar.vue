<template>
  <div class="pdf-toolbar">
    <span v-if="currentViewType !== 'original'" class="pdf-toolbar__current">
      当前：{{ currentViewLabel }}
    </span>
    <el-dropdown trigger="click" placement="bottom-end" @command="handleSwitchView">
      <el-button size="small" plain class="pdf-toolbar__trigger">
        文件视图
        <el-icon class="pdf-toolbar__trigger-icon"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            command="original"
            :class="{ 'pdf-toolbar__item--active': currentViewType === 'original' }"
          >
            原始文件
          </el-dropdown-item>
          <el-dropdown-item
            command="preprocess"
            :disabled="!isPreprocessAvailable"
            :class="{ 'pdf-toolbar__item--active': currentViewType === 'preprocess' }"
          >
            <span>预处理文件</span>
            <span v-if="!isPreprocessAvailable" class="pdf-toolbar__item-hint">暂无</span>
          </el-dropdown-item>
          <el-dropdown-item
            command="recognition"
            :class="{ 'pdf-toolbar__item--active': currentViewType === 'recognition' }"
          >
            识别文件(MD)
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  currentViewType: {
    type: String,
    default: 'original'
  },
  isPreprocessAvailable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['switch-view'])

const VIEW_LABELS = {
  original: '原始文件',
  preprocess: '预处理文件',
  recognition: '识别文件(MD)'
}

const currentViewLabel = computed(() => VIEW_LABELS[props.currentViewType] || '原始文件')

const handleSwitchView = (viewType) => {
  if (viewType === 'preprocess' && !props.isPreprocessAvailable) return
  emit('switch-view', viewType)
}
</script>

<style scoped>
.pdf-toolbar {
  height: 36px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.pdf-toolbar__current {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.pdf-toolbar__trigger-icon {
  margin-left: 4px;
}

.pdf-toolbar__item-hint {
  margin-left: 6px;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.pdf-toolbar__item--active) {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
