<template>
  <el-dialog
    :model-value="modelValue"
    title="文件上传"
    width="640px"
    class="upload-archive-dialog"
    :before-close="beforeClose"
    :close-on-click-modal="!isUploadServerProcessing"
    :close-on-press-escape="!isUploadServerProcessing"
    :show-close="!isUploadServerProcessing"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <el-form label-position="top" class="upload-form">
      <el-row :gutter="14" class="upload-grid">
        <el-col :span="24" class="upload-meta-col">
          <el-form-item class="upload-meta-merge-item">
            <template #label>
              <span class="upload-meta-merge-label">文件归类与目标归档夹</span>
            </template>
            <div class="upload-meta-merge">
              <div class="upload-meta-inline-pair">
                <div class="upload-meta-merge-block">
                  <div class="upload-meta-sublabel">文件归类</div>
                  <div class="upload-current-archive" :title="lockedFileContextLabel">
                    {{ lockedFileContextLabel }}
                  </div>
                </div>
                <div class="upload-meta-merge-block">
                  <div class="upload-meta-sublabel">目标归档夹</div>
                  <div class="upload-current-archive">{{ selectedArchiveName || '—' }}</div>
                </div>
              </div>
              <div v-if="uploadForm.fileContextType === 'SURVEY_REPORT'" class="upload-meta-merge-block">
                <div class="upload-meta-sublabel">期数（实测报告必填）</div>
                <el-input-number
                  v-model="uploadForm.phase"
                  :min="1"
                  :max="99"
                  controls-position="right"
                  class="upload-phase"
                />
              </div>
            </div>
          </el-form-item>
        </el-col>

        <el-col :span="24" class="upload-drop-col">
          <div class="upload-unified-panel">
            <div class="upload-panel-toolbar" :class="{ 'is-empty': !uploadFiles.length }">
              <div v-if="uploadFiles.length" class="upload-toolbar-main">
                <span class="upload-toolbar-stat">
                  <strong>{{ uploadFiles.length }}</strong>
                  <span class="muted">个文件</span>
                </span>
                <span class="upload-toolbar-dot" aria-hidden="true">·</span>
                <span class="upload-toolbar-stat">
                  <span class="muted">合计</span>
                  <strong>{{ formatArchiveFileSize(selectedTotalBytes) }}</strong>
                </span>
                <template v-if="topFileGroups.length">
                  <span class="upload-toolbar-dot" aria-hidden="true">·</span>
                  <span class="upload-toolbar-chips">
                    <span v-for="g in topFileGroups" :key="g.key" class="group-chip">{{ g.label }} {{ g.count }}</span>
                  </span>
                </template>
              </div>
              <el-button
                class="upload-clear-btn"
                size="small"
                text
                type="danger"
                :disabled="uploadLoading || !uploadFiles.length"
                @click="emit('clear-files')"
              >
                清空
              </el-button>
            </div>

            <el-upload
              class="upload-dropzone"
              :class="{ 'is-compact': uploadFiles.length > 0 }"
              drag
              action="#"
              :auto-upload="false"
              multiple
              :show-file-list="false"
              :file-list="uploadFiles"
              :on-change="(...args) => emit('file-change', ...args)"
              :on-remove="(...args) => emit('file-remove', ...args)"
            >
              <div v-if="!uploadFiles.length" class="upload-drop-inner">
                <div class="upload-icon-wrap" aria-hidden="true">
                  <el-icon class="upload-icon"><UploadFilled /></el-icon>
                </div>
                <div class="upload-drop-title">拖拽文件到这里</div>
                <div class="upload-drop-sub">或点击选择文件上传</div>
              </div>
              <div v-else class="upload-drop-compact">
                <el-icon class="upload-drop-compact-icon"><UploadFilled /></el-icon>
                <div class="upload-drop-compact-text">
                  <span class="upload-drop-compact-title">继续添加文件</span>
                  <span class="upload-drop-compact-sub">拖拽到此处，或点击选择（支持多选）</span>
                </div>
              </div>
            </el-upload>

            <div v-if="uploadFiles.length" class="upload-file-list-wrap">
              <div class="upload-file-list-head">
                <span>待上传列表</span>
                <span class="upload-file-list-meta">共 {{ uploadFiles.length }} 项，可在下方滚动查看</span>
              </div>
              <div class="upload-file-scroll">
                <div v-for="(item, idx) in uploadFiles" :key="item.uid ?? idx" class="file-row">
                  <span class="fn" :title="archiveUploadFileDisplayName(item)">{{ archiveUploadFileDisplayName(item) }}</span>
                  <span class="fs">{{ formatArchiveFileSize(archiveUploadFileSize(item)) }}</span>
                  <el-button
                    class="file-row-remove"
                    type="danger"
                    link
                    size="small"
                    :disabled="uploadLoading"
                    :icon="Close"
                    @click.stop="emit('remove-one', item)"
                  />
                </div>
              </div>
            </div>

            <div v-if="uploadLoading" class="upload-phase-label">{{ uploadPhaseLabel }}</div>
            <el-progress
              v-if="uploadLoading"
              :indeterminate="isUploadServerProcessing"
              :percentage="uploadProgress"
              :stroke-width="10"
              :show-text="!isUploadServerProcessing"
              class="upload-progress"
            />
            <div v-if="uploadLoading" class="upload-progress-bytes">
              <template v-if="isUploadServerProcessing">
                已发送 {{ formatArchiveFileSize(uploadUploadedBytes) }}
                <span class="upload-progress-phase-hint">· 等待服务端处理（此阶段不可取消）</span>
              </template>
              <template v-else>
                已上传 {{ formatArchiveFileSize(uploadUploadedBytes) }} / {{ formatArchiveFileSize(uploadTotalBytes) }}
                <span v-if="uploadSpeedText" class="upload-speed">· {{ uploadSpeedText }}</span>
                <span v-if="uploadEtaText" class="upload-eta">· 剩余 {{ uploadEtaText }}</span>
              </template>
            </div>
            <div v-if="uploadLoading" class="upload-progress-tip">
              <template v-if="isUploadServerProcessing">
                服务端正在写入存储并提交后处理任务，请保持页面打开直至完成。
              </template>
              <template v-else>传输阶段可点击「取消上传」中断；进度条仅表示浏览器到服务器的传输进度。</template>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <div class="upload-footer">
        <span class="upload-footer-left">
          已选择 <b>{{ uploadFiles.length }}</b> 个文件
        </span>
        <div>
          <el-button :disabled="isUploadServerProcessing" @click="emit('update:modelValue', false)">
            {{ uploadLoading && uploadPhase === 'transferring' ? '取消上传' : '取消' }}
          </el-button>
          <el-button
            type="primary"
            :loading="uploadLoading"
            :disabled="uploadFiles.length === 0 || uploadLoading"
            @click="emit('confirm-upload')"
          >
            确认上传
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Close, UploadFilled } from '@element-plus/icons-vue'
import {
  archiveUploadFileDisplayName,
  archiveUploadFileSize,
  formatArchiveFileSize
} from '@/composables/project-list/archiveFolderPresent.js'

