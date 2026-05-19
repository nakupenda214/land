/** 归档文件列表：状态文案与行内操作按钮可见性 */

export const ARCHIVE_FILE_STATE_LABELS = {
  UPLOADING: '上传中',
  WAITING_POST_PROCESS: '上传中',
  WAITING_PARSE: '待解析',
  PENDING: '待处理',
  PARSING: '解析中',
  PARSE_FAIL: '解析失败',
  PARSE_COMPLETE: '解析完成',
  UNPARSEABLE: '不可解析',
  AUDITING: '审核中',
  AUDIT_PASS: '审核通过',
  AUDIT_FAIL: '审核失败'
}

export const PARSE_SCENE_TO_STATE = {
  PARSE_PENDING: 'PENDING',
  PARSE_START: 'PARSING',
  PARSE_SUCCESS: 'PARSE_COMPLETE',
  PARSE_FAILED: 'PARSE_FAIL',
  PARSE_FAIL: 'PARSE_FAIL'
}

export function getArchiveFileStateLabel(state) {
  return ARCHIVE_FILE_STATE_LABELS[state] || state || '-'
}

export function showArchiveParseButton(row) {
  return ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row?.fileState)
}

export function showArchiveCancelParseButton(row) {
  return ['PENDING', 'PARSING'].includes(row?.fileState)
}

export function showArchiveAuditButton(row, _selectedArchiveKind = '') {
  return ['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL', 'AUDIT_PASS'].includes(row?.fileState)
}

export function archiveParseButtonText(row) {
  if (row?.fileState === 'PARSE_FAIL') return '重试解析'
  if (row?.fileState === 'PARSE_COMPLETE') return '重新解析'
  return '开始解析'
}
