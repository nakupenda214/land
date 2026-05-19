<template>
  <div class="archive-audit-stack">
    <CalibrationWorkspaceDialog
      v-model="showCalibration"
      :project-id="projectId"
      :current-file="currentFile"
      :is-editing="isEditing"
      :editing-row-id="editingRowId"
      :start-row-edit="enterEditMode"
      :exit-edit-mode="exitEditMode"
      :handle-save-data="handleSaveData"
      :handle-refresh-survey-report="handleRefreshSurveyReport"
      :handle-create-room="handleCreateRoom"
      :handle-delete-room="handleDeleteRoom"
      :room-create-loading="roomCreateLoading"
      :room-delete-loading="roomDeleteLoading"
      :report-refresh-loading="reportRefreshLoading"
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
      :room-info-total="roomInfoTotal"
      :room-info-page-num="roomInfoPageNum"
      :room-info-page-size="roomInfoPageSize"
      :go-room-info-page="goRoomInfoPage"
      :go-room-info-page-size-change="goRoomInfoPageSizeChange"
      @back="handleCalibrationBack"
      @closed="handleCalibrationClosed"
    />

    <PlanningReviewAuditDialog
      v-model="planningReviewAuditVisible"
      :project-id="projectId"
      :form-data="planningReviewAuditForm"
    />

    <ProjectPartySummaryAuditDialog
      v-model="partySummaryAuditVisible"
      :project-id="projectId"
      :file-record-id="partySummaryAuditFileRecordId"
      :initial-file="partySummaryAuditInitialFile"
    />
  </div>
</template>

<script setup>
import CalibrationWorkspaceDialog from '@/components/file-upload/CalibrationWorkspaceDialog.vue'
import PlanningReviewAuditDialog from '@/components/project-list/PlanningReviewAuditDialog.vue'
import ProjectPartySummaryAuditDialog from '@/components/project-list/ProjectPartySummaryAuditDialog.vue'
import { useArchiveFolderAuditStack } from '@/composables/project-list/useArchiveFolderAuditStack.js'

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false },
  selectedArchive: { type: Object, default: null },
  archiveList: { type: Array, default: () => [] },
  archiveFiles: { type: Array, default: () => [] },
  selectedArchiveId: { type: [String, Number], default: null },
  selectedArchiveName: { type: String, default: '' },
  queryForm: { type: Object, default: null },
  fetchArchiveFiles: { type: Function, required: true },
  fetchArchives: { type: Function, default: undefined },
  selectArchiveForAudit: { type: Function, default: undefined },
  onContractArchiveAudit: { type: Function, default: undefined }
})

const emit = defineEmits(['audit-consumed'])

const {
  showCalibration,
  currentFile,
  isEditing,
  editingRowId,
  roomCreateLoading,
  roomDeleteLoading,
  reportRefreshLoading,
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
  roomInfoLoading,
  roomInfoTotal,
  roomInfoPageNum,
  roomInfoPageSize,
  goRoomInfoPage,
  goRoomInfoPageSizeChange,
  enterEditMode,
  exitEditMode,
  handleSaveData,
  handleRefreshSurveyReport,
  handleCreateRoom,
  handleDeleteRoom,
  handleAuditPass,
  handleCalibrationBack,
  handleCalibrationClosed,
  planningReviewAuditVisible,
  planningReviewAuditForm,
  partySummaryAuditVisible,
  partySummaryAuditFileRecordId,
  partySummaryAuditInitialFile,
  handleAudit,
  openAuditByFileRecordId
} = useArchiveFolderAuditStack({
  projectId: () => props.projectId,
  active: () => props.active,
  selectedArchive: () => props.selectedArchive,
  archiveList: () => props.archiveList,
  archiveFiles: () => props.archiveFiles,
  selectedArchiveId: () => props.selectedArchiveId,
  selectedArchiveName: () => props.selectedArchiveName,
  queryForm: props.queryForm,
  refreshArchiveFiles: props.fetchArchiveFiles,
  fetchArchives: props.fetchArchives,
  selectArchiveForAudit: props.selectArchiveForAudit,
  onContractArchiveAudit: props.onContractArchiveAudit,
  onAuditConsumed: () => emit('audit-consumed')
})

defineExpose({
  handleAudit,
  openAuditByFileRecordId
})
</script>

<style scoped>
.archive-audit-stack {
  display: contents;
}
</style>
