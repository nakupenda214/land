import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { refreshSurveyReportsByProject } from '@/services/project.service'

const categoryMap = {
  calcCommercial: { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  calcResidential: { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  calcPropMgmt: { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  calcOther: { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  nonCalcCommunity: { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  nonCalcOther: { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
}

export function parseUnknownUsageNames(unknownUsagesJson) {
  try {
    const raw = unknownUsagesJson
    const arr = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw
    if (!Array.isArray(arr)) return []
    const set = new Set()
    for (const x of arr) {
      const s = String(x ?? '').trim()
      if (s) set.add(s)
    }
    return [...set]
  } catch {
    return []
  }
}

/**
 * 智能审核对话框内：将当前报告涉及的未知用途配置为已知用途
 */
export function useCalibrationUnknownUsagePolicy({
  dialogOpen,
  projectId,
  auditSummaryData,
  handleRefreshSurveyReport
}) {
  const rows = ref([])
  const loading = ref(false)
  const savingId = ref(null)

  const nameSet = computed(() => {
    const json = auditSummaryData.value?.unknownUsages
    return new Set(parseUnknownUsageNames(json))
  })

  const shouldLoad = computed(() => {
    if (!dialogOpen.value) return false
    const pid = String(projectId.value || '').trim()
    if (!pid) return false
    if (nameSet.value.size === 0) return false
    return true
  })

  const loadRows = async () => {
    const pid = String(projectId.value || '').trim()
    if (!pid || nameSet.value.size === 0) {
      rows.value = []
      return
    }
    loading.value = true
    try {
      const res = await axios.get(`/api/usage-config/unknown/project/${pid}`)
      const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
      const names = nameSet.value
      rows.value = list
        .filter((item) => names.has(String(item.usageName || '').trim()))
        .map((item) => ({ ...item, selectedTarget: '' }))
    } catch (error) {
      console.error('加载审核页未知用途失败:', error)
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    [dialogOpen, projectId, () => auditSummaryData.value?.unknownUsages, shouldLoad],
    async () => {
      if (!shouldLoad.value) {
        rows.value = []
        return
      }
      await loadRows()
    },
    { flush: 'post' }
  )

  const saveRule = async (row) => {
    if (!row?.selectedTarget) {
      ElMessage.warning('请先选择归属分类')
      return
    }
    const mapping = categoryMap[row.selectedTarget]
    if (!mapping) {
      ElMessage.error('归属分类无效')
      return
    }
    const pid = String(projectId.value || '').trim()
    savingId.value = row.id
    try {
      const res = await axios.post('/api/usage-config/create-from-unknown', null, {
        params: {
          unknownUsageId: row.id,
          usageCategory: mapping.usageCategory,
          floorAreaType: mapping.floorAreaType,
          isRegex: 1,
          priority: 1000
        }
      })
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '保存失败')
        return
      }
      if (pid) {
        await refreshSurveyReportsByProject(pid)
      }
      await handleRefreshSurveyReport.value?.()
      ElMessage.success(`已纳入已知用途：${row.usageName || ''}`)
      await loadRows()
    } catch (error) {
      console.error(error)
      ElMessage.error(error?.response?.data?.msg || '保存失败')
    } finally {
      savingId.value = null
    }
  }

  return {
    calibrationUnknownRows: rows,
    calibrationUnknownLoading: loading,
    savingCalibrationUnknownId: savingId,
    saveCalibrationUnknownRule: saveRule,
    reloadCalibrationUnknownRows: loadRows
  }
}
