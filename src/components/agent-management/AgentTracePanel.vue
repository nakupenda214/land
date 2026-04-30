<template>
  <section class="trace-shell">
    <div class="grain" aria-hidden="true" />

    <div class="trace-grid">
      <!-- 控制条：索引 + 发题合并于详情区上方，为下方拓扑/时间轴腾出纵向空间 -->
      <div class="trace-deck">
        <aside class="trace-list-card">
          <div class="card-cap">
            <div class="card-cap-title">
              <span class="cap-dot" />
              <span>TRACE 索引</span>
            </div>
            <div class="card-cap-actions">
              <el-input
                v-model="traceKeyword"
                class="trace-search"
                clearable
                placeholder="搜索摘要 / traceId / thread / 状态"
              />
              <el-select v-model="limit" class="limit-sel" @change="loadList">
                <el-option :value="30" label="最近 30 条" />
                <el-option :value="50" label="最近 50 条" />
                <el-option :value="100" label="最近 100 条" />
              </el-select>
              <el-button type="primary" class="btn-refresh" :loading="listLoading" @click="loadList">刷新列表</el-button>
            </div>
          </div>
          <el-table
            v-loading="listLoading"
            :data="filteredRows"
            class="trace-table"
            height="212"
            highlight-current-row
            empty-text="暂无 trace，请先发起一次智能查询"
            @row-click="onRowClick"
          >
            <el-table-column prop="inputPreview" label="摘要" min-width="118" show-overflow-tooltip />
            <el-table-column prop="_id" label="traceId" min-width="118" show-overflow-tooltip />
            <el-table-column prop="threadId" label="thread" min-width="118" show-overflow-tooltip />
            <el-table-column label="开始" min-width="118" show-overflow-tooltip>
              <template #default="{ row }">
                {{ formatTime(row.startedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="124" align="center">
              <template #default="{ row }">
                <span class="status-pill" :data-status="row.status">{{ row.status || '—' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </aside>

        <section class="obs-run-card">
          <div class="obs-run-body">
            <el-input
              v-model="obsQuery"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 3 }"
              placeholder="自然语言提问，Enter 发送 · Shift+Enter 换行"
              resize="none"
              class="obs-input"
              :disabled="obsStreaming"
              @keydown.enter.exact.prevent="sendObservation"
              @keydown.shift.enter.stop
            />
            <div class="obs-actions">
              <el-button plain size="small" class="obs-btn obs-btn-new" @click="resetObservationSession">新会话</el-button>
              <div class="obs-actions-row">
                <el-button v-if="obsStreaming" type="warning" plain size="small" class="obs-btn" @click="stopObservation">停止</el-button>
                <el-button type="primary" class="obs-btn obs-btn-send" :loading="obsStreaming" :disabled="!obsQuery.trim()" @click="sendObservation">
                  {{ obsStreaming ? '执行中…' : '发送' }}
                </el-button>
              </div>
            </div>
          </div>
          <el-collapse v-if="liveReasoningLines.length" class="live-collapse">
            <el-collapse-item :title="`SSE 过程（${liveReasoningLines.length}）`" name="sse">
              <ul class="live-tail-list">
                <li v-for="line in liveReasoningLines" :key="line.id" class="live-tail-item">
                  <span class="live-t">{{ line.t }}</span>
                  <span class="live-txt">{{ line.text }}</span>
                </li>
              </ul>
            </el-collapse-item>
          </el-collapse>
        </section>
      </div>

      <main class="trace-detail-card">
        <template v-if="!selectedId">
          <div class="empty-detail">
            <div class="empty-orbit" />
            <p>在上方控制条选择一条 trace，此处将展开拓扑、事件时间轴与原始 payload。</p>
          </div>
        </template>
        <template v-else>
          <div class="detail-head">
            <div>
              <h3>{{ selectedSummary }}</h3>
            </div>
            <div class="detail-actions">
              <el-button size="small" :loading="detailLoading" @click="reloadDetail">重载详情</el-button>
            </div>
          </div>

          <div class="detail-meta">
            <div class="meta-chip">
              <span class="meta-label">status</span>
              <span class="status-pill lg" :data-status="detail?.status">{{ detail?.status }}</span>
            </div>
            <div class="meta-chip">
              <span class="meta-label">time</span>
              <span class="meta-val">{{ formatTime(detail?.startedAt) }} → {{ formatTime(detail?.endedAt) }}</span>
            </div>
          </div>

          <div v-if="ragSummary.totalCalls > 0" class="rag-metric-card">
            <div class="rag-cap">RAG 指标</div>
            <div class="rag-grid">
              <div class="rag-kv">
                <span class="rag-k">召回调用</span>
                <span class="rag-v">{{ ragSummary.totalCalls }}</span>
              </div>
              <div class="rag-kv">
                <span class="rag-k">召回结果（命中 / 空）</span>
                <span class="rag-v">{{ ragSummary.hitEmptyText }}</span>
              </div>
              <div class="rag-kv">
                <span class="rag-k">平均耗时</span>
                <span class="rag-v">{{ ragSummary.avgDurationMs }}</span>
              </div>
              <div v-if="manualRagMetrics.recallProxyText" class="rag-kv">
                <span class="rag-k">人工召回率 proxy</span>
                <span class="rag-v">{{ manualRagMetrics.recallProxyText }}</span>
              </div>
              <div v-if="manualRagMetrics.precisionProxyText" class="rag-kv">
                <span class="rag-k">人工准确率 proxy</span>
                <span class="rag-v">{{ manualRagMetrics.precisionProxyText }}</span>
              </div>
              <div v-if="manualRagMetrics.hitAt3Text" class="rag-kv">
                <span class="rag-k">人工 Hit@3 proxy</span>
                <span class="rag-v">{{ manualRagMetrics.hitAt3Text }}</span>
              </div>
            </div>
          </div>

          <AgentTraceTopology
            v-if="layoutNodes.length"
            :layout-nodes="layoutNodes"
            :skeleton-edges="skeletonEdges"
            :trace-id="selectedId"
            :observed-graph-edges="observedGraphEdges"
            :observed-edge-keys="observedEdgeKeySet"
            :selected-node-id="topologySelectedId"
            :node-metrics="topologyNodeMetrics"
            @select-node="onTopologySelect"
            @select-edge="onTopologyEdgeSelect"
            @clear-node="topologySelectedId = ''"
          />

          <el-dialog
            v-model="inspectVisible"
            :title="inspectTitle"
            width="min(960px, 94vw)"
            destroy-on-close
            append-to-body
            class="trace-text-inspect-dialog"
            @closed="onInspectClosed"
          >
            <el-input :model-value="inspectBody" type="textarea" :autosize="{ minRows: 18, maxRows: 36 }" readonly class="inspect-body" />
          </el-dialog>
          <el-dialog
            v-model="queryResultVisible"
            :title="queryResultTitle"
            width="min(1100px, 96vw)"
            destroy-on-close
            append-to-body
            class="trace-text-inspect-dialog"
            @closed="onQueryResultClosed"
          >
            <el-input
              v-if="!queryResultLoading"
              :model-value="queryResultBody"
              type="textarea"
              :autosize="{ minRows: 18, maxRows: 40 }"
              readonly
              class="inspect-body"
            />
            <div v-else class="detail-loading">
              <el-icon class="spin"><Loading /></el-icon>
              <span>加载查询结果中…</span>
            </div>
          </el-dialog>

          <div v-if="planStepChips.length" class="plan-spine" aria-label="计划沿拓扑推进顺序">
            <span class="plan-spine-title">计划推进</span>
            <span v-for="(c, i) in planStepChips" :key="i" class="plan-chip">{{ c }}</span>
          </div>

          <div class="filter-bar">
            <span class="filter-label">事件类型</span>
            <el-checkbox-group v-model="typeFilterList" size="small" class="type-group">
              <el-checkbox-button v-for="t in allTypes" :key="t" :label="t">
                {{ t }}
              </el-checkbox-button>
            </el-checkbox-group>
            <span class="filter-label">TRACE_BAG 分区</span>
            <el-radio-group v-model="traceBagLaneFilter" size="small" class="lane-group">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="governance">治理</el-radio-button>
              <el-radio-button label="business">业务</el-radio-button>
            </el-radio-group>
            <span v-if="typeFilterList.length" class="filter-hint">已选 {{ typeFilterList.length }} 类；清空则显示全部</span>
          </div>

          <el-scrollbar class="timeline-scroll" max-height="calc(100vh - 420px)">
            <div v-if="detailLoading" class="detail-loading">
              <el-icon class="spin"><Loading /></el-icon>
              <span>载入事件流…</span>
            </div>
            <ol v-else class="timeline">
              <li
                v-for="(block, bidx) in timelineBlocks"
                :key="blockTimelineKey(block, bidx)"
                class="timeline-item"
                :class="{ 'timeline-item--cluster': block.kind === 'node-run' }"
                :style="{ '--stagger': bidx }"
              >
                <div
                  class="rail-mark"
                  :class="block.kind === 'node-run' ? 'dot-node-cluster' : dotClassForEventType(block.events[0]?.type)"
                />
                <section
                  v-if="block.kind === 'node-run'"
                  class="ev-cluster"
                  :data-edge-key="clusterEdgeKey(block)"
                >
                  <header class="ev-cluster-head">
                    <div class="ev-cluster-head-main">
                      <h4 class="ev-cluster-title">{{ clusterTitle(block.nodeId) }}</h4>
                      <p class="ev-cluster-id mono-clip">{{ block.nodeId }}</p>
                    </div>
                    <div class="ev-cluster-head-aside">
                      <div class="phase-strip" aria-hidden="true">
                        <span class="phase-pill phase-pill--start">START</span>
                        <span class="phase-wire" />
                        <span class="phase-pill phase-pill--end">END</span>
                      </div>
                      <div class="ev-cluster-chips">
                        <span class="cc-chip">{{ block.events.length }} 件事务</span>
                        <span class="cc-chip">节点耗时 {{ nodeRunDurationLabel(block) }}</span>
                        <span class="cc-chip" :data-ok="nodeRunStatusChip(block).ok">{{ nodeRunStatusChip(block).text }}</span>
                      </div>
                      <time class="ev-cluster-range">{{ formatTime(nodeRunWindow(block).start) }} →
                        {{ formatTime(nodeRunWindow(block).end) }}</time>
                    </div>
                  </header>
                  <div class="ev-cluster-stack">
                    <AgentTraceEventCard
                      v-for="(ev, j) in block.events"
                      :key="`${bidx}-${j}-${ev?.ts}-${ev?.type}`"
                      :ev="ev"
                      variant="nested"
                      :format-time="formatTime"
                      :edge-picked="isPickedEdgeEvent(ev)"
                      :edge-key="edgeKeyOfEvent(ev)"
                      @open-prompt="openPromptInspect"
                      @open-response="openResponseInspect"
                      @open-query-result="openQueryResultInspect"
                    />
                  </div>
                </section>
                <AgentTraceEventCard
                  v-else
                  :ev="block.events[0]"
                  variant="standalone"
                  :format-time="formatTime"
                  :edge-picked="isPickedEdgeEvent(block.events[0])"
                  :edge-key="edgeKeyOfEvent(block.events[0])"
                  @open-prompt="openPromptInspect"
                  @open-response="openResponseInspect"
                  @open-query-result="openQueryResultInspect"
                />
              </li>
            </ol>
          </el-scrollbar>

          <div v-if="finalAnswerText" class="final-answer-card">
            <div class="final-answer-cap">模型最终答复</div>
            <div class="final-answer-body agent-md" v-html="finalAnswerHtml" />
          </div>

          <div v-if="llmStreamRows.length" class="final-answer-card">
            <div class="final-answer-cap">思考流（Reasoning）</div>
            <div
              ref="llmStreamWrapRef"
              class="llm-stream-wrap"
              @scroll.passive="onLlmStreamScroll"
            >
              <div v-for="row in llmStreamRows" :key="`llm-${row.nodeId}`" class="llm-stream-node">
                <div class="llm-stream-node-head">
                  <span class="llm-stream-node-title">{{ row.nodeId }}</span>
                  <span class="llm-stream-node-meta">{{ row.reasoningChars }} chars / {{ row.answerChars }} chars</span>
                </div>
                <div class="llm-stream-grid">
                  <section class="llm-stream-pane">
                    <h5>思考过程</h5>
                    <div
                      class="llm-stream-body"
                      @scroll.passive="onLlmPaneScroll(row.nodeId, 'reasoning')"
                      :ref="(el) => setLlmPaneRef(el, row.nodeId, 'reasoning')"
                    >{{ row.reasoningText || '（无）' }}</div>
                  </section>
                  <section class="llm-stream-pane">
                    <h5>正常回答</h5>
                    <div
                      class="llm-stream-body"
                      @scroll.passive="onLlmPaneScroll(row.nodeId, 'answer')"
                      :ref="(el) => setLlmPaneRef(el, row.nodeId, 'answer')"
                    >{{ row.answerText || '（无）' }}</div>
                  </section>
                </div>
              </div>
            </div>
            <div v-if="!llmAutoFollow" class="llm-stream-float">
              <el-button size="small" type="primary" plain @click="resumeLlmAutoFollow">
                跟随最新内容
              </el-button>
            </div>
          </div>

          <div v-if="selectedId" class="anno-card">
            <el-collapse v-model="annoCollapseNames" class="anno-collapse">
              <el-collapse-item name="anno-panel">
                <template #title>
                  <span class="anno-cap-title">人工标注（当前 trace）</span>
                </template>

                <el-form :model="ann" label-width="168px" class="anno-form" size="small">
              <el-form-item>
                <template #label>
                  <span>链路 route</span>
                  <el-tooltip placement="top" effect="light" content="按 trace 聚合 → 意图分流占比可与 Micrometer intent.route 对照；此处为单条人工修正。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.route" placeholder="自动提取，可手工修正" clearable style="width: 220px">
                  <el-option value="data_query" label="data_query（NL→MQL）" />
                  <el-option value="knowledge_qa" label="knowledge_qa（知识库问答）" />
                  <el-option value="common_chat" label="common_chat" />
                  <el-option value="unknown" label="unknown" />
                </el-select>
              </el-form-item>

              <template v-if="showDataQueryAnno">
                <div class="anno-block-title">数据分析（route=data_query 时填写；含该链路 RAG 召回）</div>
                <el-form-item>
                <template #label>
                  <span>召回相关集合</span>
                  <el-tooltip
                    placement="top"
                    effect="light"
                    content="自动合并：证据 rag_recall 命中里的 collection + Schema 粗召 schema_rough.collections。用于与「MQL 执行集合」算覆盖度/冗余 proxy。"
                  >
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-input v-model="ann.dqRecalledCsv" placeholder="逗号分隔；可改" clearable />
                </el-form-item>
                <el-form-item>
                <template #label>
                  <span>MQL 执行集合</span>
                  <el-tooltip placement="top" effect="light" content="来自本 trace 的 mongo_execute 摘要（可多步合并）；与左列算执行覆盖度。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-input v-model="ann.dqUsedCsv" placeholder="逗号分隔；可改" clearable />
                </el-form-item>
                <el-form-item>
                <template #label>
                  <span>意图是否正确</span>
                  <el-tooltip placement="top" effect="light" content="存库键 intentCorrect。全库聚合 → 意图人工正确率（见上表）。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.dqIntentCorrect" clearable placeholder="请选择" style="width: 200px">
                  <el-option value="yes" label="yes（相对用户真实意图，路由对）" />
                  <el-option value="no" label="no（路由错）" />
                  <el-option value="unclear" label="unclear（看不清）" />
                </el-select>
                </el-form-item>
              </template>

              <template v-if="showKnowledgeQaAnno">
                <div class="anno-block-title">知识问答（route=knowledge_qa 时填写）</div>
                <el-form-item>
                <template #label>
                  <span>检索是否相关</span>
                  <el-tooltip placement="top" effect="light" content="存库键 retrievalRelevant。全库聚合 → KQA 检索相关率。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.kqaRetrievalRelevant" clearable placeholder="请选择" style="width: 200px">
                  <el-option value="yes" label="yes" />
                  <el-option value="no" label="no" />
                  <el-option value="unclear" label="unclear" />
                </el-select>
                </el-form-item>
                <el-form-item>
                <template #label>
                  <span>空命中是否合理</span>
                  <el-tooltip placement="top" effect="light" content="存库键 emptyHitJustified。全库聚合 → 空命中合理率；可与 trace 中空召回事实对照。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.kqaEmptyJustified" clearable placeholder="请选择" style="width: 200px">
                  <el-option value="yes" label="yes（该空）" />
                  <el-option value="no" label="no（不该空）" />
                  <el-option value="na" label="na（非空召回）" />
                </el-select>
                </el-form-item>
                <el-form-item>
                <template #label>
                  <span>答案是否贴证据</span>
                  <el-tooltip placement="top" effect="light" content="存库键 answerGrounded。全库聚合 → 答案贴证据率。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.kqaAnswerGrounded" clearable placeholder="请选择" style="width: 200px">
                  <el-option value="yes" label="yes" />
                  <el-option value="no" label="no" />
                  <el-option value="unclear" label="unclear" />
                </el-select>
                </el-form-item>
              </template>

              <el-form-item>
                <template #label>
                  <span>最终答复正确性</span>
                  <el-tooltip placement="top" effect="light" content="全库聚合 → 最终答复正确率 = correct / (correct+partial+wrong)。">
                    <span class="anno-lab-hint">?</span>
                  </el-tooltip>
                </template>
                <el-select v-model="ann.finalAnswerCorrectness" clearable placeholder="请选择" style="width: 260px">
                  <el-option value="correct" label="correct（正确回答问题）" />
                  <el-option value="partial" label="partial（部分正确）" />
                  <el-option value="wrong" label="wrong（回答错误/跑偏）" />
                  <el-option value="unclear" label="unclear（无法判断）" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="annSaving" @click="saveAnnotation">保存标注</el-button>
                <span v-if="annVersion != null" class="anno-ver">version {{ annVersion }}</span>
              </el-form-item>
                </el-form>
              </el-collapse-item>
            </el-collapse>
          </div>
        </template>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  getAgentGraphSkeleton,
  getAgentMongoQueryResult,
  getAgentTrace,
  getTraceAnnotationByTraceId,
  listAgentTraces,
  upsertTraceAnnotation
} from '@/services/agent-management.service.js'
import { normalizeAgentMarkdownText, renderAgentMarkdownHtml } from '@/utils/agent-markdown.js'
import { chatAgentStream, formatAgentNodeLine } from '@/services/agent.service'
import AgentTraceTopology from '@/components/agent-management/AgentTraceTopology.vue'
import AgentTraceEventCard from '@/components/agent-management/AgentTraceEventCard.vue'
import { buildTimelineBlocks } from '@/components/agent-management/agent-trace-timeline-groups.js'
import { dotClassForEventType } from '@/components/agent-management/agent-trace-event-present.js'
import {
  buildNodeMetricsFromEvents,
  edgeKey,
  eventTouchesNode,
  extractGraphEdgesFromTrace,
  layoutGraphLr,
  resolveCanonicalEndId
} from '@/components/agent-management/agent-trace-topology-layout.js'

const OBS_THREAD_KEY = 'agent_trace_obs_thread_id'
const limit = ref(50)
const listLoading = ref(false)
const detailLoading = ref(false)
const rows = ref([])
const traceKeyword = ref('')
const selectedId = ref('')
const detail = ref(null)
/** 选中的类型；空数组表示不过滤（显示全部） */
const typeFilterList = ref([])
/** TRACE_BAG 车道过滤：all/governance/business */
const traceBagLaneFilter = ref('all')
/** 拓扑节点点击 → 时间轴仅看相关事件 */
const topologySelectedId = ref('')
/** 拓扑边点击 → 时间轴联动到 GRAPH_EDGE 事件 */
const topologySelectedEdgeKey = ref('')

/** 文本检视弹窗（LLM 提示词 / 响应预览） */
const inspectVisible = ref(false)
const inspectTitle = ref('')
const inspectBody = ref('')
const queryResultVisible = ref(false)
const queryResultTitle = ref('')
const queryResultBody = ref('')
const queryResultLoading = ref(false)
const displayedFinalAnswerText = ref('')
let finalAnswerTypingTimer = null
const llmStreamWrapRef = ref(null)
const llmAutoFollow = ref(true)
const llmPaneRefs = ref({})
const llmPaneAutoFollow = ref({})

const skeleton = ref(null)
const obsQuery = ref('')
const obsThreadId = ref(typeof localStorage !== 'undefined' ? localStorage.getItem(OBS_THREAD_KEY) || '' : '')
const obsStreaming = ref(false)
const obsAbortController = ref(null)
const liveReasoningLines = ref([])
const liveLlmNodeStreams = ref({})
const liveLlmNodeSeq = ref(0)
let pollTimer = null

/** 与 trace 详情同屏的人工标注（写入 agent_trace_annotation） */
const ann = reactive({
  route: '',
  finalAnswerCorrectness: '',
  dqRecalledCsv: '',
  dqUsedCsv: '',
  dqIntentCorrect: '',
  kqaRetrievalRelevant: '',
  kqaEmptyJustified: '',
  kqaAnswerGrounded: ''
})
const annSaving = ref(false)
const annVersion = ref(null)
/** 人工标注区默认折叠；name 存在时展开 */
const annoCollapseNames = ref([])

const events = computed(() => {
  const e = detail.value?.events
  return Array.isArray(e) ? e : []
})

const allTypes = computed(() => {
  const s = new Set()
  for (const ev of events.value) {
    if (ev?.type) s.add(ev.type)
  }
  return [...s].sort()
})

const filteredRows = computed(() => {
  const q = String(traceKeyword.value || '').trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((row) => {
    const parts = [
      row?.inputPreview,
      row?._id,
      row?.traceId,
      row?.threadId,
      row?.status
    ]
    return parts.some((v) => String(v || '').toLowerCase().includes(q))
  })
})

const filteredEvents = computed(() => {
  let list = events.value
  if (typeFilterList.value.length) {
    const set = new Set(typeFilterList.value)
    list = list.filter((ev) => set.has(ev?.type))
  }
  if (traceBagLaneFilter.value !== 'all') {
    list = list.filter((ev) => {
      if (ev?.type !== 'TRACE_BAG') return true
      const facet = String(ev?.payload?.facet || '')
      const isGovernance = facet === 'node_governance'
      return traceBagLaneFilter.value === 'governance' ? isGovernance : !isGovernance
    })
  }
  if (topologySelectedId.value) {
    const nid = topologySelectedId.value
    list = list.filter((ev) => eventTouchesNode(ev, nid))
  }
  return list
})

/**
 * 为 LLM_RESPONSE 关联同节点最近一次 LLM_CALL 的 token 使用量。
 * 说明：LLM_RESPONSE 事件本身不落 token，这里做只读展示增强。
 */
const llmResponseTokenByEvent = computed(() => {
  const map = new WeakMap()
  const queueByNode = new Map()
  for (const ev of events.value) {
    if (!ev || typeof ev !== 'object') continue
    if (ev.type === 'LLM_CALL') {
      const payload = ev.payload && typeof ev.payload === 'object' ? ev.payload : {}
      const rawLabel = String(payload.label || '').trim()
      if (!rawLabel) continue
      const nodeKey = rawLabel.split(':')[0]
      const promptTokens = Number(payload.promptTokens || 0)
      const completionTokens = Number(payload.completionTokens || 0)
      const usage = {
        promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
        completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0
      }
      const q = queueByNode.get(nodeKey) || []
      q.push(usage)
      queueByNode.set(nodeKey, q)
      continue
    }
    if (ev.type === 'LLM_RESPONSE') {
      const nodeKey = String(ev.source || '').trim()
      if (!nodeKey) continue
      const q = queueByNode.get(nodeKey)
      if (q && q.length) {
        map.set(ev, q.shift())
      }
    }
  }
  return map
})

const timelineEvents = computed(() =>
  filteredEvents.value.map((ev) => {
    if (ev?.type !== 'LLM_RESPONSE') return ev
    const usage = llmResponseTokenByEvent.value.get(ev)
    if (!usage) return ev
    const payload = ev.payload && typeof ev.payload === 'object' ? ev.payload : {}
    return {
      ...ev,
      payload: {
        ...payload,
        tokenUsage: usage
      }
    }
  })
)

/** 时间轴展示块：单条事件或「NODE_START→…→NODE_END」节点聚合 */
const timelineBlocks = computed(() => buildTimelineBlocks(timelineEvents.value))

const nodeLabelById = computed(() => {
  const m = new Map()
  for (const n of skeleton.value?.nodes || []) {
    if (n?.id) m.set(String(n.id), String(n.label || n.id))
  }
  return m
})

function blockTimelineKey(block, idx) {
  if (block.kind === 'node-run') {
    return `run-${block.nodeId}-${idx}-${block.events[0]?.ts}`
  }
  return `one-${idx}-${block.events[0]?.ts}-${block.events[0]?.type}`
}

function clusterTitle(nodeId) {
  return nodeLabelById.value.get(nodeId) || nodeId
}

function clusterEdgeKey(block) {
  for (const ev of block.events) {
    const k = edgeKeyOfEvent(ev)
    if (k) return k
  }
  return ''
}

function formatDurationShortMs(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)}s`
}

function nodeRunWindow(block) {
  const evs = block.events
  return { start: evs[0]?.ts, end: evs[evs.length - 1]?.ts }
}

function nodeRunDurationLabel(block) {
  const endEv = block.events.find((e) => e?.type === 'NODE_END')
  const d = Number(endEv?.payload?.durationMs)
  if (Number.isFinite(d) && d >= 0) return formatDurationShortMs(d)
  return '—'
}

function nodeRunStatusChip(block) {
  if (!block.complete) return { text: '未闭合', ok: false }
  const endEv = block.events.find((e) => e?.type === 'NODE_END')
  if (!endEv) return { text: '—', ok: true }
  const ok = endEv.payload?.ok !== false
  return { text: ok ? '成功' : '失败', ok }
}

const skeletonEdges = computed(() => {
  const e = skeleton.value?.edges
  return Array.isArray(e) ? e : []
})

const layoutNodes = computed(() => {
  const nodes = skeleton.value?.nodes
  if (!Array.isArray(nodes) || !nodes.length) return []
  return layoutGraphLr(nodes, skeletonEdges.value)
})

const selectedSummary = computed(() => {
  const s = detail.value?.inputPreview
  if (s != null && String(s).trim()) return String(s).trim()
  return '未命名查询'
})

const canonicalEndId = computed(() => resolveCanonicalEndId(skeleton.value?.nodes))

const observedGraphEdges = computed(() => extractGraphEdgesFromTrace(events.value, canonicalEndId.value))

const observedEdgeKeySet = computed(() => {
  const s = new Set()
  for (const ge of observedGraphEdges.value) {
    s.add(edgeKey(ge.from, ge.to))
  }
  return s
})

const topologyNodeMetrics = computed(() => buildNodeMetricsFromEvents(events.value))

const ragSummary = computed(() => {
  const rows = events.value.filter((ev) => {
    if (ev?.type !== 'TRACE_BAG') return false
    const facet = String(ev?.payload?.facet || '')
    return facet === 'rag_recall' || facet === 'schema_rough' || facet === 'few_shot_recall'
  })
  if (!rows.length) {
    return {
      totalCalls: 0,
      hitEmptyText: '0 / 0',
      avgDurationMs: '0ms',
      callsByLaneText: ''
    }
  }
  let hit = 0
  let empty = 0
  let sum = 0
  let durN = 0
  const byLane = new Map()
  for (const ev of rows) {
    const facet = String(ev?.payload?.facet || '')
    const nodeId = String(ev?.payload?.nodeId || '')
    let lane = nodeId || facet
    if (facet === 'schema_rough') lane = 'schema_rough'
    byLane.set(lane, (byLane.get(lane) || 0) + 1)

    const kv = ev?.payload?.kv || {}
    const out = String(kv.outcome || '')
    // 与后端 ragSummary 一致：单次调用要么计命中要么计非命中，避免 HIT 与 empty 双计
    if (out === 'HIT') {
      hit += 1
    } else {
      empty += 1
    }
    const d = Number(kv.vectorDurationMs ?? kv.durationMs)
    if (Number.isFinite(d) && d >= 0) {
      sum += d
      durN += 1
    }
  }
  const total = rows.length
  const callsByLaneText = [...byLane.entries()]
    .map(([k, v]) => `${k}:${v}`)
    .join(' | ')
  return {
    totalCalls: total,
    hitEmptyText: `${hit} / ${empty}`,
    avgDurationMs: `${durN ? Math.round(sum / durN) : 0}ms`,
    callsByLaneText
  }
})


function percent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0.0%'
  return `${(n * 100).toFixed(1)}%`
}


/** 根文档 finalAnswerPreview 或事件中 TRACE_BAG final_answer（仅详情区展示） */
/** TRACE_BAG plan_step：与拓扑「一节点一框」一致，只表示沿图推进的步骤顺序 */
const planStepChips = computed(() => {
  const out = []
  for (const ev of events.value) {
    if (ev?.type !== 'TRACE_BAG' || ev?.payload?.facet !== 'plan_step') continue
    const kv = ev.payload?.kv || {}
    if (kv.phase === 'plan_done') {
      out.push(`完成 · 共 ${kv.totalSteps ?? '?'} 步`)
      continue
    }
    const step = kv.currentStep
    const tot = kv.totalSteps
    const tool = kv.toolToUse || '?'
    out.push(`第${step}/${tot}步 → ${tool}`)
  }
  return out
})

const finalAnswerText = computed(() => {
  const fp = detail.value?.finalAnswerPreview
  if (fp != null && String(fp).trim()) return String(fp).trim()
  const evs = events.value
  for (let i = evs.length - 1; i >= 0; i--) {
    const ev = evs[i]
    if (ev?.type === 'TRACE_BAG' && ev?.payload?.facet === 'final_answer') {
      const p = ev.payload?.kv?.preview
      if (p != null && String(p).trim()) return String(p).trim()
    }
  }
  return ''
})

const finalAnswerHtml = computed(() => renderAgentMarkdownHtml(displayedFinalAnswerText.value))

const LLM_STREAM_REASON_SEP = '\n\n── 同节点后续推理（trace 摘要）──\n\n'
const LLM_STREAM_ANSWER_SEP = '\n\n── 同节点后续输出（trace）──\n\n'

const llmStreamRows = computed(() => {
  const merged = {}
  const live = liveLlmNodeStreams.value || {}
  const hadLiveReasoning = new Set()
  const hadLiveAnswer = new Set()
  for (const [nodeIdRaw, row] of Object.entries(live)) {
    const nodeId = String(nodeIdRaw || '').trim() || 'unknown'
    const x = merged[nodeId] || {
      nodeId,
      firstSeen: Number(row?.firstSeen ?? Number.MAX_SAFE_INTEGER),
      reasoningText: String(row?.reasoningText || ''),
      answerText: String(row?.answerText || '')
    }
    x.firstSeen = Math.min(x.firstSeen, Number(row?.firstSeen ?? Number.MAX_SAFE_INTEGER))
    if (String(x.reasoningText || '').trim()) hadLiveReasoning.add(nodeId)
    if (String(x.answerText || '').trim()) hadLiveAnswer.add(nodeId)
    merged[nodeId] = x
  }
  let eventIdx = 0
  for (const ev of events.value) {
    eventIdx += 1
    const eventFirstSeen = 1000000 + eventIdx
    if (ev?.type === 'TRACE_BAG' && String(ev?.payload?.facet || '') === 'llm_reasoning') {
      const kv = ev?.payload?.kv || {}
      const nodeId = String(kv.nodeId || ev?.payload?.nodeId || '').trim() || 'unknown'
      const x = merged[nodeId] || { nodeId, firstSeen: eventFirstSeen, reasoningText: '', answerText: '' }
      x.firstSeen = Math.min(x.firstSeen, eventFirstSeen)
      const preview = String(kv.reasoningPreview || '')
      if (!preview) {
        merged[nodeId] = x
        continue
      }
      // 本会话已收到该节点 reasoning SSE 时，仍以实时流为准，仅用 trace 补空，避免与 LLM_RESPONSE 双写重复。
      if (hadLiveReasoning.has(nodeId)) {
        if (!x.reasoningText) x.reasoningText = preview
      } else if (!x.reasoningText) {
        x.reasoningText = preview
      } else if (!x.reasoningText.includes(preview)) {
        x.reasoningText += LLM_STREAM_REASON_SEP + preview
      }
      merged[nodeId] = x
      continue
    }
    if (ev?.type === 'LLM_RESPONSE') {
      const nodeId = String(ev?.source || '').trim() || 'unknown'
      const payload = ev?.payload || {}
      const text = String(payload.responseFull || payload.responsePreview || '')
      if (!text) continue
      const x = merged[nodeId] || { nodeId, firstSeen: eventFirstSeen, reasoningText: '', answerText: '' }
      x.firstSeen = Math.min(x.firstSeen, eventFirstSeen)
      if (hadLiveAnswer.has(nodeId)) {
        if (!x.answerText) x.answerText = text
      } else if (!x.answerText) {
        x.answerText = text
      } else if (!x.answerText.includes(text)) {
        x.answerText += LLM_STREAM_ANSWER_SEP + text
      }
      merged[nodeId] = x
    }
  }
  return Object.values(merged)
    .map((x) => ({
      ...x,
      reasoningChars: x.reasoningText.length,
      answerChars: x.answerText.length
    }))
    .filter((x) => x.reasoningChars > 0 || x.answerChars > 0)
    .sort((a, b) => {
      if (a.firstSeen !== b.firstSeen) return a.firstSeen - b.firstSeen
      return a.nodeId.localeCompare(b.nodeId)
    })
})

function formatTime(ms) {
  if (ms == null || ms === '') return '—'
  const n = Number(ms)
  if (!Number.isFinite(n)) return String(ms)
  try {
    return new Date(n).toLocaleString()
  } catch {
    return String(ms)
  }
}

function stopFinalAnswerTyping() {
  if (finalAnswerTypingTimer) {
    clearInterval(finalAnswerTypingTimer)
    finalAnswerTypingTimer = null
  }
}

function syncFinalAnswerDisplay(nextRaw, animate) {
  const normalized = normalizeAgentMarkdownText(nextRaw || '')
  if (!animate) {
    stopFinalAnswerTyping()
    displayedFinalAnswerText.value = normalized
    return
  }
  const current = displayedFinalAnswerText.value || ''
  if (!normalized.startsWith(current)) {
    displayedFinalAnswerText.value = ''
  }
  stopFinalAnswerTyping()
  finalAnswerTypingTimer = setInterval(() => {
    const cur = displayedFinalAnswerText.value || ''
    if (cur.length >= normalized.length) {
      stopFinalAnswerTyping()
      return
    }
    // 每帧推进 2~4 字，既有“打字感”又不拖沓
    const step = Math.max(2, Math.min(4, Math.ceil((normalized.length - cur.length) / 60)))
    displayedFinalAnswerText.value = normalized.slice(0, cur.length + step)
  }, 24)
}

function openPromptInspect(ev) {
  const p = ev?.payload || {}
  const full = p.promptFull != null ? String(p.promptFull) : ''
  const body = full || '未采集到提示词全文'
  inspectTitle.value = `LLM 提示词 · ${p.template || '（无模板名）'}`
  inspectBody.value = body
  inspectVisible.value = true
}

function openResponseInspect(ev) {
  const p = ev?.payload || {}
  const bodyRaw =
    p.responseFull != null
      ? String(p.responseFull)
      : p.responsePreview != null
        ? String(p.responsePreview)
        : ''
  const body = tryPrettyJson(bodyRaw)
  inspectTitle.value = `LLM 响应全文 · ${ev?.source || '—'}`
  inspectBody.value = body
  inspectVisible.value = true
}

function tryPrettyJson(text) {
  const raw = text == null ? '' : String(text).trim()
  if (!raw) return ''
  const first = raw[0]
  const last = raw[raw.length - 1]
  if (!((first === '{' && last === '}') || (first === '[' && last === ']'))) {
    return text
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return text
  }
}

function onInspectClosed() {
  inspectVisible.value = false
  inspectTitle.value = ''
  inspectBody.value = ''
}

function onQueryResultClosed() {
  queryResultVisible.value = false
  queryResultTitle.value = ''
  queryResultBody.value = ''
  queryResultLoading.value = false
}

async function openQueryResultInspect(ev) {
  const detail = ev?.payload?.detail || {}
  const queryResultId = detail.queryResultId != null ? String(detail.queryResultId).trim() : ''
  if (!queryResultId) {
    ElMessage.warning('该事件未记录查询结果 ID')
    return
  }
  queryResultVisible.value = true
  queryResultLoading.value = true
  queryResultTitle.value = `查询结果 · ${queryResultId}`
  queryResultBody.value = ''
  try {
    const data = await getAgentMongoQueryResult(queryResultId)
    const rows = Array.isArray(data?.rows) ? data.rows : []
    queryResultBody.value = JSON.stringify(
      {
        queryResultId: data?.queryResultId || queryResultId,
        traceId: data?.traceId || '',
        stepNo: data?.stepNo,
        rowCount: data?.rowCount ?? rows.length,
        durationMs: data?.durationMs,
        createdAt: data?.createdAt,
        mqlRaw: data?.mqlRaw || '',
        rows
      },
      null,
      2
    )
  } catch (e) {
    queryResultBody.value = `加载失败：${e?.message || '未知错误'}`
  } finally {
    queryResultLoading.value = false
  }
}

async function loadList() {
  listLoading.value = true
  try {
    rows.value = (await listAgentTraces(limit.value)) || []
    if (selectedId.value && !rows.value.some((r) => (r._id || r.traceId) === selectedId.value)) {
      selectedId.value = ''
      detail.value = null
    }
  } catch (e) {
    ElMessage.error(e.message || '加载列表失败')
  } finally {
    listLoading.value = false
  }
}

function resetAnnForm() {
  ann.route = ''
  ann.finalAnswerCorrectness = ''
  ann.dqRecalledCsv = ''
  ann.dqUsedCsv = ''
  ann.dqIntentCorrect = ''
  ann.kqaRetrievalRelevant = ''
  ann.kqaEmptyJustified = ''
  ann.kqaAnswerGrounded = ''
  annVersion.value = null
}

function formatCollectionsField(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join(', ')
  if (v == null) return ''
  return String(v).trim()
}

function pushCsvCollection(target, raw) {
  if (raw == null) return
  const vals = Array.isArray(raw) ? raw : [raw]
  for (const one of vals) {
    const s = String(one || '').trim()
    if (s) target.add(s)
  }
}

function inferRouteFromTrace(trace, evs) {
  const direct = String(trace?.route || '').trim().toLowerCase()
  if (direct) return direct
  for (const ev of evs) {
    if (ev?.type !== 'GRAPH_EDGE') continue
    const reason = String(ev?.payload?.reason || '').toUpperCase()
    if (reason.includes('INTENT_DATA_QUERY')) return 'data_query'
    if (reason.includes('INTENT_KNOWLEDGE_QA')) return 'knowledge_qa'
    if (reason.includes('INTENT_COMMON_CHAT')) return 'common_chat'
  }
  for (const ev of evs) {
    const nid = String(ev?.payload?.nodeId || '').toLowerCase()
    if (!nid) continue
    if (nid.includes('knowledge_qa')) return 'knowledge_qa'
    if (nid.includes('evidence_recall') || nid.includes('mql') || nid.includes('mongo_execute')) return 'data_query'
  }
  return ''
}

function extractCollectionsFromTrace(evs) {
  const recalled = new Set()
  const usedInMql = new Set()
  for (const ev of evs) {
    if (ev?.type === 'TRACE_BAG' && ev?.payload?.facet === 'rag_recall') {
      const hits = Array.isArray(ev?.payload?.kv?.hits) ? ev.payload.kv.hits : []
      for (const h of hits) {
        pushCsvCollection(recalled, h?.collection)
      }
    }
    if (ev?.type === 'TRACE_BAG' && ev?.payload?.facet === 'schema_rough') {
      pushCsvCollection(recalled, ev?.payload?.kv?.collections)
    }
    if (ev?.type === 'TOOL_CALL' && String(ev?.payload?.tool || '') === 'mongo_execute') {
      const cols = ev?.payload?.detail?.collections
      pushCsvCollection(usedInMql, cols)
    }
  }
  return {
    recalledCsv: [...recalled].join(', '),
    usedCsv: [...usedInMql].join(', ')
  }
}

function applyAnnAutoFromTrace(trace) {
  const evs = Array.isArray(trace?.events) ? trace.events : []
  const route = inferRouteFromTrace(trace, evs)
  const { recalledCsv, usedCsv } = extractCollectionsFromTrace(evs)
  if (!ann.route && route) ann.route = route
  if (!ann.dqRecalledCsv && recalledCsv) ann.dqRecalledCsv = recalledCsv
  if (!ann.dqUsedCsv && usedCsv) ann.dqUsedCsv = usedCsv
}

function applyAnnDoc(doc) {
  if (!doc) {
    resetAnnForm()
    return
  }
  const r = doc.route
  ann.route = r && r !== 'unknown' ? r : ''
  ann.finalAnswerCorrectness = doc.finalAnswerCorrectness != null ? String(doc.finalAnswerCorrectness) : ''
  const dq = doc.dataQuery || {}
  ann.dqRecalledCsv = formatCollectionsField(dq.recalledCollections)
  ann.dqUsedCsv = formatCollectionsField(dq.usedInMqlCollections)
  ann.dqIntentCorrect = dq.intentCorrect != null ? String(dq.intentCorrect) : ''
  const kq = doc.knowledgeQa || {}
  ann.kqaRetrievalRelevant = kq.retrievalRelevant != null ? String(kq.retrievalRelevant) : ''
  ann.kqaEmptyJustified = kq.emptyHitJustified != null ? String(kq.emptyHitJustified) : ''
  ann.kqaAnswerGrounded = kq.answerGrounded != null ? String(kq.answerGrounded) : ''
  annVersion.value = doc.version != null ? Number(doc.version) : null
}

function csvToCollectionList(s) {
  if (!s || !String(s).trim()) return []
  return String(s)
    .split(/[,，;；\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** 基于两列集合名 + 当前表单，单 trace 可解释的 proxy（非 golden Recall@K） */
const annoSetMetrics = computed(() => {
  const recalled = new Set(csvToCollectionList(ann.dqRecalledCsv))
  const used = new Set(csvToCollectionList(ann.dqUsedCsv))
  const hasSets = recalled.size > 0 || used.size > 0
  if (!hasSets) {
    return { hasSets: false, coverageText: '', noiseText: '', autoAlignText: '' }
  }
  let inter = 0
  for (const u of used) {
    if (recalled.has(u)) inter += 1
  }
  const usedSize = used.size
  const recSize = recalled.size
  let coverageText = '—'
  if (usedSize > 0) {
    coverageText = `${((inter / usedSize) * 100).toFixed(1)}%（${inter}/${usedSize}）`
  } else {
    coverageText = '无执行集合'
  }
  let noiseText = '—'
  if (recSize > 0) {
    let extra = 0
    for (const r of recalled) {
      if (!used.has(r)) extra += 1
    }
    noiseText = `${((extra / recSize) * 100).toFixed(1)}%（${extra}/${recSize}）`
  } else {
    noiseText = '无召回相关集合'
  }
  let autoAlignText = ''
  if (usedSize > 0 && recSize > 0) {
    if (inter === usedSize) autoAlignText = '执行集合 ⊆ 召回相关（强一致）'
    else if (inter > 0) autoAlignText = '部分重合：请结合业务判断是否漏召或列名不一致'
    else autoAlignText = '无交集：请核对「召回相关」与「执行集合」是否填对'
  }
  return { hasSets: true, coverageText, noiseText, autoAlignText }
})

/** 知识问答链路最后一次证据向量检索（与后端一致：nodeId 为 evidence_recall） */
const traceKqaRagLine = computed(() => {
  let lastKv = null
  for (const ev of events.value) {
    if (ev?.type !== 'TRACE_BAG' || ev?.payload?.facet !== 'rag_recall') continue
    if (String(ev?.payload?.nodeId || '') !== 'evidence_recall') continue
    lastKv = ev?.payload?.kv || null
  }
  if (!lastKv) return ''
  const out = lastKv.outcome != null ? String(lastKv.outcome) : ''
  const eh =
    lastKv.emptyHit === true ? '空召回' : lastKv.emptyHit === false ? '有命中' : ''
  const rc = lastKv.retrievedCount != null ? String(lastKv.retrievedCount) : ''
  const parts = []
  if (out) parts.push(`outcome=${out}`)
  if (eh) parts.push(eh)
  if (rc) parts.push(`retrieved=${rc}`)
  return parts.join('，')
})

/** 人工标注驱动的通用 RAG proxy，展示在上方 RAG 指标卡 */
const manualRagMetrics = computed(() => {
  const m = { recallProxyText: '', precisionProxyText: '', hitAt3Text: '', note: '' }
  const route = String(ann.route || '').trim().toLowerCase()

  // NL→MQL 场景：用「召回相关集合 vs 执行集合」做 proxy
  if (!route || route === 'data_query') {
    if (annoSetMetrics.value.hasSets) {
      m.recallProxyText = annoSetMetrics.value.coverageText
      const noisePct = Number.parseFloat(annoSetMetrics.value.noiseText || '')
      m.precisionProxyText = Number.isFinite(noisePct) ? `${(100 - noisePct).toFixed(1)}%` : ''
      const covNum = Number.parseFloat(annoSetMetrics.value.coverageText || '0')
      if (Number.isFinite(covNum)) m.hitAt3Text = covNum > 0 ? '1（有命中）' : '0（无命中）'
      m.note = 'NL→MQL 这里也用了 RAG；当前为集合级 proxy，非 golden Recall@K。'
      return m
    }
  }

  // 知识问答场景：用人工 yes/no 映射通用指标 proxy
  if (route === 'knowledge_qa') {
    if (ann.kqaRetrievalRelevant) {
      m.precisionProxyText = ann.kqaRetrievalRelevant === 'yes' ? '100.0%' : ann.kqaRetrievalRelevant === 'no' ? '0.0%' : 'unclear'
      m.recallProxyText = m.precisionProxyText
      m.hitAt3Text = ann.kqaRetrievalRelevant === 'yes' ? '1（有命中）' : ann.kqaRetrievalRelevant === 'no' ? '0（无命中）' : ''
      m.note = '知识问答暂以人工相关性映射 proxy；严格 Recall@K/MRR 需 golden 样本。'
    }
  }
  return m
})

const showDataQueryAnno = computed(() => ann.route === 'data_query' || ann.route === '')
const showKnowledgeQaAnno = computed(() => ann.route === 'knowledge_qa' || ann.route === '')

async function loadAnnotation(traceId) {
  if (!traceId) {
    resetAnnForm()
    return
  }
  resetAnnForm()
  applyAnnAutoFromTrace(detail.value)
  try {
    const doc = await getTraceAnnotationByTraceId(traceId)
    if (doc) applyAnnDoc(doc)
  } catch {
    /* 自动提取失败时保留回填值 */
  }
}

async function saveAnnotation() {
  const tid = selectedId.value
  if (!tid) {
    ElMessage.warning('请先选择一条 trace')
    return
  }
  annSaving.value = true
  try {
    const dataQuery = {
      recalledCollections: csvToCollectionList(ann.dqRecalledCsv),
      usedInMqlCollections: csvToCollectionList(ann.dqUsedCsv),
      intentCorrect: ann.dqIntentCorrect || ''
    }
    const knowledgeQa = {
      retrievalRelevant: ann.kqaRetrievalRelevant || '',
      emptyHitJustified: ann.kqaEmptyJustified || '',
      answerGrounded: ann.kqaAnswerGrounded || ''
    }
    const res = await upsertTraceAnnotation({
      traceId: tid,
      route: ann.route || null,
      finalAnswerCorrectness: ann.finalAnswerCorrectness || null,
      dataQuery,
      knowledgeQa
    })
    if (res?.version != null) annVersion.value = res.version
    ElMessage.success('标注已保存')
  } catch (e) {
    ElMessage.error(e?.message || '保存标注失败')
  } finally {
    annSaving.value = false
  }
}

async function loadDetail(id) {
  if (!id) return
  detailLoading.value = true
  try {
    detail.value = await getAgentTrace(id)
    // 从列表/重载进入详情时丢弃观测 SSE 缓冲，避免与 Mongo 事件错位或「只显示一轮」的合并假象
    liveLlmNodeStreams.value = {}
    liveLlmNodeSeq.value = 0
    typeFilterList.value = []
    await loadAnnotation(id)
  } catch (e) {
    ElMessage.error(e.message || '加载详情失败')
    detail.value = null
    resetAnnForm()
  } finally {
    detailLoading.value = false
  }
}

function onRowClick(row) {
  const id = row?._id || row?.traceId
  if (!id) return
  selectedId.value = id
  topologySelectedId.value = ''
  topologySelectedEdgeKey.value = ''
  loadDetail(id)
}

function onTopologySelect(id) {
  topologySelectedEdgeKey.value = ''
  topologySelectedId.value = topologySelectedId.value === id ? '' : id
}

function edgeKeyOfEvent(ev) {
  if (ev?.type !== 'GRAPH_EDGE') return ''
  const p = ev?.payload || {}
  const from = p.from != null ? String(p.from) : ''
  const to = p.to != null ? String(p.to) : ''
  if (!from || !to) return ''
  return edgeKey(from, to)
}

function isPickedEdgeEvent(ev) {
  if (!topologySelectedEdgeKey.value) return false
  return edgeKeyOfEvent(ev) === topologySelectedEdgeKey.value
}

function onTopologyEdgeSelect(payload) {
  topologySelectedId.value = ''
  topologySelectedEdgeKey.value = payload?.key || ''
  scrollToPickedEdgeEvent()
}

async function scrollToPickedEdgeEvent() {
  const k = topologySelectedEdgeKey.value
  if (!k) return
  await nextTick()
  const root = document.querySelector('.timeline')
  if (!root) return
  const candidates = root.querySelectorAll('[data-edge-key]')
  let hit = null
  for (const el of candidates) {
    if (el.getAttribute('data-edge-key') === k) {
      hit = el
      break
    }
  }
  if (!hit) {
    ElMessage.info('当前筛选条件下未找到对应 GRAPH_EDGE 事件')
    return
  }
  hit.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    const id = selectedId.value
    if (!id) return
    try {
      detail.value = await getAgentTrace(id)
    } catch {
      /* 忽略单次失败 */
    }
  }, 850)
}

function stopObservation() {
  if (obsAbortController.value) {
    obsAbortController.value.abort()
    obsAbortController.value = null
  }
  obsStreaming.value = false
}

function resetObservationSession() {
  obsThreadId.value = ''
  try {
    localStorage.removeItem(OBS_THREAD_KEY)
  } catch {
    /* ignore */
  }
  ElMessage.success('已切换为新会话，下一次发送将创建新的 thread')
  liveLlmNodeStreams.value = {}
  liveLlmNodeSeq.value = 0
}

function formatNowClock() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

let lastDedup = ''

function appendLiveLine(text, { dedup = true } = {}) {
  const t = String(text || '').trim()
  if (!t) return
  if (dedup) {
    const k = t
    if (k === lastDedup) return
    lastDedup = k
  }
  liveReasoningLines.value.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    t: formatNowClock(),
    text: t
  })
}

function pushNodeStreamChunk(node, channel, chunk) {
  const nodeId = String(node || '').trim() || 'unknown'
  const text = String(chunk || '')
  if (!text) return
  const prev = liveLlmNodeStreams.value[nodeId] || {
    reasoningText: '',
    answerText: '',
    firstSeen: ++liveLlmNodeSeq.value
  }
  const next = { ...prev }
  if (channel === 'reasoning') {
    next.reasoningText += text
  } else {
    next.answerText += text
  }
  liveLlmNodeStreams.value = {
    ...liveLlmNodeStreams.value,
    [nodeId]: next
  }
}

async function sendObservation() {
  const q = obsQuery.value.trim()
  if (!q || obsStreaming.value) return
  lastDedup = ''
  liveReasoningLines.value = []
  liveLlmNodeStreams.value = {}
  liveLlmNodeSeq.value = 0
  obsStreaming.value = true
  obsAbortController.value = new AbortController()
  try {
    await chatAgentStream({
      payload: { query: q, threadId: obsThreadId.value || undefined },
      signal: obsAbortController.value.signal,
      onTraceMeta: ({ threadId, traceId }) => {
        if (threadId) {
          obsThreadId.value = threadId
          try {
            localStorage.setItem(OBS_THREAD_KEY, threadId)
          } catch {
            /* ignore */
          }
        }
        if (traceId) {
          selectedId.value = traceId
          topologySelectedId.value = ''
          getAgentTrace(traceId)
            .then((d) => {
              detail.value = d
            })
            .catch(() => {})
          startPolling()
        }
      },
      onThink: (evt) => {
        const msg = evt?.payload?.message
        if (msg) appendLiveLine(String(msg))
      },
      onNode: (evt) => {
        const line = formatAgentNodeLine(evt)
        if (line) appendLiveLine(line)
      },
      onStreamChunk: (chunk, meta) => {
        pushNodeStreamChunk(meta?.node, 'answer', chunk)
      },
      onStreamTrace: (chunk, meta) => {
        pushNodeStreamChunk(meta?.node, 'answer', chunk)
      },
      onStreamReasoning: (chunk, meta) => {
        pushNodeStreamChunk(meta?.node, 'reasoning', chunk)
      },
      onError: (evt) => {
        const msg = evt?.message || evt?.text || '流式错误'
        appendLiveLine(String(msg), { dedup: false })
      }
    })
  } catch (e) {
    if (e?.name !== 'AbortError') {
      ElMessage.error(e?.message || '发送失败')
    }
  } finally {
    obsAbortController.value = null
    try {
      if (selectedId.value) {
        detail.value = await getAgentTrace(selectedId.value)
      }
    } catch {
      /* ignore */
    }
    obsStreaming.value = false
    stopPolling()
    await loadList()
  }
}

watch(
  () => [obsStreaming.value, detail.value?.status, selectedId.value],
  ([stream, st, sid]) => {
    if (!sid) {
      stopPolling()
      return
    }
    if (stream || st === 'RUNNING') startPolling()
    else stopPolling()
  }
)

watch(
  () => [finalAnswerText.value, detail.value?.status],
  ([text, status]) => {
    const animate = status === 'RUNNING' || obsStreaming.value
    syncFinalAnswerDisplay(String(text || ''), animate)
  },
  { immediate: true }
)

watch(selectedId, (id) => {
  inspectVisible.value = false
  inspectTitle.value = ''
  inspectBody.value = ''
  onQueryResultClosed()
  topologySelectedEdgeKey.value = ''
  annoCollapseNames.value = []
  if (!id) resetAnnForm()
})

function reloadDetail() {
  if (selectedId.value) loadDetail(selectedId.value)
}

async function loadSkeleton() {
  try {
    skeleton.value = await getAgentGraphSkeleton()
  } catch {
    skeleton.value = null
  }
}

onMounted(() => {
  loadList()
  loadSkeleton()
})

onUnmounted(() => {
  stopPolling()
  stopObservation()
  stopFinalAnswerTyping()
  liveLlmNodeStreams.value = {}
  liveLlmNodeSeq.value = 0
})

function isNearBottom(el, threshold = 28) {
  if (!el) return true
  const remain = el.scrollHeight - el.clientHeight - el.scrollTop
  return remain <= threshold
}

function scrollLlmStreamToBottom(smooth = false) {
  const el = llmStreamWrapRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onLlmStreamScroll() {
  const el = llmStreamWrapRef.value
  if (!el) return
  llmAutoFollow.value = isNearBottom(el)
}

function resumeLlmAutoFollow() {
  llmAutoFollow.value = true
  Object.keys(llmPaneAutoFollow.value).forEach((k) => {
    llmPaneAutoFollow.value[k] = true
  })
  nextTick(() => {
    scrollLlmStreamToBottom(true)
    scrollAllLlmPanesToBottom(true)
  })
}

function paneKey(nodeId, kind) {
  return `${String(nodeId || 'unknown')}::${String(kind || 'answer')}`
}

function setLlmPaneRef(el, nodeId, kind) {
  const key = paneKey(nodeId, kind)
  if (el) {
    llmPaneRefs.value[key] = el
    if (!(key in llmPaneAutoFollow.value)) {
      llmPaneAutoFollow.value[key] = true
    }
    return
  }
  delete llmPaneRefs.value[key]
}

function onLlmPaneScroll(nodeId, kind) {
  const key = paneKey(nodeId, kind)
  const el = llmPaneRefs.value[key]
  if (!el) return
  llmPaneAutoFollow.value[key] = isNearBottom(el)
}

function scrollLlmPaneToBottom(nodeId, kind, smooth = false) {
  const key = paneKey(nodeId, kind)
  const el = llmPaneRefs.value[key]
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function scrollAllLlmPanesToBottom(smooth = false) {
  for (const key of Object.keys(llmPaneRefs.value)) {
    if (!llmPaneAutoFollow.value[key]) continue
    const el = llmPaneRefs.value[key]
    if (!el) continue
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }
}

watch(
  () => [llmStreamRows.value.length, llmStreamRows.value.map((r) => `${r.nodeId}:${r.reasoningChars}:${r.answerChars}`).join('|')],
  () => {
    nextTick(() => {
      if (llmAutoFollow.value) {
        scrollLlmStreamToBottom()
      }
      for (const row of llmStreamRows.value) {
        const reasonKey = paneKey(row.nodeId, 'reasoning')
        const answerKey = paneKey(row.nodeId, 'answer')
        if (llmPaneAutoFollow.value[reasonKey] !== false) {
          scrollLlmPaneToBottom(row.nodeId, 'reasoning')
        }
        if (llmPaneAutoFollow.value[answerKey] !== false) {
          scrollLlmPaneToBottom(row.nodeId, 'answer')
        }
      }
    })
  }
)

watch(
  () => selectedId.value,
  () => {
    llmAutoFollow.value = true
    llmPaneAutoFollow.value = {}
    nextTick(() => {
      scrollLlmStreamToBottom()
      scrollAllLlmPanesToBottom()
    })
  }
)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fragment+Mono:ital@0;1&family=Outfit:wght@400;600;700&display=swap');

.trace-shell {
  position: relative;
  font-family: 'Outfit', system-ui, sans-serif;
  border-radius: 22px;
  padding: 22px 22px 26px;
  overflow: hidden;
  color: #1a3456;
  background:
    radial-gradient(1000px 380px at 0% 0%, rgba(70, 129, 217, 0.14), transparent 48%),
    radial-gradient(820px 280px at 100% 0%, rgba(243, 191, 82, 0.12), transparent 52%),
    linear-gradient(165deg, #fbfdff 0%, #f2f7ff 45%, #eef4ff 100%);
  border: 1px solid #d3dff2;
  box-shadow: 0 12px 32px rgba(21, 46, 89, 0.07);
}

/* 极轻纸张纹理，避免整块死白 */
.grain {
  pointer-events: none;
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.limit-sel {
  width: 140px;
}

.trace-search {
  width: 260px;
}

.btn-refresh {
  font-weight: 700;
}

.trace-grid {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 顶部「索引 | 发题」一体控制条：工业感分割，避免与下方主画布抢纵向空间 */
.trace-deck {
  display: grid;
  /* 索引表列多需更宽；发题区控件简单 — 约 1.35 : 0.65 分配余量，右侧不再被 1fr 拉满 */
  grid-template-columns: minmax(380px, 1.35fr) minmax(260px, 0.65fr);
  align-items: stretch;
  border-radius: 16px;
  border: 1px solid #c5d4ec;
  background: linear-gradient(105deg, #ffffff 0%, #f6f9fc 42%, #eef6ff 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.75) inset,
    0 10px 28px rgba(24, 52, 98, 0.07);
  overflow: hidden;
}

@media (max-width: 960px) {
  .trace-deck {
    grid-template-columns: 1fr;
  }

  .trace-list-card {
    border-right: none !important;
    border-bottom: 1px solid #e2ebfa;
  }

  .card-cap {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-cap-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.trace-list-card,
.trace-detail-card {
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border: 1px solid #dce7f8;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(21, 46, 89, 0.05);
}

.trace-list-card {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 12px 12px 10px;
  border-right: 1px solid #e2ebfa;
  background: transparent;
  min-width: 0;
}

.trace-detail-card {
  min-width: 0;
}

.card-cap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.card-cap-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #5978a5;
  font-weight: 700;
}

.card-cap-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cap-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4c8dff 0%, #8a73ff 100%);
  box-shadow: 0 0 0 3px rgba(76, 141, 255, 0.15);
}

.trace-table :deep(.el-table) {
  --el-table-bg-color: #ffffff;
  --el-table-tr-bg-color: #ffffff;
  --el-table-header-bg-color: #eef4ff;
  --el-table-border-color: #e2ebfa;
  --el-table-text-color: #1a3456;
  --el-table-header-text-color: #204977;
}

.trace-table :deep(.el-table__body tr:hover > td) {
  background-color: #f4f8ff !important;
}

.trace-table :deep(.el-table__body tr.current-row > td) {
  background-color: #e8f1ff !important;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid #c9daf5;
  color: #4f6280;
  background: #f8fafc;
}

.status-pill[data-status='SUCCESS'] {
  color: #0d7a52;
  border-color: #a7e3c9;
  background: #ecfdf5;
}

.status-pill[data-status='RUNNING'] {
  color: #a16207;
  border-color: #fde68a;
  background: #fffbeb;
}

.status-pill[data-status='FAILED'],
.status-pill[data-status='CANCELLED'] {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
}

.status-pill.lg {
  font-size: 13px;
  padding: 4px 14px;
}

.empty-detail {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #5c6f8d;
  text-align: center;
  padding: 24px;
}

.empty-orbit {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px dashed #b8c9e5;
  position: relative;
  animation: orbit 14s linear infinite;
}

.empty-orbit::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4c8dff, #8a73ff);
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 10px rgba(76, 141, 255, 0.35);
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.detail-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #204977;
  max-width: 80ch;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mono-clip {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 12px;
  word-break: break-all;
}

.detail-sub {
  margin: 0;
  color: #5c6f8d;
}

.detail-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 12px;
  background: #f4f8ff;
  border: 1px solid #dce7f8;
}

.meta-label {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #5978a5;
  font-weight: 700;
}

.meta-val {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 12px;
  color: #1a3456;
}

.rag-metric-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #b8e8e0;
  background: linear-gradient(165deg, #f0fdfa 0%, #ecfeff 100%);
}

.rag-cap {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0f766e;
  margin-bottom: 8px;
}

.rag-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.rag-kv {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #ccfbf1;
}

.rag-k {
  font-size: 10px;
  color: #64748b;
}

.rag-v {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 700;
  color: #134e4a;
}

.rag-trend-card {
  margin-bottom: 14px;
  padding: 10px 12px 12px;
  border-radius: 12px;
  border: 1px solid #c7d8ff;
  background: linear-gradient(165deg, #f6f8ff 0%, #eff4ff 100%);
}

.rag-grid--overall {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 8px;
}

.rag-kv--wide {
  grid-column: 1 / -1;
}

.rag-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rag-mode-label {
  font-size: 11px;
  font-weight: 700;
  color: #5c6f8d;
}

.rag-trend-table {
  border-radius: 10px;
  overflow: hidden;
}

.rag-lane-table {
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}

.anno-card {
  margin-top: 14px;
  margin-bottom: 14px;
  padding: 12px 14px 14px;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  background: linear-gradient(165deg, #ffffff 0%, #f8fbff 100%);
}

.anno-cap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.anno-cap-title {
  font-size: 13px;
  font-weight: 800;
  color: #1e3a5f;
}

.anno-cap-hint {
  font-size: 11px;
  line-height: 1.45;
  color: #64748b;
}

.anno-kpi-preview {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.anno-kpi-cap {
  font-size: 11px;
  font-weight: 800;
  color: #475569;
  margin-bottom: 8px;
}

.anno-kpi-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 6px 10px;
  align-items: start;
  font-size: 12px;
  margin-bottom: 8px;
}

.anno-kpi-row--sub {
  grid-template-columns: 140px minmax(0, 1fr);
}

.anno-kpi-k {
  color: #64748b;
  font-weight: 600;
}

.anno-kpi-v {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-weight: 700;
  color: #0f172a;
}

.anno-kpi-d {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
}

.anno-kpi-empty {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.anno-metric-legend {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(238, 244, 255, 0.65);
  border: 1px dashed #c7d8ff;
}

.anno-legend-cap {
  font-size: 11px;
  font-weight: 800;
  color: #204977;
  margin-bottom: 6px;
}

.anno-legend-list {
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  line-height: 1.55;
  color: #475569;
}

.anno-legend-list code {
  font-size: 10px;
  background: #fff;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.anno-legend-note {
  margin: 8px 0 0;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.45;
}

.anno-lab-hint {
  display: inline-flex;
  margin-left: 4px;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  background: #e2e8f0;
  cursor: default;
  vertical-align: middle;
}

.anno-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.anno-block-title {
  margin: 12px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5978a5;
}

.anno-ver {
  margin-left: 12px;
  font-size: 12px;
  color: #94a3b8;
  font-family: 'Fragment Mono', ui-monospace, monospace;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5978a5;
  margin-right: 4px;
}

.type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lane-group :deep(.el-radio-button__inner) {
  font-size: 11px;
  border-radius: 999px !important;
  border: 1px solid #d3dff2 !important;
  background: #ffffff;
  color: #4f6280;
  box-shadow: none !important;
}

.lane-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: linear-gradient(120deg, #ecfeff 0%, #dff7ff 100%);
  border-color: #14b8a6 !important;
  color: #0f766e;
}

.type-group :deep(.el-checkbox-button__inner) {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 11px;
  border-radius: 999px !important;
  border: 1px solid #d3dff2 !important;
  background: #ffffff;
  color: #4f6280;
  box-shadow: none !important;
}

.type-group :deep(.el-checkbox-button.is-checked .el-checkbox-button__inner) {
  background: linear-gradient(120deg, #eef4ff 0%, #e0ebff 100%);
  border-color: #4c8dff !important;
  color: #204977;
}

.filter-hint {
  font-size: 12px;
  color: #5c6f8d;
  margin-left: 4px;
}

.timeline-scroll {
  border-radius: 12px;
  border: 1px solid #dce7f8;
  background: #fbfcff;
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  color: #5c6f8d;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 16px 16px 20px 28px;
}

.timeline-item {
  position: relative;
  padding-left: 22px;
  padding-bottom: 18px;
  animation: rise 0.45s ease both;
  animation-delay: calc(var(--stagger) * 28ms);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item--cluster {
  padding-bottom: 22px;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: -10px;
  width: 2px;
  background: linear-gradient(180deg, rgba(76, 141, 255, 0.35), rgba(211, 223, 242, 0.9));
}

.timeline-item:last-child::before {
  display: none;
}

.rail-mark {
  position: absolute;
  left: -2px;
  top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #d3dff2;
}

.dot-edge {
  background: conic-gradient(from 180deg, #38bdf8, #6366f1);
}
.dot-node {
  background: linear-gradient(135deg, #fbbf24, #f97316);
}
.dot-state {
  background: linear-gradient(135deg, #a78bfa, #ec4899);
}
.dot-llm {
  background: linear-gradient(135deg, #34d399, #14b8a6);
}
.dot-tool {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}
.dot-default {
  background: #94a3b8;
}

.dot-bag {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
}

.dot-node-cluster {
  top: 8px;
  width: 10px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fbbf24, #ea580c);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 4px 10px rgba(234, 88, 12, 0.35);
}

.ev-cluster {
  --ec-ink: #0b1f33;
  --ec-rail: #7c5cff;
  border-radius: 14px;
  border: 1px solid #c9d8f0;
  background:
    linear-gradient(125deg, rgba(255, 253, 248, 0.98) 0%, rgba(244, 247, 255, 0.96) 42%, rgba(236, 252, 247, 0.55) 100%);
  box-shadow: 0 10px 26px rgba(15, 40, 71, 0.1);
  overflow: hidden;
  position: relative;
}

.ev-cluster::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, var(--ec-rail), #22d3ee 55%, #34d399);
  opacity: 0.92;
}

.ev-cluster-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 18px;
  padding: 12px 14px 10px 18px;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.55);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.55), transparent);
}

.ev-cluster-head-main {
  flex: 1;
  min-width: 0;
}

.ev-cluster-title {
  margin: 0;
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ec-ink);
  line-height: 1.2;
}

.ev-cluster-id {
  margin: 4px 0 0;
  font-size: 11px;
  color: #64748b;
}

.ev-cluster-head-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: min(280px, 46%);
}

.phase-strip {
  display: flex;
  align-items: center;
  gap: 6px;
}

.phase-pill {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #c4b5fd;
  color: #4c1d95;
  background: #ede9fe;
}

.phase-pill--end {
  border-color: #6ee7b7;
  color: #065f46;
  background: #d1fae5;
}

.phase-wire {
  flex: 0 0 36px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #a78bfa, #34d399);
  opacity: 0.85;
}

.ev-cluster-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.cc-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dbeafe;
  color: #1e3a5f;
}

.cc-chip[data-ok='false'] {
  border-color: #fecaca;
  color: #991b1b;
  background: #fef2f2;
}

.ev-cluster-range {
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 10px;
  color: #64748b;
}

.ev-cluster-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 14px 18px;
}

.ev-cluster-stack :deep(.tec--nested) {
  margin-left: 2px;
}

.final-answer-card {
  margin-top: 18px;
  margin-bottom: 14px;
  padding: 16px 18px 18px;
  border-radius: 14px;
  border: 1px solid #b8e8e0;
  background: linear-gradient(165deg, #f0fdfa 0%, #ecfeff 100%);
}

.final-answer-cap {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #0f766e;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(13, 148, 136, 0.28);
}

.final-answer-body {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.65;
  color: #134e4a;
  word-break: break-word;
  max-height: 360px;
  overflow: auto;
}

.final-answer-body.agent-md :deep(h1),
.final-answer-body.agent-md :deep(h2),
.final-answer-body.agent-md :deep(h3) {
  margin: 0.75em 0 0.4em;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.final-answer-body.agent-md :deep(h1) {
  font-size: 1.25em;
}
.final-answer-body.agent-md :deep(h2) {
  font-size: 1.12em;
}
.final-answer-body.agent-md :deep(h3) {
  font-size: 1.05em;
}

.final-answer-body.agent-md :deep(p) {
  margin: 0 0 0.65em;
}

.final-answer-body.agent-md :deep(p:last-child) {
  margin-bottom: 0;
}

.final-answer-body.agent-md :deep(ul),
.final-answer-body.agent-md :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.25em;
}

.final-answer-body.agent-md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.6em 0;
  font-size: 13px;
}

.final-answer-body.agent-md :deep(th),
.final-answer-body.agent-md :deep(td) {
  border: 1px solid #bae6d4;
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}

.final-answer-body.agent-md :deep(th) {
  background: #ecfdf5;
  font-weight: 700;
}

.final-answer-body.agent-md :deep(code) {
  font-size: 0.9em;
  padding: 0.12em 0.35em;
  border-radius: 6px;
  background: #f1f5f9;
}

.final-answer-body.agent-md :deep(pre code) {
  display: block;
  padding: 10px 12px;
  overflow-x: auto;
}

.final-answer-body.agent-md :deep(blockquote) {
  margin: 0.5em 0;
  padding: 0.35em 0 0.35em 12px;
  border-left: 3px solid #5eead4;
  color: #334155;
  background: rgba(255, 255, 255, 0.65);
}

.llm-stream-wrap {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
  scroll-behavior: smooth;
}

.llm-stream-node {
  border-radius: 12px;
  border: 1px solid #99f6e4;
  background: #ffffff;
  padding: 10px 12px 12px;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.08);
}

.llm-stream-node-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.llm-stream-node-title {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
}

.llm-stream-node-meta {
  font-size: 11px;
  color: #64748b;
  font-family: 'Fragment Mono', ui-monospace, monospace;
}

.llm-stream-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.llm-stream-pane {
  border-radius: 8px;
  border: 1px solid #ccfbf1;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 8px;
}

.llm-stream-pane h5 {
  margin: 0 0 6px;
  font-size: 12px;
  color: #334155;
}

.llm-stream-body {
  font-size: 12px;
  line-height: 1.62;
  color: #0f172a;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 186px;
  overflow: auto;
  font-family: 'Fragment Mono', ui-monospace, monospace;
  scrollbar-gutter: stable;
}

.llm-stream-float {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.plan-spine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed #94a3b8;
  background: #f8fafc;
}

.plan-spine-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.plan-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #1e293b;
}

.obs-run-card {
  position: relative;
  margin: 0;
  padding: 14px;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.obs-run-body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.obs-input :deep(.el-textarea__inner) {
  font-family: inherit;
  border-radius: 12px;
  min-height: 40px !important;
  line-height: 1.45;
}

.obs-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  width: 96px;
}

.obs-actions-row {
  display: flex;
  gap: 6px;
  min-width: 0;
}

.obs-actions-row .obs-btn {
  width: auto;
  flex: 1 1 0;
  min-width: 0;
}

.obs-btn {
  width: 100%;
  min-width: 0;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.obs-actions :deep(.el-button) {
  min-width: 0;
}

.obs-btn-send {
  flex: 1;
}

@media (max-width: 1100px) {
  .obs-run-body {
    flex-direction: column;
    align-items: stretch;
  }

  .obs-actions {
    width: 100%;
  }
}

@media (max-width: 1200px) {
  .trace-search {
    width: 100%;
  }
}

.live-collapse {
  margin-top: 6px;
  border: none;
  --el-collapse-border-color: transparent;
}

.live-collapse :deep(.el-collapse-item__header) {
  font-size: 11px;
  font-weight: 700;
  color: #5978a5;
  padding: 4px 0;
  min-height: auto;
  line-height: 1.3;
}

.live-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.live-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

.live-tail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 120px;
  overflow: auto;
}

.live-tail-item {
  display: flex;
  gap: 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #334155;
  padding: 4px 0;
  border-bottom: 1px solid #eef2f7;
}

.live-tail-item:last-child {
  border-bottom: none;
}

.live-t {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.live-txt {
  flex: 1;
  word-break: break-word;
}
</style>

<style>
/* el-dialog 挂载到 body，需非 scoped 才能作用到内部 textarea */
.trace-text-inspect-dialog .el-textarea__inner {
  font-family: 'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
