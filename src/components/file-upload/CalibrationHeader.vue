<template>
  <div class="cali-header">
    <div class="header-left">
      <el-button icon="Back" round @click="onClose" style="margin-right: 15px;">返回列表</el-button>
      <div class="file-title-block">
        <span class="title">智能审核模式</span>
        <span class="sub-name">{{ currentFile?.name }}</span>
      </div>
    </div>
    <div class="header-right">
      <el-button
        v-if="!isEditing && currentFile?.status !== 'AUDIT_PASS'"
        type="success"
        plain
        round
        icon="CircleCheck"
        @click="$emit('audit-pass')"
      >
        审核通过
      </el-button>
      <el-button
        v-if="!isEditing && currentFile?.status !== 'AUDIT_PASS'"
        type="warning"
        plain
        round
        icon="EditPen"
        @click="$emit('enter-edit')"
      >
        进入编辑
      </el-button>
      <el-button
        v-if="isEditing"
        type="danger"
        plain
        round
        icon="Close"
        @click="$emit('exit-edit')"
      >
        退出编辑（不保存）
      </el-button>
      <el-button type="primary" plain round icon="DocumentChecked" @click="$emit('save-data')">保存修改</el-button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentFile: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  closeHandler: {
    type: Function,
    required: true
  }
})

defineEmits(['enter-edit', 'exit-edit', 'save-data', 'audit-pass'])

const onClose = () => props.closeHandler()
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

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1280px) {
  .cali-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-right {
    justify-content: flex-start;
  }
}
</style>
