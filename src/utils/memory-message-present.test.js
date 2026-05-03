import { describe, expect, it } from 'vitest'
import {
  buildHighlightedMemoryMessageHtml,
  escapeHtmlForMemoryMessage,
  formatAgentMemoryTimestamp,
  memoryMessageContentNeedsExpandButton,
} from './memory-message-present.js'

describe('escapeHtmlForMemoryMessage', () => {
  it('escapes HTML special chars', () => {
    expect(escapeHtmlForMemoryMessage('<a>')).toBe('&lt;a&gt;')
  })
})

describe('buildHighlightedMemoryMessageHtml', () => {
  it('returns escaped text when keyword empty', () => {
    expect(buildHighlightedMemoryMessageHtml('hello', '')).toBe('hello')
  })

  it('wraps keyword with mark', () => {
    const html = buildHighlightedMemoryMessageHtml('foo bar foo', 'foo')
    expect(html).toContain('<mark class="kw-highlight">')
    expect(html).toContain('foo')
  })
})

describe('memoryMessageContentNeedsExpandButton', () => {
  it('returns false for blank', () => {
    expect(memoryMessageContentNeedsExpandButton('')).toBe(false)
  })

  it('returns true for newlines or long text', () => {
    expect(memoryMessageContentNeedsExpandButton('a\nb')).toBe(true)
    expect(memoryMessageContentNeedsExpandButton('x'.repeat(80))).toBe(true)
  })
})

describe('formatAgentMemoryTimestamp', () => {
  it('returns dash for invalid', () => {
    expect(formatAgentMemoryTimestamp(null)).toBe('—')
    expect(formatAgentMemoryTimestamp(0)).toBe('—')
  })

  it('formats finite ms', () => {
    const s = formatAgentMemoryTimestamp(1700000000000)
    expect(s).not.toBe('—')
    expect(s.length).toBeGreaterThan(4)
  })
})
