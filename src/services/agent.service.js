import axios from 'axios'

export const chatAgent = (payload) =>
  axios.post('/api/agent/chat', payload)

export const chatAgentStream = async ({
  payload,
  signal,
  onMeta,
  onDelta,
  onDone,
  onStage,
  onToolCall,
  onToolResult,
  onGuardrail,
  onEvent
}) => {
  const response = await fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal,
    credentials: 'same-origin'
  })

  if (!response.ok || !response.body) {
    throw new Error(`SSE请求失败: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const consumeEvent = (rawEvent) => {
    if (!rawEvent) return
    const lines = rawEvent.split('\n')
    const dataText = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')
    if (!dataText) return
    try {
      const payloadData = JSON.parse(dataText)
      const kind = String(payloadData?.kind || '').toLowerCase()
      onEvent?.(payloadData)
      if (kind === 'meta') onMeta?.(payloadData)
      if (kind === 'delta') onDelta?.(payloadData)
      if (kind === 'done') onDone?.(payloadData)
      if (kind === 'stage') onStage?.(payloadData)
      if (kind === 'tool_call') onToolCall?.(payloadData)
      if (kind === 'tool_result') onToolResult?.(payloadData)
      if (kind === 'guardrail') onGuardrail?.(payloadData)
    } catch {
      // ignore malformed chunk
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    events.forEach(consumeEvent)
  }

  if (buffer.trim()) {
    consumeEvent(buffer.trim())
  }
}
