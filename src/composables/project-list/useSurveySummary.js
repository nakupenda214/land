import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getParsedSurveyReportsByProject } from '@/services/project.service'
import { queryFiles } from '@/services/file.service'

function normalizeVerifiedFlag(value) {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

function formatRatio(commercial, residential) {
  const c = Number(commercial || 0)
  const r = Number(residential || 0)
  if (c <= 0 && r <= 0) return '-'
  if (r <= 0) return '∞ : 1'
  return `${c.toFixed(2)} : ${r.toFixed(2)}`
}

function calcMeasuredByRule(surveyData) {
  const totalCommercial = surveyData.reduce((sum, item) => sum + Number(item.actualCommercialArea || 0), 0)
  const totalResidential = surveyData.reduce((sum, item) => sum + Number(item.actualResidentialArea || 0), 0)
  const totalManagement = surveyData.reduce((sum, item) => sum + Number(item.actualManagementRoomArea || 0), 0)
  const totalOtherBuildable = surveyData.reduce((sum, item) => sum + Number(item.actualOtherBuildableArea || 0), 0)
  const pooledArea = totalManagement + totalOtherBuildable

  const base = totalCommercial + totalResidential
  let pooledToCommercial = 0
  let pooledToResidential = 0

  if (base > 0) {
    pooledToCommercial = (pooledArea * totalCommercial) / base
    pooledToResidential = pooledArea - pooledToCommercial
  }

  const measuredCommercial = totalCommercial + pooledToCommercial
  const measuredResidential = totalResidential + pooledToResidential
  const measuredBuilding = measuredCommercial + measuredResidential

  return {
    measuredBuilding,
    measuredCommercial,
    measuredResidential,
    totalCommercial,
    totalResidential,
    totalManagement,
    totalOtherBuildable,
    pooledArea,
    pooledToCommercial,
    pooledToResidential
  }
}

export function useSurveySummary({ reportList }) {
  const businessResidentialRatio = reactive({ contractRatio: '≥2:8', measuredRatio: '-' })
  const comparisonData = reactive([
    { label: '合同约定建筑面积', contract: '-', measured: '-', diff: '-', isArea: true },
    { label: '合同约定商业面积', contract: '-', measured: '-', diff: '-', isArea: true },
    { label: '合同约定住宅面积', contract: '-', measured: '-', diff: '-', isArea: true }
  ])

  const tableTotalData = computed(() => {
    return [...comparisonData]
  })

  const rawTableData = ref([])
  const unknownUsages = ref([])
  const isSavingPolicy = ref(false)
  const displayTableData = computed(() => rawTableData.value)
  const requestSeq = ref(0)
  const uploadedSurveyReportTotal = ref(0)
  const measuredDebugSums = ref({
    commercial: 0,
    residential: 0,
    management: 0,
    otherBuildable: 0,
    pooledArea: 0,
    pooledToCommercial: 0,
    pooledToResidential: 0,
    measuredCommercial: 0,
    measuredResidential: 0
  })

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

const fetchContractMetrics = async (projectId) => {
  const zero = { totalArea: 0, residentialArea: 0, commercialArea: 0 }
  try {
    const summaryRes = await axios.get(`/api/project/contracts/area-summary/${Number(projectId)}`)
    if (summaryRes?.data?.code !== 200 || !summaryRes?.data?.data) return zero
    return {
      totalArea: Number(summaryRes.data.data.totalArea || 0),
      residentialArea: Number(summaryRes.data.data.residentialArea || 0),
      commercialArea: Number(summaryRes.data.data.commercialArea || 0)
    }
  } catch (error) {
    console.error('获取合同汇总指标失败:', error)
    return zero
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
      const [surveyRes, contractMetrics, uploadedTotal] = await Promise.all([
        getParsedSurveyReportsByProject(projectId),
        fetchContractMetrics(projectId),
        fetchUploadedSurveyReportTotal(projectId)
      ])
      if (currentSeq !== requestSeq.value) return

      uploadedSurveyReportTotal.value = uploadedTotal

      if (surveyRes.data?.code !== 200 || !Array.isArray(surveyRes.data?.data)) {
        rawTableData.value = []
        return
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

      const measuredMetrics = calcMeasuredByRule(surveyData)
      measuredDebugSums.value = {
        commercial: Number(measuredMetrics.totalCommercial || 0),
        residential: Number(measuredMetrics.totalResidential || 0),
        management: Number(measuredMetrics.totalManagement || 0),
        otherBuildable: Number(measuredMetrics.totalOtherBuildable || 0),
        pooledArea: Number(measuredMetrics.pooledArea || 0),
        pooledToCommercial: Number(measuredMetrics.pooledToCommercial || 0),
        pooledToResidential: Number(measuredMetrics.pooledToResidential || 0),
        measuredCommercial: Number(measuredMetrics.measuredCommercial || 0),
        measuredResidential: Number(measuredMetrics.measuredResidential || 0)
      }

      const totalContractArea = Number(contractMetrics.totalArea || 0)
      const contractCommercial = Number(contractMetrics.commercialArea || 0)
      const contractResidential = Number(contractMetrics.residentialArea || 0)

      comparisonData[0].contract = totalContractArea.toFixed(2)
      comparisonData[0].measured = measuredMetrics.measuredBuilding.toFixed(2)
      comparisonData[0].diff = (totalContractArea - measuredMetrics.measuredBuilding).toFixed(2)

      comparisonData[1].contract = contractCommercial.toFixed(2)
      comparisonData[1].measured = measuredMetrics.measuredCommercial.toFixed(2)
      comparisonData[1].diff = (contractCommercial - measuredMetrics.measuredCommercial).toFixed(2)

      comparisonData[2].contract = contractResidential.toFixed(2)
      comparisonData[2].measured = measuredMetrics.measuredResidential.toFixed(2)
      comparisonData[2].diff = (contractResidential - measuredMetrics.measuredResidential).toFixed(2)

      businessResidentialRatio.contractRatio = formatRatio(contractCommercial, contractResidential)
      businessResidentialRatio.measuredRatio = formatRatio(measuredMetrics.measuredCommercial, measuredMetrics.measuredResidential)

      const hasUnknown = surveyData.some((item) => Number(item.hasUnknownUsage) === 1)
      if (hasUnknown) {
        await fetchUnknownUsages(projectId)
      } else {
        unknownUsages.value = []
      }
    } catch (error) {
      if (currentSeq !== requestSeq.value) return
      console.error('拉取汇总表数据失败:', error)
      resetSummaryMetrics()
      ElMessage.error('汇总表数据加载失败，请重试')
    }
  }

  const resetSummaryMetrics = () => {
    rawTableData.value = []
    unknownUsages.value = []
    uploadedSurveyReportTotal.value = 0
    measuredDebugSums.value = {
      commercial: 0,
      residential: 0,
      management: 0,
      otherBuildable: 0,
      pooledArea: 0,
      pooledToCommercial: 0,
      pooledToResidential: 0,
      measuredCommercial: 0,
      measuredResidential: 0
    }
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
    measuredDebugSums,
    surveyStats,
    fetchSurveyReports,
    resetSummaryMetrics
  }
}
