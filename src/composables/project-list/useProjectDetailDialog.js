import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSurveyRoomInfo } from '@/services/project.service'

const usageCategoryMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业/办公',
  MANAGEMENT: '物管用房',
  COMMUNITY: '社区用房',
  OTHER_BUILDABLE: '其他计容',
  OTHER_PUBLIC: '其他公用',
  UNKNOWN: '未知'
}

export function useProjectDetailDialog({ currentProjectInfo, rawTableData }) {
  const roomSumInfo = reactive({
    buildingAreaSum: '0.00',
    innerAreaSum: '0.00',
    balconyAreaSum: '0.00',
    sharedAreaSum: '0.00'
  })

  const detailDialogVisible = ref(false)
  const roomInfoData = ref([])
  const detailLoading = ref(false)

  const viewDetail = async (row) => {
    if (!currentProjectInfo.id || !row.id) {
      ElMessage.warning('缺少项目/报告ID，无法查看详情')
      return
    }

    detailLoading.value = true
    detailDialogVisible.value = true

    try {
      const summaryRow = rawTableData.value.find((item) => item.id === row.id)
      if (summaryRow) {
        roomSumInfo.buildingAreaSum = summaryRow.roomInfoBuildingAreaSum?.toFixed(2) || '0.00'
        roomSumInfo.innerAreaSum = summaryRow.roomInfoInnerAreaSum?.toFixed(2) || '0.00'
        roomSumInfo.balconyAreaSum = summaryRow.roomInfoBalconyAreaSum?.toFixed(2) || '0.00'
        roomSumInfo.sharedAreaSum = summaryRow.roomInfoSharedAreaSum?.toFixed(2) || '0.00'
      } else {
        roomSumInfo.buildingAreaSum = '0.00'
        roomSumInfo.innerAreaSum = '0.00'
        roomSumInfo.balconyAreaSum = '0.00'
        roomSumInfo.sharedAreaSum = '0.00'
      }

      const res = await getSurveyRoomInfo(currentProjectInfo.id, row.id)
      if (res.data.code === 200 && Array.isArray(res.data.data)) {
        roomInfoData.value = res.data.data.map((item) => ({
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
      } else {
        roomInfoData.value = []
        ElMessage.warning('暂无户室面积数据')
      }
    } catch (error) {
      console.error('获取户室面积失败：', error)
      ElMessage.error('获取户室面积数据失败，请重试')
      roomInfoData.value = []
    } finally {
      detailLoading.value = false
    }
  }

  return {
    roomSumInfo,
    detailDialogVisible,
    roomInfoData,
    detailLoading,
    viewDetail
  }
}
