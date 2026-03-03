import { useBatchActions } from '@/composables/file-upload/useBatchActions'
import { useUploadDialog } from '@/composables/file-upload/useUploadDialog'
import { useParseActions } from '@/composables/file-upload/useParseActions'
import { useFileListActions } from '@/composables/file-upload/useFileListActions'
import { useBatchPoller } from '@/views/useBatchPoller'

export function useFileUploadOperations({ currentProject, projectOptions, refreshData }) {
  const { deleteFile, checkBatchStatus } = useFileListActions({
    currentProject,
    refreshData
  })

  const { startPolling, stopPolling, isPolling } = useBatchPoller(checkBatchStatus, refreshData)

  const {
    selectedRows,
    batchLoading,
    canBatchParse,
    handleSelectionChange,
    batchDelete,
    batchParse
  } = useBatchActions({ refreshData, startPolling })

  const {
    uploadDialogVisible,
    tempUploadType,
    uploadPhase,
    tempFiles,
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload
  } = useUploadDialog({
    currentProject,
    projectOptions,
    startPolling
  })

  const { startProcessing, cancelProcessing } = useParseActions({ startPolling })

  return {
    deleteFile,
    stopPolling,
    isPolling,
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
  }
}
