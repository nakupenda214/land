import { ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useRoomEditWorkflow(options = {}) {
  const {
    currentProject,
    realSurveyReportId,
    currentFile,
    roomInfoData,
    roomInfoLoading,
    isEditing,
    editingRowId,
    batchUpdateLoading,
    usageCategoryMap,
    usageCategoryReverseMap,
    auditSummaryData
  } = options

  const localIsEditing = isEditing || ref(false)
  const localEditingRowId = editingRowId || ref('')
  const localBatchUpdateLoading = batchUpdateLoading || ref(false)

  const originalEditingRow = ref(null)
  const roomCreateLoading = ref(false)
  const roomDeleteLoading = ref(false)
  const reportRefreshLoading = ref(false)

  const mapRoomInfoList = (list = []) =>
    list.map((item) => ({
      id: item.id,
      roomLevel: item.roomLevel || '-',
      roomNumber: item.roomNumber || '-',
      buildingArea: Number(item.buildingArea || 0).toFixed(2),
      innerArea: Number(item.innerArea || 0).toFixed(2),
      balconyArea: Number(item.balconyArea || 0).toFixed(2),
      sharedArea: Number(item.sharedArea || 0).toFixed(2),
      isCalculate: Number(item.isCalculate ?? 0),
      usageCategory: usageCategoryMap?.[item.usageCategory] || '未知',
      roomUsage: item.roomUsage || '-',
      floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : item.floorAreaType === 'NON_BUILDABLE' ? '不计容' : '未知',
      remark: item.remark || ''
    }))

  const resolveUsageCategoryForUpdate = (value) => {
    if (!value) return 'UNKNOWN'
    const text = String(value)
    if (
      text === 'RESIDENTIAL' ||
      text === 'COMMERCIAL' ||
      text === 'MANAGEMENT' ||
      text === 'COMMUNITY' ||
      text === 'OTHER_BUILDABLE' ||
      text === 'OTHER_PUBLIC' ||
      text === 'UNKNOWN'
    ) {
      return text
    }
    return usageCategoryReverseMap?.[text] || 'UNKNOWN'
  }

  const resolveFloorAreaTypeForUpdate = (value) => {
    if (!value) return 'UNKNOWN'
    const text = String(value)
    if (text === 'BUILDABLE' || text === 'NON_BUILDABLE' || text === 'UNKNOWN') {
      return text
    }
    if (text === '计容') return 'BUILDABLE'
    if (text === '不计容') return 'NON_BUILDABLE'
    return 'UNKNOWN'
  }

  const resolveUsagePresetByCategory = (category) => {
    const normalized = resolveUsageCategoryForUpdate(category)
    const presetMap = {
      RESIDENTIAL: { roomUsage: '住宅', floorAreaType: 'BUILDABLE' },
      COMMERCIAL: { roomUsage: '商业', floorAreaType: 'BUILDABLE' },
      MANAGEMENT: { roomUsage: '物管', floorAreaType: 'BUILDABLE' },
      OTHER_BUILDABLE: { roomUsage: '其他计容', floorAreaType: 'BUILDABLE' },
      COMMUNITY: { roomUsage: '社区用房', floorAreaType: 'NON_BUILDABLE' },
      OTHER_PUBLIC: { roomUsage: '其他公用', floorAreaType: 'NON_BUILDABLE' },
      UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN' }
    }
    return { usageCategory: normalized, ...(presetMap[normalized] || presetMap.UNKNOWN) }
  }

  const clearEditingState = () => {
    localIsEditing.value = false
    localEditingRowId.value = ''
    originalEditingRow.value = null
  }

  const ensureContext = () => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportId = Number(realSurveyReportId?.value || 0)
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    return {
      projectId,
      surveyReportId,
      fileRecordId,
      ok: Boolean(projectId && surveyReportId && fileRecordId)
    }
  }

  const reloadRoomOnly = async () => {
    const { projectId, surveyReportId } = ensureContext()
    if (!projectId || !surveyReportId) return

    roomInfoLoading.value = true
    try {
      const roomRes = await axios.get(`/api/project/${projectId}/survey-reports/${surveyReportId}/room-info`)
      if (roomRes.data?.code === 200 && Array.isArray(roomRes.data?.data)) {
        roomInfoData.value = mapRoomInfoList(roomRes.data.data)
      } else {
        roomInfoData.value = []
      }
    } catch (error) {
      console.error('重新加载户室数据失败:', error)
      throw error
    } finally {
      roomInfoLoading.value = false
    }
  }

  const reloadSummaryOnly = async () => {
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    if (!fileRecordId) return

    try {
      const summaryRes = await axios.post('/api/project/survey-reports/query', {
        fileRecordId
      })
      const currentSummary = summaryRes?.data?.data?.records?.[0]
      if (!currentSummary || !auditSummaryData) return

      auditSummaryData.pendingConfirmArea = Number(currentSummary.pendingConfirmArea || 0).toFixed(2)
      auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]'
      auditSummaryData.unknownUsageCount = Number(currentSummary.unknownUsageCount || 0)
      auditSummaryData.isVerified = Number(currentSummary.isVerified || 0)
      auditSummaryData.hasUnknownUsage = Number(currentSummary.hasUnknownUsage || 0)
      auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-'
      auditSummaryData.roomInfoBuildingAreaSum = Number(currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSum = Number(currentSummary.roomInfoInnerAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSum = Number(currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSum = Number(currentSummary.roomInfoSharedAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoBuildingAreaSumFromOcr = Number(currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSumFromOcr = Number(currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSumFromOcr = Number(currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSumFromOcr = Number(currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2)
    } catch (error) {
      console.error('重新加载汇总数据失败:', error)
      throw error
    }
  }

  const triggerSurveyReportRefresh = async ({ silent = false } = {}) => {
    const surveyReportId = Number(realSurveyReportId?.value || 0)
    if (!surveyReportId) {
      if (!silent) ElMessage.warning('缺少实测报告ID，无法刷新')
      return false
    }

    reportRefreshLoading.value = true
    try {
      const res = await axios.post(`/api/project/survey-report/${surveyReportId}/refresh`)
      if (res.data?.code !== 200) {
        if (!silent) ElMessage.warning(res.data?.msg || '刷新失败')
        return false
      }
      if (!silent) ElMessage.success(res.data?.msg || '刷新成功')
      return true
    } catch (error) {
      console.error('刷新实测报告失败:', error)
      if (!silent) ElMessage.error(error?.response?.data?.msg || '刷新实测报告失败')
      return false
    } finally {
      reportRefreshLoading.value = false
    }
  }

  const reloadRoomAndSummaryData = async ({ refreshReport = false, silentRefresh = true } = {}) => {
    if (refreshReport) {
      const refreshOk = await triggerSurveyReportRefresh({ silent: silentRefresh })
      if (!refreshOk) return false
    }

    try {
      await Promise.all([reloadSummaryOnly(), reloadRoomOnly()])
      return true
    } catch {
      ElMessage.error('刷新页面数据失败，请重试')
      return false
    }
  }

  const isRowModified = (currentRow, originalRow) => {
    if (!currentRow || !originalRow) return false
    return (
      currentRow.roomLevel !== originalRow.roomLevel ||
      currentRow.roomNumber !== originalRow.roomNumber ||
      currentRow.buildingArea !== originalRow.buildingArea ||
      currentRow.innerArea !== originalRow.innerArea ||
      currentRow.balconyArea !== originalRow.balconyArea ||
      currentRow.sharedArea !== originalRow.sharedArea ||
      currentRow.isCalculate !== originalRow.isCalculate ||
      currentRow.usageCategory !== originalRow.usageCategory ||
      currentRow.roomUsage !== originalRow.roomUsage ||
      currentRow.floorAreaType !== originalRow.floorAreaType ||
      currentRow.remark !== originalRow.remark
    )
  }

  const enterEditMode = (row) => {
    if (!row?.id) {
      ElMessage.warning('缺少户室ID，无法编辑')
      return
    }

    const target = roomInfoData.value.find((item) => String(item.id) === String(row.id))
    if (!target) {
      ElMessage.warning('未找到可编辑的户室行')
      return
    }

    originalEditingRow.value = JSON.parse(JSON.stringify(target))
    localEditingRowId.value = String(target.id)
    localIsEditing.value = true
  }

  const exitEditMode = () => {
    if (!localIsEditing.value || !localEditingRowId.value) {
      clearEditingState()
      return
    }

    ElMessageBox.confirm('确定退出编辑模式吗？未保存的修改将丢失。', '提示', {
      confirmButtonText: '确认退出',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
      .then(() => {
        const idx = roomInfoData.value.findIndex((item) => String(item.id) === String(localEditingRowId.value))
        if (idx >= 0 && originalEditingRow.value) {
          roomInfoData.value[idx] = { ...originalEditingRow.value }
        }
        clearEditingState()
      })
      .catch(() => {})
  }

  const handleSaveData = async () => {
    if (!localIsEditing.value || !localEditingRowId.value) {
      ElMessage.warning('请先选择一行进入编辑')
      return
    }

    const row = roomInfoData.value.find((item) => String(item.id) === String(localEditingRowId.value))
    if (!row?.id) {
      ElMessage.warning('未找到当前编辑行')
      return
    }

    if (!isRowModified(row, originalEditingRow.value)) {
      ElMessage.info('当前行无修改')
      clearEditingState()
      return
    }

    try {
      await ElMessageBox.confirm('确认保存当前户室修改吗？', '提示', {
        confirmButtonText: '确认保存',
        cancelButtonText: '取消',
        type: 'primary'
      })
    } catch {
      return
    }

    localBatchUpdateLoading.value = true
    try {
      const preset = resolveUsagePresetByCategory(row.usageCategory)
      const roomInfoUpdateDTO = {
        id: Number(row.id),
        roomLevel: row.roomLevel || '',
        roomNumber: row.roomNumber || '',
        buildingArea: Number(row.buildingArea || 0),
        innerArea: Number(row.innerArea || 0),
        balconyArea: Number(row.balconyArea || 0),
        sharedArea: Number(row.sharedArea || 0),
        roomUsage: row.roomUsage || preset.roomUsage || '',
        remark: row.remark || '',
        isCalculate: Number(row.isCalculate || 0),
        usageCategory: preset.usageCategory,
        // 面积类型始终由用途类别推导，避免手工编辑造成不一致
        floorAreaType: preset.floorAreaType
      }

      const res = await axios.put('/api/project/room-info/update', roomInfoUpdateDTO)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '保存失败')
        return
      }

      clearEditingState()
      await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: true })
      ElMessage.success('保存成功，已刷新实测报告')
    } catch (error) {
      console.error('保存户室数据失败:', error)
      ElMessage.error(error?.response?.data?.msg || '保存失败，请重试')
    } finally {
      localBatchUpdateLoading.value = false
    }
  }

  const handleCreateRoom = async (payload = {}) => {
    const { projectId, surveyReportId, fileRecordId, ok } = ensureContext()
    if (!ok) {
      ElMessage.warning('缺少项目/文件/报告信息，无法新增户室')
      return false
    }

    roomCreateLoading.value = true
    try {
      const preset = resolveUsagePresetByCategory(payload.usageCategory)
      const body = {
        projectId,
        fileRecordId,
        surveyReportInfoId: surveyReportId,
        usageCategory: preset.usageCategory,
        roomLevel: payload.roomLevel || '',
        roomNumber: payload.roomNumber || '',
        buildingArea: Number(payload.buildingArea || 0),
        innerArea: Number(payload.innerArea || 0),
        balconyArea: Number(payload.balconyArea || 0),
        sharedArea: Number(payload.sharedArea || 0),
        roomUsage: preset.roomUsage,
        remark: payload.remark || '',
        floorAreaType: preset.floorAreaType
      }

      const res = await axios.post('/api/project/room-info/create', body)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '新增户室失败')
        return false
      }

      clearEditingState()
      await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: true })
      ElMessage.success('新增户室成功，已刷新实测报告')
      return true
    } catch (error) {
      console.error('新增户室失败:', error)
      ElMessage.error(error?.response?.data?.msg || '新增户室失败')
      return false
    } finally {
      roomCreateLoading.value = false
    }
  }

  const handleDeleteRoom = async (row) => {
    const roomId = Number(row?.id || 0)
    if (!roomId) {
      ElMessage.warning('缺少户室ID，无法删除')
      return false
    }

    try {
      await ElMessageBox.confirm('确定删除该户室吗？删除后不可恢复。', '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return false
    }

    roomDeleteLoading.value = true
    try {
      const res = await axios.delete(`/api/project/room-info/${roomId}`)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '删除户室失败')
        return false
      }

      clearEditingState()
      await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: true })
      ElMessage.success('删除户室成功，已刷新实测报告')
      return true
    } catch (error) {
      console.error('删除户室失败:', error)
      ElMessage.error(error?.response?.data?.msg || '删除户室失败')
      return false
    } finally {
      roomDeleteLoading.value = false
    }
  }

  const handleRefreshSurveyReport = async () => {
    const ok = await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: false })
    if (ok) {
      ElMessage.success('数据已刷新')
    }
    return ok
  }

  const handleEditUsageCategoryChange = (row) => {
    if (!row) return
    const preset = resolveUsagePresetByCategory(row.usageCategory)
    const displayType =
      preset.floorAreaType === 'BUILDABLE'
        ? '计容'
        : preset.floorAreaType === 'NON_BUILDABLE'
          ? '不计容'
          : '未知'
    row.floorAreaType = displayType
    row.roomUsage = preset.roomUsage
  }

  return {
    enterEditMode,
    exitEditMode,
    handleSaveData,
    clearEditingState,
    handleEditUsageCategoryChange,
    handleRefreshSurveyReport,
    handleCreateRoom,
    handleDeleteRoom,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading
  }
}
