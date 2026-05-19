<template>
  <section class="table-panel">
    <div class="query-bar">
      <div class="query-top">
        <div class="query-fields">
          <el-input
            v-model.trim="queryForm.keyword"
            placeholder="请输入文件名关键词"
            clearable
            class="query-item keyword"
            @input="emit('auto-query', 'keyword')"
            @clear="emit('auto-query', 'keyword')"
            @keyup.enter="emit('search')"
          />
          <el-select
            v-model="queryForm.verifyStatus"
            placeholder="校验状态"
            clearable
            class="query-item"
            @change="emit('auto-query', 'verifyStatus')"
            @clear="emit('auto-query', 'verifyStatus')"
          >
            <el-option
              v-for="item in verifyStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select
            v-model="queryForm.fileState"
            placeholder="文件状态"
            clearable
            class="query-item"
            @change="emit('auto-query', 'fileState')"
            @clear="emit('auto-query', 'fileState')"
          >
            <el-option v-for="item in fileStateOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="query-actions">
          <el-button size="small" @click="emit('reset')">重置</el-button>
          <el-button size="small" :icon="Refresh" @click="emit('refresh')">刷新</el-button>
        </div>
      </div>
      <div class="query-bottom">
        <div class="batch-actions">
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="selectedCount === 0"
            :loading="batchDeleteLoading"
            @click="emit('batch-delete')"
          >
            批量删除
          </el-button>
          <el-button
            size="small"
            type="primary"
            plain
            :disabled="!canBatchParse"
            :loading="batchParseLoading"
            @click="emit('batch-parse')"
          >
            批量解析
          </el-button>
          <el-button
            class="upload-btn"
            size="small"
            type="primary"
            plain
            :icon="UploadFilled"
            :disabled="!projectId || !selectedArchiveId"
            @click="emit('open-upload')"
          >
            文件上传
          </el-button>
        </div>
      </div>
    </div>

    <div ref="tableWrapRef" class="table-wrap" v-loading="fileLoading">
      <el-empty v-if="!selectedArchiveId" description="选择归档夹后展示文件" />
      <el-empty
        v-else-if="!fileLoading && archiveFiles.length === 0"
        description="该归档夹暂无文件，可上传或切换其他归档夹"
        :image-size="80"
      />
      <template v-else>
        <el-table
          :data="archiveFiles"
          stripe
          border
          :height="tableBodyHeight"
          row-key="id"
          @selection-change="(rows) => emit('selection-change', rows)"
        >
          <el-table-column type="selection" width="48" align="center" />
          <el-table-column v-if="showThumbnailColumn" label="缩略图" width="95" align="center">
            <template #default="{ row }">
              <el-image
                v-if="getArchiveThumbnailUrl(row)"
                class="thumb"
                :src="getArchiveThumbnailUrl(row)"
                fit="cover"
                :preview-src-list="getArchiveThumbnailPreviewList(row)"
                :preview-teleported="true"
              >
                <template #error>
                  <div class="thumb-placeholder">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <div v-else class="thumb-placeholder">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="文件名" min-width="280">
            <template #default="{ row }">
              <el-link
                v-if="canPreview(row)"
                type="primary"
                :underline="false"
                class="archive-file-name-link"
                :title="`点击预览：${row.originalName || ''}`"
                @click="emit('preview', row)"
              >
                {{ row.originalName || '-' }}
              </el-link>
              <span v-else class="archive-file-name-text" :title="row.originalName || ''">
                {{ row.originalName || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="130" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.parseJobId"
                :type="getArchiveStateTagType(row.fileState)"
                size="small"
                effect="light"
                class="state-tag-parse-flow"
                title="点击查看解析流程"
                @click.stop="emit('open-parse-flow', row)"
              >
                {{ getArchiveFileStateLabel(row.fileState) }}
              </el-tag>
              <el-tag v-else :type="getArchiveStateTagType(row.fileState)" size="small" effect="light">
                {{ getArchiveFileStateLabel(row.fileState) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="selectedArchiveKind === 'SURVEY_REPORT'"
            label="校验状态"
            width="130"
            align="center"
          >
            <template #default="{ row }">
              <el-tooltip
                v-if="getArchiveVerifyStatus(row).type === 'danger' && row.verificationErrorReason"
                :content="row.verificationErrorReason"
                placement="top"
                effect="light"
              >
                <el-tag :type="getArchiveVerifyStatus(row).type" size="small" effect="light">
                  {{ getArchiveVerifyStatus(row).label }}
                </el-tag>
              </el-tooltip>
              <el-tag v-else :type="getArchiveVerifyStatus(row).type" size="small" effect="light">
                {{ getArchiveVerifyStatus(row).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="180" align="center">
            <template #default="{ row }">{{ formatArchiveDateTime(row.uploadTime) }}</template>
          </el-table-column>
          <el-table-column label="上传人" width="110" align="center" show-overflow-tooltip>
            <template #default="{ row }">{{ row.uploadUserName || '—' }}</template>
          </el-table-column>
          <el-table-column label="文件类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.fileType || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="100" align="center">
            <template #default="{ row }">{{ formatArchiveFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="268" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="showArchiveParseButton(row)"
                class="op-btn parse-btn"
                size="small"
                type="primary"
                @click="emit('parse', row)"
              >
                {{ archiveParseButtonText(row) }}
              </el-button>
              <el-button
                v-if="showArchiveCancelParseButton(row)"
                class="op-btn"
                link
                type="warning"
                @click="emit('cancel-parse', row)"
              >
                取消解析
              </el-button>
              <el-button
                v-if="showArchiveAuditButton(row, selectedArchiveKind)"
                class="op-btn audit-btn"
                size="small"
                type="primary"
                plain
                @click="emit('audit', row)"
              >
                {{ row.fileState === 'AUDIT_PASS' ? '查看' : '审核' }}
              </el-button>
              <el-popconfirm title="确定删除该文件吗？" @confirm="emit('delete-file', row)">
                <template #reference>
                  <el-button class="op-btn delete-btn" size="small" type="danger" plain>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager-row">
          <span class="file-count">共 {{ fileTotal }} 个文件，已选 {{ selectedCount }} 个</span>
          <el-pagination
            background
            layout="sizes, prev, pager, next"
            :total="fileTotal"
            :page-size="queryForm.pageSize"
            :current-page="queryForm.pageNum"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="(size) => emit('page-size-change', size)"
            @current-change="(page) => emit('page-change', page)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { Picture, Refresh, UploadFilled } from '@element-plus/icons-vue'
import {
  ARCHIVE_FILE_STATE_OPTIONS,
  ARCHIVE_VERIFY_STATUS_OPTIONS,
  formatArchiveDateTime,
  formatArchiveFileSize,
  getArchiveStateTagType,
  getArchiveThumbnailPreviewList,
  getArchiveThumbnailUrl,
  getArchiveVerifyStatus
} from '@/composables/project-list/archiveFolderPresent.js'
import {
  archiveParseButtonText,
  getArchiveFileStateLabel,
  showArchiveAuditButton,
  showArchiveCancelParseButton,
  showArchiveParseButton
} from '@/composables/project-list/archiveFileRowPresent.js'
import { useArchiveFileTableHeight } from '@/composables/project-list/useArchiveFileTableHeight.js'

defineProps({
  projectId: { type: [String, Number], default: '' },
  selectedArchiveId: { type: [String, Number], default: null },
  selectedArchiveKind: { type: String, default: '' },
  queryForm: { type: Object, required: true },
  fileLoading: { type: Boolean, default: false },
  archiveFiles: { type: Array, default: () => [] },
  fileTotal: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  showThumbnailColumn: { type: Boolean, default: true },
  canBatchParse: { type: Boolean, default: false },
  batchDeleteLoading: { type: Boolean, default: false },
  batchParseLoading: { type: Boolean, default: false },
  canPreview: { type: Function, default: () => false }
})

const emit = defineEmits([
  'auto-query',
  'search',
  'reset',
  'refresh',
  'batch-delete',
  'batch-parse',
  'open-upload',
  'selection-change',
  'preview',
  'open-parse-flow',
  'parse',
  'cancel-parse',
  'audit',
  'delete-file',
  'page-change',
  'page-size-change'
])

const verifyStatusOptions = ARCHIVE_VERIFY_STATUS_OPTIONS
const fileStateOptions = ARCHIVE_FILE_STATE_OPTIONS

const { tableWrapRef, tableBodyHeight, updateTableBodyHeight, bindTableWrapResizeObserver } =
  useArchiveFileTableHeight()

defineExpose({
  updateTableBodyHeight,
  bindTableWrapResizeObserver
})
</script>

<style scoped>
.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: #fff;
  padding: 12px;
  height: 100%;
  min-height: 0;
}

.query-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, var(--home-panel-grad-start) 0%, var(--home-panel-grad-end) 100%);
}

.query-top {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 10px 12px;
  flex-wrap: wrap;
}

.query-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed #d4deea;
}

.query-fields {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1 1 520px;
  min-width: 0;
}

.query-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

:deep(.batch-actions .el-button) {
  min-width: 98px;
  height: 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  border-color: #9aa8ba;
  color: #334155;
}

:deep(.batch-actions .el-button--danger) {
  border-color: #c79aa0;
  color: #7a2e35;
}

:deep(.batch-actions .el-button--primary) {
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.batch-actions .el-button--primary.is-plain) {
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.batch-actions .el-button--danger.is-plain) {
  background: #fff3f2;
  border-color: #f7c4bf;
  color: #b42318;
}

:deep(.query-actions .el-button) {
  min-width: 84px;
  height: 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
}

.query-item {
  width: 150px !important;
  flex: 0 0 150px;
}

.query-item.keyword {
  width: 260px !important;
  flex: 1 1 260px;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.table-wrap .el-table) {
  border-radius: 8px;
}

:deep(.table-wrap .el-table th.el-table__cell) {
  background: #f1f6fc;
  color: #445468;
  font-weight: 600;
  padding-top: 11px;
  padding-bottom: 11px;
}

:deep(.table-wrap .el-table td.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

:deep(.table-wrap .el-table .el-table__row:hover > td.el-table__cell) {
  background: #f0f7ff !important;
}

.thumb {
  width: 70px;
  height: 46px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 46px;
  color: #9ca3af;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.pager-row {
  flex-shrink: 0;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 6px 10px;
  border-top: 1px solid #e8eef5;
}

.file-count {
  color: #607286;
  font-size: 13px;
}

:deep(.pager-row .el-pagination) {
  --el-color-primary: #1f4e79;
}

.state-tag-parse-flow {
  cursor: pointer;
}

.state-tag-parse-flow:hover {
  filter: brightness(0.97);
  box-shadow: 0 0 0 1px rgba(31, 78, 121, 0.2);
}

.archive-file-name-link,
.archive-file-name-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.archive-file-name-link:hover {
  text-decoration: underline;
}

@media (max-width: 1366px) {
  .query-top {
    align-items: flex-start;
  }

  .query-fields {
    flex-basis: 100%;
  }

  .query-actions {
    width: 100%;
  }

  .query-item.keyword {
    width: 220px !important;
    flex: 1 1 220px;
  }
}
</style>
