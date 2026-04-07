<template>
  <el-dialog
    v-model="visible"
    title="合同信息编辑"
    fullscreen
    append-to-body
    class="contract-workspace-dialog"
    :close-on-click-modal="false"
    :destroy-on-close="false"
  >
    <div class="contract-workspace-root">
      <div class="workspace-topbar">
        <div class="topbar-left">
          <span class="topbar-title">合同工作区</span>
          <span class="topbar-sub">全屏工作区 · 可拖动中间分隔条调整左右宽度</span>
        </div>
        <div class="topbar-right">
          <el-tag type="info" effect="plain" class="meta-tag" :title="fileName || '未关联合同文件'">
            {{ fileName || '未关联合同文件' }}
          </el-tag>
          <div class="file-picker-row">
            <el-select
              :model-value="selectedFileId"
              filterable
              clearable
              placeholder="选择项目文件（可搜索）"
              class="file-picker-select"
              popper-class="project-file-select-dropdown"
              :loading="fileOptionsLoading"
              @update:model-value="(v) => emit('update:selectedFileId', v)"
            >
              <el-option v-for="item in fileOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </div>
      </div>

      <div
        ref="auditLayoutRef"
        class="audit-split-layout audit-split-layout--responsive contract-workspace-split"
      >
        <section class="pdf-panel audit-split-layout__left" :style="leftPanelStyle" v-loading="pdfLoading">
          <iframe v-if="pdfUrl" class="pdf-frame" :src="pdfUrl" title="合同预览" />
          <el-empty v-else description="暂无可预览PDF" />
        </section>

        <div
          class="audit-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调节左右区域宽度"
          @mousedown="onSplitterMouseDown"
        />

        <section class="form-panel audit-split-layout__right">
          <div class="panel-title">合同字段</div>
          <div class="form-meta">
            <div class="meta-item">
              <span class="k">合同编号</span>
              <span class="v">{{ form.contractNumber || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">合同类型</span>
              <span class="v">{{ form.contractType || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">出让方</span>
              <span class="v">{{ form.transferor || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">受让方</span>
              <span class="v">{{ form.transferee || '-' }}</span>
            </div>
          </div>
          <el-form :ref="setFormRef" :model="form" :rules="rules" label-position="top" class="contract-form contract-form-scroll">
            <el-form-item label="合同编号" prop="contractNumber">
              <el-input v-model="form.contractNumber" placeholder="请输入合同编号" />
            </el-form-item>
            <el-form-item label="合同类型" prop="contractType">
              <el-input v-model="form.contractType" placeholder="请输入合同类型" />
            </el-form-item>
            <el-form-item label="出让方" prop="transferor">
              <el-input v-model="form.transferor" placeholder="请输入出让方" />
            </el-form-item>
            <el-form-item label="受让方" prop="transferee">
              <el-input v-model="form.transferee" placeholder="请输入受让方" />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入备注" />
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">保存修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  rules: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  setFormRef: { type: Function, default: () => {} },
  pdfUrl: { type: String, default: '' },
  pdfLoading: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
  fileOptions: { type: Array, default: () => [] },
  fileOptionsLoading: { type: Boolean, default: false },
  selectedFileId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['update:modelValue', 'submit', 'update:selectedFileId'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 55,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  }
})
</script>

<style scoped>
.contract-workspace-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.contract-workspace-split {
  flex: 1;
  min-height: 240px;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
  overflow: hidden;
}

.workspace-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 0;
  border: 1px solid #e9eef7;
  border-radius: 10px;
  background: #ffffff;
  min-width: 0;
}

.topbar-left {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.topbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d3d;
}

.topbar-sub {
  font-size: 12px;
  color: #7a879a;
  white-space: nowrap;
}

.topbar-right {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.meta-tag {
  max-width: 360px;
}

:deep(.meta-tag .el-tag__content) {
  display: inline-block;
  max-width: 330px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-picker-row {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.file-picker-select {
  width: 320px;
}

:deep(.file-picker-select .el-input__wrapper) {
  min-height: 34px;
}

:deep(.project-file-select-dropdown .el-select-dropdown__wrap) {
  max-height: 280px;
}

.pdf-panel,
.form-panel {
  border: 1px solid #e6ebf3;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pdf-panel {
  position: relative;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #243447;
  margin-bottom: 10px;
}

.pdf-frame {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  border: none;
  border-radius: 8px;
}

.contract-form-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.form-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  padding: 8px;
  background: #f8fbff;
}

.meta-item {
  min-width: 0;
}

.meta-item .k {
  display: block;
  font-size: 12px;
  color: #7b8798;
}

.meta-item .v {
  display: block;
  font-size: 13px;
  color: #243447;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.contract-form .el-form-item) {
  margin-bottom: 16px;
}

:deep(.contract-form .el-form-item__label) {
  color: #46566e;
  font-weight: 600;
}

:deep(.contract-form .el-input__wrapper),
:deep(.contract-form .el-textarea__inner),
:deep(.contract-form .el-select__wrapper),
:deep(.contract-form .el-input-number) {
  border-radius: 8px;
}

@media (max-width: 1280px) {
  .workspace-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-left {
    flex-wrap: wrap;
  }

  .topbar-sub {
    white-space: normal;
  }

  .contract-workspace-split .pdf-panel {
    min-height: 360px;
    height: 46vh;
  }

  .contract-workspace-split .form-panel {
    min-height: 280px;
  }

  .form-meta {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.contract-workspace-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: 0;
}

.contract-workspace-dialog .el-dialog__header {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid #e4ebf4;
}

.contract-workspace-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  box-sizing: border-box;
}

.contract-workspace-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  margin: 0;
  border-top: 1px solid #eef2f7;
}
</style>
