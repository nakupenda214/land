const TASK_STATUS_KIND = {
  PENDING: 'info',
  PROCESSING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  MANUAL_REVIEW: 'manual'
}

const STAGE_KIND = {
  INGEST: 'info',
  DIAGNOSIS: 'info',
  PLAN: 'info',
  EXECUTE: 'warning',
  VERIFY: 'warning',
  RELEASE: 'success',
  PRECIPITATION: 'success'
}

function normalize(raw) {
  return String(raw || '').trim().toUpperCase()
}

export function statusPillClass(raw) {
  const key = normalize(raw)
  return `status-pill status-pill--${TASK_STATUS_KIND[key] || 'default'}`
}

export function stageTagType(raw) {
  const key = normalize(raw)
  return STAGE_KIND[key] || 'info'
}

export function normalizeTaskStatus(raw) {
  const key = normalize(raw)
  return key || 'UNKNOWN'
}

