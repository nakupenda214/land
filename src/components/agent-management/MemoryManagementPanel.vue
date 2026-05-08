<template>
  <section class="memory-page">
    <el-tabs v-model="memoryTab" class="memory-tabs">
      <el-tab-pane name="sessions" label="会话与消息">
        <div class="memory-split">
          <MemorySessionSidebar
            v-model:keyword="keyword"
            :sessions="sessions"
            :loading-sessions="loadingSessions"
            :selected-thread-id="selectedThreadId"
            @query-sessions="loadSessions"
            @select-session="selectSession"
          />
          <main class="content-pane">
            <section class="panel-card details-card">
              <div class="card-head">
                <div>
                  <h3>会话与消息</h3>
                </div>
                <div class="actions actions--wrap">
                  <el-select v-model="messageRole" style="width: 112px" placeholder="角色" @change="onFilterChange">
                    <el-option label="全部角色" value="" />
                    <el-option label="user" value="user" />
                    <el-option label="assistant" value="assistant" />
                  </el-select>
                  <el-input
                    v-model="messageKeyword"
                    clearable
                    placeholder="按消息内容检索"
                    style="width: 200px"
                    @keyup.enter="loadMessages"
                    @clear="onFilterChange"
                  />
                  <el-button :disabled="!selectedThreadId" :loading="loadingMessages" @click="loadMessages">查询</el-button>
                  <el-button :disabled="!selectedThreadId" @click="refreshSummary(selectedSession)">刷新摘要</el-button>
                  <el-button :disabled="!selectedThreadId" type="danger" plain @click="clearSummary(selectedSession)">
                    清空摘要
                  </el-button>
                  <el-button :disabled="!selectedThreadId" type="warning" plain @click="clearAllMessages">清空消息</el-button>
                  <el-button :disabled="!selectedThreadId" type="danger" @click="deleteSession">删除会话</el-button>
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
              <el-table
                v-if="selectedSession"
                v-loading="loadingMessages"
                :data="messages"
                stripe
                max-height="420"
              >
                <el-table-column label="时间" width="172">
                  <template #default="{ row }">{{ formatTs(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="role" label="角色" width="92" />
                <el-table-column label="内容" min-width="360">
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
        </div>
      </el-tab-pane>

      <el-tab-pane name="settings" label="参数配置">
        <div class="memory-settings-host">
          <section class="panel-card memory-settings-card">
          <div class="card-head">
            <div>
              <h3>记忆参数</h3>
            </div>
            <div class="actions">
              <el-button :loading="loadingCfg" @click="loadConfig">刷新</el-button>
              <el-button type="primary" :loading="savingCfg" @click="saveConfig">保存</el-button>
            </div>
          </div>
          <p class="cfg-hint">
            此处为常用可调参数。会话摘要默认走 LLM（失败回退规则摘要）。Trace 记忆观测、HITL 续跑、LLM
            摘要拼接/超时、向量分块等仍在服务端
            <code class="cfg-code">landcheck.agent.memory</code>
            配置（需重启）。
          </p>
          <el-form :model="cfg" class="cfg-form" label-position="top" size="small">
            <h4 class="cfg-section-title">工作记忆</h4>
            <div class="cfg-grid">
              <el-form-item label="候选历史条数">
                <el-input-number v-model="cfg.workingCandidateMessages" :min="8" :max="200" class="cfg-num" />
                <div class="cfg-item-tip">从新到旧最多拉取多少条参与筛选</div>
              </el-form-item>
              <el-form-item label="相关性保留条数">
                <el-input-number v-model="cfg.workingTopMessages" :min="2" :max="20" class="cfg-num" />
                <div class="cfg-item-tip">语义相关命中后保留几条</div>
              </el-form-item>
              <el-form-item label="最近对话兜底条数">
                <el-input-number v-model="cfg.workingRecentMessages" :min="1" :max="10" class="cfg-num" />
                <div class="cfg-item-tip">防止上下文突然断档</div>
              </el-form-item>
              <el-form-item label="拼进模型的记忆最长字符">
                <el-input-number v-model="cfg.workingMaxChars" :min="800" :max="20000" :step="200" class="cfg-num" />
              </el-form-item>
            </div>

            <h4 class="cfg-section-title">会话摘要（规则摘要）</h4>
            <div class="cfg-grid">
              <el-form-item label="参与摘要的最近消息条数">
                <el-input-number v-model="cfg.summarySourceMessages" :min="8" :max="100" class="cfg-num" />
              </el-form-item>
              <el-form-item label="摘要最长字符">
                <el-input-number v-model="cfg.summaryMaxChars" :min="300" :max="5000" :step="100" class="cfg-num" />
              </el-form-item>
              <el-form-item label="摘要最短刷新间隔（毫秒）">
                <el-input-number
                  v-model="cfg.summaryRefreshIntervalMs"
                  :min="30000"
                  :max="3600000"
                  :step="10000"
                  class="cfg-num"
                />
                <div class="cfg-item-tip">例：120000 ≈ 2 分钟</div>
              </el-form-item>
            </div>

            <h4 class="cfg-section-title">语义召回</h4>
            <div class="cfg-grid cfg-grid--2">
              <el-form-item label="最多召回几条">
                <el-input-number v-model="cfg.vectorTopK" :min="1" :max="32" class="cfg-num" />
              </el-form-item>
              <el-form-item label="相似度下限（余弦）">
                <el-input-number
                  v-model="cfg.vectorMinSimilarity"
                  :min="-1"
                  :max="1"
                  :step="0.01"
                  :precision="3"
                  class="cfg-num"
                />
                <div class="cfg-item-tip">低于此值的历史消息不采用</div>
              </el-form-item>
            </div>

            <el-collapse v-model="cfgAdvancedOpen" class="cfg-advanced">
              <el-collapse-item title="存储与定时清理" name="lifecycle">
                <div class="cfg-grid">
                  <el-form-item label="启用定时清理">
                    <el-switch v-model="cfg.lifecycleEnabled" />
                    <div class="cfg-item-tip">开启后会按下方规则删过期会话或裁剪消息</div>
                  </el-form-item>
                  <el-form-item label="会话多久未更新则删除（毫秒，0=不按时间删）">
                    <el-input-number
                      v-model="cfg.sessionTtlMs"
                      :min="0"
                      :max="31536000000"
                      :step="86400000"
                      class="cfg-num"
                    />
                    <div class="cfg-item-tip">例：604800000 = 7 天</div>
                  </el-form-item>
                  <el-form-item label="单会话最多保留消息条数（0=不限）">
                    <el-input-number v-model="cfg.maxMessagesPerThread" :min="0" :max="50000" class="cfg-num" />
                  </el-form-item>
                  <el-form-item label="单会话消息总字符上限（0=不限）">
                    <el-input-number
                      v-model="cfg.maxMessageBytesPerThread"
                      :min="0"
                      :max="500000000"
                      :step="10000"
                      class="cfg-num"
                    />
                  </el-form-item>
                  <el-form-item label="清理任务 Cron" class="cfg-span-2">
                    <el-input v-model="cfg.cleanupCron" maxlength="120" placeholder="默认每天 3 点：0 0 3 * * *" />
                    <div class="cfg-item-tip">Spring 6 域：秒 分 时 日 月 周</div>
                  </el-form-item>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="messageViewerVisible" title="内容全文" width="780px" destroy-on-close>
      <pre class="msg-viewer-pre">{{ viewingMessageContent || '—' }}</pre>
      <template #footer>
        <el-button type="primary" @click="messageViewerVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import MemorySessionSidebar from './MemorySessionSidebar.vue'
