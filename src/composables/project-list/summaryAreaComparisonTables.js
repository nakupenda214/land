/**
 * 房产实测汇总：打印/导出/弹窗预览共用的「面积核算对比」附表数据
 */

import { formatAreaDigits } from '@/composables/project-list/summaryExportColumnSchema.js'

export const SUMMARY_COMPARISON_GROUP_META = [
  { key: 'systemCalculated', title: '实测报告对比结果' },
  { key: 'projectPartyDeclared', title: '项目方统计比对结果' },
  { key: 'planningCalculated', title: '规划复核对比结果' }
]

function formatComparisonArea(value) {
  return formatAreaDigits(value, '-')
}

function buildComparisonRows(tripleLine) {
  return [
    {
      label: '建筑面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.totalBuilding?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.totalBuilding?.buildableArea),
      difference: formatComparisonArea(tripleLine?.totalBuilding?.difference)
    },
    {
      label: '商业面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.commercial?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.commercial?.buildableArea),
      difference: formatComparisonArea(tripleLine?.commercial?.difference)
    },
    {
      label: '住宅面积',
      contractAgreedArea: formatComparisonArea(tripleLine?.residential?.contractAgreedArea),
      buildableArea: formatComparisonArea(tripleLine?.residential?.buildableArea),
      difference: formatComparisonArea(tripleLine?.residential?.difference)
    }
  ]
}

/**
 * @param {Record<string, unknown>} areaComparison
 * @param {string[]} selectedKeys 如 systemCalculated
 * @returns {Array<{ key: string, title: string, rows: ReturnType<typeof buildComparisonRows> }>}
 */
export function buildSelectedComparisonGroups(areaComparison, selectedKeys) {
  const keys = Array.isArray(selectedKeys) ? selectedKeys : []
  return SUMMARY_COMPARISON_GROUP_META.filter((meta) => keys.includes(meta.key)).map((meta) => ({
    key: meta.key,
    title: meta.title,
    rows: buildComparisonRows(areaComparison?.[meta.key])
  }))
}
