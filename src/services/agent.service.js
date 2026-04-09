import axios from 'axios'

/** 将 SSE kind 统一为小写字符串。 */
function normalizeStreamKind(payloadData) {
  if (!payloadData || typeof payloadData !== 'object') return ''
  const raw = payloadData.kind
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw).toLowerCase()
  }
  return ''
}

export const chatAgent = (payload) =>
  axios.post('/api/agent/chat', payload)

/**
 * 与后端 AgentStreamEvent.Kind 对齐：ingress（DTO 预留）、llm、tool_call、tool_result、final_answer、error。
 * 当前服务端流式首包为 kind=llm 且常带 payload.phase=start，不单独发 ingress。
 */
export const chatAgentStream = async ({
  payload,
  signal,
  onFinal,
  onToolCall,
  onToolResult,
  onEvent,
  onIngress,
  onLlm,
  onError
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
    const lines = rawEvent.split(/\r?\n/)
    const dataText = lines
      .filter((line) => line.trimStart().startsWith('data:'))
      .map((line) => line.trimStart().slice(5).trim())
      .join('\n')
    if (!dataText) return
    try {
      const payloadData = JSON.parse(dataText)
      const kind = normalizeStreamKind(payloadData)

      // 总线：原始事件始终透出，便于调试或自定义处理
      onEvent?.(payloadData)

      // 硬切换：仅分发新协议事件
      switch (kind) {
        case 'ingress':
          onIngress?.(payloadData)
          break
        case 'llm':
          onLlm?.(payloadData)
          break
        case 'tool_call':
          onToolCall?.(payloadData)
          break
        case 'tool_result':
          onToolResult?.(payloadData)
          break
        case 'final_answer':
          onFinal?.(payloadData)
          break
        case 'error':
          onError?.(payloadData)
          break
        default:
          break
      }
    } catch {
      // 忽略损坏分片
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    events.forEach(consumeEvent)
  }

  if (buffer.trim()) {
    consumeEvent(buffer.trim())
  }
}
