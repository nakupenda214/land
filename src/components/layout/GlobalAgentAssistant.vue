<template>
  <div class="global-agent">
    <button
      v-if="!visible"
      class="agent-fab"
      type="button"
      title="智能助手"
      @click="visible = true"
    >
      <span class="fab-core">
        <span class="icon-ripple r1" />
        <span class="icon-ripple r2" />
        <el-icon class="fab-icon"><ChatDotRound /></el-icon>
      </span>
    </button>

    <el-drawer
      v-model="visible"
      :size="640"
      append-to-body
      class="agent-drawer"
      title="智能助手"
    >
      <div class="agent-body">
        <div class="quick-questions">
          <button
            v-for="q in displayedQuickQuestions"
            :key="q"
            type="button"
            class="quick-chip"
            @click="applyQuickQuestion(q)"
          >
            {{ q }}
          </button>
        </div>

        <div ref="messageContainerRef" class="message-list">
          <div v-if="messages.length === 0" class="empty-tip">
            请输入明确问题，例如“上传文件在哪里上传”“合同及地块在哪里查询”。
          </div>
          <div
            v-for="item in messages"
            :key="item.id"
            class="msg-row"
            :class="item.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <div class="msg-bubble">
              <template v-if="item.role === 'assistant' && item.reasoningLogs?.length">
                <details class="reasoning-block" :open="item.reasoningOpen">
                  <summary>思考</summary>
                  <ul class="reasoning-list">
                    <li v-for="log in item.reasoningLogs" :key="log.id" class="reasoning-item">
                      <span class="reasoning-dot" :class="`is-${log.level || 'info'}`" />
                      <span class="reasoning-type">{{ log.typeLabel || '过程' }}</span>
                      <span class="reasoning-time">{{ log.time }}</span>
                      <span class="reasoning-text">{{ log.text }}</span>
                    </li>
                  </ul>
                </details>
              </template>
              <pre>{{ item.content }}</pre>
            </div>
          </div>
        </div>

        <div class="agent-toolbar">
          <el-button class="tool-btn" @click="clearMessages">清空</el-button>
          <el-button
            v-if="streaming"
            class="tool-btn stop-btn"
            type="warning"
            @click="stopStreaming"
          >
            停止生成
          </el-button>
        </div>

        <div class="input-area">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="7"
            placeholder="请输入问题，Enter发送，Shift+Enter换行"
            @keydown.enter.exact.prevent="handleSend"
            @keydown.shift.enter.stop
          />
          <div class="input-actions">
            <el-button
              class="send-btn"
              :disabled="sending || !inputText.trim()"
              type="primary"
              @click="handleSend"
            >
              {{ streaming ? '生成中...' : '发送' }}
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { chatAgent, chatAgentStream } from '@/services/agent.service'

const visible = ref(false)
const inputText = ref('')
const messages = ref([])
const sending = ref(false)
const streaming = ref(false)
const messageContainerRef = ref(null)
let streamAbortController = null

const quickQuestionPool = [
  '上传文件在哪里上传？',
  '想要修改户室面积对照表怎么修改？',
  '合同及地块信息在哪里查询？',
  '归档文件查询里如何开始解析文件？',
  '解析失败后先看哪个字段定位问题？',
  '审核页面如何进入编辑并保存修改？',
  '项目创建后为什么看不到最新汇总数据？',
  '如何在归档里按文件名快速定位某个文件？',
  '土地类型管理里如何把未知用途归类到已知用途？',
  '打印报表和导出Excel入口分别在哪里？'
]
const displayedQuickQuestions = ref([])

const SESSION_KEY = 'global_agent_session_id'
const createSessionId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
const sessionId = ref(localStorage.getItem(SESSION_KEY) || createSessionId())
localStorage.setItem(SESSION_KEY, sessionId.value)

const pickQuickQuestions = () => {
  const pool = [...quickQuestionPool]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  displayedQuickQuestions.value = pool.slice(0, Math.random() > 0.5 ? 5 : 4)
}

