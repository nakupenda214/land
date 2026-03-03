import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { queryFiles } from '@/services/file.service'

export function useFileTableQuery(currentProject) {
  const fileTableData = ref([])
  const tableLoading = ref(false)

  const filterStatus = ref('')
  const filterFileName = ref('')
  const filterFileType = ref('')

  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  const formatUploadTime = (timeStr) => {
    if (!timeStr) return '未知时间'
    return timeStr.replace('T', ' ').split('.')[0]
  }

  const refreshData = async () => {
    if (!currentProject.value) {
      fileTableData.value = []
      return
    }

    tableLoading.value = true
    try {
      const queryParams = {
        projectId: currentProject.value,
        originalName: filterFileName.value || null,
        fileContextType: filterFileType.value || null,
        fileState: filterStatus.value || null,
        pageNum: currentPage.value,
        pageSize: pageSize.value
      }
      const res = await queryFiles(queryParams)

      const list = []
      let pageTotal = 0
      let rawList = []

      if (Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (res.data.data && Array.isArray(res.data.data.records)) {
        rawList = res.data.data.records
        pageTotal = res.data.data.total || 0
      } else if (res.data.data && Array.isArray(res.data.data.rows)) {
        rawList = res.data.data.rows
        pageTotal = res.data.data.total || 0
      } else if (res.data.data && Array.isArray(res.data.data.list)) {
        rawList = res.data.data.list
        pageTotal = res.data.data.total || 0
      }

      total.value = pageTotal

      if (res.data.code === 200) {
        rawList.forEach((item) => {
          let fileType = 'survey'
          if (item.fileContextType === 'CONTRACT') fileType = 'contract'
          if (item.fileContextType === 'SURVEY_REPORT') fileType = 'survey'

          list.push({
            id: item.id,
            rawId: item.id,
            fileId: item.gridfsId,
            preprocessGridfsId: item.preprocessGridfsId || '',
            name: item.originalName || '未命名文件',
            uploadTime: item.uploadTime ? formatUploadTime(item.uploadTime) : '未知时间',
            type: fileType,
            phase: null,
            status: item.fileState || 'WAITING_PARSE',
            errorMessage: item.parseMessage,
            thumbnailUrl: item.thumbGridfsId
              ? `/api/file/download/gridfs/${item.thumbGridfsId}`
              : 'https://placehold.co/150/e0e0e0/808080?text=NoThumb'
          })
        })
      }

      fileTableData.value = list
    } catch (error) {
      console.error(error)
    } finally {
      tableLoading.value = false
    }
  }

  const resetFilter = () => {
    filterFileName.value = ''
    filterFileType.value = ''
    filterStatus.value = ''
    refreshData()
  }

  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    refreshData()
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
    refreshData()
  }

  const handleRefresh = () => {
    refreshData()
    ElMessage.info('正在刷新数据...')
  }

  return {
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
  }
}

