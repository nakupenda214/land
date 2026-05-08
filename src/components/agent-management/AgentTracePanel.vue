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
              <span>TRACE</span>
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

        <section class="obs-run-card" aria-label="观测发题">
          <div class="obs-run-cap">
            <span class="obs-run-cap-kicker">观测</span>
            <span class="obs-run-cap-muted">Enter 发送 · Shift+Enter 换行</span>
          </div>
          <div class="obs-run-inner">
            <el-input
              v-model="obsQuery"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              placeholder="输入问题…"
              resize="none"
              class="obs-input obs-input-full"
              :disabled="obsStreaming"
              @keydown.enter.exact.prevent="sendObservation"
              @keydown.shift.enter.stop
            />
            <div class="obs-toolbar">
              <div class="obs-toolbar-left">
                <el-tooltip content="开启后，Planner 产出计划需人工通过再继续执行" placement="top">
                  <div class="obs-hitl-switch" role="group" aria-label="人工复核计划">
                    <el-switch v-model="obsHumanReview" size="small" :disabled="obsStreaming" />
                    <span class="obs-hitl-switch-label">复核计划</span>
                  </div>
                </el-tooltip>
              </div>
              <div class="obs-toolbar-right">
                <el-tooltip content="新会话（清空当前观测缓冲）" placement="top">
                  <el-button
                    :icon="CirclePlus"
                    circle
                    size="small"
                    plain
                    class="obs-tool-btn"
                    aria-label="新会话"
                    @click="resetObservationSession"
                  />
                </el-tooltip>
                <el-button
                  v-if="obsStreaming"
                  type="warning"
                  plain
                  size="small"
                  class="obs-stop-btn"
                  aria-label="停止"
                  @click="stopObservation"
                >
                  停止
                </el-button>
                <el-tooltip :content="obsQuery.trim() ? '发送' : '请先输入问题'" placement="top">
                  <el-button
                    type="primary"
                    size="small"
                    class="obs-send-btn"
                    :icon="Promotion"
                    round
                    :loading="obsStreaming"
                    :disabled="!obsQuery.trim()"
                    aria-label="发送"
                    @click="sendObservation"
                  />
                </el-tooltip>
              </div>
            </div>
            <div v-if="showObsHitlPendingBar" class="obs-hitl-bar">
              <p class="obs-hitl-hint">
                计划已挂起，请填写说明后选择通过或驳回（将发起新的 SSE 续跑）。关闭本区仅影响展示：同一会话 Trace 仍为运行中，可随时续跑。
              </p>
              <div v-if="obsHitlPlanPreview.trim()" class="obs-hitl-plan-row">
                <el-button type="primary" link size="small" @click="obsHitlPlanDialogVisible = true">查看待审计划</el-button>
              </div>
              <el-input
                v-model="obsHitlNote"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 5 }"
                placeholder="复核说明（必填）"
                class="obs-hitl-input"
              />
              <div class="obs-hitl-actions">
                <el-button size="small" @click="dismissHumanReviewBar">稍后处理</el-button>
                <el-button type="success" size="small" :loading="obsHitlSubmitting" :disabled="obsStreaming" @click="submitHumanReviewFeedback(true)">
                  通过
                </el-button>
                <el-button type="danger" size="small" :loading="obsHitlSubmitting" :disabled="obsStreaming" @click="submitHumanReviewFeedback(false)">
                  驳回
                </el-button>
              </div>
            </div>
            <div v-else-if="showObsHitlDismissedStrip" class="obs-hitl-dismissed-strip">
              <p class="obs-hitl-hint">
                已收起复核区。Trace 未结束：请点「继续复核」后填写说明并选择通过或驳回；需使用同一 threadId（见上方会话）发起续跑。
              </p>
              <el-button type="primary" plain size="small" @click="resumeHumanReviewBar">继续复核</el-button>
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
            <p>请选择一条 Trace</p>
          </div>
        </template>
        <template v-else>
          <div class="detail-head">
            <div class="detail-head-col">
              <div class="detail-title-line">
                <h3 class="detail-summary-heading" :title="selectedSummary">{{ selectedSummary }}</h3>
                <el-tooltip content="重载详情" placement="left">
                  <el-button
                    :icon="Refresh"
                    circle
                    size="small"
                    plain
                    class="detail-reload-btn"
                    :loading="detailLoading"
                    aria-label="重载详情"
                    @click="reloadDetail"
                  />
                </el-tooltip>
              </div>
              <div class="detail-subline" aria-label="Trace 状态与时间">
                <span class="status-pill detail-status-pill" :data-status="detail?.status">{{
                  traceStatusBrief(detail?.status)
                }}</span>
                <span class="detail-time-compact">{{ formatTraceWindowCompact(detail?.startedAt, detail?.endedAt) }}</span>
              </div>
            </div>
          </div>

          <AgentTraceTopology
            v-if="layoutNodes.length"
            v-model:positions="topologyPositions"
            layout-scope="agent_main"
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

          <div v-if="planSpineTodos.length" class="plan-spine" aria-label="计划沿拓扑推进顺序">
            <div class="plan-spine-head">
              <span class="plan-spine-title">计划推进</span>
              <span v-if="planSpineSource !== 'none'" class="plan-spine-source">{{ planSpineSourceLabel }}</span>
            </div>
            <ul class="plan-spine-todos">
              <li
                v-for="row in planSpineTodos"
                :key="row.step"
                class="plan-spine-todo"
                :data-status="row.status"
              >
                <span class="plan-todo-mark" aria-hidden="true">{{ planTodoIcon(row.status) }}</span>
                <span class="plan-todo-body">
                  <span class="plan-todo-step">第 {{ row.step }} 步</span>
                  <code class="plan-todo-tool">{{ row.toolToUse }}</code>
                  <span v-if="row.instruction" class="plan-todo-inst">{{ row.instruction }}</span>
                </span>
              </li>
            </ul>
          </div>

          <div class="filter-bar">
            <span class="filter-label">事件类型</span>
            <el-checkbox-group v-model="typeFilterList" size="small" class="type-group">
              <el-checkbox-button v-for="t in allTypes" :key="t" :value="t">
                {{ t }}
              </el-checkbox-button>
            </el-checkbox-group>
            <span class="filter-label">TRACE_BAG 分区</span>
            <el-radio-group v-model="traceBagLaneFilter" size="small" class="lane-group">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="governance">治理</el-radio-button>
              <el-radio-button value="business">业务</el-radio-button>
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
                  <header class="ev-cluster-head" :class="{ 'ev-cluster-head--python': isPythonNodeId(block.nodeId) }">
                    <div class="ev-cluster-head-main">
                      <h4 class="ev-cluster-title">
                        <el-tag
                          v-if="isPythonNodeId(block.nodeId)"
                          size="small"
                          type="warning"
                          effect="plain"
                          class="python-cluster-tag"
                        >
                          Python
                        </el-tag>
                        {{ clusterTitle(block.nodeId) }}
                      </h4>
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
                      @open-trace="onOpenChildTrace"
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
                  @open-trace="onOpenChildTrace"
                />
              </li>
            </ol>
          </el-scrollbar>

          <div v-if="llmStreamRows.length" class="final-answer-card reasoning-stream-card">
            <el-collapse v-model="reasoningCollapseNames" class="reasoning-collapse">
              <el-collapse-item name="reasoning-panel">
                <template #title>
                  <span class="reasoning-collapse-title">思考流（Reasoning）</span>

                </template>
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
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="selectedId && finalAnswerText" class="final-answer-card">
            <div class="final-answer-cap">模型最终答复</div>
            <div class="final-answer-body agent-md" v-html="finalAnswerHtml" />
          </div>

          <div v-if="selectedId && traceRasterUrl" class="final-answer-card trace-raster-chart-wrap">
            <div class="final-answer-cap">Python 输出图表</div>
            <div class="trace-raster-inner">
              <img class="trace-raster-img" :src="traceRasterUrl" alt="" />
            </div>
          </div>

          <div v-if="selectedId && traceChartHostVisible" class="final-answer-card trace-chart-card-wrap">
            <div class="final-answer-cap">查询结果图表（ECharts）</div>
            <div
              :id="`agent-chart-${selectedId}-obs`"
              class="trace-echarts-host"
              role="img"
              aria-label="查询结果图表"
            />
          </div>

          <div v-if="selectedId" class="anno-card">
            <el-collapse v-model="annoCollapseNames" class="anno-collapse">
              <el-collapse-item name="anno-panel">
                <template #title>
                  <span class="anno-cap-title">人工标注</span>
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

    <el-dialog
      v-model="obsHitlPlanDialogVisible"
      title="待审计划"
      width="min(720px, 92vw)"
      destroy-on-close
      append-to-body
      class="obs-hitl-plan-dialog"
    >
      <div class="obs-hitl-plan-dialog-body">
        <template v-if="obsHitlPlanModel.mode === 'steps'">
          <p v-if="obsHitlPlanModel.thoughtProcess" class="obs-plan-thought">{{ obsHitlPlanModel.thoughtProcess }}</p>
          <ol class="obs-plan-steps">
            <li v-for="st in obsHitlPlanModel.steps" :key="st.step" class="obs-plan-step-row">
              <span class="obs-plan-step-no">#{{ st.step }}</span>
              <code class="obs-plan-tool">{{ st.toolToUse }}</code>
              <span v-if="st.instruction" class="obs-plan-inst">{{ st.instruction }}</span>
            </li>
          </ol>
        </template>
        <pre v-else-if="obsHitlPlanModel.mode === 'pretty'" class="obs-hitl-plan-pre-dialog">{{ obsHitlPlanModel.pretty }}</pre>
        <pre v-else class="obs-hitl-plan-pre-dialog">{{ obsHitlPlanModel.pretty || obsHitlPlanPreview }}</pre>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CirclePlus, Loading, Promotion, Refresh } from '@element-plus/icons-vue'
