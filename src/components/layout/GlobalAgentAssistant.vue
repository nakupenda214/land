<template>
  <div class="global-agent">
    <button
      v-if="showAgentFab && !visible"
      class="agent-fab"
      type="button"
      title="智能助手"
      aria-label="打开智能助手"
      @click="visible = true"
    >
      <span class="fab-glow" aria-hidden="true" />
      <span class="fab-core">
        <el-icon class="fab-icon"><ChatDotRound /></el-icon>
      </span>
    </button>

    <el-drawer
      v-model="visible"
      :size="drawerWidth"
      append-to-body
      class="agent-drawer"
      direction="rtl"
      :show-close="false"
      :with-header="false"
      :destroy-on-close="false"
    >
      <div class="agent-shell">
        <header class="agent-header">
          <div class="agent-header-main">
            <div class="agent-header-mark" aria-hidden="true">
              <AgentAssistantGlyph size="md" />
            </div>
            <div class="agent-header-copy">
              <div class="agent-header-title-row">
                <h2 class="agent-title">智能助手</h2>
                <span v-if="streaming" class="agent-header-live">应答中</span>
              </div>
              <p class="agent-subtitle">
                <span class="agent-subtag">土地评估 · 数据查询</span>
                <span class="agent-subsep" aria-hidden="true" />
                <span class="agent-subtag">多轮会话 · SSE 流式</span>
              </p>
            </div>
          </div>
          <button type="button" class="agent-header-close" aria-label="关闭" @click="visible = false">
            <el-icon><Close /></el-icon>
          </button>
        </header>

        <div class="agent-body">
          <el-scrollbar ref="scrollbarRef" class="message-scroll" wrap-class="message-scroll-wrap">
            <div ref="messageContainerRef" class="message-list">
              <div v-if="messages.length === 0" class="empty-state">
                <div class="empty-icon" aria-hidden="true">
                  <AgentAssistantGlyph size="xl" />
                </div>
                <p class="empty-title">开始对话</p>
                <p class="empty-desc">
                  例如询问「合同及地块在哪里查询」「2025 年有多少个项目」等；支持多轮，将自动关联本会话。
                </p>
              </div>

              <div
                v-for="item in messages"
                :key="item.id"
                class="msg-row"
                :class="item.role === 'user' ? 'is-user' : 'is-assistant'"
              >
                <div class="msg-avatar" :class="item.role === 'user' ? 'is-user' : 'is-bot'" aria-hidden="true">
                  <el-icon v-if="item.role === 'user'"><User /></el-icon>
                  <AgentAssistantGlyph v-else size="sm" />
                </div>
                <div class="msg-main">
                  <div class="msg-meta">
                    <span class="msg-role">{{ item.role === 'user' ? '我' : '助手' }}</span>
                    <span v-if="item.streaming" class="msg-streaming">
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                    </span>
                  </div>
                  <div class="msg-bubble">
                    <!-- 主流助手布局：过程（阶段 + 可折叠原始流式）→ 最终回答 -->
                    <template
                      v-if="
                        item.role === 'assistant' &&
                        (item.reasoningLogs?.length || item.traceStream || item.streaming)
                      "
                    >
                      <details
                        class="reasoning-block"
                        :open="item.reasoningOpen"
                        @toggle="onReasoningToggle(item, $event)"
                      >
                        <summary>
                          <el-icon class="reasoning-chev"><ArrowRight /></el-icon>
                          <span class="reasoning-summary-text">执行过程</span>
                          <span v-if="item.reasoningLogs?.length" class="reasoning-count">{{
                            item.reasoningLogs.length
                          }}</span>
                          <span v-if="item.streaming" class="reasoning-live">进行中</span>
                        </summary>
                        <div class="reasoning-body">
                          <ul v-if="item.reasoningLogs?.length" class="reasoning-list">
                            <li v-for="log in item.reasoningLogs" :key="log.id" class="reasoning-item">
                              <span class="reasoning-dot" :class="`is-${log.level || 'info'}`" />
                              <span class="reasoning-type">{{ log.typeLabel || '过程' }}</span>
                              <span class="reasoning-time">{{ log.time }}</span>
                              <span class="reasoning-text">{{ log.text }}</span>
                            </li>
                          </ul>
                          <p
                            v-else-if="item.streaming"
                            class="reasoning-placeholder"
                          >
                            正在接收节点与模型事件…
                          </p>
                          <details
                            v-if="item.traceStream"
                            class="trace-stream-block trace-stream-nested"
                            @toggle.stop
                          >
                            <summary>
                              <el-icon class="trace-chev"><ArrowRight /></el-icon>
                              模型流式输出
                            </summary>
                            <pre class="trace-pre">{{ item.traceStream }}</pre>
                          </details>
                        </div>
                      </details>
                    </template>
                    <!-- 流式中：纯文本避免半句 Markdown 闪烁 -->
                    <div v-if="item.role === 'assistant' && item.streaming" class="msg-text msg-text-plain msg-answer">
                      {{ item.content }}
                    </div>
                    <template v-else-if="item.role === 'assistant'">
                      <div class="msg-text agent-md msg-answer" v-html="renderAssistantHtml(item.content)" />
                      <div
                        v-if="item.rasterChartDataUrl"
                        class="agent-raster-chart-card"
                        role="img"
                        aria-label="Python 输出图表"
                      >
                        <img class="agent-raster-chart-img" :src="item.rasterChartDataUrl" alt="" />
                      </div>
                      <div
                        v-if="shouldShowAssistantChartSlot(item)"
                        :id="`agent-chart-${item.id}`"
                        class="agent-chart-card"
                        role="img"
                        :aria-label="item.chartViewSpec?.title || '查询结果图表'"
                      />
                    </template>
                    <div v-else class="msg-text msg-text-plain">{{ item.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>

          <footer class="agent-footer">
            <div class="toolbar-row">
              <el-button text class="toolbar-link" @click="clearMessages">清空对话</el-button>
              <el-button
                v-if="streaming"
                type="warning"
                plain
                round
                size="small"
                class="stop-btn"
                @click="stopStreaming"
              >
                停止生成
              </el-button>
            </div>
            <div class="composer">
              <el-input
                v-model="inputText"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 8 }"
                :placeholder="composerPlaceholder"
                resize="none"
                class="composer-input"
                :disabled="awaitingHumanReview || (hitlReviewPending && hitlBarDismissed)"
                @keydown.enter.exact.prevent="handleSend"
                @keydown.shift.enter.stop
              />
              <div class="composer-actions">
                <el-checkbox
                  v-model="humanReviewEnabled"
                  size="small"
                  class="hitl-check"
                  :disabled="streaming || awaitingHumanReview || (hitlReviewPending && hitlBarDismissed)"
                >
                  人工复核计划
                </el-checkbox>
                <el-button
                  type="primary"
                  round
                  class="send-btn"
                  :loading="streaming"
                  :disabled="sending || !inputText.trim() || awaitingHumanReview || (hitlReviewPending && hitlBarDismissed)"
                  @click="handleSend"
                >
                  {{ streaming ? '生成中…' : '发送' }}
                </el-button>
              </div>
            </div>
            <div v-if="awaitingHumanReview" class="hitl-panel">
              <p class="hitl-hint">
                当前回答已挂起，等待您对<strong>执行计划</strong>复核。请填写说明后选择通过或驳回（将发起新的续跑请求）。点「稍后处理」仅收起本区：同一会话
                Trace 仍为运行中，可再次打开抽屉继续复核。
              </p>
              <div v-if="hitlPlanPreview.trim()" class="hitl-plan-row">
                <el-button type="primary" link size="small" @click="hitlPlanDialogVisible = true">查看待审计划</el-button>
              </div>
              <el-input
                v-model="hitlNote"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 5 }"
                placeholder="复核说明（必填）"
                class="hitl-input"
              />
              <div class="hitl-actions">
                <el-button size="small" text @click="dismissHumanReview">稍后处理</el-button>
                <el-button type="success" size="small" :loading="hitlSubmitting" :disabled="streaming" @click="submitHumanReviewFeedback(true)">
                  通过
                </el-button>
                <el-button type="danger" size="small" :loading="hitlSubmitting" :disabled="streaming" @click="submitHumanReviewFeedback(false)">
                  驳回
                </el-button>
              </div>
            </div>
            <div v-else-if="hitlBarDismissed && hitlReviewPending" class="hitl-dismissed-strip">
              <p class="hitl-hint">
                已收起复核区。Trace 未结束：请点击「继续复核」填写说明并选择通过或驳回；请勿发送新问题直至完成复核。
              </p>
              <el-button type="primary" plain size="small" @click="resumeHumanReviewPanel">继续复核</el-button>
            </div>
          </footer>
        </div>
      </div>
    </el-drawer>

    <el-dialog
      v-model="hitlPlanDialogVisible"
      title="待审计划"
      width="min(720px, 92vw)"
      destroy-on-close
      append-to-body
      class="hitl-plan-dialog"
    >
      <div class="hitl-plan-dialog-body">
        <template v-if="hitlPlanModel.mode === 'steps'">
          <p v-if="hitlPlanModel.thoughtProcess" class="hitl-plan-thought">{{ hitlPlanModel.thoughtProcess }}</p>
          <ol class="hitl-plan-steps">
            <li v-for="st in hitlPlanModel.steps" :key="st.step" class="hitl-plan-step-row">
              <span class="hitl-plan-step-no">#{{ st.step }}</span>
              <code class="hitl-plan-tool">{{ st.toolToUse }}</code>
              <span v-if="st.instruction" class="hitl-plan-inst">{{ st.instruction }}</span>
            </li>
          </ol>
        </template>
        <pre v-else-if="hitlPlanModel.mode === 'pretty'" class="hitl-plan-pre-dialog">{{ hitlPlanModel.pretty }}</pre>
        <pre v-else class="hitl-plan-pre-dialog">{{ hitlPlanModel.pretty || hitlPlanPreview }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowRight, ChatDotRound, Close, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AgentAssistantGlyph from '@/components/layout/AgentAssistantGlyph.vue'
import { chatAgentStream, formatAgentNodeLine } from '@/services/agent.service'
import {
  buildRasterChartDataUrl,
  coerceChartSpecForRender,
  disposeAgentAssistantChart,
  mountAgentAssistantChart,
  shouldShowAssistantChartSlot
} from '@/utils/agent-assistant-chart.js'
import { renderAgentMarkdownHtml } from '@/utils/agent-markdown.js'
import { parsePlanPreviewModel } from '@/utils/agent-plan-preview.js'

const visible = ref(false)
const showAgentFab = false
const drawerWidth = computed(() => (typeof window !== 'undefined' && window.innerWidth < 720 ? '100%' : 'min(640px, 92vw)'))
const inputText = ref('')
const messages = ref([])
const sending = ref(false)
const streaming = ref(false)
const messageContainerRef = ref(null)
const scrollbarRef = ref(null)
let streamAbortController = null

const composerPlaceholder =
  '请输入问题，例如「合同及地块在哪里查询」「帮我查 2025 年项目数量」…'

const THREAD_KEY = 'global_agent_thread_id'
const HITL_RESTORE_KEY = 'global_agent_hitl_restore'
const threadId = ref(localStorage.getItem(THREAD_KEY) || '')
const humanReviewEnabled = ref(false)
const awaitingHumanReview = ref(false)
const hitlNote = ref('')
const hitlTraceId = ref('')
const hitlSubmitting = ref(false)
const hitlPlanPreview = ref('')
/** 点「稍后处理」仅收起条 */
const hitlBarDismissed = ref(false)
/** 仍存在未完成的挂起复核（与 UI 是否展开无关） */
const hitlReviewPending = ref(false)
const hitlPlanDialogVisible = ref(false)
const hitlPlanModel = computed(() => parsePlanPreviewModel(hitlPlanPreview.value))

function persistGlobalHitl() {
  try {
    if (!hitlReviewPending.value) {
      localStorage.removeItem(HITL_RESTORE_KEY)
      return
    }
    const tid = String(threadId.value || '').trim()
    const tr = String(hitlTraceId.value || '').trim()
    if (!tid) return
    localStorage.setItem(
      HITL_RESTORE_KEY,
      JSON.stringify({
        threadId: tid,
        traceId: tr,
        dismissed: !!hitlBarDismissed.value
      })
    )
  } catch {
    /* ignore */
  }
}

function clearGlobalHitlRestore() {
  try {
    localStorage.removeItem(HITL_RESTORE_KEY)
  } catch {
    /* ignore */
  }
}

function restoreGlobalHitl() {
  try {
    const raw = localStorage.getItem(HITL_RESTORE_KEY)
    if (!raw) return
    const o = JSON.parse(raw)
    const savedTid = String(o.threadId || '').trim()
    if (!savedTid) return
    const cur = String(threadId.value || '').trim()
    if (cur && savedTid !== cur) return
    threadId.value = savedTid
    localStorage.setItem(THREAD_KEY, savedTid)
    const tr = String(o.traceId || '').trim()
    if (tr) hitlTraceId.value = tr
    hitlBarDismissed.value = !!o.dismissed
    hitlReviewPending.value = true
    awaitingHumanReview.value = !hitlBarDismissed.value
  } catch {
    /* ignore */
  }
}

watch(
  () => [hitlReviewPending.value, hitlBarDismissed.value, threadId.value, hitlTraceId.value],
  () => persistGlobalHitl(),
  { deep: false }
)

watch(visible, (v) => {
  if (v) restoreGlobalHitl()
})

const scrollToBottom = async () => {
  await nextTick()
  const wrap = scrollbarRef.value?.wrapRef
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight
    return
  }
  const el = messageContainerRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const makeMessage = (role, content = '') => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  traceStream: role === 'assistant' ? '' : undefined,
  streaming: false,
  reasoningLogs: role === 'assistant' ? [] : undefined,
  reasoningOpen: role === 'assistant',
  chartViewSpec: null,
  chartPreviewRows: null,
  chartDispose: null,
  rasterChartDataUrl: null
})

