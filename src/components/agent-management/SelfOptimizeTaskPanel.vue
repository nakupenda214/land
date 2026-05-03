<template>
  <section class="selfopt-panel">
    <section class="selfopt-surface selfopt-surface--flow" aria-label="手动执行流水线">
      <div class="selfopt-surface-head">
        <div class="selfopt-surface-head__titles">
          <span class="selfopt-surface-title">自优化主流程</span>
        </div>
        <div class="selfopt-surface-head__actions">
          <el-button type="primary" plain :loading="taskListLoading" @click="loadTasks">刷新任务</el-button>
          <el-dropdown trigger="click" @command="onHeaderMoreCommand">
            <el-button plain>
              更多
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="runPending" :disabled="pendingLoading">执行待处理任务</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="selfopt-pipeline" role="group">
        <div class="selfopt-pipeline-step">
          <div class="selfopt-step-badge" aria-hidden="true">1</div>
          <div class="selfopt-step-body">
            <label class="selfopt-label" for="selfopt-trace-input">Trace ID</label>
            <el-input
              id="selfopt-trace-input"
              v-model.trim="traceId"
              class="selfopt-control"
              placeholder="手动输入 traceId（也可从 bad case 一键填入）"
              clearable
            />
            <el-button type="primary" class="selfopt-step-cta" :loading="buildLoading" @click="buildSnapshot">
              步骤 1 · 构建快照任务
            </el-button>
          </div>
        </div>

        <div class="selfopt-pipeline-join" aria-hidden="true">
          <span class="selfopt-pipeline-join__line" />
          <span class="selfopt-pipeline-join__chev">›</span>
        </div>

        <div class="selfopt-pipeline-step">
          <div class="selfopt-step-badge" aria-hidden="true">2</div>
          <div class="selfopt-step-body">
            <label class="selfopt-label" for="selfopt-task-input">Task ID</label>
            <el-input
              id="selfopt-task-input"
              v-model.trim="taskId"
              class="selfopt-control"
              placeholder="输入 taskId 以执行闭环或查看详情"
              clearable
            />
            <div class="selfopt-step-actions">
              <el-button
                type="primary"
                plain
                :loading="isTaskRunning(taskId)"
                :disabled="!taskId || isTaskRunning(taskId)"
                @click="runTask"
              >
                步骤 2 · 执行闭环
              </el-button>
              <el-button
                type="warning"
                plain
                :loading="isTaskExecuting(taskId)"
                :disabled="!canExecuteCurrentInputTask"
                @click="executeTask"
              >
                执行低风险动作
              </el-button>
            </div>
            <p v-if="inputExecuteDisabledReason" class="selfopt-hint">{{ inputExecuteDisabledReason }}</p>
          </div>
        </div>
      </div>

      <el-collapse v-model="buildOptionsCollapse" class="build-options-collapse">
        <el-collapse-item name="more">
          <template #title>
            <span class="collapse-title">可选：质量标注与人工反馈</span>
          </template>
          <div class="build-opts-layout">
            <div class="build-opts-block">
              <div class="opts-block-head">
                <span>质量问题 <code>qualityIssue</code></span>
                <el-switch v-model="buildForm.qualityEnabled" inline-prompt active-text="启用" inactive-text="关闭" />
              </div>
              <el-form label-position="top" :disabled="!buildForm.qualityEnabled" class="build-opts-form">
                <el-form-item label="issueType（必填，若启用）">
                  <el-input v-model.trim="buildForm.issueType" placeholder="如 SILENT_WRONG_ANSWER / QUALITY_MISMATCH" />
                </el-form-item>
                <el-form-item label="expectedResult（黄金答案片段，可选）">
                  <el-input v-model.trim="buildForm.expectedResult" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="expectedCount（期望查询行数，可选）">
                  <el-input v-model.trim="buildForm.expectedCount" placeholder="留空则不校验行数" />
                </el-form-item>
                <el-form-item label="involvedCollections（逗号分隔，可选）">
                  <el-input v-model.trim="buildForm.involvedCollectionsStr" placeholder="collection_a, collection_b" />
                </el-form-item>
                <el-form-item label="markOperator（标注人，可选）">
                  <el-input v-model.trim="buildForm.markOperator" placeholder="工号或姓名" />
                </el-form-item>
              </el-form>
            </div>
            <div class="build-opts-block">
              <div class="opts-block-head">
                <span>人工反馈 <code>humanFeedback</code></span>
                <el-switch v-model="buildForm.feedbackEnabled" inline-prompt active-text="启用" inactive-text="关闭" />
              </div>
              <el-form label-position="top" :disabled="!buildForm.feedbackEnabled" class="build-opts-form">
                <el-form-item label="feedbackContent（必填，若启用）">
                  <el-input v-model.trim="buildForm.feedbackContent" type="textarea" :rows="3" placeholder="运营/专家意见" />
                </el-form-item>
                <el-form-item label="focusTags（可多选；留空表示各环节均参考）">
                  <el-select v-model="buildForm.feedbackFocusTags" multiple collapse-tags placeholder="ROOT_CAUSE / PLAN_GENERATION / MQL_EXECUTE">
                    <el-option label="ROOT_CAUSE" value="ROOT_CAUSE" />
                    <el-option label="PLAN_GENERATION" value="PLAN_GENERATION" />
                    <el-option label="MQL_EXECUTE" value="MQL_EXECUTE" />
                  </el-select>
                </el-form-item>
                <el-form-item label="operator（可选）">
                  <el-input v-model.trim="buildForm.feedbackOperator" placeholder="反馈人" />
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section class="block-card block-card--collapse">
      <el-collapse v-model="badCaseCollapseActive" class="secondary-collapse">
        <el-collapse-item name="bad">
          <template #title>
            <span class="secondary-collapse__title">Bad case 列表</span>
          </template>
          <div class="block-head block-head--inner">
            <el-button type="primary" plain size="small" :loading="badListLoading" @click="loadBadCases">刷新</el-button>
          </div>
          <el-table :data="badCases" stripe empty-text="暂无 bad case" size="small">
            <el-table-column prop="createdAt" label="时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="traceId" label="traceId" min-width="180" show-overflow-tooltip />
            <el-table-column prop="userQuery" label="userQuery" min-width="220" show-overflow-tooltip />
            <el-table-column label="reasonCode" width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ formatReasonCode(row.reasonCode) }}</template>
            </el-table-column>
            <el-table-column prop="source" label="source" width="100" />
            <el-table-column prop="issueCategory" label="issueCategory" width="130" show-overflow-tooltip />
            <el-table-column label="操作" min-width="200" align="right" class-name="col-actions">
              <template #default="{ row }">
                <div class="row-action-group row-action-group--bad">
                  <el-tooltip content="从该 bad case 启动一条自优化任务" placement="top" :show-after="400">
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      :icon="VideoPlay"
                      :loading="startLoadingTraceId === row.traceId"
                      @click="startFromBadCase(row)"
                    >
                      开始优化
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="永久删除该 bad case" placement="top" :show-after="400">
                    <el-button
                      size="small"
                      type="danger"
                      plain
                      :icon="Delete"
                      :loading="deletingBadCaseId === row._id"
                      @click.stop="deleteBadCaseRow(row)"
                    >
                      删除
                    </el-button>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager-wrap">
            <el-pagination
              v-model:current-page="badPageNum"
              v-model:page-size="badPageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              :total="badTotal"
              @current-change="loadBadCases"
              @size-change="onBadCasePageSizeChange"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section class="block-card">
      <div class="block-head">
        <h5>任务列表</h5>
      </div>

      <div class="task-toolbar" aria-label="常用筛选">
        <el-input
          v-model.trim="taskQuery.traceId"
          class="task-toolbar__trace"
          placeholder="按 traceId 筛选"
          clearable
        />
        <el-button type="primary" :loading="taskListLoading" @click="applyTaskFilters">应用</el-button>
        <el-button @click="resetTaskFilters">重置</el-button>
        <el-button text type="primary" @click="taskAdvancedFilterOpen = !taskAdvancedFilterOpen">
          {{ taskAdvancedFilterOpen ? '收起高级筛选' : '高级筛选' }}
        </el-button>
      </div>

      <div v-show="taskAdvancedFilterOpen" class="selfopt-filter" aria-label="任务高级筛选">
        <div class="selfopt-filter__grid">
          <div class="selfopt-filter-field">
            <span class="selfopt-label">状态 status</span>
            <el-select
              v-model="taskQuery.statusList"
              class="selfopt-control"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="全部状态"
            >
              <el-option label="PENDING" value="PENDING" />
              <el-option label="PROCESSING" value="PROCESSING" />
              <el-option label="SUCCESS" value="SUCCESS" />
              <el-option label="FAILED" value="FAILED" />
              <el-option label="MANUAL_REVIEW" value="MANUAL_REVIEW" />
            </el-select>
          </div>
          <div class="selfopt-filter-field">
            <span class="selfopt-label">阶段 stage</span>
            <el-select v-model="taskQuery.stage" class="selfopt-control" placeholder="全部阶段" clearable>
              <el-option label="INGEST" value="INGEST" />
              <el-option label="DIAGNOSIS" value="DIAGNOSIS" />
              <el-option label="PLAN" value="PLAN" />
              <el-option label="EXECUTE" value="EXECUTE" />
              <el-option label="VERIFY" value="VERIFY" />
              <el-option label="RELEASE" value="RELEASE" />
              <el-option label="PRECIPITATION" value="PRECIPITATION" />
            </el-select>
          </div>
          <div class="selfopt-filter-field selfopt-filter-field--wide">
            <span class="selfopt-label">时间范围</span>
            <el-date-picker
              v-model="taskQuery.timeRange"
              class="selfopt-control selfopt-date-range"
              type="datetimerange"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </div>
          <div class="selfopt-filter-actions">
            <el-button type="primary" :loading="taskListLoading" @click="applyTaskFilters">应用筛选</el-button>
            <el-button @click="resetTaskFilters">重置条件</el-button>
          </div>
        </div>
      </div>

      <el-table
        :data="tasks"
        stripe
        highlight-current-row
        empty-text="暂无任务记录"
        :row-class-name="taskRowClassName"
        @row-click="onTaskRowClick"
      >
        <el-table-column prop="taskId" label="taskId" min-width="160" show-overflow-tooltip />
        <el-table-column prop="traceId" label="traceId" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="128">
          <template #default="{ row }">
            <el-tooltip
              v-if="!isTaskRunning(row.taskId) && !isTaskExecuting(row.taskId) && row.errorMessage"
              :content="String(row.errorMessage)"
              placement="top"
              :show-after="400"
            >
              <span :class="statusPillClass(row.status)">{{ normalizeTaskStatus(row.status) }}</span>
            </el-tooltip>
            <span v-else-if="isTaskRunning(row.taskId) || isTaskExecuting(row.taskId)" class="running-badge">
              <el-icon class="spin"><Loading /></el-icon>执行中
            </span>
            <span v-else :class="statusPillClass(row.status)">{{ normalizeTaskStatus(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="阶段" width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="stageTagType(row.currentStage)">{{ row.currentStage || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatTime(row.updateTime || row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="最后执行" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="buildLastExecutionTooltip(row)" placement="top" :show-after="200">
              <button class="last-exec-btn" type="button" @click.stop="openEventFlowFromTask(row)">
                <span class="last-exec-main">
                  <el-icon v-if="getLastExecutionAction(row).action === 'run'" class="exec-icon"><RefreshRight /></el-icon>
                  <el-icon v-else-if="getLastExecutionAction(row).action === 'execute'" class="exec-icon"><Operation /></el-icon>
                  <el-icon v-else class="exec-icon"><Clock /></el-icon>
                  <span>{{ getLastExecutionAction(row).label }}</span>
                </span>
                <span class="last-exec-time">{{ getLastExecutionAction(row).timeText }}</span>
                <span :class="statusPillClass(getLastExecutionStatus(row))">
                  {{ normalizeTaskStatus(getLastExecutionStatus(row)) }}
                </span>
              </button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="268" align="right" class-name="col-actions">
          <template #default="{ row }">
            <div class="row-action-group row-action-group--task">
              <el-tooltip content="重新执行整条自优化流程" placement="top" :show-after="350">
                <span class="btn-tooltip-wrap">
                  <el-button
                    size="small"
                    link
                    type="primary"
                    :icon="RefreshRight"
                    :loading="isTaskRunning(row.taskId)"
                    :disabled="isTaskRunning(row.taskId)"
                    @click.stop="quickRun(row.taskId)"
                  >
                    重跑
                  </el-button>
                </span>
              </el-tooltip>
              <el-tooltip
                :content="
                  isRowExecutionDisabled(row)
                    ? '当前阶段需人工审核通过后才可执行优化动作'
                    : '执行已批准的优化动作（写配置 / 触发验证等）'
                "
                placement="top"
                :show-after="350"
              >
                <span class="btn-tooltip-wrap">
                  <el-button
                    size="small"
                    link
                    type="warning"
                    :icon="Operation"
                    :loading="isTaskExecuting(row.taskId)"
                    :disabled="isTaskExecuting(row.taskId) || isRowExecutionDisabled(row)"
                    @click.stop="quickExecute(row.taskId)"
                  >
                    执行动作
                  </el-button>
                </span>
              </el-tooltip>
              <span v-if="isRowExecutionDisabled(row)" class="exec-hint-text">需人工审核</span>
              <el-tooltip content="软删除该任务（列表中隐藏）" placement="top" :show-after="350">
                <span class="btn-tooltip-wrap">
                  <el-button
                    size="small"
                    link
                    type="danger"
                    :icon="Delete"
                    :loading="deletingTaskId === row.taskId"
                    @click.stop="deleteTaskRow(row)"
                  >
                    删除
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-wrap">
        <el-pagination
          v-model:current-page="taskPageNum"
          v-model:page-size="taskPageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="taskTotal"
          @current-change="loadTasks"
          @size-change="onTaskPageSizeChange"
        />
      </div>
    </section>

    <section class="block-card block-card--collapse">
      <el-collapse :model-value="versionCollapseActive" @change="onVersionCollapseChange" class="secondary-collapse">
        <el-collapse-item name="versions">
          <template #title>
            <span class="secondary-collapse__title">优化版本浏览</span>
          </template>

          <div class="selfopt-filter" aria-label="版本筛选">
            <div class="selfopt-filter__grid">
              <div class="selfopt-filter-field">
                <span class="selfopt-label">taskId</span>
                <el-input v-model.trim="versionQuery.taskId" class="selfopt-control" placeholder="按 taskId 筛选" clearable />
              </div>
              <div class="selfopt-filter-field">
                <span class="selfopt-label">actionType</span>
                <el-input v-model.trim="versionQuery.actionType" class="selfopt-control" placeholder="如 FEW_SHOT_INJECTION" clearable />
              </div>
              <div class="selfopt-filter-field">
                <span class="selfopt-label">executeStatus</span>
                <el-select v-model="versionQuery.executeStatus" class="selfopt-control" placeholder="全部执行状态" clearable>
                  <el-option label="SUCCESS" value="SUCCESS" />
                  <el-option label="FAILED" value="FAILED" />
                  <el-option label="ROLLBACK" value="ROLLBACK" />
                  <el-option label="EXECUTING" value="EXECUTING" />
                </el-select>
              </div>
              <div class="selfopt-filter-field">
                <span class="selfopt-label">verifyStatus</span>
                <el-select v-model="versionQuery.verifyStatus" class="selfopt-control" placeholder="全部验证状态" clearable>
                  <el-option label="PASS" value="PASS" />
                  <el-option label="FAIL" value="FAIL" />
                  <el-option label="SKIP" value="SKIP" />
                </el-select>
              </div>
              <div class="selfopt-filter-field selfopt-filter-field--wide">
                <span class="selfopt-label">时间范围</span>
                <el-date-picker
                  v-model="versionQuery.timeRange"
                  class="selfopt-control selfopt-date-range"
                  type="datetimerange"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                />
              </div>
              <div class="selfopt-filter-actions">
                <el-button type="primary" :loading="versionsLoading" @click="applyVersionFilters">应用筛选</el-button>
                <el-button @click="resetVersionFilters">重置条件</el-button>
              </div>
            </div>
          </div>

          <el-table :data="versions" stripe empty-text="暂无版本记录">
            <el-table-column prop="versionId" label="versionId" min-width="200" show-overflow-tooltip />
            <el-table-column label="taskId" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="onTaskRowClick({ taskId: row.taskId })">
                  {{ row.taskId || '—' }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="actionType" label="actionType" min-width="170" show-overflow-tooltip />
            <el-table-column label="executeStatus" width="130">
              <template #default="{ row }">
                <el-tag size="small" :type="executeStatusTagType(row.executeStatus)">{{ row.executeStatus || '—' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="verifyStatus" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="verifyStatusTagType(row.verifyStatus)">{{ row.verifyStatus || '—' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="rollbackable" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="row.rollbackable === false ? 'info' : 'warning'">
                  {{ row.rollbackable === false ? '否' : '是' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="updateTime" width="170">
              <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="240">
              <template #default="{ row }">
                <el-button size="small" text type="primary" @click="openVersionDetailDialog(row)">详情</el-button>
                <el-button
                  size="small"
                  text
                  type="primary"
                  :loading="versionVerifyLoading"
                  :disabled="versionVerifyLoading"
                  @click="quickVerifyVersion(row)"
                >
                  验证
                </el-button>
                <el-button
                  size="small"
                  text
                  type="warning"
                  :loading="rollbackLoading"
                  :disabled="rollbackLoading || row.rollbackable === false"
                  @click="quickRollbackVersion(row)"
                >
                  回滚
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pager-wrap">
            <el-pagination
              v-model:current-page="versionPageNum"
              v-model:page-size="versionPageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              :total="versionTotal"
              @current-change="loadVersions"
              @size-change="onVersionPageSizeChange"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section class="block-card detail-panel">
      <div class="block-head">
        <div>
          <h5>任务详情</h5>
        </div>
      </div>
      <el-empty v-if="!selectedTaskId" description="请点击上方任务记录行查看详情" />
      <template v-else>
        <el-tabs v-model="detailActiveTab">
          <el-tab-pane label="概览" name="overview" lazy>
            <div v-loading="detailLoading" class="detail-body">
              <el-descriptions title="任务信息" :column="3" border>
                <el-descriptions-item label="taskId">{{ selectedTask?.taskId || '—' }}</el-descriptions-item>
                <el-descriptions-item label="traceId">{{ selectedTask?.traceId || '—' }}</el-descriptions-item>
                <el-descriptions-item label="snapshotId">{{ selectedTask?.snapshotId || '—' }}</el-descriptions-item>
                <el-descriptions-item label="status">
                  <span :class="statusPillClass(selectedTask?.status)">{{ normalizeTaskStatus(selectedTask?.status) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="stage">
                  <el-tag size="small" :type="stageTagType(selectedTask?.currentStage)">{{ selectedTask?.currentStage || '—' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="selfOptTraceId">{{ selectedTask?.selfOptTraceId || '—' }}</el-descriptions-item>
                <el-descriptions-item label="createTime">{{ formatTime(selectedTask?.createTime) }}</el-descriptions-item>
                <el-descriptions-item label="updateTime">{{ formatTime(selectedTask?.updateTime) }}</el-descriptions-item>
                <el-descriptions-item label="errorMessage">{{ selectedTask?.errorMessage || '—' }}</el-descriptions-item>
              </el-descriptions>

              <el-descriptions title="快照信息" :column="2" border class="snapshot-desc">
                <el-descriptions-item label="traceId">{{ selectedSnapshot?.traceId || '—' }}</el-descriptions-item>
                <el-descriptions-item label="triggerNode">{{ selectedSnapshot?.triggerNode || '—' }}</el-descriptions-item>
                <el-descriptions-item label="triggerType">{{ selectedSnapshot?.triggerType || '—' }}</el-descriptions-item>
                <el-descriptions-item label="optimizationStatus">{{ selectedSnapshot?.optimizationStatus || '—' }}</el-descriptions-item>
                <el-descriptions-item label="userQuery" :span="2">{{ selectedSnapshot?.userQuery || '—' }}</el-descriptions-item>
                <el-descriptions-item label="rootCause" :span="2">{{ selectedSnapshot?.rootCause || '—' }}</el-descriptions-item>
              </el-descriptions>

              <el-collapse v-model="snapshotExtraCollapse" class="snapshot-extra-collapse">
                <el-collapse-item name="qx">
                  <template #title>
                    <span>质量标注与人工反馈</span>
                    <span v-if="selectedSnapshot?.qualityIssue && snapshotHasQualityIssue(selectedSnapshot.qualityIssue)" class="collapse-badge">quality</span>
                    <span v-if="humanFeedbackEntries.length" class="collapse-badge">反馈 {{ humanFeedbackEntries.length }}</span>
                  </template>
                  <div class="snapshot-extra-actions">
                    <el-button size="small" type="primary" plain :disabled="!selectedTask?.snapshotId" @click="openAppendFeedbackDialog">
                      追加人工反馈
                    </el-button>
                  </div>
                  <el-descriptions :column="2" border size="small" class="snapshot-desc snapshot-desc--sub">
                    <el-descriptions-item label="qualityIssue" :span="2">
                      <template v-if="selectedSnapshot?.qualityIssue && snapshotHasQualityIssue(selectedSnapshot.qualityIssue)">
                        <el-tag size="small" type="warning">{{ selectedSnapshot.qualityIssue.issueType || '—' }}</el-tag>
                        <span class="snapshot-meta-inline">期望行数 {{ selectedSnapshot.qualityIssue.expectedCount ?? '—' }}</span>
                        <el-button size="small" text type="primary" @click="openTextViewer('qualityIssue', formatJson(selectedSnapshot.qualityIssue))">JSON</el-button>
                      </template>
                      <span v-else>—</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="humanFeedback" :span="2">
                      <ul v-if="humanFeedbackEntries.length" class="human-fb-list">
                        <li v-for="(fb, idx) in humanFeedbackEntries" :key="idx">
                          <strong>r{{ fb.revision ?? '?' }}</strong>
                          <span v-if="fb.focusTags?.length" class="fb-tags">{{ fb.focusTags.join(', ') }}</span>
                          — {{ shortText(fb.feedbackContent, 120) }}
                        </li>
                      </ul>
                      <span v-else>暂无</span>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>

          <el-tab-pane label="证据快照" name="evidence" lazy>
            <div v-loading="detailLoading" class="detail-body">
              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">链路证据</div>
                </template>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="sessionMemory">
                    <div class="ellipsis-text">{{ shortText(selectedSnapshot?.sessionMemory) }}</div>
                    <el-button
                      v-if="isLongText(selectedSnapshot?.sessionMemory)"
                      size="small"
                      text
                      type="primary"
                      @click="openEvidenceViewer('sessionMemory', selectedSnapshot?.sessionMemory)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="recallEvidence">
                    <div class="ellipsis-text">{{ shortText(selectedSnapshot?.recallEvidence) }}</div>
                    <el-button
                      v-if="isLongText(selectedSnapshot?.recallEvidence)"
                      size="small"
                      text
                      type="primary"
                      @click="openEvidenceViewer('recallEvidence', selectedSnapshot?.recallEvidence)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="replanHistory">
                    <div class="ellipsis-text">{{ shortText(selectedSnapshot?.replanHistory) }}</div>
                    <el-button
                      v-if="isLongText(selectedSnapshot?.replanHistory)"
                      size="small"
                      text
                      type="primary"
                      @click="openEvidenceViewer('replanHistory', selectedSnapshot?.replanHistory)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">上下文片段</div>
                </template>
                <p class="evidence-field-hint">
                  以下为运行时上下文的观测摘要（STATE_PATCH 预览或快照回退解析）。节点「完整 Prompt」以各节点
                  LLM_REQUEST 的 promptFull 为准，长度受服务端 devTracePromptFullMaxChars 限制。
                </p>
                <el-descriptions :column="1" border>
                  <el-descriptions-item
                    v-if="selectedSnapshot?.schemaSnippetProvenance && selectedSnapshot.schemaSnippetProvenance !== 'NOT_AVAILABLE'"
                    label="schemaSnippet来源"
                  >
                    {{ selectedSnapshot.schemaSnippetProvenance }}
                  </el-descriptions-item>
                  <el-descriptions-item label="schemaSnippet">
                    <div class="ellipsis-text">{{ shortText(selectedSnapshot?.schemaSnippet) }}</div>
                    <el-button
                      v-if="isLongText(selectedSnapshot?.schemaSnippet)"
                      size="small"
                      text
                      type="primary"
                      @click="openEvidenceViewer('schemaSnippet', selectedSnapshot?.schemaSnippet)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="fewShotSnippet">
                    <div class="ellipsis-text">{{ shortText(selectedSnapshot?.fewShotSnippet) }}</div>
                    <el-button
                      v-if="isLongText(selectedSnapshot?.fewShotSnippet)"
                      size="small"
                      text
                      type="primary"
                      @click="openEvidenceViewer('fewShotSnippet', selectedSnapshot?.fewShotSnippet)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">节点证据</div>
                </template>
                <el-table
                  :data="snapshotNodeRows"
                  stripe
                  size="small"
                  empty-text="暂无节点证据"
                >
                  <el-table-column prop="nodeName" label="节点" min-width="180" show-overflow-tooltip />
                  <el-table-column label="inputState" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                      <div class="ellipsis-text">{{ shortText(row.inputState) }}</div>
                      <el-button
                        v-if="isLongText(row.inputState)"
                        size="small"
                        text
                        type="primary"
                        @click="openNodeStateViewer(row.nodeName, 'inputState', row.inputState)"
                      >
                        查看全文
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column label="outputState" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                      <div class="ellipsis-text">{{ shortText(row.outputState) }}</div>
                      <el-button
                        v-if="isLongText(row.outputState)"
                        size="small"
                        text
                        type="primary"
                        @click="openNodeStateViewer(row.nodeName, 'outputState', row.outputState)"
                      >
                        查看全文
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column label="promptTemplate" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                      {{ row.promptTemplate }}
                    </template>
                  </el-table-column>
                  <el-table-column label="llmInput" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                      <div class="ellipsis-text">{{ shortText(row.llmInput) }}</div>
                      <el-button
                        v-if="isLongText(row.llmInput)"
                        size="small"
                        text
                        type="primary"
                        @click="openTextViewer(`${row.nodeName} llmInput（全文，受 trace 落库上限）`, row.llmInput)"
                      >
                        查看全文
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column label="llmOutput" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                      <div class="ellipsis-text">{{ shortText(row.llmOutput) }}</div>
                      <el-button
                        v-if="isLongText(row.llmOutput)"
                        size="small"
                        text
                        type="primary"
                        @click="openTextViewer(`${row.nodeName} llmOutput（全文，受 trace 落库上限）`, row.llmOutput)"
                      >
                        查看全文
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column label="duration" width="110">
                    <template #default="{ row }">{{ row.durationMs >= 0 ? `${row.durationMs} ms` : '—' }}</template>
                  </el-table-column>
                  <el-table-column label="retry" width="90">
                    <template #default="{ row }">{{ row.retryCount >= 0 ? row.retryCount : '—' }}</template>
                  </el-table-column>
                  <el-table-column label="error" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                      <span>{{ shortText(row.errorStack) }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </div>
          </el-tab-pane>



          <el-tab-pane label="决策 / 执行" name="decision" lazy>
            <div v-loading="detailLoading" class="detail-body">
              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">计划</div>
                </template>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="action_type">
                    <el-tag size="small" type="info">{{ decisionData.plan.actionType || '—' }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="risk_level">
                    <el-tag size="small" :type="riskTagType(decisionData.plan.riskLevel)">{{ decisionData.plan.riskLevel || '—' }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="optimization_content" :span="2">
                    <div class="ellipsis-text">{{ shortText(decisionData.plan.optimizationContent) }}</div>
                    <el-button
                      v-if="isLongText(decisionData.plan.optimizationContent)"
                      size="small"
                      text
                      type="primary"
                      @click="openDecisionOptimizationContentViewer"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">动作执行</div>
                </template>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="executeStatus">
                    <el-tag size="small" :type="executeStatusTagType(decisionData.action.executeStatus)">
                      {{ decisionData.action.executeStatus || '—' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="versionId">{{ decisionData.action.versionId || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="errorMessage" :span="2">
                    {{ decisionData.action.errorMessage || '—' }}
                  </el-descriptions-item>
                </el-descriptions>
                <p class="evidence-field-hint">
                  详细的 before / after 配置变更与回滚/验证操作，见下方「版本详情」卡。
                </p>
              </el-card>

              <el-card shadow="never" class="evidence-card version-detail-card">
                <template #header>
                  <div class="evidence-head">
                    <span>版本详情</span>
                    <span v-if="versionDetail?.versionId" class="version-detail-id">versionId: {{ versionDetail.versionId }}</span>
                  </div>
                </template>
                <el-empty
                  v-if="!decisionData.action.versionId"
                  description="该任务暂未生成优化版本（动作未执行或失败）"
                />
                <div v-else v-loading="versionDetailLoading">
                  <el-empty v-if="!versionDetail" description="未找到版本详情，可能已被清理" />
                  <template v-else>
                    <el-descriptions :column="3" border size="small" class="version-meta-desc">
                      <el-descriptions-item label="actionType">
                        <el-tag size="small" type="info">{{ versionDetail.actionType || '—' }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="riskLevel">
                        <el-tag size="small" :type="riskTagType(versionDetail.riskLevel)">{{ versionDetail.riskLevel || '—' }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="executeStatus">
                        <el-tag size="small" :type="executeStatusTagType(versionDetail.executeStatus)">{{ versionDetail.executeStatus || '—' }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="verifyStatus">
                        <el-tag size="small" :type="verifyStatusTagType(versionDetail.verifyStatus)">{{ versionDetail.verifyStatus || '—' }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="rollbackable">
                        <el-tag size="small" :type="versionDetail.rollbackable === false ? 'info' : 'warning'">
                          {{ versionDetail.rollbackable === false ? '否' : '是' }}
                        </el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="rollbackTime">{{ formatTime(versionDetail.rollbackTime) }}</el-descriptions-item>
                      <el-descriptions-item label="createTime">{{ formatTime(versionDetail.createTime) }}</el-descriptions-item>
                      <el-descriptions-item label="updateTime">{{ formatTime(versionDetail.updateTime) }}</el-descriptions-item>
                      <el-descriptions-item label="rollbackReason">{{ versionDetail.rollbackReason || '—' }}</el-descriptions-item>
                    </el-descriptions>

                    <div class="version-config-grid">
                      <div class="version-config-col">
                        <div class="version-config-head">
                          <span class="version-config-title">before_config</span>
                          <el-button size="small" text type="primary" @click="copyConfigJson(versionDetail.beforeConfig, 'before_config')">复制</el-button>
                        </div>
                        <el-input
                          :model-value="formatConfigJson(versionDetail.beforeConfig)"
                          type="textarea"
                          readonly
                          :autosize="{ minRows: 10, maxRows: 24 }"
                        />
                      </div>
                      <div class="version-config-col">
                        <div class="version-config-head">
                          <span class="version-config-title">after_config</span>
                          <el-button size="small" text type="primary" @click="copyConfigJson(versionDetail.afterConfig, 'after_config')">复制</el-button>
                        </div>
                        <el-input
                          :model-value="formatConfigJson(versionDetail.afterConfig)"
                          type="textarea"
                          readonly
                          :autosize="{ minRows: 10, maxRows: 24 }"
                        />
                      </div>
                    </div>

                    <div class="version-actions">
                      <el-button size="small" @click="openTextViewer('版本完整 JSON', JSON.stringify(versionDetail, null, 2))">
                        查看完整 JSON
                      </el-button>
                      <el-button
                        size="small"
                        type="primary"
                        plain
                        :loading="versionVerifyLoading"
                        :disabled="!versionDetail?.versionId || versionVerifyLoading"
                        @click="triggerVersionVerify(versionDetail.versionId)"
                      >
                        触发验证
                      </el-button>
                      <el-button
                        size="small"
                        type="warning"
                        plain
                        :loading="rollbackLoading"
                        :disabled="!versionDetail?.versionId || rollbackLoading || versionDetail?.rollbackable === false"
                        @click="triggerVersionRollback(versionDetail.versionId)"
                      >
                        回滚
                      </el-button>
                      <span v-if="versionDetail?.rollbackable === false" class="version-actions-hint">
                        当前版本已不可回滚（已回滚或失败）
                      </span>
                    </div>
                  </template>
                </div>
              </el-card>

              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">验证结果</div>
                </template>
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="verifyStatus">
                    <el-tag size="small" :type="verifyStatusTagType(decisionData.verify.verifyStatus)">
                      {{ decisionData.verify.verifyStatus || '—' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="passRate">{{ passRateText(decisionData.verify.passRate) }}</el-descriptions-item>
                  <el-descriptions-item label="totalCount">{{ decisionData.verify.totalCount >= 0 ? decisionData.verify.totalCount : '—' }}</el-descriptions-item>
                  <el-descriptions-item label="totalPlanned">{{ verifyCountOrDash(decisionData.verify.totalPlanned) }}</el-descriptions-item>
                  <el-descriptions-item label="totalExecuted">{{ verifyCountOrDash(decisionData.verify.totalExecuted) }}</el-descriptions-item>
                  <el-descriptions-item label="stage1 / 2 / 3 计划数">
                    {{ verifyCountOrDash(decisionData.verify.stage1Count) }} /
                    {{ verifyCountOrDash(decisionData.verify.stage2Count) }} /
                    {{ verifyCountOrDash(decisionData.verify.stage3Count) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="failedCaseList" :span="3">
                    <div class="ellipsis-text">{{ shortText(decisionData.verify.failedCaseList) }}</div>
                    <el-button
                      v-if="isLongText(decisionData.verify.failedCaseList)"
                      size="small"
                      text
                      type="primary"
                      @click="openTextViewer('失败样例', decisionData.verify.failedCaseList)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="errorMessage" :span="3">
                    {{ decisionData.verify.errorMessage || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="decisionData.verify.factConsistencyCheck" label="事实一致性" :span="3">
                    <el-tag size="small" :type="decisionData.verify.factConsistencyCheck.consistencyPass ? 'success' : 'danger'">
                      {{ decisionData.verify.factConsistencyCheck.consistencyPass ? 'PASS' : 'FAIL' }}
                    </el-tag>
                    <span class="snapshot-meta-inline">
                      期望行数 {{ decisionData.verify.factConsistencyCheck.expectedCount ?? '—' }} /
                      实际 {{ decisionData.verify.factConsistencyCheck.actualCount ?? '—' }}
                    </span>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      @click="openTextViewer('factConsistencyCheck', formatJson(decisionData.verify.factConsistencyCheck))"
                    >
                      详情 JSON
                    </el-button>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>

              <el-card shadow="never" class="evidence-card">
                <template #header>
                  <div class="evidence-head">知识沉淀摘要</div>
                </template>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="knowledgeId">
                    <span class="mono-clip-inline">{{ decisionData.knowledge.knowledgeId || '—' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="vectorType">{{ decisionData.knowledge.vectorType || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="rootCause 预览">
                    <div class="ellipsis-text">{{ shortText(decisionData.knowledge.rootCausePreview, 400) }}</div>
                    <el-button
                      v-if="isLongText(decisionData.knowledge.rootCausePreview, 400)"
                      size="small"
                      text
                      type="primary"
                      @click="openTextViewer('rootCause 预览', decisionData.knowledge.rootCausePreview)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="plan 预览">
                    <div class="ellipsis-text">{{ shortText(decisionData.knowledge.planPreview, 400) }}</div>
                    <el-button
                      v-if="isLongText(decisionData.knowledge.planPreview, 400)"
                      size="small"
                      text
                      type="primary"
                      @click="openTextViewer('plan 预览', decisionData.knowledge.planPreview)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="verification 预览">
                    <div class="ellipsis-text">{{ shortText(decisionData.knowledge.verificationPreview, 400) }}</div>
                    <el-button
                      v-if="isLongText(decisionData.knowledge.verificationPreview, 400)"
                      size="small"
                      text
                      type="primary"
                      @click="openTextViewer('verification 预览', decisionData.knowledge.verificationPreview)"
                    >
                      查看全文
                    </el-button>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </div>
          </el-tab-pane>


          <el-tab-pane label="观测" name="observe" lazy>
            <div v-loading="detailLoading" class="detail-body detail-body--nested-tabs">
              <el-tabs v-model="detailObserveSubTab" class="observe-sub-tabs">
                <el-tab-pane label="事件流" name="events" lazy>
                  <el-empty v-if="!sortedEvents.length" description="暂无事件" />
                  <ol v-else class="timeline">
                    <li
                      v-for="(block, index) in timelineBlocks"
                      :key="blockTimelineKey(block, index)"
                      class="timeline-item"
                      :class="{ 'timeline-item--cluster': block.kind === 'node-run' }"
                    >
                      <section v-if="block.kind === 'node-run'" class="ev-cluster">
                        <header class="ev-cluster-head">
                          <h4>{{ block.nodeId }}</h4>
                          <span>{{ block.complete ? '完整节点事务' : '未闭合节点事务' }}</span>
                        </header>
                        <div class="ev-cluster-stack">
                          <AgentTraceEventCard
                            v-for="(ev, j) in block.events"
                            :key="`${index}-${j}-${ev?.ts}-${ev?.type}`"
                            :ev="ev"
                            variant="nested"
                            :format-time="formatTime"
                            @open-prompt="handleOpenPrompt"
                            @open-response="handleOpenResponse"
                            @open-query-result="handleOpenQueryResult"
                          />
                        </div>
                      </section>
                      <AgentTraceEventCard
                        v-else
                        :ev="block.events[0]"
                        variant="standalone"
                        :format-time="formatTime"
                        @open-prompt="handleOpenPrompt"
                        @open-response="handleOpenResponse"
                        @open-query-result="handleOpenQueryResult"
                      />
                    </li>
                  </ol>
                </el-tab-pane>
                <el-tab-pane label="拓扑" name="topology" lazy>
                  <AgentTraceTopology
                    v-if="layoutNodes.length"
                    :layout-nodes="layoutNodes"
                    :skeleton-edges="skeletonEdges"
                    :trace-id="selectedTask?.selfOptTraceId || ''"
                    :observed-graph-edges="observedGraphEdges"
                    :observed-edge-keys="observedEdgeKeySet"
                    :selected-node-id="''"
                    :node-metrics="topologyNodeMetrics"
                  />
                  <el-empty v-else description="暂无拓扑数据" />
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </section>

    <el-drawer
      v-model="textViewerVisible"
      :title="textViewerTitle"
      size="52%"
      :append-to-body="false"
      destroy-on-close
      :close-on-click-modal="true"
      @closed="onTextViewerClosed"
    >
      <pre class="text-viewer-body">{{ textViewerContent }}</pre>
    </el-drawer>

    <el-dialog v-model="appendFeedbackVisible" title="追加人工反馈" width="520px" destroy-on-close @closed="resetAppendFeedbackForm">
      <el-form label-position="top">
        <el-form-item label="snapshotId">
          <el-input :model-value="selectedTask?.snapshotId || ''" disabled />
        </el-form-item>
        <el-form-item label="feedbackContent" required>
          <el-input v-model.trim="appendFeedbackForm.feedbackContent" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="focusTags">
          <el-select v-model="appendFeedbackForm.focusTags" multiple collapse-tags placeholder="可选">
            <el-option label="ROOT_CAUSE" value="ROOT_CAUSE" />
            <el-option label="PLAN_GENERATION" value="PLAN_GENERATION" />
            <el-option label="MQL_EXECUTE" value="MQL_EXECUTE" />
          </el-select>
        </el-form-item>
        <el-form-item label="operator">
          <el-input v-model.trim="appendFeedbackForm.operator" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appendFeedbackVisible = false">取消</el-button>
        <el-button type="primary" :loading="appendFeedbackLoading" @click="submitAppendFeedback">提交</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Clock, Delete, Loading, Operation, RefreshRight, VideoPlay } from '@element-plus/icons-vue'
import AgentTraceEventCard from './AgentTraceEventCard.vue'
import AgentTraceTopology from './AgentTraceTopology.vue'
import { buildTimelineBlocks } from './agent-trace-timeline-groups.js'
import {
  buildNodeMetricsFromEvents,
  edgeKey,
  extractGraphEdgesFromTrace,
  layoutGraphLr,
  resolveCanonicalEndId
} from './agent-trace-topology-layout.js'
import {
  appendSnapshotHumanFeedback,
  buildDebugSnapshot,
  deleteAgentBadCase,
  deleteSelfOptimizeTask,
  executeOptimizationAction,
  getAgentMongoQueryResult,
  getOptimizationVersion,
  getSelfOptimizeSnapshot,
  getSelfOptimizeTask,
  getSelfOptimizeTaskEvents,
  getSelfOptimizeGraphSkeleton,
  listAgentBadCases,
  listOptimizationVersions,
  listSelfOptimizeTasks,
  rollbackOptimizationVersion,
  runPendingSelfOptimizeTasks,
  runSelfOptimizeTask,
  verifyOptimizationVersion
} from '@/services/agent-management.service.js'
import { normalizeTaskStatus, stageTagType, statusPillClass } from './selfopt-status-present.js'

const traceId = ref('')
const taskId = ref('')
const buildOptionsCollapse = ref([])
const buildForm = reactive({
  qualityEnabled: false,
  issueType: '',
  expectedResult: '',
  expectedCount: '',
  involvedCollectionsStr: '',
  markOperator: '',
  feedbackEnabled: false,
  feedbackContent: '',
  feedbackFocusTags: [],
  feedbackOperator: ''
})
const appendFeedbackVisible = ref(false)
const appendFeedbackLoading = ref(false)
const appendFeedbackForm = reactive({
  feedbackContent: '',
  focusTags: [],
  operator: ''
})
const buildLoading = ref(false)
const pendingLoading = ref(false)
const taskListLoading = ref(false)
const localExecutionMap = ref(new Map())

const runningTaskIdSet = ref(new Set())
const executingTaskIdSet = ref(new Set())

const tasks = ref([])
const taskTotal = ref(0)
const taskPageNum = ref(1)
const taskPageSize = ref(20)
const taskQuery = ref({
  traceId: '',
  statusList: [],
  stage: '',
  timeRange: []
})
const highlightedTaskId = ref('')

const badCases = ref([])
const badListLoading = ref(false)
const badPageNum = ref(1)
const badPageSize = ref(20)
const badTotal = ref(0)
const startLoadingTraceId = ref('')
const deletingBadCaseId = ref('')
const deletingTaskId = ref('')

const detailActiveTab = ref('overview')
const detailLoading = ref(false)
const selectedTaskId = ref('')
const selectedTask = ref(null)
const selectedSnapshot = ref(null)
const selectedEvents = ref([])
const selfOptSkeleton = ref(null)
const textViewerVisible = ref(false)
const textViewerTitle = ref('')
const textViewerContent = ref('')
const rollbackLoading = ref(false)

const versionDetail = ref(null)
const versionDetailLoading = ref(false)
const versionVerifyLoading = ref(false)

const versions = ref([])
const versionsLoading = ref(false)
const versionTotal = ref(0)
const versionPageNum = ref(1)
const versionPageSize = ref(20)
const versionQuery = ref({
  taskId: '',
  actionType: '',
  executeStatus: '',
  verifyStatus: '',
  timeRange: []
})
const versionCollapseActive = ref([])
const badCaseCollapseActive = ref([])
const taskAdvancedFilterOpen = ref(false)
const detailObserveSubTab = ref('events')
const snapshotExtraCollapse = ref([])

const sortedEvents = computed(() => {
  const list = Array.isArray(selectedEvents.value) ? [...selectedEvents.value] : []
  list.sort((a, b) => Number(a?.ts || 0) - Number(b?.ts || 0))
  return list
})
const timelineBlocks = computed(() => buildTimelineBlocks(sortedEvents.value))
const skeletonNodes = computed(() => (Array.isArray(selfOptSkeleton.value?.nodes) ? selfOptSkeleton.value.nodes : []))
const skeletonEdges = computed(() => (Array.isArray(selfOptSkeleton.value?.edges) ? selfOptSkeleton.value.edges : []))
const layoutNodes = computed(() => {
  if (!skeletonNodes.value.length) return []
  return layoutGraphLr(skeletonNodes.value, skeletonEdges.value)
})
const canonicalEndId = computed(() => resolveCanonicalEndId(skeletonNodes.value))
const observedGraphEdges = computed(() => extractGraphEdgesFromTrace(sortedEvents.value, canonicalEndId.value))
const observedEdgeKeySet = computed(() => {
  const set = new Set()
  for (const ge of observedGraphEdges.value) {
    set.add(edgeKey(ge.from, ge.to))
  }
  return set
})
const topologyNodeMetrics = computed(() => buildNodeMetricsFromEvents(sortedEvents.value))
const snapshotNodeRows = computed(() => {
  const list = Array.isArray(selectedSnapshot.value?.nodeSnapshots) ? selectedSnapshot.value.nodeSnapshots : []
  return list.map((x) => ({
    nodeName: String(x?.nodeName || '—'),
    inputState: String(x?.inputState || '—'),
    outputState: String(x?.outputState || '—'),
    promptTemplate: String(x?.promptTemplate || '—'),
    llmInput: String(x?.llmInput || '—'),
    llmOutput: String(x?.llmOutput || '—'),
    durationMs: Number(x?.executeInfo?.durationMs ?? -1),
    retryCount: Number(x?.executeInfo?.retryCount ?? -1),
    errorStack: String(x?.executeInfo?.errorStack || '—')
  }))
})
const humanFeedbackEntries = computed(() => {
  const list = selectedSnapshot.value?.humanFeedbackHistory
  return Array.isArray(list) ? list : []
})
const decisionData = computed(() => {
  return extractDecisionDataFromEvents(sortedEvents.value)
})
const selectedTaskExecutionGuard = computed(() => resolveExecutionGuardFromDecision(decisionData.value))
const canExecuteCurrentInputTask = computed(() => {
  const id = String(taskId.value || '').trim()
  if (!id) return false
  if (isTaskExecuting(id)) return false
  if (selectedTaskId.value === id) return selectedTaskExecutionGuard.value.allowed
  return true
})
const inputExecuteDisabledReason = computed(() => {
  const id = String(taskId.value || '').trim()
  if (!id) return ''
  if (selectedTaskId.value !== id) return ''
  return selectedTaskExecutionGuard.value.allowed ? '' : '需人工审核'
})

function blockTimelineKey(block, idx) {
  if (block.kind === 'node-run') {
    return `run-${block.nodeId}-${idx}-${block.events[0]?.ts}`
  }
  return `one-${idx}-${block.events[0]?.ts}-${block.events[0]?.type}`
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function passRateText(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function riskTagType(risk) {
  const value = String(risk || '').toUpperCase()
  if (value === 'LOW') return 'success'
  if (value === 'MEDIUM') return 'warning'
  if (value === 'HIGH') return 'danger'
  return 'info'
}

function executeStatusTagType(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'SUCCESS') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'EXECUTING') return 'warning'
  return 'info'
}

function verifyStatusTagType(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'PASS') return 'success'
  if (value === 'FAIL') return 'danger'
  return 'info'
}

function asObj(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw
}

function readAny(obj, keys, fallback = '') {
  const source = asObj(obj)
  for (const key of keys) {
    const v = source[key]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return fallback
}

function verifyCountOrDash(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return '—'
  return String(n)
}

function extractDecisionDataFromEvents(events) {
  const defaultData = {
    plan: { actionType: '', riskLevel: '', executeWay: '', optimizationContent: '' },
    action: { executeStatus: '', versionId: '', errorMessage: '' },
    verify: {
      verifyStatus: '',
      passRate: -1,
      totalCount: -1,
      errorMessage: '',
      failedCaseList: '',
      totalPlanned: -1,
      totalExecuted: -1,
      stage1Count: -1,
      stage2Count: -1,
      stage3Count: -1,
      factConsistencyCheck: null
    },
    knowledge: {
      knowledgeId: '',
      vectorType: '',
      rootCausePreview: '',
      planPreview: '',
      verificationPreview: ''
    }
  }
  const list = Array.isArray(events) ? events : []
  const llmPlan = extractPlanFromLlmResponse(list)
  const merged = {
    plan: { ...defaultData.plan },
    action: { ...defaultData.action },
    verify: { ...defaultData.verify },
    knowledge: { ...defaultData.knowledge }
  }
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i]
    if (String(ev?.type || '') !== 'STATE_PATCH') continue
    const payload = asObj(ev?.payload)
    const summary = asObj(payload?.selfoptSummary)
    const plan = asObj(summary?.optimizationPlan)
    const action = asObj(summary?.actionExecuteResult)
    const verify = asObj(summary?.verificationResult)
    const kprec = asObj(summary?.knowledgePrecipitation)
    if (Object.keys(plan).length) {
      if (!merged.plan.actionType) {
        merged.plan.actionType = String(readAny(plan, ['actionType', 'action_type', 'optimizationType', 'optimization_type'])).trim()
      }
      if (!merged.plan.riskLevel) {
        merged.plan.riskLevel = String(readAny(plan, ['riskLevel', 'risk_level'])).trim()
      }
      if (!merged.plan.executeWay) {
        merged.plan.executeWay = String(readAny(plan, ['executeWay', 'execute_way'])).trim()
      }
      if (!merged.plan.optimizationContent) {
        merged.plan.optimizationContent = String(readAny(plan, ['optimizationContent', 'optimization_content'])).trim()
      }
    }
    if (Object.keys(action).length) {
      if (!merged.action.executeStatus) {
        merged.action.executeStatus = String(readAny(action, ['executeStatus', 'execute_status'])).trim()
      }
      if (!merged.action.versionId) {
        merged.action.versionId = String(readAny(action, ['versionId', 'version_id'])).trim()
      }
      if (!merged.action.errorMessage) {
        merged.action.errorMessage = String(readAny(action, ['errorMessage', 'error_message'])).trim()
      }
    }
    if (Object.keys(verify).length) {
      if (!merged.verify.verifyStatus) {
        merged.verify.verifyStatus = String(readAny(verify, ['verifyStatus', 'verify_status'])).trim()
      }
      if (!(Number.isFinite(merged.verify.passRate) && merged.verify.passRate >= 0)) {
        merged.verify.passRate = Number(readAny(verify, ['passRate', 'pass_rate'], -1))
      }
      if (!(Number.isFinite(merged.verify.totalCount) && merged.verify.totalCount >= 0)) {
        merged.verify.totalCount = Number(readAny(verify, ['totalCount', 'total_count'], -1))
      }
      if (!merged.verify.errorMessage) {
        merged.verify.errorMessage = String(readAny(verify, ['errorMessage', 'error_message'])).trim()
      }
      if (!merged.verify.failedCaseList) {
        merged.verify.failedCaseList = String(readAny(verify, ['failedCaseList', 'failed_case_list'])).trim()
      }
      if (!(Number.isFinite(merged.verify.totalPlanned) && merged.verify.totalPlanned >= 0)) {
        const tp = Number(readAny(verify, ['totalPlanned', 'total_planned'], -1))
        if (Number.isFinite(tp) && tp >= 0) merged.verify.totalPlanned = tp
      }
      if (!(Number.isFinite(merged.verify.totalExecuted) && merged.verify.totalExecuted >= 0)) {
        const te = Number(readAny(verify, ['totalExecuted', 'total_executed'], -1))
        if (Number.isFinite(te) && te >= 0) merged.verify.totalExecuted = te
      }
      if (!(Number.isFinite(merged.verify.stage1Count) && merged.verify.stage1Count >= 0)) {
        const s1 = Number(readAny(verify, ['stage1Count', 'stage1_count'], -1))
        if (Number.isFinite(s1) && s1 >= 0) merged.verify.stage1Count = s1
      }
      if (!(Number.isFinite(merged.verify.stage2Count) && merged.verify.stage2Count >= 0)) {
        const s2 = Number(readAny(verify, ['stage2Count', 'stage2_count'], -1))
        if (Number.isFinite(s2) && s2 >= 0) merged.verify.stage2Count = s2
      }
      if (!(Number.isFinite(merged.verify.stage3Count) && merged.verify.stage3Count >= 0)) {
        const s3 = Number(readAny(verify, ['stage3Count', 'stage3_count'], -1))
        if (Number.isFinite(s3) && s3 >= 0) merged.verify.stage3Count = s3
      }
      if (!merged.verify.factConsistencyCheck) {
        const fc = verify.factConsistencyCheck ?? verify.fact_consistency_check
        if (fc && typeof fc === 'object') {
          merged.verify.factConsistencyCheck = fc
        }
      }
    }
    if (Object.keys(kprec).length) {
      if (!merged.knowledge.knowledgeId) {
        merged.knowledge.knowledgeId = String(readAny(kprec, ['knowledgeId', 'knowledge_id'])).trim()
      }
      if (!merged.knowledge.vectorType) {
        merged.knowledge.vectorType = String(readAny(kprec, ['vectorType', 'vector_type'])).trim()
      }
      if (!merged.knowledge.rootCausePreview) {
        merged.knowledge.rootCausePreview = String(readAny(kprec, ['rootCausePreview', 'root_cause_preview'])).trim()
      }
      if (!merged.knowledge.planPreview) {
        merged.knowledge.planPreview = String(readAny(kprec, ['planPreview', 'plan_preview'])).trim()
      }
      if (!merged.knowledge.verificationPreview) {
        merged.knowledge.verificationPreview = String(readAny(kprec, [
          'verificationPreview',
          'verification_preview'
        ])).trim()
      }
    }
  }
  if (!merged.plan.riskLevel) merged.plan.riskLevel = llmPlan.riskLevel
  if (!merged.plan.executeWay) merged.plan.executeWay = llmPlan.executeWay
  if (!merged.plan.optimizationContent) merged.plan.optimizationContent = llmPlan.optimizationContent
  if (merged.plan.actionType || merged.plan.riskLevel || merged.plan.executeWay || merged.plan.optimizationContent
    || merged.action.executeStatus || merged.action.versionId || merged.action.errorMessage
    || merged.verify.verifyStatus || (Number.isFinite(merged.verify.passRate) && merged.verify.passRate >= 0)
    || (Number.isFinite(merged.verify.totalCount) && merged.verify.totalCount >= 0)
    || merged.verify.errorMessage || merged.verify.failedCaseList
    || (Number.isFinite(merged.verify.totalPlanned) && merged.verify.totalPlanned >= 0)
    || (Number.isFinite(merged.verify.totalExecuted) && merged.verify.totalExecuted >= 0)
    || (Number.isFinite(merged.verify.stage1Count) && merged.verify.stage1Count >= 0)
    || (Number.isFinite(merged.verify.stage2Count) && merged.verify.stage2Count >= 0)
    || (Number.isFinite(merged.verify.stage3Count) && merged.verify.stage3Count >= 0)
    || merged.verify.factConsistencyCheck
    || merged.knowledge.knowledgeId || merged.knowledge.vectorType
    || merged.knowledge.rootCausePreview || merged.knowledge.planPreview || merged.knowledge.verificationPreview) {
    return merged
  }
  return defaultData
}

function extractPlanFromLlmResponse(events) {
  const list = Array.isArray(events) ? events : []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i]
    if (String(ev?.type || '') !== 'LLM_RESPONSE') continue
    if (!String(ev?.source || '').includes('optimization_plan_generate')) continue
    const raw = String(ev?.payload?.responseFull || '').trim()
    if (!raw) continue
    const jsonText = firstJsonObject(raw)
    if (!jsonText) continue
    try {
      const parsed = JSON.parse(jsonText)
      return {
        riskLevel: String(parsed?.risk_level || parsed?.riskLevel || '').trim(),
        executeWay: String(parsed?.execute_way || parsed?.executeWay || '').trim(),
        optimizationContent: String(parsed?.optimization_content || parsed?.optimizationContent || '').trim()
      }
    } catch {
      // ignore parse error
    }
  }
  return { riskLevel: '', executeWay: '', optimizationContent: '' }
}

function firstJsonObject(text) {
  const raw = String(text || '')
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  return raw.slice(start, end + 1)
}

function normalizePlanRisk(riskLevel) {
  const value = String(riskLevel || '').trim().toUpperCase()
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH') return value
  return ''
}

function normalizePlanExecuteWay(executeWay) {
  const value = String(executeWay || '').trim().toUpperCase()
  if (!value) return ''
  if (value === 'AUTO_EXECUTE' || value === 'AUTOMATIC') return 'AUTO'
  return value
}

function resolveExecutionGuardFromDecision(decision) {
  const risk = normalizePlanRisk(decision?.plan?.riskLevel)
  const executeWay = normalizePlanExecuteWay(decision?.plan?.executeWay)
  if (risk && risk !== 'LOW') {
    return { allowed: false, reason: `该优化计划风险等级为${risk}，需要人工审核，无法自动执行` }
  }
  if (executeWay && executeWay !== 'AUTO') {
    return { allowed: false, reason: '该优化计划需要人工审核，无法自动执行' }
  }
  if (!risk || !executeWay) {
    return { allowed: false, reason: '该优化计划信息不完整，需要人工审核' }
  }
  return { allowed: true, reason: '' }
}

async function ensureTaskExecutionAllowed(taskIdValue) {
  const id = String(taskIdValue || '').trim()
  if (!id) return { allowed: false, reason: '请先输入 taskId' }
  if (selectedTaskId.value === id) {
    return selectedTaskExecutionGuard.value
  }
  const events = await getSelfOptimizeTaskEvents(id)
  const guard = resolveExecutionGuardFromDecision(extractDecisionDataFromEvents(events))
  return guard
}

function shortText(text, max = 200) {
  const raw = String(text || '').trim()
  if (!raw) return '—'
  if (raw.length <= max) return raw
  return `${raw.slice(0, max)}...`
}

function isLongText(text, max = 200) {
  return String(text || '').trim().length > max
}

function tryFormatJsonText(text) {
  const raw = String(text || '').trim()
  if (!raw) return '—'
  try {
    const parsed = JSON.parse(raw)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

function beautifyText(text) {
  const raw = String(text || '').trim()
  if (!raw) return '—'
  return raw
    .replace(/\s+\|\s+/g, '\n- ')
    .replace(/；/g, '；\n')
    .replace(/。/g, '。\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function openTextViewer(title, content) {
  textViewerTitle.value = String(title || '详情')
  textViewerContent.value = beautifyText(tryFormatJsonText(content))
  textViewerVisible.value = true
}

function getLatestEventBy(type, predicate) {
  for (let i = sortedEvents.value.length - 1; i >= 0; i -= 1) {
    const ev = sortedEvents.value[i]
    if (String(ev?.type || '') !== type) continue
    if (!predicate || predicate(ev)) return ev
  }
  return null
}

function readStatePatchKeyPreview(key) {
  const ev = getLatestEventBy('STATE_PATCH', (x) => x?.payload?.keys?.[key]?.preview != null)
  const preview = ev?.payload?.keys?.[key]?.preview
  return String(preview || '').trim()
}

function resolveOptimizationContentFull() {
  const llmResponse = getLatestEventBy('LLM_RESPONSE', (x) =>
    String(x?.source || '').includes('optimization_plan_generate')
  )
  const responseFull = String(llmResponse?.payload?.responseFull || '').trim()
  if (responseFull) return responseFull
  return decisionData.value.plan.optimizationContent || ''
}

function resolveRecallEvidenceFull() {
  const facets = ['rag_recall', 'few_shot_recall', 'schema_rough']
  const lines = []
  for (const facet of facets) {
    const ev = getLatestEventBy('TRACE_BAG', (x) => String(x?.payload?.facet || '') === facet)
    if (!ev) continue
    lines.push(`${facet}: ${JSON.stringify(ev?.payload?.kv || {}, null, 2)}`)
  }
  if (lines.length) return lines.join('\n\n')
  return String(selectedSnapshot.value?.recallEvidence || '')
}

function openDecisionOptimizationContentViewer() {
  openTextViewer('优化计划内容', resolveOptimizationContentFull())
}

function openEvidenceViewer(field, fallbackValue) {
  if (field === 'sessionMemory') {
    const canonical = readStatePatchKeyPreview('canonical_query')
    const enhanced = readStatePatchKeyPreview('query_enhance_output')
    const full = canonical || enhanced ? `canonicalQuery: ${canonical}\n\nenhancedQuery: ${enhanced}` : fallbackValue
    openTextViewer('sessionMemory', full)
    return
  }
  if (field === 'schemaSnippet') {
    const snap = String(selectedSnapshot.value?.schemaSnippet || '').trim()
    const prov = String(selectedSnapshot.value?.schemaSnippetProvenance || '').trim()
    const fromState = readStatePatchKeyPreview('schema_snippet')
    const body = snap || fromState || String(fallbackValue || '').trim()
    const head =
      prov && prov !== 'NOT_AVAILABLE' ? `【schemaSnippet 来源：${prov}】\n\n` : ''
    openTextViewer('schemaSnippet', head + body)
    return
  }
  if (field === 'fewShotSnippet') {
    const snap = String(selectedSnapshot.value?.fewShotSnippet || '').trim()
    const fromState = readStatePatchKeyPreview('few_shot_snippet')
    openTextViewer('fewShotSnippet', snap || fromState || String(fallbackValue || '').trim())
    return
  }
  if (field === 'replanHistory') {
    openTextViewer('replanHistory', readStatePatchKeyPreview('plan_replan_reason_code') || fallbackValue)
    return
  }
  if (field === 'recallEvidence') {
    openTextViewer('recallEvidence', resolveRecallEvidenceFull())
    return
  }
  openTextViewer(field, fallbackValue)
}

function openNodeStateViewer(nodeName, kind, fallbackValue) {
  const ev = getLatestEventBy('STATE_PATCH', (x) => String(x?.payload?.nodeId || '') === String(nodeName || ''))
  const payload = ev?.payload || {}
  const resolved = kind === 'inputState'
    ? JSON.stringify(payload?.keys || {}, null, 2)
    : JSON.stringify(payload?.selfoptSummary || payload || {}, null, 2)
  const text = resolved && resolved !== '{}' ? resolved : fallbackValue
  openTextViewer(`${nodeName} ${kind}`, text)
}

function handleOpenPrompt(ev) {
  openTextViewer('提示词全文', ev?.payload?.promptFull || ev?.payload?.promptPreview || '')
}

function handleOpenResponse(ev) {
  openTextViewer('响应全文', ev?.payload?.responseFull || ev?.payload?.responsePreview || '')
}

async function handleOpenQueryResult(ev) {
  const id = String(ev?.payload?.detail?.queryResultId || '').trim()
  if (!id) {
    ElMessage.warning('当前事件无 queryResultId')
    return
  }
  try {
    const data = await getAgentMongoQueryResult(id)
    openTextViewer('查询结果', JSON.stringify(data || {}, null, 2))
  } catch (e) {
    ElMessage.error(e?.message || '加载查询结果失败')
  }
}

function formatConfigJson(value) {
  if (value === null || value === undefined) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

async function copyConfigJson(value, label) {
  const text = formatConfigJson(value)
  if (!text || text === '—') {
    ElMessage.info(`${label} 为空`)
    return
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success(`${label} 已复制`)
  } catch {
    ElMessage.error('复制失败，请手动选中复制')
  }
}

async function loadVersionDetail(versionIdValue) {
  const id = String(versionIdValue || '').trim()
  if (!id) {
    versionDetail.value = null
    return
  }
  versionDetailLoading.value = true
  try {
    versionDetail.value = await getOptimizationVersion(id)
  } catch (e) {
    versionDetail.value = null
    ElMessage.error(e?.message || '加载版本详情失败')
  } finally {
    versionDetailLoading.value = false
  }
}

watch(
  () => decisionData.value?.action?.versionId || '',
  (next) => {
    loadVersionDetail(next)
  },
  { immediate: true }
)

async function triggerVersionVerify(versionIdValue) {
  const id = String(versionIdValue || '').trim()
  if (!id) {
    ElMessage.warning('当前无 versionId')
    return
  }
  versionVerifyLoading.value = true
  try {
    const result = await verifyOptimizationVersion(id)
    ElMessage.success(`验证完成：${result?.verifyStatus || 'UNKNOWN'}`)
    await loadVersionDetail(id)
    if (versionCollapseActive.value.includes('versions')) {
      await loadVersions()
    }
  } catch (e) {
    ElMessage.error(e?.message || '验证失败')
  } finally {
    versionVerifyLoading.value = false
  }
}

async function triggerVersionRollback(versionIdValue) {
  const id = String(versionIdValue || '').trim()
  if (!id) {
    ElMessage.warning('当前无 versionId')
    return
  }
  rollbackLoading.value = true
  try {
    const data = await rollbackOptimizationVersion(id)
    if (data?.rollback === true) {
      ElMessage.success('回滚已生效')
    } else {
      ElMessage.warning('回滚未生效，可能版本不存在或已不可回滚')
    }
    await loadVersionDetail(id)
    if (versionCollapseActive.value.includes('versions')) {
      await loadVersions()
    }
  } catch (e) {
    ElMessage.error(e?.message || '回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}

async function loadVersions() {
  versionsLoading.value = true
  try {
    const offset = (versionPageNum.value - 1) * versionPageSize.value
    const startTime = Array.isArray(versionQuery.value.timeRange) ? versionQuery.value.timeRange[0] : ''
    const endTime = Array.isArray(versionQuery.value.timeRange) ? versionQuery.value.timeRange[1] : ''
    const data = await listOptimizationVersions({
      taskId: versionQuery.value.taskId || undefined,
      actionType: versionQuery.value.actionType || undefined,
      executeStatus: versionQuery.value.executeStatus || undefined,
      verifyStatus: versionQuery.value.verifyStatus || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      limit: versionPageSize.value,
      offset
    })
    versions.value = Array.isArray(data?.records) ? data.records : []
    versionTotal.value = Number(data?.total || 0)
  } catch (e) {
    ElMessage.error(e?.message || '加载优化版本列表失败')
  } finally {
    versionsLoading.value = false
  }
}

function applyVersionFilters() {
  versionPageNum.value = 1
  loadVersions()
}

function resetVersionFilters() {
  versionQuery.value = {
    taskId: '',
    actionType: '',
    executeStatus: '',
    verifyStatus: '',
    timeRange: []
  }
  versionPageNum.value = 1
  loadVersions()
}

function onVersionPageSizeChange() {
  versionPageNum.value = 1
  loadVersions()
}

function onVersionCollapseChange(active) {
  versionCollapseActive.value = Array.isArray(active) ? active : [active].filter(Boolean)
  if (versionCollapseActive.value.includes('versions') && !versions.value.length) {
    loadVersions()
  }
}

function openVersionDetailDialog(row) {
  openTextViewer(`版本详情 ${row?.versionId || ''}`, JSON.stringify(row || {}, null, 2))
}

async function quickVerifyVersion(row) {
  const id = String(row?.versionId || '').trim()
  await triggerVersionVerify(id)
}

async function quickRollbackVersion(row) {
  const id = String(row?.versionId || '').trim()
  await triggerVersionRollback(id)
}

function upsertLocalExecution(taskIdValue, record) {
  const key = String(taskIdValue || '').trim()
  if (!key) return
  const next = new Map(localExecutionMap.value)
  next.set(key, {
    ...(next.get(key) || {}),
    ...record
  })
  localExecutionMap.value = next
}

function formatReasonCode(code) {
  const raw = code ? String(code).trim() : ''
  if (!raw) return '—'
  const labelMap = {
    mql_generate_exhausted: '生成重试耗尽（mql_generate_exhausted）',
    graph_stream_failed: '图流执行失败（graph_stream_failed）',
    graph_stream_timeout: '图流执行超时（graph_stream_timeout）'
  }
  return labelMap[raw] || raw
}

function isTaskRunning(id) {
  const key = String(id || '').trim()
  return !!key && runningTaskIdSet.value.has(key)
}

function isTaskExecuting(id) {
  const key = String(id || '').trim()
  return !!key && executingTaskIdSet.value.has(key)
}

function setRunning(id, running) {
  const key = String(id || '').trim()
  if (!key) return
  const next = new Set(runningTaskIdSet.value)
  if (running) next.add(key)
  else next.delete(key)
  runningTaskIdSet.value = next
}

function setExecuting(id, running) {
  const key = String(id || '').trim()
  if (!key) return
  const next = new Set(executingTaskIdSet.value)
  if (running) next.add(key)
  else next.delete(key)
  executingTaskIdSet.value = next
}

async function loadTasks() {
  taskListLoading.value = true
  try {
    const offset = (taskPageNum.value - 1) * taskPageSize.value
    const status = Array.isArray(taskQuery.value.statusList) && taskQuery.value.statusList.length
      ? taskQuery.value.statusList.join(',')
      : ''
    const startTime = Array.isArray(taskQuery.value.timeRange) ? taskQuery.value.timeRange[0] : ''
    const endTime = Array.isArray(taskQuery.value.timeRange) ? taskQuery.value.timeRange[1] : ''
    const data = await listSelfOptimizeTasks({
      traceId: taskQuery.value.traceId || undefined,
      status: status || undefined,
      stage: taskQuery.value.stage || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      limit: taskPageSize.value,
      offset
    })
    tasks.value = Array.isArray(data?.records) ? data.records : []
    taskTotal.value = Number(data?.total || 0)
    if (!selectedTaskId.value && tasks.value.length) {
      selectedTaskId.value = tasks.value[0].taskId
      loadTaskDetail(selectedTaskId.value)
    } else if (selectedTaskId.value && !tasks.value.some((x) => x.taskId === selectedTaskId.value)) {
      selectedTaskId.value = ''
      selectedTask.value = null
      selectedSnapshot.value = null
      selectedEvents.value = []
    }
  } catch (e) {
    ElMessage.error(e?.message || '加载任务失败')
  } finally {
    taskListLoading.value = false
  }
}

function pickNextTaskAfterDelete(removedTaskId) {
  const list = tasks.value
  if (!Array.isArray(list) || !list.length) return ''
  const idx = list.findIndex((x) => x.taskId === removedTaskId)
  if (idx < 0) return list[0]?.taskId || ''
  if (list[idx + 1]?.taskId) return list[idx + 1].taskId
  if (list[idx - 1]?.taskId) return list[idx - 1].taskId
  return ''
}

function applyTaskFilters() {
  taskPageNum.value = 1
  loadTasks()
}

function resetTaskFilters() {
  taskQuery.value = {
    traceId: '',
    statusList: [],
    stage: '',
    timeRange: []
  }
  taskAdvancedFilterOpen.value = false
  taskPageNum.value = 1
  loadTasks()
}

function onHeaderMoreCommand(cmd) {
  if (cmd === 'runPending') {
    void runPending()
  }
}

function onTaskPageSizeChange() {
  taskPageNum.value = 1
  loadTasks()
}

function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function snapshotHasQualityIssue(qi) {
  if (!qi || typeof qi !== 'object') return false
  if (String(qi.issueType || '').trim()) return true
  if (qi.expectedCount != null && String(qi.expectedCount).trim() !== '') return true
  if (String(qi.expectedResult || '').trim()) return true
  return false
}

function buildHumanFeedbackBodyFromBuildForm() {
  if (!buildForm.feedbackEnabled) return null
  const feedbackContent = String(buildForm.feedbackContent || '').trim()
  if (!feedbackContent) return null
  return {
    feedbackContent,
    operator: String(buildForm.feedbackOperator || '').trim() || undefined,
    focusTags:
      Array.isArray(buildForm.feedbackFocusTags) && buildForm.feedbackFocusTags.length
        ? [...buildForm.feedbackFocusTags]
        : undefined
  }
}

function buildSnapshotPayload() {
  const body = {}
  if (buildForm.qualityEnabled) {
    const issueType = String(buildForm.issueType || '').trim()
    if (issueType) {
      const coll = String(buildForm.involvedCollectionsStr || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const ecRaw = String(buildForm.expectedCount || '').trim()
      let expectedCount
      if (ecRaw !== '') {
        const n = Number(ecRaw)
        if (Number.isFinite(n)) expectedCount = n
      }
      body.qualityIssue = {
        issueType,
        markOperator: String(buildForm.markOperator || '').trim() || undefined,
        expectedResult: String(buildForm.expectedResult || '').trim() || undefined,
        expectedCount,
        involvedCollections: coll.length ? coll : undefined
      }
    }
  }
  const hf = buildHumanFeedbackBodyFromBuildForm()
  if (hf) body.humanFeedback = hf
  if (!body.qualityIssue && !body.humanFeedback) return undefined
  return body
}

function openAppendFeedbackDialog() {
  if (!String(selectedTask.value?.snapshotId || '').trim()) {
    ElMessage.warning('请先选择任务（需含 snapshotId）')
    return
  }
  resetAppendFeedbackForm()
  appendFeedbackVisible.value = true
}

function resetAppendFeedbackForm() {
  appendFeedbackForm.feedbackContent = ''
  appendFeedbackForm.focusTags = []
  appendFeedbackForm.operator = ''
}

async function submitAppendFeedback() {
  const sid = String(selectedTask.value?.snapshotId || '').trim()
  const txt = String(appendFeedbackForm.feedbackContent || '').trim()
  if (!sid) {
    ElMessage.warning('无 snapshotId')
    return
  }
  if (!txt) {
    ElMessage.warning('请填写 feedbackContent')
    return
  }
  appendFeedbackLoading.value = true
  try {
    const body = {
      feedbackContent: txt,
      operator: String(appendFeedbackForm.operator || '').trim() || undefined,
      focusTags:
        Array.isArray(appendFeedbackForm.focusTags) && appendFeedbackForm.focusTags.length
          ? [...appendFeedbackForm.focusTags]
          : undefined
    }
    await appendSnapshotHumanFeedback(sid, body)
    ElMessage.success('已追加人工反馈')
    appendFeedbackVisible.value = false
    await loadTaskDetail(selectedTaskId.value)
  } catch (e) {
    ElMessage.error(e?.message || '追加失败')
  } finally {
    appendFeedbackLoading.value = false
  }
}

async function buildSnapshot() {
  const tid = String(traceId.value || '').trim()
  if (!tid) {
    ElMessage.warning('请先输入 traceId')
    return
  }
  if (buildForm.qualityEnabled && !String(buildForm.issueType || '').trim()) {
    ElMessage.warning('启用质量问题时请填写 issueType')
    return
  }
  if (buildForm.feedbackEnabled && !String(buildForm.feedbackContent || '').trim()) {
    ElMessage.warning('启用人工反馈时请填写 feedbackContent')
    return
  }
  buildLoading.value = true
  try {
    const payload = buildSnapshotPayload()
    const data = await buildDebugSnapshot(tid, payload)
    const task = data?.task
    const generatedTaskId = String(task?.taskId || '').trim()
    if (!generatedTaskId) {
      throw new Error('构建成功但未返回 taskId')
    }
    taskId.value = generatedTaskId
    highlightedTaskId.value = generatedTaskId
    await loadTasks()
    onTaskRowClick({ taskId: generatedTaskId })
    ElMessage.success(`步骤1成功：taskId=${generatedTaskId}`)
  } catch (e) {
    ElMessage.error(e?.message || '构建快照失败')
  } finally {
    buildLoading.value = false
  }
}

async function refreshTaskRow(rowTaskId) {
  const id = String(rowTaskId || '').trim()
  if (!id) return null
  const latest = await getSelfOptimizeTask(id)
  const idx = tasks.value.findIndex((x) => x.taskId === id)
  if (idx >= 0) {
    const next = [...tasks.value]
    next[idx] = latest
    tasks.value = next
  }
  return latest
}

async function refreshSelectedDetailIf(targetTaskId) {
  if (selectedTaskId.value && selectedTaskId.value === String(targetTaskId || '').trim()) {
    await loadTaskDetail(selectedTaskId.value)
  }
}

function unchangedTaskStatus(before, after) {
  if (!before || !after) return false
  return String(before.status || '') === String(after.status || '') &&
    String(before.currentStage || '') === String(after.currentStage || '') &&
    String(before.errorMessage || '') === String(after.errorMessage || '')
}

function getLastExecutionAction(row) {
  const taskKey = String(row?.taskId || '').trim()
  const local = taskKey ? localExecutionMap.value.get(taskKey) : null
  if (local?.action) {
    return {
      action: local.action,
      label: local.action === 'run' ? '重跑' : '执行动作',
      timeText: formatTime(local.at)
    }
  }
  const status = String(row?.status || '').trim().toUpperCase()
  if (!status || status === 'PENDING') {
    return {
      action: '',
      label: '暂无执行',
      timeText: '—'
    }
  }
  const fallbackTs = row?.updateTime || row?.createTime
  if (fallbackTs) {
    return {
      action: '',
      label: '最近更新',
      timeText: formatTime(fallbackTs)
    }
  }
  return {
    action: '',
    label: '暂无执行',
    timeText: '—'
  }
}

function getLastExecutionStatus(row) {
  if (!row) return ''
  return String(row.status || '').trim() || ''
}

function buildLastExecutionTooltip(row) {
  const taskKey = String(row?.taskId || '').trim()
  const local = taskKey ? localExecutionMap.value.get(taskKey) : null
  const action = getLastExecutionAction(row)
  const status = normalizeTaskStatus(getLastExecutionStatus(row)) || 'UNKNOWN'
  const stage = row?.currentStage || '—'
  const error = (local?.errorMessage || row?.errorMessage || '').trim() || '无'
  const duration = Number(local?.durationMs || 0) > 0 ? `${local.durationMs} ms` : '—'
  return `动作：${action.label}\n时间：${action.timeText}\n状态：${status}\n阶段：${stage}\n耗时：${duration}\n错误摘要：${error}`
}

function openEventFlowFromTask(row) {
  onTaskRowClick(row)
  detailActiveTab.value = 'observe'
  detailObserveSubTab.value = 'events'
}

async function runTaskById(rawTaskId) {
  const id = String(rawTaskId || '').trim()
  if (!id) {
    ElMessage.warning('请先输入 taskId')
    return
  }
  if (isTaskRunning(id)) return
  setRunning(id, true)
  const startedAt = Date.now()
  upsertLocalExecution(id, { action: 'run', at: startedAt })
  try {
    const before = await getSelfOptimizeTask(id)
    if (!before?.snapshotId) {
      throw new Error('任务快照未就绪，请先完成步骤1')
    }
    await runSelfOptimizeTask(id)
    const after = await refreshTaskRow(id)
    highlightedTaskId.value = id
    await refreshSelectedDetailIf(id)
    if (unchangedTaskStatus(before, after)) {
      ElMessage.success('重跑完成，状态未变化')
    } else {
      ElMessage.success('任务重跑完成')
    }
    upsertLocalExecution(id, {
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      status: String(after?.status || before?.status || '').trim(),
      stage: String(after?.currentStage || before?.currentStage || '').trim(),
      errorMessage: String(after?.errorMessage || '').trim()
    })
  } catch (e) {
    upsertLocalExecution(id, {
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      errorMessage: String(e?.message || '重跑失败')
    })
    throw e
  } finally {
    setRunning(id, false)
  }
}

async function runTask() {
  try {
    await runTaskById(taskId.value)
  } catch (e) {
    ElMessage.error(e?.message || '执行任务失败')
  }
}

async function quickRun(id) {
  try {
    await runTaskById(id)
  } catch (e) {
    ElMessage.error(e?.message || '任务重跑失败')
  }
}

async function executeTaskById(rawTaskId) {
  const id = String(rawTaskId || '').trim()
  if (!id) {
    ElMessage.warning('请先输入 taskId')
    return
  }
  if (isTaskExecuting(id)) return
  setExecuting(id, true)
  const startedAt = Date.now()
  upsertLocalExecution(id, { action: 'execute', at: startedAt })
  try {
    const before = await getSelfOptimizeTask(id)
    const guard = await ensureTaskExecutionAllowed(id)
    if (!guard.allowed) {
      throw new Error(guard.reason || '该优化计划需要人工审核，无法自动执行')
    }
    await executeOptimizationAction(id)
    const after = await refreshTaskRow(id)
    highlightedTaskId.value = id
    await refreshSelectedDetailIf(id)
    if (unchangedTaskStatus(before, after)) {
      ElMessage.success('执行完成，状态未变化')
    } else {
      ElMessage.success('动作执行完成')
    }
    upsertLocalExecution(id, {
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      status: String(after?.status || before?.status || '').trim(),
      stage: String(after?.currentStage || before?.currentStage || '').trim(),
      errorMessage: String(after?.errorMessage || '').trim()
    })
  } catch (e) {
    upsertLocalExecution(id, {
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      errorMessage: String(e?.message || '执行动作失败')
    })
    throw e
  } finally {
    setExecuting(id, false)
  }
}

async function executeTask() {
  try {
    await executeTaskById(taskId.value)
  } catch (e) {
    const msg = String(e?.message || '执行动作失败')
    if (msg.includes('需要人工审核')) {
      ElMessage.warning('该优化计划需要人工审核，无法自动执行')
      return
    }
    if (msg.includes('不支持自动执行')) {
      ElMessage.warning('该优化动作需要人工处理')
      return
    }
    ElMessage.error(msg)
  }
}

async function quickExecute(id) {
  try {
    await executeTaskById(id)
  } catch (e) {
    const msg = String(e?.message || '执行动作失败')
    if (msg.includes('需要人工审核')) {
      ElMessage.warning('该优化计划需要人工审核，无法自动执行')
      return
    }
    if (msg.includes('不支持自动执行')) {
      ElMessage.warning('该优化动作需要人工处理')
      return
    }
    ElMessage.error(msg)
  }
}

async function runPending() {
  pendingLoading.value = true
  try {
    const data = await runPendingSelfOptimizeTasks(10)
    const count = Array.isArray(data?.records) ? data.records.length : 0
    await loadTasks()
    ElMessage.success(`待处理任务执行完成：${count} 条`)
  } catch (e) {
    ElMessage.error(e?.message || '执行待处理任务失败')
  } finally {
    pendingLoading.value = false
  }
}

async function loadBadCases() {
  badListLoading.value = true
  try {
    const page = await listAgentBadCases(badPageNum.value, badPageSize.value)
    badCases.value = page.records || []
    badTotal.value = Number(page.total || 0)
    badPageNum.value = Number(page.pageNum || badPageNum.value)
    badPageSize.value = Number(page.pageSize || badPageSize.value)
  } catch (e) {
    ElMessage.error(e?.message || '加载 bad case 失败')
  } finally {
    badListLoading.value = false
  }
}

function onBadCasePageSizeChange() {
  badPageNum.value = 1
  loadBadCases()
}

async function startFromBadCase(row) {
  const tid = String(row?.traceId || '').trim()
  if (!tid) {
    ElMessage.warning('当前 bad case 无 traceId')
    return
  }
  startLoadingTraceId.value = tid
  try {
    traceId.value = tid
    await buildSnapshot()
    await loadTasks()
    ElMessage.success('已从 bad case 发起自优化')
  } catch (e) {
    ElMessage.error(e?.message || '发起自优化失败')
  } finally {
    startLoadingTraceId.value = ''
  }
}

async function deleteBadCaseRow(row) {
  const badCaseId = String(row?._id || '').trim()
  if (!badCaseId) {
    ElMessage.warning('当前 bad case 缺少主键，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm('确认删除该 bad case 吗？删除后不可恢复。', '删除确认', { type: 'warning' })
    deletingBadCaseId.value = badCaseId
    await deleteAgentBadCase(badCaseId)
    ElMessage.success('bad case 已删除')
    await loadBadCases()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.message || '删除 bad case 失败')
    }
  } finally {
    deletingBadCaseId.value = ''
  }
}

async function loadTaskDetail(taskIdValue) {
  const id = String(taskIdValue || '').trim()
  if (!id) return
  detailLoading.value = true
  try {
    const task = await getSelfOptimizeTask(id)
    const snapshot = task?.snapshotId ? await getSelfOptimizeSnapshot(task.snapshotId) : null
    const events = await getSelfOptimizeTaskEvents(id)
    selectedTask.value = task
    selectedSnapshot.value = snapshot
    selectedEvents.value = Array.isArray(events) ? events : []
  } catch (e) {
    ElMessage.error(e?.message || '加载任务详情失败')
  } finally {
    detailLoading.value = false
  }
}

function onTaskRowClick(row) {
  const id = String(row?.taskId || '').trim()
  if (!id) return
  selectedTaskId.value = id
  highlightedTaskId.value = id
  taskId.value = id
  loadTaskDetail(id)
}

async function deleteTaskRow(row) {
  const id = String(row?.taskId || '').trim()
  if (!id) return
  try {
    await ElMessageBox.confirm('确认删除该自优化任务吗？任务会被隐藏（软删除）。', '删除确认', { type: 'warning' })
    deletingTaskId.value = id
    const nextTaskId = pickNextTaskAfterDelete(id)
    await deleteSelfOptimizeTask(id)
    ElMessage.success('任务已删除')
    if (selectedTaskId.value === id) {
      selectedTaskId.value = ''
      selectedTask.value = null
      selectedSnapshot.value = null
      selectedEvents.value = []
      if (nextTaskId) {
        selectedTaskId.value = nextTaskId
      }
    }
    await loadTasks()
    if (selectedTaskId.value) {
      await loadTaskDetail(selectedTaskId.value)
    }
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.message || '删除任务失败')
    }
  } finally {
    deletingTaskId.value = ''
  }
}

function taskRowClassName({ row }) {
  if (!row?.taskId) return ''
  const running = isTaskRunning(row.taskId) || isTaskExecuting(row.taskId)
  if (running) return 'task-row-running'
  if (row.taskId === selectedTaskId.value) return 'task-row-selected'
  if (row.taskId === highlightedTaskId.value) return 'task-row-highlight'
  return ''
}

function isRowExecutionDisabled(row) {
  const id = String(row?.taskId || '').trim()
  if (!id) return false
  if (selectedTaskId.value !== id) return false
  return !selectedTaskExecutionGuard.value.allowed
}

async function loadSelfOptSkeleton() {
  try {
    selfOptSkeleton.value = await getSelfOptimizeGraphSkeleton()
  } catch {
    selfOptSkeleton.value = null
  }
}

function onTextViewerClosed() {
  textViewerVisible.value = false
}

onMounted(() => {
  loadBadCases()
  loadTasks()
  loadSelfOptSkeleton()
})

onBeforeUnmount(() => {
  textViewerVisible.value = false
})
</script>

<style scoped>
.selfopt-panel {
  --selfopt-ink-soft: #1e3a5f;
  --selfopt-muted: #5c6f8d;
  --selfopt-line: #dce7f8;
  --selfopt-surface: #fbfdff;
  --selfopt-accent: linear-gradient(90deg, #4c8dff 0%, #8a73ff 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
}

.selfopt-surface {
  border: 1px solid var(--selfopt-line);
  border-radius: 14px;
  padding: 16px 18px;
  background: var(--selfopt-surface);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.selfopt-surface-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(220, 231, 248, 0.9);
}

.selfopt-surface-head__titles {
  flex: 1 1 260px;
  min-width: 0;
}

.selfopt-surface-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--selfopt-ink-soft);
  letter-spacing: -0.01em;
}

.selfopt-surface-lead {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--selfopt-muted);
  font-weight: 500;
}

.selfopt-surface-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}

.selfopt-pipeline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px 10px;
  align-items: stretch;
}

.selfopt-pipeline-step {
  display: flex;
  gap: 12px;
  min-width: 0;
}

.selfopt-step-badge {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 900;
  color: #fff;
  background: var(--selfopt-accent);
  box-shadow: 0 8px 18px rgba(76, 141, 255, 0.25);
}

.selfopt-step-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selfopt-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--selfopt-muted);
  letter-spacing: 0.02em;
}

.selfopt-control {
  width: 100%;
}

.selfopt-step-cta {
  align-self: flex-start;
}

.selfopt-step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.selfopt-hint {
  margin: 0;
  font-size: 12px;
  color: #b45309;
  line-height: 1.45;
}

.selfopt-pipeline-join {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #94a3b8;
  padding: 28px 0 0;
}

.selfopt-pipeline-join__line {
  width: 2px;
  height: 26px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(76, 141, 255, 0.35), rgba(138, 115, 255, 0.35));
}

.selfopt-pipeline-join__chev {
  font-size: 22px;
  line-height: 1;
  font-weight: 300;
  color: #64748b;
}

@media (max-width: 960px) {
  .selfopt-pipeline {
    grid-template-columns: 1fr;
  }

  .selfopt-pipeline-join {
    display: none;
  }
}

.block-card {
  border: 1px solid #dbe7f8;
  border-radius: 12px;
  padding: 12px;
  background: #fbfdff;
}

.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.block-head h5 {
  margin: 0;
  color: #1e3a5f;
}

.selfopt-filter {
  margin: 0 0 12px;
  padding: 12px 12px 4px;
  border-radius: 12px;
  border: 1px solid rgba(220, 231, 248, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.selfopt-filter__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 14px;
  align-items: end;
}

.selfopt-filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.selfopt-filter-field--wide {
  grid-column: span 2;
}

.selfopt-filter-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 4px 0 8px;
}

@media (max-width: 720px) {
  .selfopt-filter-field--wide {
    grid-column: span 1;
  }
}

.selfopt-date-range {
  width: 100%;
}

:deep(.selfopt-date-range.el-date-editor--datetimerange) {
  width: 100%;
  box-sizing: border-box;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.detail-panel .detail-body {
  min-height: 220px;
}

.evidence-card {
  margin-bottom: 10px;
}

.evidence-head {
  font-weight: 600;
  color: #334155;
}

.evidence-field-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.evidence-card.version-detail-card .evidence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-detail-id {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  word-break: break-all;
}

.version-meta-desc {
  margin-bottom: 12px;
}

.version-config-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

@media (max-width: 960px) {
  .version-config-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.version-config-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.version-config-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-config-title {
  font-size: 12px;
  font-weight: 700;
  color: #1e3a5f;
  letter-spacing: 0.02em;
}

.version-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.version-actions-hint {
  font-size: 12px;
  color: #d97706;
}

.block-card--collapse {
  padding-top: 4px;
}

.block-head--inner {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.secondary-collapse {
  border: none;
}

.secondary-collapse :deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a5f;
  padding-left: 4px;
}

.secondary-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.secondary-collapse__title {
  font-weight: 700;
  color: #1e3a5f;
}

.secondary-collapse__hint {
  margin-left: 10px;
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
}

.task-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.task-toolbar__trace {
  width: min(420px, 100%);
  flex: 1 1 220px;
}

.detail-panel .block-head h5 {
  margin: 0 0 4px;
}

.detail-panel-lead {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.detail-body--nested-tabs {
  padding-top: 4px;
}

.observe-sub-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.snapshot-extra-collapse {
  margin-top: 10px;
}

.snapshot-extra-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 13px;
}

.snapshot-desc--sub {
  margin-top: 0;
}

.snapshot-extra-actions {
  margin-bottom: 8px;
}

.collapse-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #4338ca;
  background: #eef2ff;
}

.ellipsis-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 4px;
}

.mono-clip-inline {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
}

.snapshot-desc {
  margin-top: 12px;
}

.running-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #d97706;
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
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-item--cluster .ev-cluster {
  border: 1px dashed #dbe7f8;
  border-radius: 10px;
  padding: 8px;
  background: #f8fbff;
}

.ev-cluster-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ev-cluster-head h4 {
  margin: 0;
  font-size: 13px;
  color: #1e3a5f;
}

.ev-cluster-head span {
  font-size: 12px;
  color: #64748b;
}

.ev-cluster-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.last-exec-btn {
  border: 0;
  padding: 0;
  margin: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

.last-exec-main {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #334155;
  min-width: 76px;
}

.last-exec-time {
  color: #64748b;
  font-size: 12px;
}

.exec-icon {
  color: #1d4ed8;
}

.row-action-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 2px 8px;
  width: 100%;
}

.row-action-group .el-button {
  margin: 0;
}

.row-action-group--bad {
  gap: 8px;
}

.btn-tooltip-wrap {
  display: inline-flex;
  vertical-align: middle;
}

:deep(.col-actions .cell) {
  padding-left: 10px;
  padding-right: 8px;
}

.exec-hint-text {
  margin-left: 0;
  font-size: 12px;
  color: #d97706;
  white-space: nowrap;
}

.text-viewer-body {
  margin: 0;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 72vh;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
}

:deep(.task-row-highlight) {
  --el-table-tr-bg-color: #eef7ff;
}

:deep(.task-row-selected) {
  --el-table-tr-bg-color: #e8f2ff;
}

:deep(.task-row-running) {
  --el-table-tr-bg-color: #fff7e6;
}

.build-options-collapse {
  margin-top: 14px;
  border: 1px dashed #c7d8f0;
  border-radius: 12px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.65);
}

.build-options-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  color: #1e3a5f;
}

.collapse-sub {
  margin-left: 10px;
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
}

.build-opts-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-bottom: 8px;
}

@media (max-width: 960px) {
  .build-opts-layout {
    grid-template-columns: 1fr;
  }
}

.build-opts-block {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}

.opts-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #334155;
}

.opts-block-head code {
  font-size: 11px;
  color: #64748b;
}

.build-opts-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.snapshot-meta-inline {
  margin-left: 10px;
  font-size: 12px;
  color: #64748b;
}

.human-fb-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.human-fb-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #334155;
}

.human-fb-list .fb-tags {
  color: #6366f1;
  margin: 0 6px;
}
</style>

