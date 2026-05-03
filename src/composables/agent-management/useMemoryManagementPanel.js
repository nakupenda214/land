import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  clearAgentMemorySummary,
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
  const cfg = reactive({
    traceBagEnabled: true,
    workingCandidateMessages: 40,
    workingTopMessages: 6,
    workingRecentMessages: 2,
    workingMaxChars: 4000,
    summarySourceMessages: 24,
    summaryMaxChars: 1200,
    summaryRefreshIntervalMs: 120000,
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
  const roleCounts = reactive({ user: 0, assistant: 0 })
  const messageViewerVisible = ref(false)
  const viewingMessageContent = ref('')

  const selectedSession = computed(
    () => sessions.value.find((s) => s.threadId === selectedThreadId.value) || null
  )
  const roleStats = computed(() => {
    const total = Number(messageTotal.value || 0)
    const user = Number(roleCounts.user || 0)
    const assistant = Number(roleCounts.assistant || 0)
    const pct = (x) => (total > 0 ? `${((x * 100) / total).toFixed(1)}%` : '0.0%')
    return {
      user,
      assistant,
      userPct: pct(user),
      assistantPct: pct(assistant),
    }
  })

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
        traceBagEnabled: !!cfg.traceBagEnabled,
        workingCandidateMessages: Number(cfg.workingCandidateMessages || 40),
        workingTopMessages: Number(cfg.workingTopMessages || 6),
        workingRecentMessages: Number(cfg.workingRecentMessages || 2),
        workingMaxChars: Number(cfg.workingMaxChars || 4000),
        summarySourceMessages: Number(cfg.summarySourceMessages || 24),
        summaryMaxChars: Number(cfg.summaryMaxChars || 1200),
        summaryRefreshIntervalMs: Number(cfg.summaryRefreshIntervalMs || 120000),
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
      roleCounts.user = Number(res?.roleCounts?.user || 0)
      roleCounts.assistant = Number(res?.roleCounts?.assistant || 0)
    } catch (e) {
      ElMessage.error(e?.message || '加载会话记忆明细失败')
      messages.value = []
      messageTotal.value = 0
      roleCounts.user = 0
      roleCounts.assistant = 0
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
    roleStats,
    selectedSession,
    openContentViewer,
    messageViewerVisible,
    viewingMessageContent,
    highlightMessage,
    messageNeedsExpand,
    refreshSummary,
    clearSummary,
    formatTs,
  }
}