watch(
  () => visible.value,
  (v) => {
    if (v) pickQuickQuestions()
  },
  { immediate: true }
)

const scrollToBottom = async () => {
  await nextTick()
  const el = messageContainerRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const makeMessage = (role, content = '') => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  reasoningLogs: role === 'assistant' ? [] : undefined,
  reasoningOpen: role === 'assistant'
})

const formatNow = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
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

const extractFunctionCallBlocks = (text) => {
  if (!text) return { visibleText: '', calls: [], carry: '' }
  const calls = []
  const pattern = /<\|FunctionCallBegin\|>([\s\S]*?)<\|FunctionCallEnd\|>/g
  let visible = text
  visible = visible.replace(pattern, (_, payload) => {
    calls.push(payload)
    return ''
  })
  const beginIndex = visible.lastIndexOf('<|FunctionCallBegin|>')
  if (beginIndex !== -1) {
    return {
      visibleText: visible.slice(0, beginIndex),
      calls,
      carry: visible.slice(beginIndex)
    }
  }
  return { visibleText: visible, calls, carry: '' }
}

const parseFunctionCallPayload = (payload) => {
  if (!payload) return null
  try {
    const parsed = JSON.parse(payload)
    return {
      name: parsed?.name || parsed?.toolName || 'unknown',
      args: parsed?.parameters || parsed?.args || {}
    }
  } catch {
    return { name: 'unknown', args: payload }
  }
}

const getMetaText = (meta) => {
  const candidates = [
    meta?.title,
    meta?.phase,
    meta?.status,
    meta?.message,
    meta?.content,
    meta?.text
  ]
  const hit = candidates.find((x) => typeof x === 'string' && x.trim())
  return hit ? hit.trim() : '模型正在分析问题...'
}

const mapStageLabel = (stage) => {
  const key = String(stage || '').toLowerCase()
  if (key.includes('understand') || key.includes('analy')) return '理解问题'
  if (key.includes('retrieve') || key.includes('search')) return '检索信息'
  if (key.includes('tool')) return '调用工具'
  if (key.includes('answer') || key.includes('compose')) return '组织答案'
  if (key.includes('done') || key.includes('finish')) return '完成'
  return stage || '阶段更新'
}

const resolveStageText = (stageEvt) => {
  const direct = [stageEvt?.text, stageEvt?.message, stageEvt?.title].find(
    (x) => typeof x === 'string' && x.trim()
  )
  if (direct) return direct.trim()
  if (stageEvt?.payload && typeof stageEvt.payload === 'object') {
    const payloadText = [stageEvt.payload.text, stageEvt.payload.message, stageEvt.payload.title].find(
      (x) => typeof x === 'string' && x.trim()
    )
    if (payloadText) return payloadText.trim()
  }
  return mapStageLabel(stageEvt?.stage || stageEvt?.payload?.stage)
}

const extractSyncAnswer = (res) => {
  const data = res?.data?.data
  if (typeof data === 'string') return data
  if (typeof data?.text === 'string') return data.text
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.answer === 'string') return data.answer
  return res?.data?.msg || '已收到，但返回内容为空。'
}

const stopStreaming = () => {
  if (streamAbortController) {
    streamAbortController.abort()
    streamAbortController = null
  }
  streaming.value = false
}

const clearMessages = () => {
  messages.value = []
}