import {
  getAgentGraphSkeleton,
  getAgentMongoQueryResult,
  getAgentTrace,
  getTraceAnnotationByTraceId,
  listAgentTraces,
  upsertTraceAnnotation
} from '@/services/agent-management.service.js'
import { normalizeAgentMarkdownText, renderAgentMarkdownHtml } from '@/utils/agent-markdown.js'
import {
  buildPlanSpineTodos,
  parsePlanPreviewModel,
  traceAwaitingHumanReviewFromDetail
} from '@/utils/agent-plan-preview.js'
import {
  AGENT_NODE_LABELS,
  chatAgentStream,
  extractPlanPreviewFromTraceEvents,
  formatAgentNodeLine
} from '@/services/agent.service'
import AgentTraceTopology from '@/components/agent-management/AgentTraceTopology.vue'
import AgentTraceEventCard from '@/components/agent-management/AgentTraceEventCard.vue'
import { buildTimelineBlocks } from '@/components/agent-management/agent-trace-timeline-groups.js'
import { dotClassForEventType } from '@/components/agent-management/agent-trace-event-present.js'
import {
  agentRuntimeLlmStreamOrderIndex,
  buildNodeMetricsFromEvents,
  edgeKey,
  eventTouchesNode,
  extractGraphEdgesFromTrace,
  layoutGraphLr,
  resolveCanonicalEndId
} from '@/components/agent-management/agent-trace-topology-layout.js'
import {
  buildRasterChartDataUrl,
  coerceChartSpecForRender,
  mountAgentAssistantChart
} from '@/utils/agent-assistant-chart.js'

