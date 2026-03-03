import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { batchUploadFiles } from '@/services/file.service'

export function useUploadDialog({
  currentProject,
  projectOptions,
  startPolling,
  uploadApi = batchUploadFiles
}) {
  const uploadDialogVisible = ref(false)
  const tempUploadType = ref('SURVEY_REPORT')
  const uploadPhase = ref(1)
  const tempFiles = ref([])
  const uploadRef = ref(null)

  const clearUploadSelection = () => {
    tempFiles.value = []
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
  }

  const openUploadDialog = () => {
    clearUploadSelection()
    uploadPhase.value = 1
    uploadDialogVisible.value = true
  }

  const handleFileChange = (_, fileList) => {
    tempFiles.value = fileList
  }

  const handleFileRemove = (_, fileList) => {
    tempFiles.value = fileList
  }

  const handleUploadDialogClosed = () => {
    clearUploadSelection()
  }

  const handleRealUpload = () => {
    if (!currentProject.value) return ElMessage.warning('请先选择作业项目')
    if (tempFiles.value.length === 0) return ElMessage.warning('请至少选择一个文件')

    const uploadFiles = [...tempFiles.value]

    ElMessage.success(`上传任务已提交！${uploadFiles.length} 个文件正在后台处理，可继续上传其他文件`)

    uploadDialogVisible.value = false
    clearUploadSelection()

    const formData = new FormData()
    uploadFiles.forEach((file) => {
      if (file.raw) {
        formData.append('files', file.raw)
      }
    })

    uploadApi(formData, {
      params: {
        projectId: currentProject.value,
        fileContextType: tempUploadType.value,
        phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : undefined
      }
    })
      .then((res) => {
        if (res.data && res.data.code === 200) {
          ElMessage.success('文件上传成功')
          startPolling()
        } else {
          const errorMsg = res.data?.msg || '服务器返回异常，上传失败'
          ElMessage.error(`上传失败：${errorMsg}`)
        }
      })
      .catch((err) => {
        let errorMsg = '未知错误，上传失败'
        if (err.response?.data?.msg) {
          errorMsg = err.response.data.msg
        } else if (err.message) {
          errorMsg = err.message
        }
        ElMessage.error(`上传失败：${errorMsg}`)
      })
  }

  const confirmUpload = () => {
    if (tempFiles.value.length === 0) return ElMessage.warning('请先选择文件')

    const typeName = tempUploadType.value === 'CONTRACT' ? '合同文件' : '实测报告'
    const projectName =
      projectOptions.value.find((p) => p.id === currentProject.value)?.name || '未知项目'

    const msg = `
      <div style="text-align: left; font-size: 14px;">
        <p style="margin-bottom: 8px;">请核对本次上传任务信息：</p>
        <ul style="list-style: none; padding-left: 10px; background: #f5f7fa; padding: 10px; border-radius: 4px;">
          <li><strong>文件数量：</strong> <span style="color: #409EFF; font-weight: bold; font-size: 16px;">${tempFiles.value.length}</span> 份</li>
          <li><strong>归属项目：</strong> ${projectName}</li>
          ${tempUploadType.value === 'SURVEY_REPORT' ? `<li><strong>所属期数：</strong> <span style="color: #E6A23C; font-weight: bold;">第 ${uploadPhase.value} 期</span></li>` : ''}
          <li><strong>文件类型：</strong> <span style="color: #F56C6C; font-weight: bold;">${typeName}</span></li>
        </ul>
        <p style="margin-top: 10px; color: #909399; font-size: 12px;">确认无误后系统将自动开始解析数据。</p>
      </div>
    `

    ElMessageBox.confirm(msg, '确认开始上传？', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确认并上传',
      cancelButtonText: '再检查一下',
      type: 'info',
      center: true
    })
      .then(() => {
        handleRealUpload()
      })
      .catch(() => {})
  }

  return {
    uploadDialogVisible,
    tempUploadType,
    uploadPhase,
    tempFiles,
    uploadRef,
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload
  }
}