function mergePythonIntoAssistantTraceStream(assistantMsg, section, chunk) {
  if (!assistantMsg || !section || chunk == null || chunk === '') return
  if (assistantMsg.role !== 'assistant') return
  if (!assistantMsg.traceStream) assistantMsg.traceStream = ''
  if (!assistantMsg._pyTraceIntro) assistantMsg._pyTraceIntro = {}
  if (!assistantMsg._pyTraceIntro[section]) {
    assistantMsg._pyTraceIntro[section] = true
    const label = section === 'code' ? '代码' : section === 'stdout' ? '输出' : '解读'
    assistantMsg.traceStream += `\n\n── Python·${label} ──\n`
  }
  assistantMsg.traceStream += String(chunk)
}

const formatNow = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const onReasoningToggle = (item, evt) => {
  if (!item || item.role !== 'assistant') return
  const el = evt?.target
  if (!el?.classList?.contains('reasoning-block') || typeof el.open !== 'boolean') return
  item.reasoningOpen = el.open
}

const appendReasoningEvent = (assistantMsg, text, { level = 'info', typeLabel = '过程' } = {}) => {
  if (!assistantMsg?.reasoningLogs || !text) return
  assistantMsg.reasoningLogs.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    time: formatNow(),
    text,
    level,
    typeLabel
  })
}