const OBS_THREAD_KEY = 'agent_trace_obs_thread_id'
/** 刷新后恢复：待人审 + 是否已点「稍后」收起条 */
const OBS_HITL_PENDING_KEY = 'agent_trace_obs_hitl_pending'

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
/** 拓扑节点坐标：父级持有；初始为空，进入页面后由 AgentTraceTopology 从后端拉取并回填 */
const topologyPositions = ref({})
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
/** 首轮请求是否开启图内人工复核（HITL） */
const obsHumanReview = ref(false)
/** 后端 complete 携带 awaitingHumanReview 时展示复核条 */
const obsAwaitingHumanReview = ref(false)
const obsHitlNote = ref('')
const obsHitlTraceId = ref('')
const obsHitlSubmitting = ref(false)
/** 挂起时计划 JSON / SSE planPreview */
const obsHitlPlanPreview = ref('')
/** 点「稍后处理」仅收起条，不代表会话取消 */
const obsHitlBarDismissed = ref(false)
/**
 * 待复核表单条：有 traceId 时仅在与列表所选 trace 一致时展示，避免换选其他行仍像在说当前 trace。
 */
const showObsHitlPendingBar = computed(() => {
  if (!obsAwaitingHumanReview.value) return false
  const tr = String(obsHitlTraceId.value || '').trim()
  if (tr) return String(selectedId.value || '').trim() === tr
  return true
})
/**
 * 「稍后」收起后的提示条：同上，与 selectedId 对齐后再显示。
 */
const showObsHitlDismissedStrip = computed(() => {
  if (!obsHitlBarDismissed.value) return false
  if (!String(obsHitlTraceId.value || '').trim() && !String(obsThreadId.value || '').trim()) return false
  const tr = String(obsHitlTraceId.value || '').trim()
  if (tr) return String(selectedId.value || '').trim() === tr
  return true
})
const obsHitlPlanDialogVisible = ref(false)
/** Python 流合并进 reasoning 时，每 (node,section) 只加一次分段标题 */
const obsPyReasoningPrefixed = ref(new Set())
const liveReasoningLines = ref([])
const liveLlmNodeStreams = ref({})
const liveLlmNodeSeq = ref(0)
let pollTimer = null

const obsHitlPlanModel = computed(() => parsePlanPreviewModel(obsHitlPlanPreview.value))

function isPythonNodeId(nodeId) {
  return /^python_/i.test(String(nodeId || '').trim())
}

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
/** 思考流区默认可折叠，默认展开 */
const reasoningCollapseNames = ref(['reasoning-panel'])

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
  const id = String(nodeId || '').trim()
  if (!id) return 'unknown'
  return nodeLabelById.value.get(id) || AGENT_NODE_LABELS[id] || id
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

/** 根文档 finalAnswerPreview 或事件中 TRACE_BAG final_answer（仅详情区展示） */
const planSpineBundle = computed(() => buildPlanSpineTodos(events.value))
const planSpineTodos = computed(() => planSpineBundle.value.todos)
const planSpineSource = computed(() => planSpineBundle.value.source)
const planSpineSourceLabel = computed(() => {
  const m = {
    outline: '大纲',
    json: 'Planner',
    plan_step_only: '步进',
    none: ''
  }
  return m[planSpineSource.value] || ''
})

function planTodoIcon(status) {
  if (status === 'done') return '✓'
  if (status === 'running') return '⏳'
  return '○'
}

/** 与后端 AgentConstants 中「流式产出最终答复」节点 id 对齐，用于 LLM_RESPONSE.responseFull 兜底 */
const FINAL_ANSWER_LLM_SOURCES = new Set([
  'answer_wrap',
  'knowledge_qa_answer',
  'feasibility_answer',
  'common_chat'
])

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
  // 根字段与 TRACE_BAG 均未写入时：从 LLM_RESPONSE.responseFull 兜底（与 traceLlmResponse 存库字段一致）
  for (let i = evs.length - 1; i >= 0; i--) {
    const ev = evs[i]
    if (ev?.type !== 'LLM_RESPONSE') continue
    const src = String(ev?.source || '').trim()
    if (!FINAL_ANSWER_LLM_SOURCES.has(src)) continue
    const pl = ev?.payload && typeof ev.payload === 'object' ? ev.payload : {}
    const full = pl.responseFull
    if (full != null && String(full).trim()) return String(full).trim()
  }
  return ''
})

const finalAnswerHtml = computed(() => renderAgentMarkdownHtml(displayedFinalAnswerText.value))

/** 根文档 rasterChartBase64 / rasterChartMime（Python stdout 剥离图，与 SSE complete 同步落库） */
const traceRasterUrl = computed(() => {
  const d = detail.value
  if (!d) return null
  const b64 = d.rasterChartBase64 ?? d.raster_chart_base64
  const mime = d.rasterChartMime ?? d.raster_chart_mime
  return buildRasterChartDataUrl(mime, b64)
})

