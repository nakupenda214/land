import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  clearAgentMemorySummary,
  clearAgentSessionMessages,
  deleteAgentMemorySession,
  getAgentMemoryConfig,
  listAgentMemoryMessages,
  listAgentMemorySessions,
  refreshAgentMemorySummary,
  updateAgentMemoryConfig,
} from '@/services/agent-management.service.js'
import {
  buildHighlightedMemoryMessageHtml,
  formatAgentMemoryTimestamp,
  memoryMessageContentNeedsExpandButton,
} from '@/utils/memory-message-present.js'

export function useMemoryManagementPanel() {
  /** 与后端 {@code getMemoryConfig} 子集一致；其余项见 landcheck.agent.memory */
  const cfg = reactive({
    workingCandidateMessages: 40,
    workingTopMessages: 6,
    workingRecentMessages: 2,
    workingMaxChars: 4000,
    summarySourceMessages: 24,
    summaryMaxChars: 1200,
    summaryRefreshIntervalMs: 120000,
    vectorTopK: 8,
    vectorMinSimilarity: 0.22,
    lifecycleEnabled: false,
    sessionTtlMs: 0,
    maxMessagesPerThread: 0,
    maxMessageBytesPerThread: 0,
    cleanupCron: '0 0 3 * * *',
  })

  const loadingCfg = ref(false)
  const savingCfg = ref(false)
  const loadingSessions = ref(false)
  const loadingMessages = ref(false)
  const sessions = ref([])
  const keyword = ref('')

  const selectedThreadId = ref('')
  const messageKeyword = ref('')
  const messageRole = ref('')
  const messages = ref([])
  const messageTotal = ref(0)
  const messagePageNum = ref(1)
  const messagePageSize = ref(20)
  const messageViewerVisible = ref(false)
  const viewingMessageContent = ref('')

  const selectedSession = computed(
    () => sessions.value.find((s) => s.threadId === selectedThreadId.value) || null
  )

  async function loadConfig() {
    loadingCfg.value = true
    try {
      const data = (await getAgentMemoryConfig()) || {}
      Object.assign(cfg, data)
    } catch (e) {
      ElMessage.error(e?.message || '加载记忆配置失败')
    } finally {
      loadingCfg.value = false
    }
  }

  async function saveConfig() {
    savingCfg.value = true
    try {
      const body = {
        workingCandidateMessages: Number(cfg.workingCandidateMessages || 40),
        workingTopMessages: Number(cfg.workingTopMessages || 6),
        workingRecentMessages: Number(cfg.workingRecentMessages || 2),
        workingMaxChars: Number(cfg.workingMaxChars || 4000),
        summarySourceMessages: Number(cfg.summarySourceMessages || 24),
        summaryMaxChars: Number(cfg.summaryMaxChars || 1200),
        summaryRefreshIntervalMs: Number(cfg.summaryRefreshIntervalMs || 120000),
        vectorTopK: Number(cfg.vectorTopK ?? 8),
        vectorMinSimilarity: Number(cfg.vectorMinSimilarity ?? 0.22),
        lifecycleEnabled: !!cfg.lifecycleEnabled,
        sessionTtlMs: Number(cfg.sessionTtlMs ?? 0),
        maxMessagesPerThread: Number(cfg.maxMessagesPerThread ?? 0),
        maxMessageBytesPerThread: Number(cfg.maxMessageBytesPerThread ?? 0),
        cleanupCron: String(cfg.cleanupCron || '0 0 3 * * *'),
      }
      const latest = await updateAgentMemoryConfig(body)
      Object.assign(cfg, latest || {})
      ElMessage.success('记忆配置已更新')
    } catch (e) {
      ElMessage.error(e?.message || '保存记忆配置失败')
    } finally {
      savingCfg.value = false
    }
  }

  async function loadMessages() {
    if (!selectedThreadId.value) return
    loadingMessages.value = true
    try {
      const res = await listAgentMemoryMessages(
        selectedThreadId.value,
        messagePageNum.value,
        messagePageSize.value,
        messageKeyword.value,
        messageRole.value
      )
      messages.value = res?.records || []
      messageTotal.value = Number(res?.total || 0)
    } catch (e) {
      ElMessage.error(e?.message || '加载会话记忆明细失败')
      messages.value = []
      messageTotal.value = 0
    } finally {
      loadingMessages.value = false
    }
  }

  async function loadSessions() {
    loadingSessions.value = true
    try {
      sessions.value = (await listAgentMemorySessions(200, keyword.value)) || []
      if (!sessions.value.length) {
        selectedThreadId.value = ''
        messages.value = []
        messageTotal.value = 0
        return
      }
      if (
        !selectedThreadId.value ||
        !sessions.value.some((it) => it.threadId === selectedThreadId.value)
      ) {
        selectedThreadId.value = sessions.value[0].threadId
        messagePageNum.value = 1
        await loadMessages()
      }
    } catch (e) {
      ElMessage.error(e?.message || '加载会话摘要失败')
      sessions.value = []
      selectedThreadId.value = ''
    } finally {
      loadingSessions.value = false
    }
  }

  async function selectSession(item) {
    const tid = item?.threadId
    if (!tid || tid === selectedThreadId.value) return
    selectedThreadId.value = tid
    messagePageNum.value = 1
    await loadMessages()
  }

  function onMessagePageChange(page) {
    messagePageNum.value = page
    loadMessages()
  }

  function onMessageSizeChange(size) {
    messagePageSize.value = size
    messagePageNum.value = 1
    loadMessages()
  }

  function onFilterChange() {
    messagePageNum.value = 1
    loadMessages()
  }

  function highlightMessage(text) {
    return buildHighlightedMemoryMessageHtml(text, messageKeyword.value)
  }

  function messageNeedsExpand(content) {
    return memoryMessageContentNeedsExpandButton(content)
  }

  function openContentViewer(content) {
    viewingMessageContent.value = String(content || '')
    messageViewerVisible.value = true
  }

  async function refreshSummary(row) {
    const tid = row?.threadId || selectedThreadId.value
    if (!tid) return
    try {
      await refreshAgentMemorySummary(tid)
      ElMessage.success('摘要已刷新')
      await loadSessions()
    } catch (e) {
      ElMessage.error(e?.message || '刷新摘要失败')
    }
  }

  async function clearSummary(row) {
    const tid = row?.threadId || selectedThreadId.value
    if (!tid) return
    try {
      await clearAgentMemorySummary(tid)
      ElMessage.success('摘要已清空')
      await loadSessions()
    } catch (e) {
      ElMessage.error(e?.message || '清空摘要失败')
    }
  }

  async function clearAllMessages() {
    const tid = selectedThreadId.value
    if (!tid) return
    try {
      await ElMessageBox.confirm('将删除该会话下全部消息（保留会话头），是否继续？', '清空会话消息', {
        type: 'warning',
        confirmButtonText: '清空',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await clearAgentSessionMessages(tid)
      ElMessage.success('会话消息已清空')
      await Promise.all([loadSessions(), loadMessages()])
    } catch (e) {
      ElMessage.error(e?.message || '清空会话消息失败')
    }
  }

  async function deleteSession() {
    const tid = selectedThreadId.value
    if (!tid) return
    try {
      await ElMessageBox.confirm('将删除该会话及全部消息，不可恢复，是否继续？', '删除会话', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await deleteAgentMemorySession(tid)
      ElMessage.success('会话已删除')
      selectedThreadId.value = ''
      await loadSessions()
    } catch (e) {
      ElMessage.error(e?.message || '删除会话失败')
    }
  }

  function formatTs(v) {
    return formatAgentMemoryTimestamp(v)
  }

  onMounted(async () => {
    await Promise.all([loadConfig(), loadSessions()])
  })

  return {
    cfg,
    loadingCfg,
    savingCfg,
    loadConfig,
    saveConfig,
    loadingSessions,
    sessions,
    keyword,
    loadSessions,
    selectSession,
    selectedThreadId,
    messageKeyword,
    messageRole,
    messages,
    loadingMessages,
    messageTotal,
    messagePageNum,
    messagePageSize,
    loadMessages,
    onMessagePageChange,
    onMessageSizeChange,
    onFilterChange,
    selectedSession,
    openContentViewer,
    messageViewerVisible,
    viewingMessageContent,
    highlightMessage,
    messageNeedsExpand,
    refreshSummary,
    clearSummary,
    clearAllMessages,
    deleteSession,
    formatTs,
  }
}
