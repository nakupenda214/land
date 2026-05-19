import { computed, reactive, ref, toValue } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useArchiveUploadMeter } from '@/composables/project-list/useArchiveUploadMeter.js'
import { batchUploadFiles } from '@/services/file.service'

/** 归档 Tab：批量上传弹窗状态与提交 */
export function useArchiveFolderUpload(deps) {
  const uploadDialogVisible = ref(false)
  const uploadLoading = ref(false)
  const uploadPhase = ref(null)
  const uploadAbortController = ref(null)
  const uploadForm = reactive({
    fileContextType: 'OTHER',
    phase: 1,
    archiveId: null
  })
  const uploadFiles = ref([])
  const uploadProgress = ref(0)
  const uploadUploadedBytes = ref(0)
  const uploadTotalBytes = ref(0)

  const {
    selectedTotalBytes,
    topFileGroups,
    uploadSpeedText,
    uploadEtaText,
    startUploadSpeedMeter,
    stopUploadSpeedMeter
  } = useArchiveUploadMeter(uploadFiles, uploadUploadedBytes, uploadTotalBytes)

  const isUploadServerProcessing = computed(
    () => uploadLoading.value && uploadPhase.value === 'server_processing'
  )

  const uploadPhaseLabel = computed(() => {
    if (!uploadLoading.value) return ''
    if (uploadPhase.value === 'server_processing') return '处理阶段 · 服务端正在入库'
    return '传输阶段 · 正在上传数据'
  })

  const isUploadAbortError = (error) =>
    axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'

  const handleUploadDialogBeforeClose = (done) => {
    if (!uploadLoading.value) {
      done()
      return
    }
    if (uploadPhase.value === 'server_processing') {
      ElMessage.warning('文件已传至服务器，正在入库与提交后处理，请稍候。此阶段不可取消。')
      return
    }
    uploadAbortController.value?.abort()
    done()
  }

  const clearUploadFiles = () => {
    uploadFiles.value = []
    uploadProgress.value = 0
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0
  }

  const resetUploadForm = () => {
    clearUploadFiles()
    uploadLoading.value = false
    uploadPhase.value = null
    uploadAbortController.value = null
    uploadForm.phase = 1
    deps.syncUploadContextByArchive?.()
    stopUploadSpeedMeter()
  }

  const openUploadDialog = () => {
    const projectId = toValue(deps.projectId)
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    if (!projectId || !selectedArchiveId) {
      ElMessage.warning('请先选择归档夹')
      return
    }
    resetUploadForm()
    uploadDialogVisible.value = true
  }

  const handleUploadFileChange = (_, list) => {
    uploadFiles.value = list
  }

  const handleUploadFileRemove = (_, list) => {
    uploadFiles.value = list
  }

  const removeOneUploadFile = (file) => {
    const uid = file?.uid
    uploadFiles.value = uploadFiles.value.filter((f) => (uid != null ? f.uid !== uid : f !== file))
  }

  const handleBatchUpload = async () => {
    const projectId = toValue(deps.projectId)
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    if (!projectId || !selectedArchiveId) {
      ElMessage.warning('请先选择归档夹')
      return
    }
    if (!uploadFiles.value.length) {
      ElMessage.warning('请先选择文件')
      return
    }

    uploadAbortController.value?.abort()
    const ac = new AbortController()
    uploadAbortController.value = ac

    uploadLoading.value = true
    uploadPhase.value = 'transferring'
    uploadProgress.value = 0
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0
    startUploadSpeedMeter()
    try {
      const formData = new FormData()
      uploadFiles.value.forEach((item) => {
        if (item.raw) formData.append('files', item.raw)
      })

      const params = {
        projectId: Number(projectId),
        fileContextType: uploadForm.fileContextType
      }
      if (params.fileContextType === 'SURVEY_REPORT') {
        params.phase = uploadForm.phase
      }
      if (params.fileContextType === 'OTHER') {
        params.archiveId = Number(selectedArchiveId)
      }

      const res = await batchUploadFiles(formData, {
        params,
        signal: ac.signal,
        onUploadProgress: (event) => {
          const total = Number(event.total || 0)
          const loaded = Number(event.loaded || 0)
          uploadUploadedBytes.value = loaded
          if (total > 0) {
            uploadTotalBytes.value = total
            if (loaded >= total) {
              uploadPhase.value = 'server_processing'
            }
            uploadProgress.value = Math.min(99, Math.round((loaded / total) * 100))
          }
        }
      })
      if (res.data?.code === 200) {
        uploadProgress.value = 100
        if (uploadTotalBytes.value > 0) {
          uploadUploadedBytes.value = uploadTotalBytes.value
        }
        ElMessage.success(
          res.data?.msg ||
          '上传已完成。若未看到新文件，请确认未按状态筛选，或稍候待后处理完成后再刷新。'
        )
        uploadLoading.value = false
        uploadPhase.value = null
        uploadAbortController.value = null
        stopUploadSpeedMeter()
        uploadDialogVisible.value = false
        await deps.onUploadSuccess?.()
      } else {
        ElMessage.warning(res.data?.msg || '文件上传失败')
      }
    } catch (error) {
      if (isUploadAbortError(error)) {
        ElMessage.info('已取消上传')
      } else {
        console.error('文件上传失败:', error)
        const backendMsg =
          error?.response?.data?.msg ||
          error?.response?.data?.message ||
          error?.message ||
          '文件上传失败'
        ElMessage.error(backendMsg)
      }
    } finally {
      uploadLoading.value = false
      uploadPhase.value = null
      uploadAbortController.value = null
      stopUploadSpeedMeter()
    }
  }

  return {
    uploadDialogVisible,
    uploadForm,
    uploadFiles,
    uploadLoading,
    uploadProgress,
    uploadUploadedBytes,
    uploadTotalBytes,
    selectedTotalBytes,
    topFileGroups,
    uploadSpeedText,
    uploadEtaText,
    isUploadServerProcessing,
    uploadPhaseLabel,
    uploadPhase,
    handleUploadDialogBeforeClose,
    clearUploadFiles,
    resetUploadForm,
    openUploadDialog,
    handleUploadFileChange,
    handleUploadFileRemove,
    removeOneUploadFile,
    handleBatchUpload,
    stopUploadSpeedMeter,
    syncUploadFormArchiveId: (archiveId) => {
      uploadForm.archiveId = archiveId ? Number(archiveId) : null
    }
  }
}