/** 根文档 chartViewSpec / chartDataPreview（与 SSE complete 同步落库；旧 trace 无此字段） */
const traceChartHostVisible = computed(() => {
  if (!selectedId.value || !detail.value) return false
  const raw = detail.value.chartViewSpec ?? detail.value.chart_view_spec
  if (raw == null || !String(raw).trim()) return false
  let spec
  try {
    spec = JSON.parse(String(raw))
  } catch {
    return false
  }
  let rows = []
  const prevRaw = detail.value.chartDataPreview ?? detail.value.chart_data_preview
  if (prevRaw != null && String(prevRaw).trim()) {
    try {
      const pr = JSON.parse(String(prevRaw))
      if (Array.isArray(pr)) rows = pr
    } catch {
      /* ignore */
    }
  }
  const eff = coerceChartSpecForRender(spec, rows) || spec
  const t = String(eff?.type || '').toLowerCase()
  return !!t && t !== 'table'
})

/** Trace 详情 ECharts：与 mountAgentAssistantChart 约定 id → #agent-chart-${id} */
let traceChartMountGen = 0
let traceChartLastMsg = null
function disposeTraceDetailChart() {
  if (traceChartLastMsg?.chartDispose) {
    try {
      traceChartLastMsg.chartDispose()
    } catch {
      /* ignore */
    }
    traceChartLastMsg = null
  }
}

const LLM_STREAM_REASON_SEP = '\n\n── 同节点后续推理（trace 摘要）──\n\n'
const LLM_STREAM_ANSWER_SEP = '\n\n── 同节点后续输出（trace）──\n\n'

function llmStreamSafeMin(a, b) {
  const fa = Number.isFinite(a)
  const fb = Number.isFinite(b)
  if (!fa && !fb) return Number.MAX_SAFE_INTEGER
  if (!fa) return b
  if (!fb) return a
  return Math.min(a, b)
}

