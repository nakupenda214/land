import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

export function useProjectEditManagement({
  activeTab,
  filterProject,
  currentProjectInfo,
  fetchProjectList,
  fetchProjectDetail
}) {
  const projectEditRef = ref(null)
  const setProjectEditRef = (formRef) => {
    projectEditRef.value = formRef
  }

  const projectEditLoading = ref(false)
  const projectUpdateForm = reactive({
    id: '',
    projectName: '',
    projectCode: '',
    location: '',
    landArea: null,
    plannedUse: '',
    projectTime: '',
    remark: ''
  })

  const projectEditRules = reactive({
    id: [{ required: true, message: '项目ID不能为空', trigger: 'blur' }],
    projectTime: [{ required: false, message: '项目时间格式错误', trigger: 'change' }]
  })

  const fetchProjectOriginalData = async (projectId) => {
    if (!projectId) return

    try {
      const res = await axios.post('/api/project/projects/query', {
        projectId: Number(projectId)
      })

      const projectOriginal = res?.data?.data?.records?.[0]
      if (res?.data?.code === 200 && projectOriginal) {
        projectUpdateForm.id = projectOriginal.id
        projectUpdateForm.projectName = projectOriginal.projectName || ''
        projectUpdateForm.projectCode = projectOriginal.projectCode || ''
        projectUpdateForm.location = projectOriginal.location || ''
        projectUpdateForm.landArea = projectOriginal.landArea || null
        projectUpdateForm.plannedUse = projectOriginal.plannedUse || ''
        projectUpdateForm.projectTime = projectOriginal.projectTime || ''
        projectUpdateForm.remark = projectOriginal.remark || ''
      }
    } catch (error) {
      console.error('拉取项目原始数据失败:', error)
      ElMessage.error('拉取项目原始数据失败，无法编辑')
    }
  }

  const refreshProjectRelatedData = async () => {
    if (!filterProject.value) return

    try {
      await fetchProjectList()
      await fetchProjectDetail(filterProject.value)
      await fetchProjectOriginalData(filterProject.value)
    } catch (error) {
      console.error('刷新项目关联数据失败:', error)
      ElMessage.warning('项目信息更新成功，但关联数据刷新失败，可手动刷新页面')
    }
  }

  const submitProjectUpdate = async () => {
    if (!projectEditRef.value) return

    if (!projectUpdateForm.id) {
      ElMessage.warning('项目ID异常，请重新选择项目后再试')
      return
    }

    try {
      await projectEditRef.value.validate()
    } catch {
      ElMessage.warning('表单校验失败，请检查填写内容')
      return
    }

    projectEditLoading.value = true
    try {
      const requestData = {
        id: projectUpdateForm.id,
        projectName: projectUpdateForm.projectName,
        projectCode: projectUpdateForm.projectCode,
        location: projectUpdateForm.location,
        landArea: projectUpdateForm.landArea,
        plannedUse: projectUpdateForm.plannedUse,
        projectTime: projectUpdateForm.projectTime,
        remark: projectUpdateForm.remark
      }

      const res = await axios.put('/api/project/update', requestData)
      if (res.data.code === 0 || res.data.code === 200 || res.data.code === 201) {
        ElMessage.success('项目信息更新成功')
        await refreshProjectRelatedData()
      } else {
        ElMessage.error(`项目信息更新失败：${res.data.msg || '后端业务处理异常'}`)
      }
    } catch (error) {
      console.error('提交项目更新失败:', error)
      ElMessage.error('提交项目更新失败，请检查接口或网络')
    } finally {
      projectEditLoading.value = false
    }
  }

  const resetProjectForm = () => {
    if (!projectEditRef.value) return

    projectEditRef.value.clearValidate()
    Object.assign(projectUpdateForm, {
      projectCode: '',
      location: '',
      landArea: null,
      plannedUse: '',
      projectTime: '',
      remark: ''
    })

    if (filterProject.value) {
      fetchProjectOriginalData(filterProject.value)
    }

    ElMessage.info('表单已重置')
  }

  watch(activeTab, (newVal) => {
    if (newVal === 'projectEdit' && filterProject.value) {
      fetchProjectOriginalData(filterProject.value)
    }
  })

  watch(
    () => currentProjectInfo.id,
    (newProjectId, oldProjectId) => {
      if (!newProjectId || newProjectId === oldProjectId) return
      if (activeTab.value === 'projectEdit') {
        fetchProjectOriginalData(newProjectId)
      }
    }
  )

  return {
    projectEditLoading,
    projectUpdateForm,
    projectEditRules,
    setProjectEditRef,
    fetchProjectOriginalData,
    submitProjectUpdate,
    resetProjectForm
  }
}
