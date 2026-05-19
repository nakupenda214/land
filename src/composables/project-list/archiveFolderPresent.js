/** 归档 Tab：筛选选项、格式化与表格展示辅助 */

export const ARCHIVE_VERIFY_STATUS_OPTIONS = [
  { label: '已通过', value: 'PASSED' },
  { label: '未通过', value: 'FAILED' },
  { label: '未校验', value: 'UNVERIFIED' }
]

export const ARCHIVE_FILE_STATE_OPTIONS = [
  { label: '上传中', value: 'WAITING_POST_PROCESS' },
  { label: '上传中', value: 'UPLOADING' },
  { label: '待解析', value: 'WAITING_PARSE' },
  { label: '待处理', value: 'PENDING' },
  { label: '解析中', value: 'PARSING' },
  { label: '解析失败', value: 'PARSE_FAIL' },
  { label: '解析完成', value: 'PARSE_COMPLETE' },
  { label: '不可解析', value: 'UNPARSEABLE' },
  { label: '审核中', value: 'AUDITING' },
  { label: '审核通过', value: 'AUDIT_PASS' },
  { label: '审核失败', value: 'AUDIT_FAIL' }
]

export function formatArchiveFileSize(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function formatArchiveDateTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text
}

export function getArchiveStateTagType(state) {
  if (state === 'PARSE_COMPLETE' || state === 'AUDIT_PASS') return 'success'
  if (state === 'PARSE_FAIL' || state === 'AUDIT_FAIL' || state === 'UNPARSEABLE') return 'danger'
  if (state === 'PARSING' || state === 'AUDITING') return 'warning'
  return 'info'
}

export function getArchiveVerifyStatus(row) {
  const value = row?.isVerified
  if (value === 1 || value === '1' || value === true) {
    return { label: '已通过', type: 'success' }
  }
  if (value === 0 || value === '0' || value === false) {
    return { label: '未通过', type: 'danger' }
  }
  return { label: '未校验', type: 'info' }
}

function shouldSkipArchiveThumbnail(row) {
  const contextType = String(row?.fileContextType || '').toUpperCase()
  if (contextType === 'PROJECT_PARTY_SURVEY_SUMMARY') return true
  const fileType = String(row?.fileType || '').toUpperCase()
  return fileType === 'XLS' || fileType === 'XLSX'
}

export function getArchiveThumbnailUrl(row) {
  if (shouldSkipArchiveThumbnail(row)) return ''
  if (row?.thumbGridfsId) return `/api/file/download/gridfs/${row.thumbGridfsId}`
  return ''
}

export function getArchiveThumbnailPreviewList(row) {
  const src = getArchiveThumbnailUrl(row)
  return src ? [src] : []
}

export function archiveUploadFileDisplayName(item) {
  return String(item?.raw?.name ?? item?.name ?? '未命名文件')
}

export function archiveUploadFileSize(item) {
  const raw = item?.raw ?? item
  return Number(raw?.size ?? item?.size ?? 0)
}