const FILE_CONTEXT_TYPE_LABELS = {
  CONTRACT: '合同文件',
  SURVEY_REPORT: '实测报告',
  PROJECT_PARTY_SURVEY_SUMMARY: '项目方实测汇总表',
  PLANNING_REVIEW: '规划复核文件',
  OTHER: '其他文件'
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  uploadForm: { type: Object, required: true },
  selectedArchiveName: { type: String, default: '' },
  uploadFiles: { type: Array, default: () => [] },
  uploadLoading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  uploadUploadedBytes: { type: Number, default: 0 },
  uploadTotalBytes: { type: Number, default: 0 },
  selectedTotalBytes: { type: Number, default: 0 },
  topFileGroups: { type: Array, default: () => [] },
  uploadSpeedText: { type: String, default: '' },
  uploadEtaText: { type: String, default: '' },
  isUploadServerProcessing: { type: Boolean, default: false },
  uploadPhaseLabel: { type: String, default: '' },
  uploadPhase: { type: String, default: '' },
  beforeClose: { type: Function, default: undefined }
})

const lockedFileContextLabel = computed(() => {
  const t = String(props.uploadForm?.fileContextType || '').toUpperCase()
  return FILE_CONTEXT_TYPE_LABELS[t] || t || '—'
})

const emit = defineEmits([
  'update:modelValue',
  'closed',
  'clear-files',
  'file-change',
  'file-remove',
  'remove-one',
  'confirm-upload'
])
</script>

<style scoped>
.upload-form {
  padding-top: 2px;
}

.upload-grid {
  width: 100%;
}

.upload-meta-col,
.upload-drop-col {
  min-width: 0;
}

