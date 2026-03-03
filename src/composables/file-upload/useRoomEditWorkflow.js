import { ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useRoomEditWorkflow({
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
}) {
  const originalRoomInfoData = ref([])

  const mapRoomInfoList = (list) =>
    list.map((item) => ({
      id: item.id,
      roomLevel: item.roomLevel || '-',
      roomNumber: item.roomNumber || '-',
      buildingArea: (item.buildingArea || 0).toFixed(2),
      innerArea: (item.innerArea || 0).toFixed(2),
      balconyArea: (item.balconyArea || 0).toFixed(2),
      sharedArea: (item.sharedArea || 0).toFixed(2),
      isCalculate: item.isCalculate || 0,
      usageCategory: usageCategoryMap[item.usageCategory] || '未知',
      roomUsage: item.roomUsage || '-',
      floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
    }))

  const reloadRoomOnly = async () => {
    if (!currentProject.value || !realSurveyReportId.value) return

    roomInfoLoading.value = true
    try {
      const roomRes = await axios.get(
        `/api/project/${currentProject.value}/survey-reports/${realSurveyReportId.value}/room-info`
      )
      if (roomRes.data.code === 200 && Array.isArray(roomRes.data.data)) {
        roomInfoData.value = mapRoomInfoList(roomRes.data.data)
      }
    } catch (error) {
      console.error('重新加载户室数据失败:', error)
      throw error
    } finally {
      roomInfoLoading.value = false
    }
  }

  const getModifiedRoomList = () => {
    const modifiedList = []
    roomInfoData.value.forEach((currentRow, index) => {
      const originalRow = originalRoomInfoData.value[index]
      if (!originalRow) return

      const isModified =
        currentRow.roomLevel !== originalRow.roomLevel ||
        currentRow.roomNumber !== originalRow.roomNumber ||
        currentRow.buildingArea !== originalRow.buildingArea ||
        currentRow.innerArea !== originalRow.innerArea ||
        currentRow.balconyArea !== originalRow.balconyArea ||
        currentRow.sharedArea !== originalRow.sharedArea ||
        currentRow.isCalculate !== originalRow.isCalculate ||
        currentRow.usageCategory !== originalRow.usageCategory ||
        currentRow.roomUsage !== originalRow.roomUsage ||
        currentRow.floorAreaType !== originalRow.floorAreaType

      if (isModified) {
        modifiedList.push(currentRow)
      }
    })
    return modifiedList
  }

  const reloadRoomAndSummaryData = async () => {
    if (!currentProject.value || !realSurveyReportId.value || !currentFile.value) return

    try {
      const summaryRes = await axios.post('/api/project/survey-reports/query', {
        fileRecordId: currentFile.value.rawId
      })
      if (
        summaryRes.data.code === 200 &&
        Array.isArray(summaryRes.data.data.records) &&
        summaryRes.data.data.records.length > 0
      ) {
        const currentSummary = summaryRes.data.data.records[0]
        auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(2)
        auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]'
        auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0
        auditSummaryData.isVerified = currentSummary.isVerified || 0
        auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0
        auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-'
        auditSummaryData.roomInfoBuildingAreaSum = (currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2)
        auditSummaryData.roomInfoInnerAreaSum = (currentSummary.roomInfoInnerAreaSum || 0).toFixed(2)
        auditSummaryData.roomInfoBalconyAreaSum = (currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2)
        auditSummaryData.roomInfoSharedAreaSum = (currentSummary.roomInfoSharedAreaSum || 0).toFixed(2)
        auditSummaryData.roomInfoBuildingAreaSumFromOcr = (currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2)
        auditSummaryData.roomInfoInnerAreaSumFromOcr = (currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2)
        auditSummaryData.roomInfoBalconyAreaSumFromOcr = (currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2)
        auditSummaryData.roomInfoSharedAreaSumFromOcr = (currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2)
      }
    } catch (error) {
      console.error('重新加载汇总数据失败:', error)
    }

    await reloadRoomOnly()
  }

  const enterEditMode = () => {
    if (roomInfoData.value.length === 0) {
      ElMessage.warning('暂无户室数据可编辑')
      return
    }
    originalRoomInfoData.value = JSON.parse(JSON.stringify(roomInfoData.value))
    isEditing.value = true
    ElMessage.info('已进入编辑模式，修改后请点击保存修改')
  }

  const exitEditMode = () => {
    ElMessageBox.confirm('确定退出编辑模式吗？未保存的修改将全部丢失。', '提示', {
      confirmButtonText: '确定退出',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
      .then(async () => {
        isEditing.value = false
        if (currentProject.value && realSurveyReportId.value) {
          try {
            await reloadRoomOnly()
            ElMessage.success('已退出编辑模式，恢复原始数据')
          } catch (error) {
            ElMessage.warning('退出编辑模式成功，但原始数据加载失败')
          }
        }
      })
      .catch(() => {})
  }

  const handleSaveData = async () => {
    if (roomInfoData.value.length === 0) {
      ElMessage.warning('暂无户室数据可保存')
      return
    }
    if (!realSurveyReportId.value) {
      ElMessage.warning('缺少户室面积对照表ID，无法保存')
      return
    }

    const modifiedRoomList = getModifiedRoomList()
    if (modifiedRoomList.length === 0) {
      ElMessage.info('暂无数据修改，无需保存')
      isEditing.value = false
      return
    }

    ElMessageBox.confirm(`确定保存 ${modifiedRoomList.length} 条修改后的户室数据吗？保存后将无法撤销。`, '提示', {
      confirmButtonText: '确定保存',
      cancelButtonText: '取消',
      type: 'primary'
    })
      .then(async () => {
        batchUpdateLoading.value = true
        let successCount = 0
        let failCount = 0

        for (const row of modifiedRoomList) {
          if (!row.id) {
            failCount++
            continue
          }

          const roomInfoUpdateDTO = {
            id: row.id,
            roomLevel: row.roomLevel || '',
            roomNumber: row.roomNumber || '',
            buildingArea: isNaN(Number(row.buildingArea)) ? 0 : Number(row.buildingArea),
            innerArea: isNaN(Number(row.innerArea)) ? 0 : Number(row.innerArea),
            balconyArea: isNaN(Number(row.balconyArea)) ? 0 : Number(row.balconyArea),
            sharedArea: isNaN(Number(row.sharedArea)) ? 0 : Number(row.sharedArea),
            roomUsage: row.roomUsage || '',
            isCalculate: isNaN(Number(row.isCalculate)) ? 0 : Number(row.isCalculate),
            usageCategory: usageCategoryReverseMap[row.usageCategory] || 'UNKNOWN',
            floorAreaType:
              row.floorAreaType === '计容'
                ? 'BUILDABLE'
                : row.floorAreaType === '不计容'
                  ? 'NON_BUILDABLE'
                  : 'UNKNOWN'
          }

          try {
            const res = await axios.put('/api/project/room-info/update', roomInfoUpdateDTO)
            if (res.data.code === 200) {
              successCount++
            } else {
              failCount++
              console.error(`户室ID ${row.id} 保存失败:`, res.data.msg)
            }
          } catch (error) {
            failCount++
            console.error(`户室ID ${row.id} 保存异常:`, error)
          }
        }

        batchUpdateLoading.value = false
        isEditing.value = false

        if (failCount === 0) {
          ElMessage.success(`全部 ${successCount} 条修改数据保存成功`)
        } else {
          ElMessage.warning(`保存完成：成功 ${successCount} 条，失败 ${failCount} 条，请查看控制台日志`)
        }

        await reloadRoomAndSummaryData()
      })
      .catch(() => {})
  }

  return {
    enterEditMode,
    exitEditMode,
    handleSaveData
  }
}
