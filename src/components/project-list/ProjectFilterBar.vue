<template>
  <div class="global-filter-card no-print">
    <div class="filter-row">
      <div class="filter-item">
        <span class="label">选择项目</span>
        <el-select
          :model-value="modelValue"
          placeholder="请输入关键词搜索项目"
          class="project-select"
          filterable
          clearable
          no-match-text="未找到相关项目"
          @update:model-value="(val) => $emit('update:modelValue', val)"
        >
          <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </div>

      <div class="action-group">
        <el-button class="query-btn biz-btn biz-btn-primary" type="primary" @click="$emit('search')" :disabled="!modelValue">
          查询档案
        </el-button>
        <el-button class="create-btn biz-btn" @click="$emit('create-project')">新建项目</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  projectOptions: {
    type: Array,
    default: () => []
  },
  currentProjectId: {
    type: [String, Number],
    default: ''
  }
})

defineEmits(['update:modelValue', 'search', 'create-project'])
</script>

<style scoped>
.global-filter-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #d7dde6;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
  padding: 14px 16px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.label {
  font-size: 14px;
  color: #4a5568;
  white-space: nowrap;
  font-weight: 600;
}

.project-select {
  width: 340px;
  max-width: 100%;
}

.action-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 2px;
}

:deep(.query-btn.el-button),
:deep(.create-btn.el-button) {
  min-height: 36px;
  min-width: 104px;
  border-radius: 6px;
  font-weight: 600;
  padding: 8px 14px;
}

:deep(.query-btn.el-button) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.query-btn.el-button:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

:deep(.query-btn.el-button:disabled) {
  opacity: 0.7;
}

@media (max-width: 1024px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    width: 100%;
  }

  .project-select {
    width: 100%;
  }

  .action-group {
    width: 100%;
  }

  :deep(.query-btn.el-button),
  :deep(.create-btn.el-button) {
    flex: 1;
  }
}
</style>
