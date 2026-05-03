import { describe, expect, it } from 'vitest'
import {
  extractPlannerNodeOutputFromEvents,
  parsePlanPreviewModel,
} from './agent-plan-preview.js'

describe('parsePlanPreviewModel', () => {
  it('returns empty mode for blank input', () => {
    expect(parsePlanPreviewModel('')).toEqual({
      mode: 'empty',
      thoughtProcess: '',
      steps: [],
      pretty: '',
    })
  })

  it('parses execution_plan steps with snake_case keys', () => {
    const json = JSON.stringify({
      thought_process: 't',
      execution_plan: [
        { step: 1, tool_to_use: 'MQL', tool_parameters: { instruction: 'do thing' } },
      ],
    })
    const r = parsePlanPreviewModel(json)
    expect(r.mode).toBe('steps')
    expect(r.thoughtProcess).toBe('t')
    expect(r.steps).toHaveLength(1)
    expect(r.steps[0].step).toBe(1)
    expect(r.steps[0].toolToUse).toBe('MQL')
    expect(r.steps[0].instruction).toContain('do thing')
  })
})

describe('extractPlannerNodeOutputFromEvents', () => {
  it('returns planner_node_output from last STATE_PATCH', () => {
    const events = [
      { type: 'STATE_PATCH', payload: { keys: { planner_node_output: '{"a":1}' } } },
    ]
    expect(extractPlannerNodeOutputFromEvents(events)).toBe('{"a":1}')
  })

  it('returns empty for non-array', () => {
    expect(extractPlannerNodeOutputFromEvents(null)).toBe('')
  })
})
