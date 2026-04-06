import { computed } from 'vue'

export function useFileUploadConstants() {
  const statusMap = {
    UPLOADING: { text: 'Uploading', color: '#909399' },
    WAITING_PARSE: { text: 'Waiting Parse', color: '#909399' },
    PENDING: { text: 'Queued', color: '#409EFF' },
    PARSING: { text: 'Parsing', color: '#409EFF' },
    PARSE_FAIL: { text: 'Parse Failed', color: '#F56C6C' },
    PARSE_COMPLETE: { text: 'Parse Complete', color: '#67C23A' },
    UNPARSEABLE: { text: 'Unparseable', color: '#E6A23C' },
    AUDITING: { text: 'Auditing', color: '#E6A23C' },
    AUDIT_PASS: { text: 'Audit Passed', color: '#67C23A' },
    AUDIT_FAIL: { text: 'Audit Failed', color: '#F56C6C' }
  }

  const usageCategoryMap = {
    RESIDENTIAL: '住宅',
    COMMERCIAL: '商业',
    MANAGEMENT: '物管',
    COMMUNITY: '社区用房',
    OTHER_BUILDABLE: '其他计容',
    OTHER_PUBLIC: '其他公用',
    UNKNOWN: '未知'
  }

  const usageCategoryReverseMap = {
    住宅: 'RESIDENTIAL',
    商业: 'COMMERCIAL',
    '商业/办公': 'COMMERCIAL',
    物管: 'MANAGEMENT',
    物管用房: 'MANAGEMENT',
    社区用房: 'COMMUNITY',
    其他计容: 'OTHER_BUILDABLE',
    其他公用: 'OTHER_PUBLIC',
    未知: 'UNKNOWN'
  }

  return {
    statusMap,
    usageCategoryMap,
    usageCategoryReverseMap
  }
}

export function useAuditSummaryDisplay(auditSummaryData) {
  const auditSummaryDisplay = computed(() => ({
    isVerifiedText: auditSummaryData.isVerified === 1 ? '已验证' : '未验证',
    hasUnknownUsageText: auditSummaryData.hasUnknownUsage === 1 ? '有' : '无'
  }))

  return { auditSummaryDisplay }
}
