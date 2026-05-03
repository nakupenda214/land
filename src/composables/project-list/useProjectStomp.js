import { onBeforeUnmount, ref, watch } from 'vue'
import SockJS from 'sockjs-client/dist/sockjs'
import { Client } from '@stomp/stompjs'

function safeParseMessage(frameBody) {
  try {
    return JSON.parse(frameBody || '{}')
  } catch {
    return null
  }
}

export function useProjectStomp({
  projectIdRef,
  activeRef,
  onFileUpdate,
  onBatchUploadUpdate,
  onConnected,
  disconnectGraceMs = 45000
}) {
  let client = null
  let subscriptions = []
  let currentProjectId = ''
  let isDisconnecting = false
  let reconnectAttempts = 0
  let reconnectTimer = null
  let disconnectGraceTimer = null
  const maxReconnectAttempts = 5
  const connectionState = ref('idle')
  const reconnectCount = ref(0)

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const clearDisconnectGraceTimer = () => {
    if (disconnectGraceTimer) {
      clearTimeout(disconnectGraceTimer)
      disconnectGraceTimer = null
    }
  }

  const unsubscribeAll = () => {
    subscriptions.forEach((sub) => {
      try {
        sub.unsubscribe()
      } catch {
        // ignore unsubscribe errors
      }
    })
    subscriptions = []
  }

  const shouldStayConnected = (projectId) => {
    const active = typeof activeRef === 'function' ? Boolean(activeRef()) : true
    const current = typeof projectIdRef === 'function' ? String(projectIdRef() || '') : ''
    return active && current === String(projectId || '')
  }

  const disconnect = async (resetAttempts = true) => {
    isDisconnecting = true
    clearReconnectTimer()
    clearDisconnectGraceTimer()
    if (resetAttempts) {
      reconnectAttempts = 0
      reconnectCount.value = 0
    }
    unsubscribeAll()
    if (!client) {
      isDisconnecting = false
      currentProjectId = ''
      connectionState.value = 'disconnected'
      return
    }

    try {
      await client.deactivate({ force: true })
    } catch {
      // ignore disconnect errors
    } finally {
      client = null
      currentProjectId = ''
      isDisconnecting = false
      connectionState.value = 'disconnected'
    }
  }

  const scheduleGracefulDisconnect = (resetAttempts = true) => {
    if (disconnectGraceMs <= 0) {
      disconnect(resetAttempts)
      return
    }
    if (disconnectGraceTimer) return
    disconnectGraceTimer = setTimeout(() => {
      disconnectGraceTimer = null
      disconnect(resetAttempts)
    }, disconnectGraceMs)
  }

  const subscribeProjectTopics = (projectId) => {
    if (!client || !projectId) return
    unsubscribeAll()

    const fileTopic = `/topic/project/${projectId}/file-updates`
    const batchTopic = `/topic/project/${projectId}/batch-upload-updates`
    const globalFileTopic = '/topic/file-updates'
    const globalBatchTopic = '/topic/batch-upload-updates'

    subscriptions.push(
      client.subscribe(fileTopic, (message) => {
        const payload = safeParseMessage(message.body)
        if (payload && typeof onFileUpdate === 'function') {
          onFileUpdate(payload)
        }
      })
    )

    subscriptions.push(
      client.subscribe(batchTopic, (message) => {
        const payload = safeParseMessage(message.body)
        if (payload && typeof onBatchUploadUpdate === 'function') {
          onBatchUploadUpdate(payload)
        }
      })
    )

    // 兜底订阅全局 topic：当后端广播缺失 projectId 时，避免前端完全收不到状态更新
    subscriptions.push(
      client.subscribe(globalFileTopic, (message) => {
        const payload = safeParseMessage(message.body)
        if (payload && typeof onFileUpdate === 'function') {
          onFileUpdate(payload)
        }
      })
    )

    subscriptions.push(
      client.subscribe(globalBatchTopic, (message) => {
        const payload = safeParseMessage(message.body)
        if (payload && typeof onBatchUploadUpdate === 'function') {
          onBatchUploadUpdate(payload)
        }
      })
    )
  }

  const scheduleReconnect = (projectId) => {
    if (isDisconnecting || reconnectTimer || !shouldStayConnected(projectId)) return
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn(`STOMP reconnect stopped after ${maxReconnectAttempts} attempts`)
      connectionState.value = 'stopped'
      return
    }

    reconnectAttempts += 1
    reconnectCount.value = reconnectAttempts
    connectionState.value = 'reconnecting'
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect(projectId, true)
    }, 2000)
  }

  const connect = (projectId, isReconnect = false) => {
    if (!projectId) return
    if (!isReconnect && client && currentProjectId === projectId) return

    disconnect(!isReconnect).finally(() => {
      if (!shouldStayConnected(projectId)) return

      currentProjectId = String(projectId)
      connectionState.value = isReconnect ? 'reconnecting' : 'connecting'
      client = new Client({
        reconnectDelay: 0,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        webSocketFactory: () => new SockJS('/api/ws'),
        debug: () => { }
      })

      client.onConnect = () => {
        reconnectAttempts = 0
        reconnectCount.value = 0
        connectionState.value = 'connected'
        subscribeProjectTopics(projectId)
        if (typeof onConnected === 'function') {
          Promise.resolve(onConnected(String(projectId || ''))).catch((error) => {
            console.error('STOMP connected callback failed:', error)
          })
        }
      }

      client.onWebSocketClose = (event) => {
        if (isDisconnecting) return
        console.warn('STOMP websocket closed:', event?.code, event?.reason || '')
        connectionState.value = 'disconnected'
        scheduleReconnect(projectId)
      }

      client.onWebSocketError = (event) => {
        console.error('STOMP websocket error:', event)
        connectionState.value = 'error'
        scheduleReconnect(projectId)
      }

      client.onStompError = (frame) => {
        console.error('STOMP broker error:', frame.headers?.message, frame.body)
        connectionState.value = 'error'
        scheduleReconnect(projectId)
      }

      client.activate()
    })
  }

  watch(
    [projectIdRef, activeRef],
    ([projectId, active]) => {
      const pid = String(projectId || '')
      if (!active || !pid) {
        scheduleGracefulDisconnect()
        return
      }
      clearDisconnectGraceTimer()
      reconnectAttempts = 0
      connect(pid, false)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    scheduleGracefulDisconnect()
  })

  return {
    disconnect,
    connectionState,
    reconnectCount,
    maxReconnectAttempts
  }
}
