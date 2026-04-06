<template>
  <div class="tab-actions no-print">
    <div class="action-btns">
      <el-button class="tool-btn print-btn" @click="$emit('print')">打印报表</el-button>
      <el-button class="tool-btn export-btn" @click="$emit('export')">导出 Excel</el-button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['print', 'export'])
</script>

<style scoped>
.tab-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.action-btns {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border: 1px solid #d7dde6;
  border-radius: 6px;
  background: #f5f7fa;
}

:deep(.tool-btn.el-button) {
  min-height: 34px;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 600;
}

:deep(.print-btn.el-button) {
  border: 1px solid #c8ddf1;
  background: #ffffff;
  color: #1f4e79;
}

:deep(.print-btn.el-button:hover) {
  border-color: #b8d3ec;
  background: #f3f8fe;
  color: #163a5a;
}

:deep(.export-btn.el-button) {
  border: 1px solid #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.export-btn.el-button:hover) {
  border-color: #b8d3ec;
  background: #d7e7f8;
  color: #163a5a;
}
</style>
