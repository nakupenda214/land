import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getParsedSurveyReportsByProject } from '@/services/project.service'

export function useSurveySummary({ reportList }) {
  const businessResidentialRatio = reactive({ contractRatio: '≥2:8', measuredRatio: '-' })
  const comparisonData = reactive([
    { label: '合同约定建筑面积', contract: '-', measured: '-', diff: '-', isArea: true },
    { label: '合同约定商业面积', contract: '-', measured: '-', diff: '-', isArea: true },
    { label: '合同约定住宅面积', contract: '-', measured: '-', diff: '-', isArea: true }
  ])

  const tableTotalData = computed(() => {
    const ratioRow = {
      label: '商住比',
      contract: businessResidentialRatio.contractRatio,
      measured: businessResidentialRatio.measuredRatio,
      diff: '-',
      isArea: false
    }
    return [ratioRow, ...comparisonData]
  })

  const rawTableData = ref([])
  const unknownUsages = ref([])
  const isSavingPolicy = ref(false)

  const displayTableData = computed(() => rawTableData.value)

  const surveyStats = computed(() => {
    const verifiedCount = rawTableData.value.filter((item) => item.isVerified === 1).length
    const unverifiedCount = rawTableData.value.filter((item) => item.isVerified === 0).length
    return {
      total: reportList.value.length,
      success: rawTableData.value.length,
      verified: verifiedCount,
      unverified: unverifiedCount
    }
  })

  const fetchUnknownUsages = async (projectId) => {
    try {
      const res = await axios.get(`/api/usage-config/unknown/project/${projectId}`)
      if (res.data.code === 200 && res.data.data) {
        unknownUsages.value = res.data.data.map((item) => ({ ...item, selectedTarget: '' }))
      }
    } catch (error) {
      console.error('未知用途加载失败', error)
    }
  }

  const fetchSurveyReports = async (projectId) => {
    if (!projectId) return

    try {
      const res = await getParsedSurveyReportsByProject(projectId)
      if (res.data.code === 200 && Array.isArray(res.data.data)) {
        const surveyData = res.data.data

        rawTableData.value = surveyData.map((item) => ({
          id: item.id || '-',
          projectName: item.buildingName || '未知楼栋',
          certNo: item.propertyCertificateNumber || '-',
          contractNo: item.propertyAreaConfirmationNoticeNumber || '-',
          phase: item.phase || '-',
          totalArea: (item.actualTotalBuildingArea || 0).toFixed(2),
          calcCommercial: (item.actualCommercialArea || 0).toFixed(2),
          calcResidential: (item.actualResidentialArea || 0).toFixed(2),
          calcPropMgmt: (item.actualManagementRoomArea || 0).toFixed(2),
          calcOther: (item.actualOtherBuildableArea || 0).toFixed(2),
          nonCalcCommunity: (item.actualCommunityArea || 0).toFixed(2),
          nonCalcOther: (item.actualOtherPublicArea || 0).toFixed(2),
          reportNo: item.realEstateSurveyReportNumber || '-',
          remarks: item.remark || '-',
          pendingConfirmArea: item.pendingConfirmArea || 0,
          unknownUsages: item.unknownUsages || '[]',
          unknownUsageCount: item.unknownUsageCount || 0,
          isVerified: item.isVerified || 0,
          hasUnknownUsage: item.hasUnknownUsage || 0,
          verificationErrorReason: item.verificationErrorReason || '-',
          roomInfoBuildingAreaSum: item.roomInfoBuildingAreaSum || 0,
          roomInfoInnerAreaSum: item.roomInfoInnerAreaSum || 0,
          roomInfoBalconyAreaSum: item.roomInfoBalconyAreaSum || 0,
          roomInfoSharedAreaSum: item.roomInfoSharedAreaSum || 0
        }))

        const totalContractArea = 0
        const totalMeasuredArea = surveyData.reduce((sum, item) => sum + Number(item.actualTotalBuildingArea || 0), 0)
        const totalCommercial = surveyData.reduce((sum, item) => sum + Number(item.actualCommercialArea || 0), 0)
        const totalResidential = surveyData.reduce((sum, item) => sum + Number(item.actualResidentialArea || 0), 0)

        comparisonData[0].contract = totalContractArea.toFixed(2)
        comparisonData[0].measured = totalMeasuredArea.toFixed(2)
        comparisonData[0].diff = (totalMeasuredArea - totalContractArea).toFixed(2)
        comparisonData[1].contract = '0.00'
        comparisonData[1].measured = totalCommercial.toFixed(2)
        comparisonData[1].diff = totalCommercial.toFixed(2)
        comparisonData[2].contract = '0.00'
        comparisonData[2].measured = totalResidential.toFixed(2)
        comparisonData[2].diff = totalResidential.toFixed(2)

        const hasUnknown = surveyData.some((item) => item.hasUnknownUsage === 1)
        if (hasUnknown) {
          await fetchUnknownUsages(projectId)
        } else {
          unknownUsages.value = []
        }
      }
    } catch (error) {
      console.error('拉取汇总表数据失败:', error)
      ElMessage.error('汇总表数据加载失败，请重试')
    }
  }

  const resetSummaryMetrics = () => {
    rawTableData.value = []
    unknownUsages.value = []
    Object.assign(businessResidentialRatio, {
      contractRatio: '≥2:8',
      measuredRatio: '-'
    })
    comparisonData.forEach((item) => {
      item.contract = '0.00'
      item.measured = '0.00'
      item.diff = '0.00'
    })
  }

  return {
    businessResidentialRatio,
    comparisonData,
    tableTotalData,
    rawTableData,
    unknownUsages,
    isSavingPolicy,
    displayTableData,
    surveyStats,
    fetchSurveyReports,
    resetSummaryMetrics
  }
}