const applyQuickQuestion = (question) => {
  inputText.value = question
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  sending.value = true
  inputText.value = ''
  const userMsg = makeMessage('user', text)
  const assistantMsg = makeMessage('assistant', '')
  messages.value.push(userMsg, assistantMsg)
  appendReasoningEvent(assistantMsg, '开始处理问题，正在建立流式连接...', {
    level: 'running',
    typeLabel: '阶段'
  })
  await scrollToBottom()
  let callCarry = ''

  try {
    streamAbortController = new AbortController()
    streaming.value = true
    await chatAgentStream({
      payload: { sessionId: sessionId.value, message: text },
      signal: streamAbortController.signal,
      onMeta: (meta) => {
        appendReasoningEvent(assistantMsg, getMetaText(meta), {
          level: 'running',
          typeLabel: '阶段'
        })
        const sid = String(meta?.sessionId || '').trim()
        if (sid) {
          sessionId.value = sid
          localStorage.setItem(SESSION_KEY, sid)
        }
      },
      onDelta: async (delta) => {
        const chunk = String(delta?.text || '')
        const merged = `${callCarry}${chunk}`
        const { visibleText, calls, carry } = extractFunctionCallBlocks(merged)
        callCarry = carry
        if (visibleText) assistantMsg.content += visibleText
        for (const rawPayload of calls) {
          const call = parseFunctionCallPayload(rawPayload)
          appendReasoningEvent(
            assistantMsg,
            `调用工具 ${call.name}，参数：${summarizeArgs(call.args)}`,
            { level: 'running', typeLabel: '工具调用' }
          )
        }
        await scrollToBottom()
      },
      onStage: (stageEvt) => {
        appendReasoningEvent(assistantMsg, resolveStageText(stageEvt), {
          level: 'running',
          typeLabel: '阶段'
        })
      },
      onToolCall: (evt) => {
        const payload = evt?.payload && typeof evt.payload === 'object' ? evt.payload : {}
        const toolName = evt?.toolName || evt?.name || payload.toolName || 'unknown'
        appendReasoningEvent(
          assistantMsg,
          `调用工具 ${toolName}，参数：${summarizeArgs(evt?.args ?? evt?.parameters ?? payload.args)}`,
          { level: 'running', typeLabel: '工具调用' }
        )
      },
      onToolResult: (evt) => {
        const payload = evt?.payload && typeof evt.payload === 'object' ? evt.payload : {}
        const toolName = evt?.toolName || evt?.name || payload.toolName || 'unknown'
        const brief = evt?.resultSummary || evt?.summary || payload.resultSummary || summarizeArgs(evt?.result ?? payload.result)
        appendReasoningEvent(
          assistantMsg,
          `工具 ${toolName} 返回：${brief}`,
          { level: 'done', typeLabel: '工具结果' }
        )
      },
      onGuardrail: (evt) => {
        const action = evt?.action || '已应用'
        const rule = evt?.rule || evt?.name || '安全规则'
        appendReasoningEvent(assistantMsg, `${rule}：${action}`, {
          level: 'warning',
          typeLabel: '安全策略'
        })
      },
      onDone: (done) => {
        appendReasoningEvent(assistantMsg, '回答生成完成。', {
          level: 'done',
          typeLabel: '阶段'
        })
        if (done?.text && !assistantMsg.content) assistantMsg.content = String(done.text)
        const sid = String(done?.sessionId || '').trim()
        if (sid) {
          sessionId.value = sid
          localStorage.setItem(SESSION_KEY, sid)
        }
      }
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    if (aborted) {
      appendReasoningEvent(assistantMsg, '已停止生成。', {
        level: 'warning',
        typeLabel: '状态'
      })
      assistantMsg.content = assistantMsg.content || '已停止生成。'
    } else {
      try {
        appendReasoningEvent(assistantMsg, '流式失败，切换为同步模式重试。', {
          level: 'warning',
          typeLabel: '状态'
        })
        const res = await chatAgent({ sessionId: sessionId.value, message: text })
        assistantMsg.content = extractSyncAnswer(res)
        appendReasoningEvent(assistantMsg, '同步模式已返回结果。', {
          level: 'done',
          typeLabel: '阶段'
        })
      } catch {
        appendReasoningEvent(assistantMsg, '请求失败，请稍后重试。', {
          level: 'error',
          typeLabel: '错误'
        })
        assistantMsg.content = '助手暂时不可用，请稍后重试。'
        ElMessage.error('助手请求失败')
      }
    }
  } finally {
    streaming.value = false
    streamAbortController = null
    sending.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.agent-fab {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 2100;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 1px solid #8ea2bf;
  background: linear-gradient(145deg, #f7fbff 0%, #dce8f7 100%);
  color: #2d4463;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(36, 55, 82, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.agent-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(36, 55, 82, 0.28);
}

.fab-core {
  position: relative;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fab-icon {
  font-size: 22px;
  position: relative;
  z-index: 3;
}

.icon-ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(120, 149, 187, 0.7);
  pointer-events: none;
}

.r1 {
  animation: rippleA 4.2s infinite;
}

.r2 {
  animation: rippleB 4.2s infinite;
}

@keyframes rippleA {
  0% { transform: scale(1); opacity: 0.62; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes rippleB {
  0% { transform: scale(1); opacity: 0; }
  45% { opacity: 0.34; }
  100% { transform: scale(1.8); opacity: 0; }
}

.agent-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-chip {
  border: 1px solid #c5d4e8;
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  color: #3f5776;
  border-radius: 16px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-chip:hover {
  border-color: #aac2e2;
  background: #e9f2ff;
  color: #27486e;
}

.message-list {
  flex: 1;
  min-height: 300px;
  overflow-y: auto;
  padding: 10px 8px;
  border: 1px solid #d9e1ec;
  border-radius: 10px;
  background: #f7f9fc;
}

.empty-tip {
  color: #5f6e84;
  font-size: 13px;
  line-height: 1.7;
  padding: 10px 12px;
}

.msg-row {
  display: flex;
  margin-bottom: 10px;
}

.msg-row.is-user {
  justify-content: flex-end;
}

.msg-row.is-assistant {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d4dcea;
  background: #fff;
}

.msg-row.is-user .msg-bubble {
  border-color: #a8bfdc;
  background: #edf4ff;
}

.msg-bubble pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.68;
  color: #2f3b4d;
}

.reasoning-block {
  margin-bottom: 8px;
  border: 1px solid #d7e1ef;
  border-radius: 8px;
  background: #f8fbff;
  padding: 6px 8px;
}

.reasoning-block summary {
  cursor: pointer;
  color: #365174;
  font-size: 12px;
  font-weight: 600;
  outline: none;
}

.reasoning-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reasoning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.reasoning-type {
  min-width: 56px;
  text-align: center;
  border-radius: 10px;
  font-size: 11px;
  line-height: 18px;
  padding: 0 6px;
  background: #edf3fb;
  color: #3b5b84;
}

.reasoning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex: 0 0 8px;
}

.reasoning-dot.is-info {
  background: #8aa1be;
}

.reasoning-dot.is-running {
  background: #5d86bb;
  box-shadow: 0 0 0 3px rgba(93, 134, 187, 0.15);
}

.reasoning-dot.is-done {
  background: #5a9d74;
}

.reasoning-dot.is-warning {
  background: #c28a36;
}

.reasoning-dot.is-error {
  background: #c15d5d;
}

.reasoning-time {
  color: #6d7f99;
  min-width: 56px;
  font-variant-numeric: tabular-nums;
}

.reasoning-text {
  color: #455b79;
}

.agent-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tool-btn {
  border-radius: 9px;
  min-width: 70px;
}

.stop-btn {
  color: #8a2d10;
  border-color: #efb9a7;
  background: #fff2ee;
}

.stop-btn:hover {
  color: #6d2007;
  border-color: #e89e89;
  background: #ffe7df;
}

.input-area {
  border: 1px solid #d8e0ec;
  border-radius: 12px;
  padding: 10px;
  background: #fff;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.send-btn {
  min-width: 96px;
  height: 36px;
  border-radius: 18px;
  box-shadow: 0 6px 14px rgba(72, 110, 160, 0.26);
}
</style>
