import { ElLoading, ElMessage } from 'element-plus'
import { getFilesByProject } from '@/services/file.service'

export function useProjectFileCollections({ reportList, contractList }) {
  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const createFetchProjectData = ({ getProjectOptions, getCurrentProjectInfo }) => {
    return async (projectId) => {
      if (!projectId) return { contractCount: 0, reportCount: 0 }

      const loading = ElLoading.service({
        lock: true,
        text: '加载项目文件数据中...',
        background: 'rgba(0, 0, 0, 0.1)'
      })

      try {
        const res = await getFilesByProject(projectId)
        if (res.data.code === 200 && Array.isArray(res.data.data)) {
          const fileList = res.data.data

          const currentProjectInfo = getCurrentProjectInfo()
          const projectOptions = getProjectOptions()
          currentProjectInfo.id = projectId
          currentProjectInfo.name =
            projectOptions.find((p) => p.id === projectId)?.name || `未知项目(${projectId})`
          currentProjectInfo.code = `XM-${String(projectId).padStart(3, '0')}`

          contractList.value = fileList
            .filter(
              (file) =>
                file.fileContextType === 'CONTRACT' ||
                (file.originalName && file.originalName.includes('合同'))
            )
            .map((file) => ({
              name: file.originalName || '未命名合同.pdf',
              type: '土地出让',
              no: '-',
              date: file.uploadTime ? file.uploadTime.split('T')[0] : '-',
              fileId: file.gridfsId
            }))

          reportList.value = fileList
            .filter(
              (file) =>
                file.fileContextType === 'SURVEY_REPORT' ||
                (file.originalName &&
                  (file.originalName.includes('报告') || file.originalName.includes('实测')))
            )
            .map((file) => ({
              name: file.originalName || '未命名实测报告.pdf',
              build: '-',
              version: 1,
              size: formatFileSize(file.fileSize),
              fileId: file.gridfsId
            }))

          return {
            contractCount: contractList.value.length,
            reportCount: reportList.value.length
          }
        }
      } catch (error) {
        console.error('拉取文件数据失败:', error)
        ElMessage.error('拉取文件数据失败，请重试')
      } finally {
        loading.close()
      }

      return { contractCount: 0, reportCount: 0 }
    }
  }

  return {
    createFetchProjectData
  }
}
