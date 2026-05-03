const TASK_STATUS_KIND = {
  PENDING: 'info',
  PROCESSING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  MANUAL_REVIEW: 'manual'
}

const RISK_LEVEL_KIND = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger'
}

const VERIFY_STATUS_KIND = {
  PASS: 'success',
  FAIL: 'danger'
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

export function riskTagType(raw) {
  const key = normalize(raw)
  return RISK_LEVEL_KIND[key] || 'info'
}

export function verifyTagType(raw) {
  const key = normalize(raw)
  return VERIFY_STATUS_KIND[key] || 'info'
}

export function stageTagType(raw) {
  const key = normalize(raw)
  return STAGE_KIND[key] || 'info'
}

export function normalizeTaskStatus(raw) {
  const key = normalize(raw)
  return key || 'UNKNOWN'
}

