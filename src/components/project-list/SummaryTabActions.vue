<template>
  <div class="tab-actions no-print">
    <div class="action-btns">
      <el-button icon="Printer" @click="$emit('print')" style="margin-right: 15px;">打印报表</el-button>
      <el-button type="success" color="#CAFFBF" style="color: #555" icon="Download" @click="$emit('export')">导出 Excel</el-button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['print', 'export'])
</script>

