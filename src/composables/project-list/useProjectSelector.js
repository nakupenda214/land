import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { queryProjects } from '@/services/project.service'

export function useProjectSelector({ fetchProjectData, fetchSurveyReports }) {
  const filterProject = ref('')
  const projectOptions = ref([])

  const currentProjectInfo = reactive({
    id: '',
    name: '请选择项目',
    code: '-',
    status: '-'
  })

  const fetchProjects = async () => {
    try {
      const res = await queryProjects({
        pageNum: 1,
        pageSize: 500,
        sortField: 'updateTime',
        sortDirection: 'desc'
      })
      if (res.data?.code === 200) {
        const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
        projectOptions.value = records.map((item) => {
          const idStr = String(item.id ?? '')
          return {
            id: idStr,
            name: item.projectName || '',
            code: item.projectCode || `XM-${idStr.padStart(3, '0')}`,
            projectTime: item.projectTime || '',
            updateTime: item.updateTime || null
          }
        })
      }
    } catch (error) {
      console.error('获取项目列表失败:', error)
    }
  }

  const fetchProjectDetail = async (projectId) => {
    if (!projectId) return

    const projectItem = projectOptions.value.find((p) => p.id === projectId)
    if (projectItem) {
      currentProjectInfo.id = projectId
      currentProjectInfo.name = projectItem.name
      currentProjectInfo.code = projectItem.code || `XM-${String(projectId).padStart(3, '0')}`
      currentProjectInfo.status = '已归档'
    }

    try {
      const { contractCount = 0, reportCount = 0 } = (await fetchProjectData(projectId)) || {}
      await fetchSurveyReports(projectId)
      ElMessage.success(`数据加载完成：合同 ${contractCount} 份，实测报告 ${reportCount} 份`)
    } catch (error) {
      console.error('数据加载异常:', error)
      ElMessage.warning('部分数据加载失败，请稍后重试')
    }
  }

  return {
    filterProject,
    projectOptions,
    currentProjectInfo,
    fetchProjects,
    fetchProjectDetail
  }
}
