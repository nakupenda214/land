import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getParsedSurveyReportsByProject, queryProjectAreaComparison } from '@/services/project.service'
import { getApiErrorMessage } from '@/utils/apiErrorMessage'
import { queryFiles } from '@/services/file.service'

function normalizeVerifiedFlag(value) {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

const COMPARISON_GROUP_KEYS = ['systemCalculated', 'projectPartyDeclared', 'planningCalculated']

const createEmptyTripleLines = () => ({
  totalBuilding: { contractAgreedArea: null, buildableArea: null, difference: null },
  commercial: { contractAgreedArea: null, buildableArea: null, difference: null },
  residential: { contractAgreedArea: null, buildableArea: null, difference: null }
})

const createEmptyAreaComparison = () => ({
  systemCalculated: createEmptyTripleLines(),
  projectPartyDeclared: createEmptyTripleLines(),
  planningCalculated: createEmptyTripleLines(),
  consistencyFlags: [],
  dataCompleteness: {
    systemCalculatedAvailable: false,
    projectPartyDeclaredAvailable: false,
    planningCalculatedAvailable: false
  }
})

export function useSurveySummary({ reportList: _reportList }) {
  const rawTableData = ref([])
  const unknownUsages = ref([])
  const isSavingPolicy = ref(false)
  const displayTableData = computed(() => rawTableData.value)
  const requestSeq = ref(0)
  const areaComparison = ref(createEmptyAreaComparison())
  const selectedComparisonGroups = ref([...COMPARISON_GROUP_KEYS])
  const uploadedSurveyReportTotal = ref(0)

  const surveyStats = computed(() => {
    const verifiedCount = rawTableData.value.filter((item) => normalizeVerifiedFlag(item.isVerified) === 1).length
    const unverifiedCount = rawTableData.value.filter((item) => normalizeVerifiedFlag(item.isVerified) === 0).length
    return {
      total: Number(uploadedSurveyReportTotal.value || 0),
      success: rawTableData.value.length,
      verified: verifiedCount,
      unverified: unverifiedCount
    }
  })

  const fetchUnknownUsages = async (projectId) => {
    try {
      const res = await axios.get(`/api/usage-config/unknown/project/${projectId}`)
      if (res.data?.code === 200 && Array.isArray(res.data?.data)) {
        unknownUsages.value = res.data.data.map((item) => ({ ...item, selectedTarget: '' }))
        return
      }
      unknownUsages.value = []
    } catch (error) {
      console.error('未知用途加载失败:', error)
      unknownUsages.value = []
    }
  }

  const fetchUploadedSurveyReportTotal = async (projectId) => {
    if (!projectId) return 0
    try {
      const res = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        projectId: Number(projectId),
        fileContextType: 'SURVEY_REPORT'
      })
      const total = Number(res?.data?.data?.total || 0)
      return Number.isFinite(total) ? total : 0
    } catch (error) {
      console.error('查询已上传实测报告总数失败:', error)
      return 0
    }
  }

  const fetchSurveyReports = async (projectId) => {
    if (!projectId) {
      resetSummaryMetrics()
      return
    }

    const currentSeq = ++requestSeq.value

    rawTableData.value = []
    unknownUsages.value = []

    try {
      const [surveyRes, uploadedTotal, comparisonRes] = await Promise.all([
        getParsedSurveyReportsByProject(projectId),
        fetchUploadedSurveyReportTotal(projectId),
        queryProjectAreaComparison(projectId)
      ])
      if (currentSeq !== requestSeq.value) return true

      uploadedSurveyReportTotal.value = uploadedTotal
      areaComparison.value =
        comparisonRes?.data?.code === 200 && comparisonRes?.data?.data
          ? comparisonRes.data.data
          : createEmptyAreaComparison()

      if (surveyRes.data?.code !== 200 || !Array.isArray(surveyRes.data?.data)) {
        rawTableData.value = []
        return true
      }

      const surveyData = surveyRes.data.data
      rawTableData.value = surveyData.map((item) => ({
        id: item.id || '-',
        fileRecordId:
          item.fileRecordId ||
          item.fileId ||
          item.file_record_id ||
          item.sourceFileRecordId ||
          item.source_file_record_id ||
          '',
        archiveId: item.archiveId || item.archive_id || '',
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
        fileOriginalName: item.fileOriginalName || item.originalName || '-',
        remarks: item.remark || '-',
        pendingConfirmArea: item.pendingConfirmArea || 0,
        unknownUsages: item.unknownUsages || '[]',
        unknownUsageCount: item.unknownUsageCount || 0,
        isVerified: normalizeVerifiedFlag(item.isVerified),
        hasUnknownUsage: item.hasUnknownUsage || 0,
        verificationErrorReason: item.verificationErrorReason || '-',
        roomInfoBuildingAreaSum: item.roomInfoBuildingAreaSum || 0,
        roomInfoInnerAreaSum: item.roomInfoInnerAreaSum || 0,
        roomInfoBalconyAreaSum: item.roomInfoBalconyAreaSum || 0,
        roomInfoSharedAreaSum: item.roomInfoSharedAreaSum || 0
      }))

      const hasUnknown = surveyData.some((item) => Number(item.hasUnknownUsage) === 1)
      if (hasUnknown) {
        await fetchUnknownUsages(projectId)
      } else {
        unknownUsages.value = []
      }
      return true
    } catch (error) {
      if (currentSeq !== requestSeq.value) return true
      console.error('拉取汇总表数据失败:', error)
      resetSummaryMetrics()
      ElMessage.error(getApiErrorMessage(error, '汇总表数据加载失败，请重试'))
      return false
    }
  }

  const resetSummaryMetrics = () => {
    rawTableData.value = []
    unknownUsages.value = []
    uploadedSurveyReportTotal.value = 0
    areaComparison.value = createEmptyAreaComparison()
    selectedComparisonGroups.value = [...COMPARISON_GROUP_KEYS]
  }

  return {
    rawTableData,
    unknownUsages,
    isSavingPolicy,
    displayTableData,
    areaComparison,
    selectedComparisonGroups,
    surveyStats,
    fetchSurveyReports,
    resetSummaryMetrics
  }
}
