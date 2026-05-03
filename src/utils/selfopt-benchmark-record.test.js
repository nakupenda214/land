import { describe, expect, it } from 'vitest'
import { addBenchmarkRecordToState, formatBenchmarkUpdateTime } from './selfopt-benchmark-record.js'

describe('addBenchmarkRecordToState', () => {
  it('prepends record with updateTime and caps list', () => {
    const existing = { benchmarks: Array.from({ length: 199 }, (_, i) => ({ id: i })) }
    const next = addBenchmarkRecordToState(existing, { caseId: 'new' })
    expect(next.benchmarks[0].caseId).toBe('new')
    expect(typeof next.benchmarks[0].updateTime).toBe('number')
    expect(next.benchmarks.length).toBe(200)
  })
})

describe('formatBenchmarkUpdateTime', () => {
  it('returns dash for falsy', () => {
    expect(formatBenchmarkUpdateTime(0)).toBe('—')
    expect(formatBenchmarkUpdateTime(null)).toBe('—')
  })
})
