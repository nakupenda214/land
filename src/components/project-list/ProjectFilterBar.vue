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

      <el-button type="primary" icon="Search" @click="$emit('search')" :disabled="!modelValue">查询档案</el-button>
    </div>
    <div class="project-meta" v-if="currentProjectId">
      <span class="meta-info" />
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

defineEmits(['update:modelValue', 'search'])
</script>

<style scoped>
.global-filter-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 18px 20px;
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.project-select {
  width: 320px;
  max-width: 100%;
}

.project-meta {
  font-size: 14px;
  color: #666;
  border-top: 1px dashed #eee;
  padding-top: 12px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 1024px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .project-select {
    width: 100%;
  }
}
</style>
