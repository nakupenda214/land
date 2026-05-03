<template>
  <section class="memory-page">
    <MemorySessionSidebar
      v-model:keyword="keyword"
      :sessions="sessions"
      :loading-sessions="loadingSessions"
      :selected-thread-id="selectedThreadId"
      @query-sessions="loadSessions"
      @select-session="selectSession"
    />

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
            <el-input-number
              v-model="cfg.summaryRefreshIntervalMs"
              :min="30000"
              :max="3600000"
              :step="10000"
            />
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
import MemorySessionSidebar from './MemorySessionSidebar.vue'
import { useMemoryManagementPanel } from '@/composables/agent-management/useMemoryManagementPanel.js'

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
} = useMemoryManagementPanel()
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