const summarizeArgs = (value) => {
  if (!value) return '{}'
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value)
    return raw.length > 120 ? `${raw.slice(0, 120)}...` : raw
  } catch {
    return String(value)
  }
}

function renderAssistantHtml(raw) {
  const s = raw == null ? '' : String(raw)
  if (!s.trim()) return '<p class="agent-md-empty">暂无内容</p>'
  return renderAgentMarkdownHtml(s)
}

function attachChartFromComplete(assistantMsg, info) {
  // eslint-disable-next-line no-console
  console.info('[LandAgent][chart-debug]', 'attachChartFromComplete 入口', {
    msgId: assistantMsg?.id,
    role: assistantMsg?.role,
    infoKeys: info && typeof info === 'object' ? Object.keys(info) : [],
    hasChartViewSpec: !!(info && info.chartViewSpec),
    hasChartDataPreview: !!(info && info.chartDataPreview),
    hasRaster: !!(info && info.rasterChartBase64 && info.rasterChartMime)
  })
  if (!assistantMsg || assistantMsg.role !== 'assistant') return
  disposeAgentAssistantChart(assistantMsg)
  assistantMsg.chartViewSpec = null
  assistantMsg.chartPreviewRows = null
  assistantMsg.rasterChartDataUrl = null
  if (info?.rasterChartBase64 != null && info?.rasterChartMime != null) {
    assistantMsg.rasterChartDataUrl = buildRasterChartDataUrl(info.rasterChartMime, info.rasterChartBase64)
    // eslint-disable-next-line no-console
    console.info('[LandAgent][chart-debug]', 'rasterChartDataUrl', {
      ok: !!assistantMsg.rasterChartDataUrl,
      mime: info?.rasterChartMime
    })
  }
  if (info?.chartViewSpec) {
    try {
      assistantMsg.chartViewSpec = JSON.parse(String(info.chartViewSpec))
    } catch (e) {
      assistantMsg.chartViewSpec = null
      // eslint-disable-next-line no-console
      console.warn('[LandAgent][chart-debug]', 'chartViewSpec JSON.parse 失败', e?.message)
    }
  }
  if (info?.chartDataPreview) {
    try {
      const rows = JSON.parse(String(info.chartDataPreview))
      assistantMsg.chartPreviewRows = Array.isArray(rows) ? rows : null
    } catch (e) {
      assistantMsg.chartPreviewRows = null
      // eslint-disable-next-line no-console
      console.warn('[LandAgent][chart-debug]', 'chartDataPreview JSON.parse 失败', e?.message)
    }
  }
  if (assistantMsg.chartViewSpec) {
    const coerced =
      coerceChartSpecForRender(assistantMsg.chartViewSpec, assistantMsg.chartPreviewRows || []) ||
      assistantMsg.chartViewSpec
    assistantMsg.chartViewSpec = coerced
  }
  // eslint-disable-next-line no-console
  console.info('[LandAgent][chart-debug]', 'attachChartFromComplete 解析后', {
    msgId: assistantMsg.id,
    chartType: assistantMsg.chartViewSpec?.type,
    previewRowCount: Array.isArray(assistantMsg.chartPreviewRows) ? assistantMsg.chartPreviewRows.length : 0,
    showEchartsSlot: (() => {
      const t = String(assistantMsg.chartViewSpec?.type || '').toLowerCase()
      return !!t && t !== 'table'
    })(),
    hasRasterUrl: !!assistantMsg.rasterChartDataUrl
  })
  nextTick(() => {
    nextTick(() => {
      mountAgentAssistantChart(assistantMsg)
    })
  })
}

