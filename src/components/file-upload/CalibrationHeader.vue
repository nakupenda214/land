<template>
  <div class="cali-header">
    <div class="header-left">
      <el-button icon="Back" round @click="onBack" style="margin-right: 15px;">返回列表</el-button>
      <div class="file-title-block">
        <span class="title">智能审核模式</span>
        <span class="sub-name">{{ currentFile?.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentFile: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['back'])

const onBack = () => emit('back')
</script>

<style scoped>
.cali-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px 18px;
  padding: 14px 18px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title {
  color: #303133;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}

.sub-name {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1280px) {
  .cali-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
