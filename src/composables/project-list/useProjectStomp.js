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

export function useProjectStomp({ projectIdRef, activeRef, onFileUpdate, onBatchUploadUpdate, onConnected }) {
  let client = null
  let subscriptions = []
  let currentProjectId = ''
  let isDisconnecting = false
  let reconnectAttempts = 0
  let reconnectTimer = null
  const maxReconnectAttempts = 5
  const connectionState = ref('idle')
  const reconnectCount = ref(0)

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
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

  const subscribeProjectTopics = (projectId) => {
    if (!client || !projectId) return
    unsubscribeAll()

    const fileTopic = `/topic/project/${projectId}/file-updates`
    const batchTopic = `/topic/project/${projectId}/batch-upload-updates`

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
  }

  const scheduleReconnect = (projectId) => {
    if (isDisconnecting || reconnectTimer || !shouldStayConnected(projectId)) return
    if (reconnectAttempts >= maxReconnectAttempts) {
      // eslint-disable-next-line no-console
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
        debug: () => {}
      })

      client.onConnect = () => {
        reconnectAttempts = 0
        reconnectCount.value = 0
        connectionState.value = 'connected'
        subscribeProjectTopics(projectId)
        if (typeof onConnected === 'function') {
          Promise.resolve(onConnected(String(projectId || ''))).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('STOMP connected callback failed:', error)
          })
        }
      }

      client.onWebSocketClose = (event) => {
        if (isDisconnecting) return
        // eslint-disable-next-line no-console
        console.warn('STOMP websocket closed:', event?.code, event?.reason || '')
        connectionState.value = 'disconnected'
        scheduleReconnect(projectId)
      }

      client.onWebSocketError = (event) => {
        // eslint-disable-next-line no-console
        console.error('STOMP websocket error:', event)
        connectionState.value = 'error'
        scheduleReconnect(projectId)
      }

      client.onStompError = (frame) => {
        // eslint-disable-next-line no-console
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
        disconnect()
        return
      }
      reconnectAttempts = 0
      connect(pid, false)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    disconnect,
    connectionState,
    reconnectCount,
    maxReconnectAttempts
  }
}