const stopStreaming = () => {
  if (streamAbortController) {
    streamAbortController.abort()
    streamAbortController = null
  }
  streaming.value = false
}

const clearMessages = () => {
  messages.value.forEach((m) => disposeAgentAssistantChart(m))
  messages.value = []
  awaitingHumanReview.value = false
  hitlNote.value = ''
  hitlPlanPreview.value = ''
  hitlBarDismissed.value = false
  hitlReviewPending.value = false
  clearGlobalHitlRestore()
}

const dismissHumanReview = () => {
  hitlBarDismissed.value = true
  awaitingHumanReview.value = false
  hitlNote.value = ''
}

const resumeHumanReviewPanel = () => {
  hitlBarDismissed.value = false
  awaitingHumanReview.value = true
}

async function submitHumanReviewFeedback(approved) {
  const note = hitlNote.value.trim()
  if (!note) {
    ElMessage.warning('请填写复核说明')
    return
  }
  if (!threadId.value) {
    ElMessage.error('缺少会话 threadId，无法续跑')
    return
  }
  if (streaming.value || hitlSubmitting.value) return
  hitlSubmitting.value = true
  hitlBarDismissed.value = false
  messages.value.push(makeMessage('assistant', ''))
  const assistantMsg = messages.value[messages.value.length - 1]
  assistantMsg.streaming = true
  await scrollToBottom()

  let lastReasoningDedup = ''
  const appendDedup = (msg, body, opts) => {
    if (!body || !String(body).trim()) return
    const key = `${opts.typeLabel || ''}|${String(body).trim()}`
    if (key === lastReasoningDedup) return
    lastReasoningDedup = key
    appendReasoningEvent(msg, String(body).trim(), opts)
  }

  try {
    streamAbortController = new AbortController()
    streaming.value = true
    await chatAgentStream({
      payload: {
        query: ' ',
        threadId: threadId.value,
        humanFeedbackContent: note,
        rejectedPlan: !approved,
        traceId: hitlTraceId.value || undefined
      },
      signal: streamAbortController.signal,
      onStreamChunk: (chunk) => {
        if (chunk) assistantMsg.content += chunk
        scrollToBottom()
      },
      onStreamTrace: (chunk) => {
        if (chunk) {
          assistantMsg.traceStream = (assistantMsg.traceStream || '') + chunk
          scrollToBottom()
        }
      },
      onStreamPython: ({ section, chunk }) => {
        mergePythonIntoAssistantTraceStream(assistantMsg, section, chunk)
        scrollToBottom()
      },
      onStreamReasoning: (chunk, meta) => {
        const t = String(chunk || '').trim()
        if (!t) return
        appendDedup(assistantMsg, meta?.node ? `[${meta.node}] ${t}` : t, { level: 'info', typeLabel: '思考' })
      },
      onThink: (evt) => {
        const msg = evt?.payload?.message
        if (msg) appendDedup(assistantMsg, msg, { level: 'info', typeLabel: '分析' })
      },
      onNode: (evt) => {
        const line = formatAgentNodeLine(evt)
        if (line) appendDedup(assistantMsg, line, { level: 'running', typeLabel: '阶段' })
      },
      onError: (evt) => {
        const msg = String(
          evt?.text || evt?.message || evt?.payload?.message || evt?.payload?.error || '流式发生错误'
        ).trim()
        if (msg) appendDedup(assistantMsg, msg, { level: 'error', typeLabel: '错误' })
      },
      onComplete: (info) => {
        if (info?.threadId) {
          threadId.value = info.threadId
          localStorage.setItem(THREAD_KEY, info.threadId)
        }
        if (info?.awaitingHumanReview) {
          hitlReviewPending.value = true
          hitlBarDismissed.value = false
          awaitingHumanReview.value = true
          const fromSse = info?.planPreview != null ? String(info.planPreview) : ''
          if (fromSse.trim()) hitlPlanPreview.value = fromSse.trim()
          persistGlobalHitl()
        } else {
          hitlReviewPending.value = false
          hitlBarDismissed.value = false
          hitlPlanPreview.value = ''
          awaitingHumanReview.value = false
          hitlNote.value = ''
          clearGlobalHitlRestore()
        }
        assistantMsg.streaming = false
        attachChartFromComplete(assistantMsg, info)
      }
    })
  } catch (e) {
    if (e?.name !== 'AbortError') {
      ElMessage.error(e?.message || '续跑失败')
      appendDedup(assistantMsg, e?.message || '续跑失败', { level: 'error', typeLabel: '错误' })
    }
  } finally {
    assistantMsg.streaming = false
    streaming.value = false
    streamAbortController = null
    hitlSubmitting.value = false
    await scrollToBottom()
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || sending.value) return
  if (awaitingHumanReview.value) {
    ElMessage.warning('请先完成计划人工复核，或点击「稍后处理」')
    return
  }
  if (hitlReviewPending.value && hitlBarDismissed.value) {
    ElMessage.warning('会话仍在等待计划复核（Trace 未结束），请点击「继续复核」后再填写说明。')
    return
  }

  sending.value = true
  inputText.value = ''
  messages.value.push(makeMessage('user', text), makeMessage('assistant', ''))
  const assistantMsg = messages.value[messages.value.length - 1]
  assistantMsg.streaming = true
  await scrollToBottom()

  let lastReasoningDedup = ''
  const appendDedup = (msg, body, opts) => {
    if (!body || !String(body).trim()) return
    const key = `${opts.typeLabel || ''}|${String(body).trim()}`
    if (key === lastReasoningDedup) return
    lastReasoningDedup = key
    appendReasoningEvent(msg, String(body).trim(), opts)
  }

  try {
    streamAbortController = new AbortController()
    streaming.value = true
    const streamResult = await chatAgentStream({
      payload: {
        query: text,
        threadId: threadId.value || undefined,
        ...(humanReviewEnabled.value ? { humanReview: true } : {})
      },
      signal: streamAbortController.signal,
      onStreamChunk: (chunk) => {
        if (chunk) assistantMsg.content += chunk
        scrollToBottom()
      },
      onStreamTrace: (chunk) => {
        if (chunk) {
          assistantMsg.traceStream = (assistantMsg.traceStream || '') + chunk
          scrollToBottom()
        }
      },
      onStreamPython: ({ section, chunk }) => {
        mergePythonIntoAssistantTraceStream(assistantMsg, section, chunk)
        scrollToBottom()
      },
      onStreamReasoning: (chunk, meta) => {
        const text = String(chunk || '').trim()
        if (!text) return
        appendDedup(assistantMsg, meta?.node ? `[${meta.node}] ${text}` : text, {
          level: 'info',
          typeLabel: '思考'
        })
      },
      onThink: (evt) => {
        const msg = evt?.payload?.message
        if (msg) appendDedup(assistantMsg, msg, { level: 'info', typeLabel: '分析' })
      },
      onNode: (evt) => {
        const line = formatAgentNodeLine(evt)
        if (line) appendDedup(assistantMsg, line, { level: 'running', typeLabel: '阶段' })
      },
      onLlm: (evt) => {
        const phase = evt?.payload && typeof evt.payload === 'object' ? evt.payload.phase : null
        if (phase === 'stream') return
        const piece = String(evt?.text || '').trim()
        if (!piece) return
        const isThink = phase === 'think'
        appendDedup(assistantMsg, piece, {
          level: isThink ? 'info' : 'running',
          typeLabel: isThink ? '分析' : '阶段'
        })
      },
      onToolCall: (evt) => {
        const payload = evt?.payload && typeof evt.payload === 'object' ? evt.payload : {}
        const toolName = evt?.toolName || evt?.name || payload.toolName || 'unknown'
        const stepHint = payload.stepId != null ? ` #${payload.stepId}` : ''
        appendDedup(
          assistantMsg,
          `调用工具 ${toolName}${stepHint}，参数：${summarizeArgs(evt?.args ?? evt?.parameters ?? payload.args)}`,
          { level: 'running', typeLabel: '工具' }
        )
      },
      onToolResult: (evt) => {
        const payload = evt?.payload && typeof evt.payload === 'object' ? evt.payload : {}
        const toolName = evt?.toolName || evt?.name || payload.toolName || 'unknown'
        const stepHint = payload.stepId != null ? ` #${payload.stepId}` : ''
        const brief =
          evt?.resultSummary || evt?.summary || payload.resultSummary || summarizeArgs(evt?.result ?? payload.result)
        appendDedup(assistantMsg, `工具 ${toolName}${stepHint} 返回：${brief}`, {
          level: 'done',
          typeLabel: '工具'
        })
      },
      onError: (evt) => {
        const msg = String(
          evt?.text || evt?.message || evt?.payload?.message || evt?.payload?.error || '流式发生错误'
        ).trim()
        if (msg) appendDedup(assistantMsg, msg, { level: 'error', typeLabel: '错误' })
      },
      onFinal: () => {
        assistantMsg.streaming = false
      },
      onTraceMeta: ({ threadId: tid, traceId }) => {
        if (traceId) hitlTraceId.value = traceId
        if (tid) {
          threadId.value = tid
          localStorage.setItem(THREAD_KEY, tid)
        }
      },
      onComplete: (info) => {
        const tid = info?.threadId
        if (tid) {
          threadId.value = tid
          localStorage.setItem(THREAD_KEY, tid)
        }
        if (info?.awaitingHumanReview) {
          hitlReviewPending.value = true
          hitlBarDismissed.value = false
          awaitingHumanReview.value = true
          const fromSse = info?.planPreview != null ? String(info.planPreview) : ''
          if (fromSse.trim()) hitlPlanPreview.value = fromSse.trim()
          persistGlobalHitl()
        } else {
          hitlReviewPending.value = false
          hitlBarDismissed.value = false
          hitlPlanPreview.value = ''
          awaitingHumanReview.value = false
          hitlNote.value = ''
          clearGlobalHitlRestore()
        }
        assistantMsg.streaming = false
        attachChartFromComplete(assistantMsg, info)
      }
    })

    const tid = streamResult?.threadId
    if (tid) {
      threadId.value = tid
      localStorage.setItem(THREAD_KEY, tid)
    }
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    if (aborted) {
      appendReasoningEvent(assistantMsg, '已停止生成。', { level: 'warning', typeLabel: '状态' })
      assistantMsg.content = assistantMsg.content || '已停止生成。'
    } else {
      appendReasoningEvent(assistantMsg, error?.message || '请求失败', {
        level: 'error',
        typeLabel: '错误'
      })
      assistantMsg.content = assistantMsg.content || '助手暂时不可用，请检查网络或稍后重试。'
      ElMessage.error('智能助手请求失败')
    }
  } finally {
    assistantMsg.streaming = false
    assistantMsg.reasoningOpen = false
    streaming.value = false
    streamAbortController = null
    sending.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.global-agent {
  --agent-accent: #4f46e5;
  --agent-accent-soft: rgba(79, 70, 229, 0.12);
  --agent-surface: #f8fafc;
  --agent-ink: #0f172a;
  --agent-muted: #64748b;
  --agent-border: #e2e8f0;
  --agent-user-bg: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  --agent-bot-bg: #ffffff;
}

.agent-fab {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 2100;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: linear-gradient(145deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%);
  color: #fff;
  box-shadow:
    0 4px 14px rgba(79, 70, 229, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.agent-fab:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 12px 28px rgba(79, 70, 229, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset;
}

.fab-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
  pointer-events: none;
  animation: fabPulse 3s ease-in-out infinite;
}

@keyframes fabPulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

.fab-core {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.fab-icon {
  font-size: 26px;
}

.agent-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: linear-gradient(180deg, #f1f5f9 0%, #f8fafc 32%, #fff 100%);
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--agent-border);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.98) 48%, rgba(241, 245, 249, 0.95) 100%);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.agent-header-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.agent-header-mark {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #eef2ff 0%, #ffffff 42%, #e0e7ff 100%);
  border: 1px solid rgba(165, 180, 252, 0.55);
  box-shadow:
    0 2px 8px rgba(79, 70, 229, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
}

.agent-header-copy {
  min-width: 0;
}

.agent-header-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.agent-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--agent-ink);
}

.agent-header-live {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #b45309;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.25);
  animation: headerLivePulse 1.4s ease-in-out infinite;
}

@keyframes headerLivePulse {
  0%,
  100% {
    opacity: 0.88;
  }
  50% {
    opacity: 1;
  }
}

.agent-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--agent-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.agent-subtag {
  font-weight: 500;
  color: #64748b;
}

.agent-subsep {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

.agent-header-close {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--agent-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--agent-muted);
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.agent-header-close:hover {
  background: #fff;
  color: var(--agent-ink);
  border-color: #cbd5e1;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.agent-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 16px;
  gap: 12px;
}

.message-scroll {
  flex: 1;
  min-height: 200px;
  border-radius: 16px;
  border: 1px solid var(--agent-border);
  background: var(--agent-surface);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
}

.message-scroll :deep(.message-scroll-wrap) {
  overflow-x: hidden;
}

.message-list {
  padding: 16px 14px 20px;
}

.empty-state {
  text-align: center;
  padding: 36px 20px 28px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: linear-gradient(150deg, #eef2ff 0%, #ffffff 45%, #e0e7ff 100%);
  border: 1px solid rgba(165, 180, 252, 0.45);
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--agent-ink);
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--agent-muted);
  max-width: 320px;
  margin-inline: auto;
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.msg-row.is-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.msg-avatar.is-user {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
}

.msg-avatar.is-bot {
  background: linear-gradient(150deg, #f5f3ff 0%, #ffffff 50%, #eef2ff 100%);
  border: 1px solid rgba(199, 210, 254, 0.9);
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.07);
}

.msg-main {
  min-width: 0;
  max-width: calc(100% - 44px);
}

.msg-row.is-user .msg-main {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--agent-muted);
}

.msg-row.is-user .msg-meta {
  flex-direction: row-reverse;
}

.msg-role {
  font-weight: 600;
  color: #475569;
}

.msg-streaming {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.typing-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--agent-accent);
  animation: typingBounce 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingBounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.msg-bubble {
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid var(--agent-border);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.msg-row.is-user .msg-bubble {
  background: var(--agent-user-bg);
  border-color: #c7d2fe;
}

.msg-row.is-assistant .msg-bubble {
  background: var(--agent-bot-bg);
}

.msg-text {
  font-size: 14px;
  line-height: 1.65;
  color: #1e293b;
  word-break: break-word;
}

.msg-text-plain {
  white-space: pre-wrap;
}

.agent-md :deep(p) {
  margin: 0 0 0.65em;
}

.agent-md :deep(p:last-child) {
  margin-bottom: 0;
}

.agent-md :deep(ul),
.agent-md :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.25em;
}

.agent-md :deep(code) {
  font-size: 0.9em;
  padding: 0.12em 0.35em;
  border-radius: 6px;
  background: #f1f5f9;
}

.agent-md :deep(pre code) {
  display: block;
  padding: 10px 12px;
  overflow-x: auto;
}

.agent-md-empty {
  margin: 0;
  color: var(--agent-muted);
  font-size: 13px;
}

.reasoning-block {
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  overflow: hidden;
}

.reasoning-block summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  user-select: none;
}

