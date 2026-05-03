<template>
  <section class="memory-page">
    <aside class="session-pane panel-card">
      <div class="session-tools">
        <el-input
          v-model="keyword"
          clearable
          placeholder="检索会话"
          @keyup.enter="loadSessions"
        />
        <el-button :loading="loadingSessions" @click="loadSessions">查询</el-button>
      </div>
      <el-scrollbar class="session-list">
        <div
          v-for="item in sessions"
          :key="item.threadId"
          class="session-item"
          :class="{ active: selectedThreadId === item.threadId }"
          @click="selectSession(item)"
        >
          <el-tooltip :content="item.title || '未命名会话'" placement="top" :show-after="300">
            <div class="session-title">{{ item.title || '未命名会话' }}</div>
          </el-tooltip>
          <div class="session-meta">用户：{{ item.userId || '—' }}</div>
          <div class="session-preview">{{ item.memorySummary || '暂无摘要' }}</div>
        </div>
        <el-empty v-if="!loadingSessions && !sessions.length" description="暂无会话数据" />
      </el-scrollbar>
    </aside>

    <main class="content-pane">
      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>记忆配置</h3>
          </div>
          <div class="actions">
            <el-button :loading="loadingCfg" @click="loadConfig">刷新</el-button>
            <el-button type="primary" :loading="savingCfg" @click="saveConfig">保存配置</el-button>
          </div>
        </div>
        <el-form :model="cfg" class="cfg-grid" label-position="top" size="small">
          <el-form-item label="写入 TRACE_BAG（memory_context）">
            <el-switch v-model="cfg.traceBagEnabled" />
          </el-form-item>
          <el-form-item label="候选消息窗口">
            <el-input-number v-model="cfg.workingCandidateMessages" :min="8" :max="200" />
          </el-form-item>
          <el-form-item label="相关 TopK">
            <el-input-number v-model="cfg.workingTopMessages" :min="2" :max="20" />
          </el-form-item>
          <el-form-item label="最近兜底条数">
            <el-input-number v-model="cfg.workingRecentMessages" :min="1" :max="10" />
          </el-form-item>
          <el-form-item label="上下文最大字符">
            <el-input-number v-model="cfg.workingMaxChars" :min="800" :max="20000" :step="200" />
          </el-form-item>
          <el-form-item label="摘要源消息数">
            <el-input-number v-model="cfg.summarySourceMessages" :min="8" :max="100" />
          </el-form-item>
          <el-form-item label="摘要最大字符">
            <el-input-number v-model="cfg.summaryMaxChars" :min="300" :max="5000" :step="100" />
          </el-form-item>
          <el-form-item label="摘要刷新间隔(ms)">
            <el-input-number v-model="cfg.summaryRefreshIntervalMs" :min="30000" :max="3600000" :step="10000" />
          </el-form-item>
        </el-form>
      </section>

      <section class="panel-card details-card">
        <div class="card-head">
          <div>
            <h3>会话记忆详情</h3>
          </div>
          <div class="actions">
            <el-select v-model="messageRole" style="width: 120px" placeholder="角色" @change="onFilterChange">
              <el-option label="全部角色" value="" />
              <el-option label="user" value="user" />
              <el-option label="assistant" value="assistant" />
            </el-select>
            <el-input
              v-model="messageKeyword"
              clearable
              placeholder="按消息内容检索"
              style="width: 220px"
              @keyup.enter="loadMessages"
              @clear="onFilterChange"
            />
            <el-button :disabled="!selectedThreadId" :loading="loadingMessages" @click="loadMessages">查询</el-button>
            <el-button :disabled="!selectedThreadId" @click="refreshSummary(selectedSession)">刷新摘要</el-button>
            <el-button :disabled="!selectedThreadId" type="danger" plain @click="clearSummary(selectedSession)">清空摘要</el-button>
          </div>
        </div>
        <div v-if="selectedSession" class="summary-box">
          <div><strong>threadId：</strong>{{ selectedSession.threadId }}</div>
          <div><strong>summary 更新时间：</strong>{{ formatTs(selectedSession.memorySummaryUpdatedAt) }}</div>
          <div class="summary-content-wrap">
            <div class="summary-content">{{ selectedSession.memorySummary || '暂无摘要' }}</div>
            <el-button
              v-if="String(selectedSession.memorySummary || '').length > 220"
              link
              type="primary"
              class="msg-view-btn"
              @click="openContentViewer(selectedSession.memorySummary)"
            >
              查看
            </el-button>
          </div>
        </div>
        <el-empty v-else description="请先在左侧选择会话" />
        <div v-if="selectedSession" class="stats-bar">
          <el-tag size="small" type="info">命中总数 {{ messageTotal }}</el-tag>
          <el-tag size="small">user {{ roleStats.user }}（{{ roleStats.userPct }}）</el-tag>
          <el-tag size="small" type="success">assistant {{ roleStats.assistant }}（{{ roleStats.assistantPct }}）</el-tag>
        </div>
        <el-table
          v-if="selectedSession"
          v-loading="loadingMessages"
          :data="messages"
          stripe
          max-height="380"
        >
          <el-table-column label="时间" width="180">
            <template #default="{ row }">{{ formatTs(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="role" label="角色" width="100" />
          <el-table-column label="内容" min-width="400">
            <template #default="{ row }">
              <div class="msg-content-row">
                <div class="msg-content msg-content--one-line" v-html="highlightMessage(row.content || '—')"></div>
                <el-button
                  v-if="messageNeedsExpand(row.content)"
                  link
                  type="primary"
                  class="msg-view-btn"
                  @click="openContentViewer(row.content)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="selectedSession" class="pager-wrap">
          <el-pagination
            layout="total, sizes, prev, pager, next, jumper"
            :total="messageTotal"
            :page-size="messagePageSize"
            :current-page="messagePageNum"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="onMessageSizeChange"
            @current-change="onMessagePageChange"
          />
        </div>
      </section>
    </main>

    <el-dialog v-model="messageViewerVisible" title="内容全文" width="780px" destroy-on-close>
      <pre class="msg-viewer-pre">{{ viewingMessageContent || '—' }}</pre>
      <template #footer>
        <el-button type="primary" @click="messageViewerVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  clearAgentMemorySummary,
  getAgentMemoryConfig,
  listAgentMemoryMessages,
  listAgentMemorySessions,
  refreshAgentMemorySummary,
  updateAgentMemoryConfig
} from '@/services/agent-management.service.js'

