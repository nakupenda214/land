import { ElMessage } from 'element-plus'
import axios from 'axios'
import { refreshSurveyReportsByProject } from '@/services/project.service'

export function useUnknownUsagePolicy({
  unknownUsages,
  isSavingPolicy,
  currentProjectInfo,
  fetchSurveyReports
}) {
  const categoryMap = {
    calcCommercial: { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
    calcResidential: { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
    calcPropMgmt: { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
    calcOther: { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
    nonCalcCommunity: { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
    nonCalcOther: { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
  }

  const savePolicy = async () => {
    const validRules = unknownUsages.value.filter((u) => u.selectedTarget)
    if (validRules.length === 0) {
      ElMessage.warning('请至少指定一项归属规则')
      return
    }

    isSavingPolicy.value = true
    try {
      const promises = validRules.map((rule) => {
        const mapping = categoryMap[rule.selectedTarget]
        return axios.post('/api/usage-config/create-from-unknown', null, {
          params: {
            unknownUsageId: rule.id,
            usageCategory: mapping.usageCategory,
            floorAreaType: mapping.floorAreaType,
            isRegex: 1,
            priority: 1000
          }
        })
      })

      await Promise.all(promises)
      ElMessage.success(`成功保存 ${validRules.length} 条规则，正在刷新数据...`)

      await refreshSurveyReportsByProject(currentProjectInfo.id)
      await fetchSurveyReports(currentProjectInfo.id)
    } catch (error) {
      console.error(error)
      ElMessage.error('保存规则失败')
    } finally {
      isSavingPolicy.value = false
    }
  }

  return {
    savePolicy
  }
}