.reasoning-summary-text {
  flex: 1;
  min-width: 0;
}

.reasoning-live {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #b45309;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  animation: reasoningPulse 1.6s ease-in-out infinite;
}

@keyframes reasoningPulse {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

.reasoning-body {
  padding: 0 10px 12px;
}

.reasoning-placeholder {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #94a3b8;
}

.trace-stream-block {
  margin-top: 10px;
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  overflow: hidden;
}

.reasoning-block .trace-stream-nested {
  margin-top: 8px;
  margin-bottom: 0;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #a5b4fc;
  background: linear-gradient(180deg, #fafafa 0%, #f8fafc 100%);
}

.reasoning-block .trace-stream-nested .trace-pre {
  max-height: 200px;
  font-size: 11px;
  border-top-color: #e2e8f0;
}

.trace-stream-block summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  user-select: none;
}

.trace-stream-block summary::-webkit-details-marker {
  display: none;
}

.trace-chev {
  font-size: 14px;
  transition: transform 0.2s;
}

.trace-stream-block[open] .trace-chev {
  transform: rotate(90deg);
}

.trace-pre {
  margin: 0;
  padding: 8px 10px 10px;
  max-height: 220px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.45;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.reasoning-block summary::-webkit-details-marker {
  display: none;
}

.reasoning-chev {
  transition: transform 0.2s;
  font-size: 14px;
}

.reasoning-block[open] .reasoning-chev {
  transform: rotate(90deg);
}

.reasoning-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--agent-accent-soft);
  color: var(--agent-accent);
}