const llmStreamRows = computed(() => {
  const evs = events.value
  /** 节点在 trace 中首次出现 LLM 相关事件的序号（1-based，与事件时间线一致） */
  const traceFirstIdx = {}
  let scanIdx = 0
  for (const ev of evs) {
    scanIdx += 1
    if (ev?.type === 'TRACE_BAG' && String(ev?.payload?.facet || '') === 'llm_reasoning') {
      const kv = ev?.payload?.kv || {}
      const nodeId = String(kv.nodeId || ev?.payload?.nodeId || '').trim() || 'unknown'
      const preview = String(kv.reasoningPreview || '')
      if (!preview) continue
      const cur = traceFirstIdx[nodeId]
      if (cur == null || scanIdx < cur) traceFirstIdx[nodeId] = scanIdx
      continue
    }
    if (ev?.type === 'LLM_RESPONSE') {
      const nodeId = String(ev?.source || '').trim() || 'unknown'
      const payload = ev?.payload || {}
      const text = String(payload.responseFull || payload.responsePreview || '')
      if (!text) continue
      const cur = traceFirstIdx[nodeId]
      if (cur == null || scanIdx < cur) traceFirstIdx[nodeId] = scanIdx
    }
  }

  const merged = {}
  const live = liveLlmNodeStreams.value || {}
  const hadLiveReasoning = new Set()
  const hadLiveAnswer = new Set()
  for (const [nodeIdRaw, row] of Object.entries(live)) {
    const nodeId = String(nodeIdRaw || '').trim() || 'unknown'
    const rowFs = Number(row?.firstSeen)
    const x = merged[nodeId] || {
      nodeId,
      firstSeen: Number.isFinite(rowFs) ? rowFs : Number.MAX_SAFE_INTEGER,
      reasoningText: String(row?.reasoningText || ''),
      answerText: String(row?.answerText || '')
    }
    x.firstSeen = llmStreamSafeMin(
      x.firstSeen,
      Number.isFinite(rowFs) ? rowFs : Number.MAX_SAFE_INTEGER
    )
    if (String(x.reasoningText || '').trim()) hadLiveReasoning.add(nodeId)
    if (String(x.answerText || '').trim()) hadLiveAnswer.add(nodeId)
    merged[nodeId] = x
  }
  let eventIdx = 0
  for (const ev of evs) {
    eventIdx += 1
    const eventFirstSeen = 1000000 + eventIdx
    if (ev?.type === 'TRACE_BAG' && String(ev?.payload?.facet || '') === 'llm_reasoning') {
      const kv = ev?.payload?.kv || {}
      const nodeId = String(kv.nodeId || ev?.payload?.nodeId || '').trim() || 'unknown'
      const x = merged[nodeId] || { nodeId, firstSeen: eventFirstSeen, reasoningText: '', answerText: '' }
      x.firstSeen = llmStreamSafeMin(x.firstSeen, eventFirstSeen)
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
      x.firstSeen = llmStreamSafeMin(x.firstSeen, eventFirstSeen)
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

  const maxEv = evs.length
  return Object.values(merged)
    .map((x) => ({
      ...x,
      reasoningChars: x.reasoningText.length,
      answerChars: x.answerText.length
    }))
    .filter((x) => x.reasoningChars > 0 || x.answerChars > 0)
    .sort((a, b) => {
      // 统一时间线：trace 内序号优先；尚未落库的实时块排在 trace 之后（保持 live 内序）
      const ta = traceFirstIdx[a.nodeId]
      const tb = traceFirstIdx[b.nodeId]
      const fa = Number.isFinite(a.firstSeen) ? a.firstSeen : Number.MAX_SAFE_INTEGER
      const fb = Number.isFinite(b.firstSeen) ? b.firstSeen : Number.MAX_SAFE_INTEGER
      const ka = Number.isFinite(ta) ? ta : maxEv + fa
      const kb = Number.isFinite(tb) ? tb : maxEv + fb
      if (ka !== kb) return ka - kb
      const oa = agentRuntimeLlmStreamOrderIndex(a.nodeId)
      const ob = agentRuntimeLlmStreamOrderIndex(b.nodeId)
      if (oa !== ob) return oa - ob
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

/** 详情区短状态文案（与 data-status 配色仍用英文枚举） */
function traceStatusBrief(statusRaw) {
  const s = String(statusRaw || '').toUpperCase()
  const m = {
    SUCCESS: '成功',
    RUNNING: '运行中',
    AWAITING_HUMAN: '待人审',
    FAILED: '失败',
    CANCELLED: '已取消',
    PENDING: '排队'
  }
  return m[s] || (statusRaw ? String(statusRaw) : '—')
}

/** 起止时间一行缩略：同日用「M/D HH:mm–HH:mm」，跨日再展开 */
function formatTraceWindowCompact(startMs, endMs) {
  if (startMs == null || startMs === '') return '—'
  const a = new Date(Number(startMs))
  if (Number.isNaN(a.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`
  if (endMs == null || endMs === '') {
    return `${md(a)} ${hm(a)} → …`
  }
  const b = new Date(Number(endMs))
  if (Number.isNaN(b.getTime())) {
    return `${md(a)} ${hm(a)} → …`
  }
  if (a.toDateString() === b.toDateString()) {
    return `${md(a)} ${hm(a)}–${hm(b)}`
  }
  return `${md(a)} ${hm(a)} → ${md(b)} ${hm(b)}`
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
      const hitlTr = String(obsHitlTraceId.value || '').trim()
      const keepForHitlRestore = hitlTr && selectedId.value === hitlTr
      if (!keepForHitlRestore) {
        selectedId.value = ''
        detail.value = null
      }
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
    if (
      nid.includes('evidence_recall') ||
      nid.includes('mql') ||
      nid.includes('mongo_execute') ||
      nid.includes('python_')
    ) {
      return 'data_query'
    }
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
  const prevDetailId = String(detail.value?._id || detail.value?.traceId || '')
  const sameTraceReload = prevDetailId && prevDetailId === String(id)
  detailLoading.value = true
  try {
    detail.value = await getAgentTrace(id)
    clearObsHitlIfTraceTerminal(detail.value)
    // 仅切换不同 trace 时清空观测 SSE 合并缓冲；同一 trace 重载详情时保留，避免思考流/最终区「整块消失」
    if (!sameTraceReload) {
      liveLlmNodeStreams.value = {}
      liveLlmNodeSeq.value = 0
    }
    typeFilterList.value = []
    await loadAnnotation(id)
    syncObsHitlUiFromDetail()
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

/** 自优化验证离线重放：打开子 trace（与列表点选一致） */
function onOpenChildTrace(traceId) {
  const id = String(traceId || '').trim()
  if (!id) return
  selectedId.value = id
  topologySelectedId.value = ''
  topologySelectedEdgeKey.value = ''
  loadDetail(id)
  ElMessage.success('已切换到子 Trace')
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
      clearObsHitlIfTraceTerminal(detail.value)
      syncObsHitlPlanFromDetail()
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

function syncObsHitlPlanFromDetail() {
  if (String(obsHitlPlanPreview.value || '').trim()) return
  const evs = detail.value?.events
  if (!Array.isArray(evs) || !evs.length) return
  const s = extractPlanPreviewFromTraceEvents(evs)
  if (s) obsHitlPlanPreview.value = s
}

function persistObsHitlPending() {
  try {
    if (!obsAwaitingHumanReview.value && !obsHitlBarDismissed.value) {
      localStorage.removeItem(OBS_HITL_PENDING_KEY)
      return
    }
    const tid = String(obsThreadId.value || '').trim()
    const tr = String(obsHitlTraceId.value || '').trim()
    if (!tid) return
    localStorage.setItem(
      OBS_HITL_PENDING_KEY,
      JSON.stringify({
        threadId: tid,
        traceId: tr,
        dismissed: !!obsHitlBarDismissed.value
      })
    )
  } catch {
    /* ignore */
  }
}

function clearObsHitlPending() {
  try {
    localStorage.removeItem(OBS_HITL_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

function restoreObsHitlPending() {
  try {
    const raw = localStorage.getItem(OBS_HITL_PENDING_KEY)
    if (!raw) return
    const o = JSON.parse(raw)
    const savedThread = String(o.threadId || '').trim()
    if (!savedThread) return
    const currentThread = String(obsThreadId.value || '').trim()
    if (currentThread && savedThread !== currentThread) return
    obsThreadId.value = savedThread
    try {
      localStorage.setItem(OBS_THREAD_KEY, savedThread)
    } catch {
      /* ignore */
    }
    const tr = String(o.traceId || '').trim()
    if (tr) obsHitlTraceId.value = tr
    obsHitlBarDismissed.value = !!o.dismissed
    obsAwaitingHumanReview.value = !obsHitlBarDismissed.value
    if (tr && !selectedId.value) selectedId.value = tr
  } catch {
    /* ignore */
  }
}

/** Trace 已终局时强制收起复核 UI（防 SSE 误判或列表未刷新时的残留态） */
function clearObsHitlIfTraceTerminal(d) {
  const st = String(d?.status || '').toUpperCase()
  if (st !== 'SUCCESS' && st !== 'FAILED' && st !== 'CANCELLED') return
  obsAwaitingHumanReview.value = false
  obsHitlBarDismissed.value = false
  obsHitlPlanPreview.value = ''
  obsHitlNote.value = ''
  clearObsHitlPending()
}

/** 详情区与观测会话对齐时，用 Mongo 事件恢复「仍待人审」态（补 localStorage 丢失） */
function syncObsHitlUiFromDetail() {
  const d = detail.value
  if (!d || !traceAwaitingHumanReviewFromDetail(d)) return
  const rowThread = String(d.threadId || '').trim()
  const traceId = String(d._id || d.traceId || '').trim()
  const obsTid = String(obsThreadId.value || '').trim()
  const obsTrace = String(obsHitlTraceId.value || '').trim()
  const matchesSession =
    (obsTrace && traceId && obsTrace === traceId) || (obsTid && rowThread && obsTid === rowThread)
  if (!matchesSession) return
  if (rowThread && !obsThreadId.value) {
    obsThreadId.value = rowThread
    try {
      localStorage.setItem(OBS_THREAD_KEY, rowThread)
    } catch {
      /* ignore */
    }
  }
  if (traceId) obsHitlTraceId.value = traceId
  if (obsHitlBarDismissed.value) {
    obsAwaitingHumanReview.value = false
  } else {
    obsAwaitingHumanReview.value = true
  }
  persistObsHitlPending()
  syncObsHitlPlanFromDetail()
}

function resetObservationSession() {
  obsThreadId.value = ''
  obsAwaitingHumanReview.value = false
  obsHitlNote.value = ''
  obsHitlTraceId.value = ''
  obsHitlPlanPreview.value = ''
  obsHitlBarDismissed.value = false
  clearObsHitlPending()
  try {
    localStorage.removeItem(OBS_THREAD_KEY)
  } catch {
    /* ignore */
  }
  ElMessage.success('已切换为新会话，下一次发送将创建新的 thread')
  liveReasoningLines.value = []
  obsPyReasoningPrefixed.value = new Set()
  liveLlmNodeStreams.value = {}
  liveLlmNodeSeq.value = 0
}

function dismissHumanReviewBar() {
  obsHitlBarDismissed.value = true
  obsAwaitingHumanReview.value = false
  obsHitlNote.value = ''
  persistObsHitlPending()
}

function resumeHumanReviewBar() {
  obsHitlBarDismissed.value = false
  obsAwaitingHumanReview.value = true
  persistObsHitlPending()
}

async function submitHumanReviewFeedback(approved) {
  const note = obsHitlNote.value.trim()
  if (!note) {
    ElMessage.warning('请填写复核说明')
    return
  }
  if (!obsThreadId.value) {
    ElMessage.error('缺少 threadId，无法续跑')
    return
  }
  if (obsStreaming.value) return
  lastDedup = ''
  obsHitlSubmitting.value = true
  obsStreaming.value = true
  obsAbortController.value = new AbortController()
  obsHitlBarDismissed.value = false
  obsPyReasoningPrefixed.value = new Set()
  try {
    await chatAgentStream({
      payload: {
        query: ' ',
        threadId: obsThreadId.value,
        humanFeedbackContent: note,
        rejectedPlan: !approved,
        traceId: obsHitlTraceId.value || undefined
      },
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
          obsHitlTraceId.value = traceId
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
      onStreamPython: ({ section, chunk, node }) => {
        appendPythonToReasoningStream(node, section, chunk)
      },
      onComplete: (info) => {
        if (info?.awaitingHumanReview) {
          obsAwaitingHumanReview.value = true
          obsHitlBarDismissed.value = false
          const fromSse = info?.planPreview != null ? String(info.planPreview) : ''
          if (fromSse.trim()) obsHitlPlanPreview.value = fromSse.trim()
          else syncObsHitlPlanFromDetail()
          persistObsHitlPending()
          appendLiveLine('再次挂起，等待人工复核', { dedup: false })
        } else {
          obsAwaitingHumanReview.value = false
          obsHitlNote.value = ''
          obsHitlPlanPreview.value = ''
          obsHitlBarDismissed.value = false
          clearObsHitlPending()
        }
      },
      onError: (evt) => {
        const msg = evt?.message || evt?.text || '流式错误'
        appendLiveLine(String(msg), { dedup: false })
      }
    })
  } catch (e) {
    if (e?.name !== 'AbortError') {
      ElMessage.error(e?.message || '续跑失败')
    }
  } finally {
    obsAbortController.value = null
    obsHitlSubmitting.value = false
    try {
      if (selectedId.value) {
        detail.value = await getAgentTrace(selectedId.value)
        clearObsHitlIfTraceTerminal(detail.value)
        syncObsHitlPlanFromDetail()
      }
    } catch {
      /* ignore */
    }
    obsStreaming.value = false
    stopPolling()
    await loadList()
  }
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

function pythonObsSectionTitle(section) {
  if (section === 'code') return '代码'
  if (section === 'stdout') return '输出'
  return '解读'
}

function appendPythonToReasoningStream(node, section, chunk) {
  if (!section || chunk == null || chunk === '') return
  const nid = String(node || '').trim() || `python_${section}`
  const key = `${nid}:${section}`
  const set = obsPyReasoningPrefixed.value
  let prefix = ''
  if (!set.has(key)) {
    obsPyReasoningPrefixed.value = new Set(set).add(key)
    prefix = `\n── Python·${pythonObsSectionTitle(section)} ──\n`
  }
  pushNodeStreamChunk(nid, 'reasoning', prefix + String(chunk))
}

async function sendObservation() {
  const q = obsQuery.value.trim()
  if (!q || obsStreaming.value) return
  lastDedup = ''
  liveReasoningLines.value = []
  obsPyReasoningPrefixed.value = new Set()
  liveLlmNodeStreams.value = {}
  liveLlmNodeSeq.value = 0
  obsStreaming.value = true
  obsAbortController.value = new AbortController()
  obsHitlBarDismissed.value = false
  try {
    await chatAgentStream({
      payload: {
        query: q,
        threadId: obsThreadId.value || undefined,
        ...(obsHumanReview.value ? { humanReview: true } : {})
      },
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
          obsHitlTraceId.value = traceId
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
      onStreamPython: ({ section, chunk, node }) => {
        appendPythonToReasoningStream(node, section, chunk)
      },
      onError: (evt) => {
        const msg = evt?.message || evt?.text || '流式错误'
        appendLiveLine(String(msg), { dedup: false })
      },
      onComplete: (info) => {
        if (info?.awaitingHumanReview) {
          obsAwaitingHumanReview.value = true
          obsHitlBarDismissed.value = false
          const fromSse = info?.planPreview != null ? String(info.planPreview) : ''
          if (fromSse.trim()) obsHitlPlanPreview.value = fromSse.trim()
          else syncObsHitlPlanFromDetail()
          persistObsHitlPending()
          appendLiveLine('图已挂起，等待人工复核', { dedup: false })
        } else {
          obsAwaitingHumanReview.value = false
          obsHitlNote.value = ''
          obsHitlPlanPreview.value = ''
          obsHitlBarDismissed.value = false
          clearObsHitlPending()
        }
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
        syncObsHitlPlanFromDetail()
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

watch(
  () => [
    selectedId.value,
    detail.value?.chartViewSpec ?? detail.value?.chart_view_spec,
    detail.value?.chartDataPreview ?? detail.value?.chart_data_preview,
    detailLoading.value
  ],
  async () => {
    const gen = ++traceChartMountGen
    disposeTraceDetailChart()
    if (detailLoading.value || !selectedId.value) return
    const d = detail.value
    if (!d) return
    const sid = selectedId.value.trim()
    const docId = String(d._id || d.traceId || '').trim()
    if (docId && docId !== sid) return
    const specRaw = d.chartViewSpec ?? d.chart_view_spec
    const prevRaw = d.chartDataPreview ?? d.chart_data_preview
    if (specRaw == null || !String(specRaw).trim()) return
    let spec
    try {
      spec = JSON.parse(String(specRaw))
    } catch {
      return
    }
    const t = String(spec?.type || '').toLowerCase()
    if (!t || t === 'table') return
    let rows = []
    if (prevRaw != null && String(prevRaw).trim()) {
      try {
        const pr = JSON.parse(String(prevRaw))
        if (Array.isArray(pr)) rows = pr
      } catch {
        /* ignore */
      }
    }
    const msg = { id: `${sid}-obs`, chartViewSpec: spec, chartPreviewRows: rows }
    await nextTick()
    await mountAgentAssistantChart(msg)
    if (gen !== traceChartMountGen) {
      if (typeof msg.chartDispose === 'function') {
        try {
          msg.chartDispose()
        } catch {
          /* ignore */
        }
      }
      return
    }
    traceChartLastMsg = msg
  },
  { flush: 'post' }
)

watch(selectedId, (id) => {
  inspectVisible.value = false
  inspectTitle.value = ''
  inspectBody.value = ''
  onQueryResultClosed()
  topologySelectedEdgeKey.value = ''
  annoCollapseNames.value = []
  reasoningCollapseNames.value = ['reasoning-panel']
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

onMounted(async () => {
  restoreObsHitlPending()
  await loadList()
  const tr = String(obsHitlTraceId.value || '').trim()
  if (tr) {
    selectedId.value = tr
    await loadDetail(tr)
  }
  loadSkeleton()
})

onUnmounted(() => {
  disposeTraceDetailChart()
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

.status-pill[data-status='AWAITING_HUMAN'] {
  color: #6b21a8;
  border-color: #e9d5ff;
  background: #faf5ff;
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
  margin-bottom: 12px;
}

.detail-head-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.detail-title-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.detail-summary-heading {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: #204977;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.detail-reload-btn {
  flex-shrink: 0;
  margin-top: 1px;
}

.detail-subline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.detail-status-pill {
  font-size: 11px;
  padding: 1px 8px;
  letter-spacing: 0.02em;
  text-transform: none;
  font-weight: 700;
}

.detail-time-compact {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #64748b;
  letter-spacing: -0.02em;
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

.ev-cluster-head--python {
  border-bottom-color: rgba(251, 191, 36, 0.55);
  background: linear-gradient(90deg, rgba(255, 251, 235, 0.9), rgba(255, 255, 255, 0.35));
}

.ev-cluster-head-main {
  flex: 1;
  min-width: 0;
}

.ev-cluster-title {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ec-ink);
  line-height: 1.2;
}

.python-cluster-tag {
  flex-shrink: 0;
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

.trace-chart-card-wrap .trace-echarts-host {
  margin-top: 10px;
  height: 260px;
  width: 100%;
  min-height: 200px;
  border-radius: 10px;
  border: 1px solid rgba(14, 116, 144, 0.22);
  background: #fff;
  box-sizing: border-box;
}

.trace-raster-chart-wrap .trace-raster-inner {
  margin-top: 10px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(14, 116, 144, 0.22);
  background: #fff;
  box-sizing: border-box;
}

.trace-raster-img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.reasoning-stream-card {
  padding-bottom: 14px;
  /* 子组件默认白底与卡片渐变叠在一起会在顶缘露出白条；裁剪圆角内区域 */
  overflow: hidden;
}

.reasoning-collapse {
  border: none;
  background: transparent;
  --el-collapse-border-color: transparent;
  /* Element Plus：头/内容区默认 var(--el-fill-color-blank)，盖住卡片渐变 */
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;
}

.reasoning-collapse :deep(.el-collapse-item) {
  background: transparent;
  border: none;
}

.reasoning-collapse :deep(.el-collapse-item__header) {
  align-items: center;
  padding: 0 0 12px;
  min-height: auto;
  line-height: 1.35;
  border-bottom: 1px solid rgba(13, 148, 136, 0.28);
  font-weight: inherit;
  background-color: transparent !important;
}

.reasoning-collapse :deep(.el-collapse-item__header.is-active) {
  background-color: transparent !important;
}

.reasoning-collapse :deep(.el-collapse-item__header:hover) {
  background-color: rgba(255, 255, 255, 0.28) !important;
}

.reasoning-collapse :deep(.el-collapse-item__title) {
  background: transparent;
}

.reasoning-collapse :deep(.el-collapse-item__arrow) {
  margin-right: 8px;
}

.reasoning-collapse-title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #0f766e;
}

.reasoning-collapse-meta {
  margin-left: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  font-family: 'Fragment Mono', ui-monospace, monospace;
}

.reasoning-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background-color: transparent;
}

.reasoning-collapse :deep(.el-collapse-item__content) {
  padding: 14px 0 0;
  background-color: transparent;
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
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed #94a3b8;
  background: #f8fafc;
}

.plan-spine-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.plan-spine-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.plan-spine-source {
  font-size: 11px;
  color: #94a3b8;
}

.plan-spine-todos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-spine-todo {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
}

.plan-spine-todo[data-status='done'] {
  opacity: 0.85;
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.plan-spine-todo[data-status='running'] {
  border-color: #fde68a;
  background: #fffbeb;
}

.plan-todo-mark {
  flex: 0 0 auto;
  width: 1.25em;
  text-align: center;
  font-weight: 700;
  color: #64748b;
}

.plan-todo-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}

.plan-todo-step {
  color: #64748b;
  font-size: 11px;
}

.plan-todo-tool {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
}

.plan-todo-inst {
  flex: 1 1 100%;
  font-size: 11px;
  color: #475569;
  line-height: 1.35;
}

.obs-run-card {
  position: relative;
  margin: 0;
  padding: 12px 14px 14px;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: flex-start;
}

.obs-run-cap {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.obs-run-cap-kicker {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 800;
  color: #5978a5;
}

.obs-run-cap-muted {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 600;
}

.obs-run-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.obs-input-full {
  width: 100%;
}

.obs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.obs-toolbar-left,
.obs-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.obs-toolbar-right {
  margin-left: auto;
}

.obs-hitl-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: default;
}

.obs-hitl-switch-label {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  user-select: none;
}

.obs-tool-btn {
  border-color: #c5d4ec !important;
}

.obs-send-btn {
  min-width: 36px;
  padding: 6px 12px;
}

.obs-stop-btn {
  font-weight: 700;
}

.obs-input {
  flex: 0 1 auto;
  min-width: 0;
}

.obs-hitl-bar {
  flex: 1 1 100%;
  width: 100%;
  margin-top: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(89, 120, 165, 0.06);
  border: 1px dashed rgba(89, 120, 165, 0.35);
  box-sizing: border-box;
}

.obs-hitl-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: #4a5f78;
  line-height: 1.45;
}

.obs-hitl-input {
  margin-bottom: 8px;
}

.obs-hitl-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.obs-hitl-plan-row {
  margin-bottom: 6px;
}

.obs-hitl-plan-dialog-body {
  max-height: min(70vh, 720px);
  overflow: auto;
}

.obs-plan-thought {
  margin: 0 0 10px;
  font-size: 12px;
  color: #475569;
  line-height: 1.45;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.obs-plan-steps {
  margin: 0;
  padding-left: 1.25rem;
}

.obs-plan-step-row {
  margin-bottom: 8px;
  line-height: 1.4;
}

.obs-plan-step-no {
  font-weight: 700;
  margin-right: 6px;
  color: #64748b;
}

.obs-plan-tool {
  font-size: 12px;
  margin-right: 6px;
}

.obs-plan-inst {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #64748b;
}

.obs-hitl-plan-pre-dialog {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, monospace;
}

.obs-hitl-dismissed-strip {
  flex: 1 1 100%;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(234, 179, 8, 0.08);
  border: 1px solid rgba(234, 179, 8, 0.35);
  box-sizing: border-box;
}

.obs-input :deep(.el-textarea__inner) {
  font-family: inherit;
  border-radius: 12px;
  min-height: 40px !important;
  line-height: 1.45;
}

@media (max-width: 1100px) {
  .obs-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .obs-toolbar-right {
    margin-left: 0;
    justify-content: flex-end;
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
