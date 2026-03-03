<template>
  <div class="macaron-container">
    <UploadActionHeader
      v-model="currentProject"
      :project-options="projectOptions"
      @create-project="showCreateProject = true"
      @open-upload="openUploadDialog"
    />

    <FileUploadTaskPanel
      :current-project="currentProject"
      :table-loading="tableLoading"
      :selected-rows-length="selectedRows.length"
      :batch-loading="batchLoading"
      :can-batch-parse="canBatchParse"
      :filter-file-name="filterFileName"
      :filter-file-type="filterFileType"
      :filter-status="filterStatus"
      :file-table-data="fileTableData"
      :status-map="statusMap"
      :table-row-class-name="tableRowClassName"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @batch-delete="batchDelete"
      @batch-parse="batchParse"
      @update:filter-file-name="(val) => (filterFileName = val)"
      @update:filter-file-type="(val) => (filterFileType = val)"
      @update:filter-status="(val) => (filterStatus = val)"
      @search="refreshData"
      @reset="resetFilter"
      @refresh="handleRefresh"
      @selection-change="handleSelectionChange"
      @cancel-processing="cancelProcessing"
      @start-processing="startProcessing"
      @open-calibration="openCalibration"
      @delete-file="deleteFile"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <CreateProjectDialog
      v-model="showCreateProject"
      :new-project-form="newProjectForm"
      :locale="zhCn"
      @submit="handleCreateProject"
    />

    <BatchUploadDialog
      v-model="uploadDialogVisible"
      :temp-upload-type="tempUploadType"
      :upload-phase="uploadPhase"
      :temp-files="tempFiles"
      @update:temp-upload-type="(val) => (tempUploadType = val)"
      @update:upload-phase="(val) => (uploadPhase = val)"
      @file-change="handleFileChange"
      @file-remove="handleFileRemove"
      @confirm="confirmUpload"
      @closed="handleUploadDialogClosed"
    />

    <CalibrationWorkspaceDialog
      v-model="showCalibration"
      :current-file="currentFile"
      :is-editing="isEditing"
      :enter-edit-mode="enterEditMode"
      :exit-edit-mode="exitEditMode"
      :handle-save-data="handleSaveData"
      :handle-audit-pass="handleAuditPass"
      :calibration-loading="calibrationLoading"
      :current-view-type="currentViewType"
      :is-preprocess-available="isPreprocessAvailable"
      :switch-view="switchView"
      :pdf-loading="pdfLoading"
      :calibration-pdf-url="calibrationPdfUrl"
      :pdf-loaded="pdfLoaded"
      :pdf-load-error="pdfLoadError"
      :recognition-md-loading="recognitionMdLoading"
      :recognition-html="recognitionHtml"
      :audit-summary-data="auditSummaryData"
      :audit-summary-display="auditSummaryDisplay"
      :room-info-data="roomInfoData"
      :room-info-loading="roomInfoLoading"
      @closed="resetCalibrationState"
    />
  </div>
</template>

<script setup>
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import UploadActionHeader from '@/components/file-upload/UploadActionHeader.vue'
import FileUploadTaskPanel from '@/components/file-upload/FileUploadTaskPanel.vue'
import CreateProjectDialog from '@/components/file-upload/CreateProjectDialog.vue'
import BatchUploadDialog from '@/components/file-upload/BatchUploadDialog.vue'
import CalibrationWorkspaceDialog from '@/components/file-upload/CalibrationWorkspaceDialog.vue'
import { useFileUploadPage } from '@/composables/file-upload/useFileUploadPage'

const {
  statusMap,
  tableRowClassName,
  projectOptions,
  currentProject,
  showCreateProject,
  newProjectForm,
  handleCreateProject,
  fileTableData,
  tableLoading,
  filterStatus,
  filterFileName,
  filterFileType,
  currentPage,
  pageSize,
  total,
  refreshData,
  resetFilter,
  handleSizeChange,
  handleCurrentChange,
  handleRefresh,
  selectedRows,
  batchLoading,
  canBatchParse,
  handleSelectionChange,
  batchDelete,
  batchParse,
  uploadDialogVisible,
  tempUploadType,
  uploadPhase,
  tempFiles,
  openUploadDialog,
  handleFileChange,
  handleFileRemove,
  handleUploadDialogClosed,
  confirmUpload,
  openCalibration,
  startProcessing,
  cancelProcessing,
  deleteFile,
  showCalibration,
  resetCalibrationState,
  currentFile,
  isEditing,
  enterEditMode,
  exitEditMode,
  handleSaveData,
  handleAuditPass,
  calibrationLoading,
  currentViewType,
  isPreprocessAvailable,
  switchView,
  pdfLoading,
  calibrationPdfUrl,
  pdfLoaded,
  pdfLoadError,
  recognitionMdLoading,
  recognitionHtml,
  auditSummaryData,
  auditSummaryDisplay,
  roomInfoData,
  roomInfoLoading
} = useFileUploadPage()
</script>

<style scoped>
.macaron-container {
  padding: 20px;
  min-height: 80vh;
  background-color: #f5f7fa;
}

:deep(.upload-confirm-btn:not(:disabled)) {
  background-color: #a0c4ff !important;
  border-color: #a0c4ff !important;
  color: #fff !important;
}

:deep(.upload-confirm-btn:disabled) {
  background-color: #e0e0e0 !important;
  border-color: #e0e0e0 !important;
  color: #999 !important;
}
</style>