import { useMemoryManagementPanel } from '@/composables/agent-management/useMemoryManagementPanel.js'

/** settings | sessions */
const memoryTab = ref('sessions')
const cfgAdvancedOpen = ref([])

const {
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
} = useMemoryManagementPanel()
</script>

<style scoped>
.memory-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 640px;
}

.memory-tabs {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border-radius: 14px;
  border: 1px solid #dce7f8;
  padding: 10px;
}

.memory-tabs :deep(.el-tabs__nav-wrap::after) {
  background: transparent;
}

.memory-tabs :deep(.el-tabs__item) {
  border-radius: 9px;
  font-weight: 600;
}

.memory-tabs :deep(.el-tabs__item.is-active) {
  background: #eef4ff;
}

.memory-split {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-height: 0;
}

.memory-settings-host {
  display: flex;
  justify-content: center;
  width: 100%;
}

.memory-settings-card {
  width: 100%;
  max-width: 920px;
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
  gap: 0;
  min-width: 0;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
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

.actions--wrap {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cfg-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}

.cfg-code {
  font-family: 'Fragment Mono', ui-monospace, monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #0f172a;
}

.cfg-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cfg-section-title {
  margin: 14px 0 8px;
  font-size: 12px;
  font-weight: 800;
  color: #334155;
  letter-spacing: 0.06em;
}

.cfg-section-title:first-of-type {
  margin-top: 0;
}

.cfg-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
}

.cfg-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 900px) {
  .cfg-grid:not(.cfg-grid--2) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.cfg-span-2 {
  grid-column: 1 / -1;
}

.cfg-num {
  width: 100%;
}

.cfg-item-tip {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.35;
  color: #94a3b8;
}

.cfg-advanced {
  margin-top: 10px;
  border: none;
  --el-collapse-border-color: transparent;
}

.cfg-advanced :deep(.el-collapse-item__header) {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  padding: 8px 0;
  min-height: auto;
  line-height: 1.3;
}

.cfg-advanced :deep(.el-collapse-item__wrap) {
  border: none;
}

.cfg-advanced :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

.cfg-grid :deep(.el-form-item) {
  margin-bottom: 4px;
}

.cfg-grid :deep(.el-form-item__label) {
  line-height: 18px;
  padding-bottom: 2px;
}

.details-card {
  min-height: 400px;
  flex: 1;
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

@media (max-width: 1100px) {
  .memory-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1400px) {
  .cfg-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
</style>