.upload-meta-merge {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.upload-meta-inline-pair {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 14px;
  width: 100%;
  min-width: 0;
}

.upload-meta-inline-pair > .upload-meta-merge-block {
  flex: 1 1 220px;
  min-width: 0;
}

.upload-meta-merge-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.upload-meta-sublabel {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  line-height: 1.3;
}

.upload-meta-merge-label {
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.upload-footer-left b {
  font-weight: 800;
  color: #0f172a;
}

.upload-drop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

.upload-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.9) 100%);
  border: 1px solid rgba(59, 130, 246, 0.18);
  box-shadow: 0 18px 44px -30px rgba(37, 99, 235, 0.55);
}

.upload-drop-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.upload-drop-sub {
  font-size: 12px;
  color: #475569;
}

.upload-icon {
  font-size: 30px;
  color: rgba(37, 99, 235, 0.92);
  margin-bottom: 0;
}

.upload-current-archive {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(203, 213, 225, 0.95);
  background: rgba(248, 250, 252, 0.95);
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.upload-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-unified-panel {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 44px -34px rgba(15, 23, 42, 0.22);
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.upload-panel-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.upload-panel-toolbar.is-empty {
  align-items: center;
}

.upload-toolbar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  font-size: 13px;
  color: #0f172a;
}

.upload-toolbar-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.upload-toolbar-stat .muted {
  color: #64748b;
  font-weight: 600;
  font-size: 12px;
}

.upload-toolbar-stat strong {
  font-weight: 900;
  font-size: 14px;
}

.upload-toolbar-dot {
  color: #cbd5e1;
  font-weight: 700;
  user-select: none;
}

.upload-toolbar-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

:deep(.upload-dropzone .el-upload-dragger) {
  border-radius: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.85);
  padding: 16px 14px;
  transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

:deep(.upload-dropzone.is-compact .el-upload-dragger) {
  padding: 10px 14px;
  min-height: 0;
}

.upload-drop-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
}

.upload-drop-compact-icon {
  font-size: 22px;
  color: rgba(37, 99, 235, 0.88);
  flex-shrink: 0;
}

.upload-drop-compact-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.upload-drop-compact-title {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.upload-drop-compact-sub {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.upload-file-list-wrap {
  margin-top: 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.65);
  overflow: hidden;
  min-width: 0;
}

.upload-file-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  color: #334155;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.75);
}

.upload-file-list-meta {
  font-weight: 600;
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
}

.upload-file-scroll {
  max-height: min(240px, 40vh);
  overflow: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-row-remove {
  flex-shrink: 0;
  margin-left: 4px;
}

.upload-phase-label {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 0.2px;
}

.upload-progress-phase-hint {
  color: #64748b;
  font-weight: 600;
}

.upload-progress {
  margin-top: 8px;
}

.upload-progress-bytes {
  margin-top: 6px;
  font-size: 12px;
  color: #334155;
}

.upload-progress-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.upload-speed,
.upload-eta {
  color: #64748b;
  font-weight: 600;
}

.group-chip {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(239, 246, 255, 0.75);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.6;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.95);
}

.file-row .fn {
  flex: 1;
  min-width: 0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-row .fs {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.upload-phase {
  width: 100%;
}

:deep(.upload-archive-dialog.el-dialog) {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--home-soft-border);
  box-shadow: var(--home-soft-shadow);
}

:deep(.upload-archive-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(219, 228, 239, 0.9);
  background: linear-gradient(180deg, var(--home-header-grad-start) 0%, var(--home-header-grad-end) 100%);
}

:deep(.upload-archive-dialog .el-dialog__title) {
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.2px;
}

:deep(.upload-archive-dialog .el-dialog__body) {
  padding: 14px 18px 8px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.82) 0%, rgba(241, 245, 249, 0.66) 100%);
}

:deep(.upload-archive-dialog .el-dialog__footer) {
  border-top: 1px solid rgba(219, 228, 239, 0.9);
  background: #ffffff;
  padding: 12px 18px;
}

:deep(.upload-progress .el-progress-bar__inner) {
  background-image: linear-gradient(
    90deg,
    var(--el-color-primary, #1f4e79) 0%,
    rgba(59, 130, 246, 0.95) 40%,
    var(--el-color-primary, #1f4e79) 80%
  );
  background-size: 200% 100%;
  animation: uploadShimmer 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.upload-progress .el-progress-bar__inner) {
    animation: none;
  }
}

@keyframes uploadShimmer {
  0% {
    background-position: 180% 0;
  }
  100% {
    background-position: -40% 0;
  }
}
</style>