.reasoning-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-bubble > .msg-answer {
  margin-top: 12px;
}

.msg-bubble > .msg-answer:first-child {
  margin-top: 0;
}

.agent-raster-chart-card {
  margin-top: 12px;
  width: 100%;
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid var(--agent-border);
  background: #fff;
  padding: 8px;
  box-sizing: border-box;
}

.agent-raster-chart-img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.agent-chart-card {
  margin-top: 12px;
  height: 260px;
  width: 100%;
  min-height: 200px;
  border-radius: 10px;
  border: 1px solid var(--agent-border);
  background: #fff;
}

.reasoning-item {
  display: grid;
  grid-template-columns: 8px auto 52px 1fr;
  gap: 8px;
  align-items: start;
  font-size: 12px;
  line-height: 1.45;
}

.reasoning-type {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  width: fit-content;
}

.reasoning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
}

.reasoning-dot.is-info {
  background: #94a3b8;
}

.reasoning-dot.is-running {
  background: var(--agent-accent);
  box-shadow: 0 0 0 3px var(--agent-accent-soft);
}

.reasoning-dot.is-done {
  background: #10b981;
}

.reasoning-dot.is-warning {
  background: #f59e0b;
}

.reasoning-dot.is-error {
  background: #ef4444;
}

.reasoning-time {
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

.reasoning-text {
  color: #475569;
  grid-column: 2 / -1;
}

@media (min-width: 400px) {
  .reasoning-item {
    grid-template-columns: 8px auto 52px minmax(0, 1fr);
  }
  .reasoning-text {
    grid-column: 4;
  }
}

.agent-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-link {
  color: var(--agent-muted);
  font-size: 13px;
}

.stop-btn {
  font-weight: 600;
}

.composer {
  border-radius: 16px;
  border: 1px solid var(--agent-border);
  background: #fff;
  padding: 12px 14px 10px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
}

.composer-input :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  padding: 4px 2px;
  font-size: 14px;
  line-height: 1.55;
  min-height: 72px !important;
  background: transparent;
}

