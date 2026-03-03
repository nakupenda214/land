import { ref } from 'vue'
import { useProjectOptions } from '@/composables/file-upload/useProjectOptions'
import { useFileTableQuery } from '@/composables/file-upload/useFileTableQuery'
import { useFileUploadConstants, useAuditSummaryDisplay } from '@/composables/file-upload/useFileUploadConstants'
import { useFileUploadOperations } from '@/composables/file-upload/useFileUploadOperations'
import { useCalibrationState } from '@/composables/file-upload/useCalibrationState'
import { useCalibrationViewer } from '@/composables/file-upload/useCalibrationViewer'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import { useCurrentProjectSession } from '@/composables/file-upload/useCurrentProjectSession'
import { useCalibrationActions } from '@/composables/file-upload/useCalibrationActions'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow'

export function useFileUploadPage() {
  const { statusMap, usageCategoryMap, usageCategoryReverseMap } = useFileUploadConstants()
  const tableRowClassName = () => 'no-hover-highlight'

  const {
    projectOptions,
    currentProject,
    showCreateProject,
    newProjectForm,
    fetchProjectList,
    handleCreateProject
  } = useProjectOptions()

  const {
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
    handleRefresh
  } = useFileTableQuery(currentProject)

  const {
    deleteFile,
    stopPolling,
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
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload,
    startProcessing,
    cancelProcessing
  } = useFileUploadOperations({
    currentProject,
    projectOptions,
    refreshData
  })

  const isEditing = ref(false)
  const batchUpdateLoading = ref(false)

  const {
    roomInfoLoading,
    roomInfoData,
    roomSumInfo,
    showCalibration,
    calibrationLoading,
    currentFile,
    auditSummaryData
  } = useCalibrationState()
  const { auditSummaryDisplay } = useAuditSummaryDisplay(auditSummaryData)

  const {
    currentViewType,
    preprocessGridfsId,
    isPreprocessAvailable,
    recognitionMdContent,
    recognitionMdLoading,
    calibrationPdfUrl,
    pdfLoading,
    realSurveyReportId,
    switchView,
    resetCalibrationState,
    openCalibration,
    pdfLoaded,
    pdfLoadError
  } = useCalibrationViewer({
    currentProject,
    showCalibration,
    currentFile,
    calibrationLoading,
    roomInfoLoading,
    roomInfoData,
    roomSumInfo,
    auditSummaryData,
    usageCategoryMap
  })

  const { recognitionHtml } = useRecognitionMarkdown({ recognitionMdContent })

  useCurrentProjectSession({
    currentProject,
    fetchProjectList,
    refreshData,
    resetFilter,
    fileTableData,
    stopPolling,
    calibrationPdfUrl,
    clearUploadSelection
  })

  const { handleAuditPass } = useCalibrationActions({
    showCalibration,
    resetCalibrationState,
    refreshData,
    currentFile,
    realSurveyReportId
  })

  const { enterEditMode, exitEditMode, handleSaveData } = useRoomEditWorkflow({
    currentProject,
    realSurveyReportId,
    currentFile,
    roomInfoData,
    roomInfoLoading,
    isEditing,
    batchUpdateLoading,
    usageCategoryMap,
    usageCategoryReverseMap,
    auditSummaryData
  })

  return {
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
    handleAuditPass
  }
}