const cfg = reactive({
  traceBagEnabled: true,
  workingCandidateMessages: 40,
  workingTopMessages: 6,
  workingRecentMessages: 2,
  workingMaxChars: 4000,
  summarySourceMessages: 24,
  summaryMaxChars: 1200,
  summaryRefreshIntervalMs: 120000
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

const selectedSession = computed(() => sessions.value.find((s) => s.threadId === selectedThreadId.value) || null)
const roleStats = computed(() => {
  const total = Number(messageTotal.value || 0)
  const user = Number(roleCounts.user || 0)
  const assistant = Number(roleCounts.assistant || 0)
  const pct = (x) => (total > 0 ? `${((x * 100) / total).toFixed(1)}%` : '0.0%')
  return {
    user,
    assistant,
    userPct: pct(user),
    assistantPct: pct(assistant)
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
      summaryRefreshIntervalMs: Number(cfg.summaryRefreshIntervalMs || 120000)
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
    if (!selectedThreadId.value || !sessions.value.some((it) => it.threadId === selectedThreadId.value)) {
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

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function highlightMessage(text) {
  const safe = escapeHtml(text)
  const kw = String(messageKeyword.value || '').trim()
  if (!kw) return safe
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reg = new RegExp(`(${escaped})`, 'ig')
  return safe.replace(reg, '<mark class="kw-highlight">$1</mark>')
}

/** 单行展示不下或含换行时显示「查看」 */
function messageNeedsExpand(content) {
  const s = String(content ?? '')
  if (!s.trim()) return false
  if (/[\r\n]/.test(s)) return true
  return s.length > 72
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
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date(n).toLocaleString()
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadSessions()])
})
</script>

<style scoped>
.memory-page {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  min-height: 640px;
}

.panel-card {
  border: 1px solid #dce7f8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #f9fbff 100%);
  padding: 12px;
}

.content-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.card-head h3 {
  margin: 0;
  font-size: 15px;
  color: #204977;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.session-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.session-list {
  height: 560px;
  padding-right: 4px;
}

.session-item {
  border: 1px solid #e6edf8;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}

.session-item.active {
  border-color: #4f8cff;
  background: #f3f8ff;
  box-shadow: inset 0 0 0 1px #b9d3ff;
}

.session-title {
  font-weight: 600;
  color: #294a74;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.session-meta {
  font-size: 12px;
  color: #5f6f89;
  margin-bottom: 2px;
}

.session-preview {
  margin-top: 6px;
  font-size: 12px;
  color: #3c4e68;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cfg-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px 10px;
}

.cfg-grid :deep(.el-form-item) {
  margin-bottom: 8px;
}

.cfg-grid :deep(.el-form-item__label) {
  line-height: 18px;
  padding-bottom: 2px;
}

.details-card {
  min-height: 360px;
}

.summary-box {
  border: 1px solid #e6edf8;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #2f4568;
}

.summary-content {
  margin-top: 6px;
  white-space: pre-wrap;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.summary-content-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.msg-content-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.msg-content {
  line-height: 1.5;
  min-width: 0;
}

.msg-content--one-line {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-view-btn {
  flex-shrink: 0;
  padding: 0;
}

.msg-viewer-pre {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 60vh;
  overflow: auto;
  color: #334155;
}

:deep(.kw-highlight) {
  background: #fff2a8;
  color: #1f2937;
  border-radius: 3px;
  padding: 0 2px;
}

.pager-wrap {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1400px) {
  .cfg-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