.composer-input :deep(.el-textarea__inner):focus {
  box-shadow: none;
}

.composer-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.hitl-check {
  flex: 1 1 100%;
  margin-right: auto;
}

.hitl-check :deep(.el-checkbox__label) {
  font-size: 12px;
  color: var(--agent-muted);
}

.hitl-panel {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(79, 70, 229, 0.35);
  background: rgba(79, 70, 229, 0.06);
}

.hitl-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--agent-muted);
  line-height: 1.45;
}

.hitl-input {
  margin-bottom: 8px;
}

.hitl-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.hitl-plan-row {
  margin-bottom: 6px;
}

.hitl-plan-dialog-body {
  max-height: min(70vh, 720px);
  overflow: auto;
}

.hitl-plan-thought {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--agent-muted);
  line-height: 1.45;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.hitl-plan-steps {
  margin: 0;
  padding-left: 1.25rem;
}

.hitl-plan-step-row {
  margin-bottom: 8px;
  line-height: 1.4;
}

.hitl-plan-step-no {
  font-weight: 700;
  margin-right: 6px;
  color: #64748b;
}

.hitl-plan-tool {
  font-size: 12px;
  margin-right: 6px;
}

.hitl-plan-inst {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--agent-muted);
}

.hitl-plan-pre-dialog {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, monospace;
}

.hitl-dismissed-strip {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(234, 179, 8, 0.45);
  background: rgba(234, 179, 8, 0.08);
}

.composer-hint {
  font-size: 11px;
  color: #94a3b8;
}

.send-btn {
  min-width: 96px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
}
</style>

<style>
/* 抽屉全宽样式（非 scoped，作用到 teleport 后的抽屉根节点） */
.agent-drawer.el-drawer.rtl.open {
  border-radius: 16px 0 0 16px;
  box-shadow: -12px 0 40px rgba(15, 23, 42, 0.12);
}

.agent-drawer .el-drawer__body {
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
