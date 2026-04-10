<template>
  <div class="floating-task-status">
    <button
      v-if="!visible"
      class="task-fab"
      type="button"
      title="任务线程池状态"
      @click="visible = true"
    >
      <span class="fab-core">
        <el-icon class="fab-icon"><Cpu /></el-icon>
      </span>
    </button>

    <el-drawer
      v-model="visible"
      :size="drawerWidthPx"
      append-to-body
      class="task-drawer"
      title="任务线程池状态"
    >
      <div class="task-body">
        <section class="summary-card">
          <div class="summary-top">
            <div class="summary-left">
              <div class="status-pill" :class="`is-${healthTag.type}`">
                <el-icon class="status-icon"><Cpu /></el-icon>
                <span class="status-text">{{ healthTag.label }}</span>
              </div>
              <div class="summary-kpis">
                <span class="kpi">运行中 <b>{{ runningCount }}</b></span>
                <span class="dot">·</span>
                <span class="kpi">排队 <b>{{ queueSize }}</b></span>
                <span class="dot">·</span>
                <span class="kpi">活跃线程 <b>{{ activeThreads }}</b></span>
              </div>
            </div>
            <div class="summary-right">
              <div class="summary-update">更新 {{ lastUpdateText }}</div>
              <el-button
                size="small"
                class="refresh-btn"
                type="primary"
                plain
                :icon="Refresh"
                :loading="loading"
                @click="refreshAll"
              >
                刷新
              </el-button>
            </div>
          </div>

          <div class="metric-grid">
            <div class="metric-item metric-item--editable">
              <span class="metric-label">核心线程</span>
              <span class="metric-value">{{ coreThreads }}</span>
              <el-input-number v-model="poolForm.corePoolSize" :min="1" :step="1" controls-position="right" size="small" style="width: 100%" />
              <el-button size="small" text type="primary" class="metric-inline-btn" @click="fetchStatus">重置</el-button>
            </div>
            <div class="metric-item metric-item--editable">
              <span class="metric-label">最大线程</span>
              <span class="metric-value">{{ maxThreads }}</span>
              <el-input-number v-model="poolForm.maximumPoolSize" :min="1" :step="1" controls-position="right" size="small" style="width: 100%" />
              <el-button size="small" type="primary" :loading="updatingPoolSize" class="metric-inline-btn" @click="submitPoolSizeUpdate">应用</el-button>
            </div>
            <div class="metric-item">
              <span class="metric-label">线程池大小</span>
              <span class="metric-value">{{ poolSize }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">已完成任务</span>
              <span class="metric-value">{{ completedCount }}</span>
            </div>
            <div class="metric-item metric-item--queue">
              <span class="metric-label">队列优先级</span>
              <div class="queue-tags">
                <el-tag size="small" type="danger" effect="plain">高 {{ highPriorityCount }}</el-tag>
                <el-tag size="small" type="warning" effect="plain">中 {{ normalPriorityCount }}</el-tag>
                <el-tag size="small" type="info" effect="plain">低 {{ lowPriorityCount }}</el-tag>
              </div>
            </div>
          </div>
        </section>

        <div class="running-card">
          <div class="card-head">
            <div class="card-title">运行中 / 排队任务</div>
            <div class="card-sub">
              <span class="card-sub-seg card-sub-seg--run">运行中 <b>{{ listRunningCount }}</b></span>
              <span class="card-sub-dot">·</span>
              <span class="card-sub-seg card-sub-seg--queue">排队 <b>{{ listQueuedCount }}</b></span>
            </div>
          </div>
          <el-empty v-if="!runningTasks.length" description="当前暂无任务" :image-size="70" />
          <div v-else class="running-list">
            <div
              v-for="task in sortedRunningTasks"
              :key="task.taskId"
              class="running-item"
              :class="`is-${String(task.status || 'unknown').toLowerCase()}`"
            >
              <div class="task-head">
                <div class="task-name">{{ task.taskName || '-' }}</div>
                <el-tag size="small" :type="task.status === 'RUNNING' ? 'success' : 'warning'" effect="light">
                  {{ task.status || '-' }}
                </el-tag>
              </div>

              <div v-if="task.taskType === 'FILE_PARSE'" class="task-stage-current">
                <div class="stage-line">
                  <span class="stage-title">阶段：</span>
                  <span class="stage-name">{{ task.currentStageName || task.currentStageCode || '等待开始' }}</span>
                  <span class="stage-percent">{{ Number(task.progress || 0) }}%</span>
                </div>
                <el-progress
                  :percentage="Number(task.progress || 0)"
                  :stroke-width="6"
                  :show-text="false"
                  class="task-stage-progress"
                />
              </div>

              <div v-if="task.taskType === 'FILE_PARSE' && Array.isArray(task.stageTraces) && task.stageTraces.length" class="stage-trace-list">
                <span
                  v-for="trace in task.stageTraces"
                  :key="`${task.taskId}-${trace.stageCode}`"
                  class="stage-trace-chip"
                  :class="`is-${String(trace.status || 'PENDING').toLowerCase()}`"
                >
                  {{ trace.stageName || trace.stageCode }} · {{ formatStageTraceDuration(trace) }}
                </span>
              </div>
              <el-tooltip
                v-if="task.taskType === 'FILE_PARSE' && task.errorMessage"
                effect="dark"
                placement="top-start"
                :content="task.errorMessage"
                :show-after="150"
              >
                <div class="task-error">{{ shortError(task.errorMessage) }}</div>
              </el-tooltip>

              <div class="task-sub">
                <div class="sub-chip">
                  <span class="sub-k">项目</span>
                  <span class="sub-v">{{ task.projectId ?? '-' }}</span>
                </div>
                <div v-if="task.fileName || task.fileId != null" class="sub-chip sub-chip--file">
                  <span class="sub-k">文件</span>
                  <span class="sub-v">{{ task.fileName || task.fileId }}</span>
                </div>
              </div>

              <div class="task-foot">
                <div class="task-foot-left">
                  <el-tag size="small" effect="plain">{{ task.priority || '-' }}</el-tag>
                </div>
                <div class="task-foot-actions">
                  <el-button size="small" text type="primary" class="detail-btn" @click="openTaskDetail(task)">
                    详情
                  </el-button>
                  <el-button
                    v-if="task.cancellable"
                    size="small"
                    text
                    type="danger"
                    class="cancel-btn"
                    @click.stop="handleCancelTask(task)"
                  >
                    取消
                  </el-button>
                </div>
              </div>

              <div class="task-runtime">
                <span class="runtime-chip">等待 {{ formatDuration(task.waitingDurationMs) }}</span>
                <span class="runtime-chip">运行 {{ formatDuration(task.runningDurationMs) }}</span>
                <span class="runtime-chip">CPU {{ formatDuration(task.threadCpuTimeMs) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="system-card">
          <div class="card-head">
            <div class="card-title">系统运行状态</div>
            <div class="card-sub">每 5s 自动刷新</div>
          </div>

          <div class="system-row">
            <div class="system-label">系统CPU</div>
            <div class="system-bar">
              <el-progress
                :percentage="systemCpuPercent"
                :color="loadColor(systemCpuPercent)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
            <div class="system-val">{{ systemCpuText }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">进程CPU</div>
            <div class="system-bar">
              <el-progress
                :percentage="processCpuPercent"
                :color="loadColor(processCpuPercent)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
            <div class="system-val">{{ processCpuText }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">JVM堆内存</div>
            <div class="system-bar">
              <el-progress
                :percentage="memoryPercent"
                :color="loadColor(memoryPercent)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
            <div class="system-val">{{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryMax) }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">线程数</div>
            <div class="system-bar system-bar--text">{{ systemStatus.thread?.liveThreadCount ?? '-' }}</div>
            <div class="system-val" />
          </div>
          <div class="system-row">
            <div class="system-label">连接池</div>
            <div class="system-bar system-bar--text">{{ poolDisplayText }}</div>
            <div class="system-val">{{ poolDisplayHint }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">GPU</div>
            <div class="system-bar">
              <template v-if="gpuSupported && gpuUtil != null">
                <el-progress
                  :percentage="gpuPercent"
                  :color="loadColor(gpuPercent)"
                  :stroke-width="8"
                  :show-text="false"
                />
              </template>
              <template v-else>
                <div class="system-bar system-bar--text">{{ systemStatus.gpu?.message || '不可用' }}</div>
              </template>
            </div>
            <div class="system-val" v-if="gpuSupported && gpuUtil != null">{{ gpuPercent }}%</div>
            <div class="system-val" v-else />
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="detailVisible" title="任务阶段详情" width="680px" destroy-on-close append-to-body>
      <TaskParseFlowDetailPanel
        :detail="detailTask"
        :loading="detailLoading"
        @refresh="refreshTaskDetail"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Cpu, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import TaskParseFlowDetailPanel from '@/components/layout/TaskParseFlowDetailPanel.vue'
import {
  cancelTaskByTaskId,
  getParseJobFlow,
  getSystemRuntimeStatus,
  getTaskDetailByTaskId,
  getTaskPoolStatus,
  updateTaskPoolSize
} from '@/services/file.service'

const visible = ref(false)
const loading = ref(false)
const updatingPoolSize = ref(false)
const lastUpdateAt = ref(0)
const statusData = ref({
  threadPoolStatus: {},
  runningTasks: [],
  queueTasks: {}
})
const systemStatus = ref({
  system: {},
  process: {},
  memory: {},
  thread: {},
  dataSource: {},
  mongoPool: {},
  gpu: {}
})
let timer = null
let detailPollTimer = null
const refreshIntervalMs = 5000
const detailPollIntervalMs = 2000
const poolForm = ref({
  corePoolSize: 1,
  maximumPoolSize: 1
})
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTask = ref(null)

const runningTasks = computed(() => (Array.isArray(statusData.value?.runningTasks) ? statusData.value.runningTasks : []))
const runningCount = computed(() => runningTasks.value.length)

/** 抽屉宽度：略宽便于双列任务卡；打开时按视口计算 */
const drawerWidthPx = ref(600)
const recalcDrawerWidth = () => {
  if (typeof window === 'undefined') return
  const w = window.innerWidth || 1200
  drawerWidthPx.value = Math.min(680, Math.max(520, Math.round(w * 0.38)))
}

const taskStatusRank = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'RUNNING') return 0
  if (s === 'QUEUED') return 1
  if (s === 'PENDING') return 2
  return 3
}

/** RUNNING 在前，QUEUED 在后，其余状态置后；同组内按 taskId 稳定排序 */
const sortedRunningTasks = computed(() => {
  const list = [...runningTasks.value]
  list.sort((a, b) => {
    const ra = taskStatusRank(a?.status)
    const rb = taskStatusRank(b?.status)
    if (ra !== rb) return ra - rb
    return String(a?.taskId || '').localeCompare(String(b?.taskId || ''))
  })
  return list
})

const listRunningCount = computed(() => runningTasks.value.filter((t) => String(t?.status || '').toUpperCase() === 'RUNNING').length)
const listQueuedCount = computed(() => runningTasks.value.filter((t) => String(t?.status || '').toUpperCase() === 'QUEUED').length)

const queueSize = computed(() => Number(statusData.value?.queueTasks?.queueSize || 0))
const highPriorityCount = computed(() => Number(statusData.value?.queueTasks?.highPriorityCount || 0))
const normalPriorityCount = computed(() => Number(statusData.value?.queueTasks?.normalPriorityCount || 0))
const lowPriorityCount = computed(() => Number(statusData.value?.queueTasks?.lowPriorityCount || 0))

const activeThreads = computed(() => Number(statusData.value?.threadPoolStatus?.activeThreadCount || 0))
const coreThreads = computed(() => Number(statusData.value?.threadPoolStatus?.corePoolSize || 0))
const maxThreads = computed(() => Number(statusData.value?.threadPoolStatus?.maximumPoolSize || 0))
const poolSize = computed(() => Number(statusData.value?.threadPoolStatus?.poolSize || 0))
const completedCount = computed(() => Number(statusData.value?.threadPoolStatus?.completedTaskCount || 0))
const systemCpu = computed(() => Number(systemStatus.value?.system?.cpuLoadPercent || 0))
const processCpu = computed(() => Number(systemStatus.value?.process?.cpuLoadPercent || 0))
const memoryUsed = computed(() => Number(systemStatus.value?.memory?.heapUsedBytes || 0))
const memoryMax = computed(() => Number(systemStatus.value?.memory?.heapMaxBytes || 0))
const gpuSupported = computed(() => Boolean(systemStatus.value?.gpu?.supported))
const gpuUtil = computed(() => systemStatus.value?.gpu?.utilizationPercent)
const dsActive = computed(() => systemStatus.value?.dataSource?.activeConnections)
const dsTotal = computed(() => systemStatus.value?.dataSource?.totalConnections)
const mongoPoolSupported = computed(() => Boolean(systemStatus.value?.mongoPool?.supported))
const mongoInUse = computed(() => systemStatus.value?.mongoPool?.inUse)
const mongoCurrentSize = computed(() => systemStatus.value?.mongoPool?.currentSize)
const mongoWaitQueue = computed(() => systemStatus.value?.mongoPool?.checkoutWaitQueue)
const mongoMessage = computed(() => systemStatus.value?.mongoPool?.message || 'Mongo连接池监控未接入')
const poolDisplayText = computed(() => {
  if (mongoPoolSupported.value) {
    const inUse = mongoInUse.value ?? '-'
    const total = mongoCurrentSize.value ?? '-'
    const wait = mongoWaitQueue.value ?? 0
    return `Mongo ${inUse} / ${total} (等待 ${wait})`
  }
  return `${dsActive ?? '-'} / ${dsTotal ?? '-'}`
})
const poolDisplayHint = computed(() => (mongoPoolSupported.value ? '' : mongoMessage.value))

const systemCpuPercent = computed(() => clampPercent(systemCpu.value))
const processCpuPercent = computed(() => clampPercent(processCpu.value))
const gpuPercent = computed(() => clampPercent(gpuUtil.value))
const memoryPercent = computed(() => {
  const max = Number(memoryMax.value || 0)
  const used = Number(memoryUsed.value || 0)
  if (!max) return 0
  return clampPercent((used / max) * 100)
})

const systemCpuText = computed(() => formatPercent(systemCpu.value))
const processCpuText = computed(() => formatPercent(processCpu.value))

const healthTag = computed(() => {
  if (queueSize.value >= 20 || (maxThreads.value > 0 && activeThreads.value >= maxThreads.value)) {
    return { label: '高负载', type: 'danger' }
  }
  if (queueSize.value > 0 || activeThreads.value > 0) {
    return { label: '繁忙', type: 'warning' }
  }
  return { label: '空闲', type: 'success' }
})

const lastUpdateText = computed(() => {
  if (!lastUpdateAt.value) return '未刷新'
  const d = new Date(lastUpdateAt.value)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
})

function clampPercent(val) {
  const v = Number(val)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100))
}

function formatPercent(val) {
  const v = Number(val)
  if (!Number.isFinite(v)) return '-'
  return `${Math.round(v * 100) / 100}%`
}

function loadColor(percent) {
  const p = Number(percent)
  if (p >= 85) return '#b42318'
  if (p >= 60) return '#c28a36'
  if (p >= 40) return '#2563eb'
  return '#1f4e79'
}

const fetchStatus = async () => {
  loading.value = true
  try {
    const res = await getTaskPoolStatus()
    if (Number(res?.data?.code) === 200) {
      statusData.value = res?.data?.data || {
        threadPoolStatus: {},
        runningTasks: [],
        queueTasks: {}
      }
      const currentCore = Number(statusData.value?.threadPoolStatus?.corePoolSize || 1)
      const currentMax = Number(statusData.value?.threadPoolStatus?.maximumPoolSize || 1)
      poolForm.value.corePoolSize = currentCore > 0 ? currentCore : 1
      poolForm.value.maximumPoolSize = currentMax > 0 ? currentMax : 1
      lastUpdateAt.value = Date.now()
    }
  } catch (error) {
    console.error('获取任务线程池状态失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchSystemStatus = async () => {
  try {
    const res = await getSystemRuntimeStatus()
    if (Number(res?.data?.code) === 200) {
      systemStatus.value = res?.data?.data || {
        system: {},
        process: {},
        memory: {},
        thread: {},
        dataSource: {},
        mongoPool: {},
        gpu: {}
      }
    }
  } catch (error) {
    console.error('获取系统运行状态失败:', error)
  }
}

const refreshAll = async () => {
  await Promise.all([fetchStatus(), fetchSystemStatus()])
}

const handleCancelTask = async (task) => {
  if (!task?.taskId || !task?.cancellable) return
  try {
    const res = await cancelTaskByTaskId(task.taskId)
    const code = Number(res?.data?.code)
    if (code === 200) {
      ElMessage.success(res?.data?.msg || '取消任务成功')
      await refreshAll()
      return
    }
    ElMessage.warning(res?.data?.msg || '取消任务失败')
  } catch (error) {
    console.error('取消任务失败:', error)
    ElMessage.error(error?.response?.data?.msg || '取消任务失败')
  }
}

const openTaskDetail = async (task) => {
  const taskId = typeof task === 'string' ? task : task?.taskId
  if (!taskId) return
  if (task && typeof task === 'object') {
    detailTask.value = {
      taskId: task.taskId,
      parseJobId: task.parseJobId
    }
  } else {
    detailTask.value = { taskId }
  }
  detailVisible.value = true
  await refreshTaskDetail()
}

const refreshTaskDetail = async () => {
  const saved = detailTask.value
  const taskId = saved?.taskId
  const parseJobId = saved?.parseJobId
  if (!taskId && !parseJobId) return
  try {
    detailLoading.value = true
    if (taskId) {
      try {
        const res = await getTaskDetailByTaskId(taskId)
        const code = Number(res?.data?.code)
        const httpStatus = Number(res?.status)
        if (code === 200) {
          detailTask.value = res?.data?.data || null
          stopDetailPollIfTerminal()
          return
        }
        if (code !== 404 && httpStatus !== 404) {
          ElMessage.warning(res?.data?.msg || '获取任务详情失败')
          return
        }
      } catch (err) {
        const st = err?.response?.status
        if (st !== 404) {
          console.error('获取任务详情失败:', err)
          ElMessage.error(err?.response?.data?.msg || '获取任务详情失败')
          return
        }
      }
    }
    if (parseJobId) {
      const res = await getParseJobFlow(parseJobId)
      const code = Number(res?.data?.code)
      if (code === 200) {
        detailTask.value = res?.data?.data || null
        stopDetailPollIfTerminal()
        return
      }
      ElMessage.warning(res?.data?.msg || '未找到解析任务记录')
      return
    }
    ElMessage.warning('暂无法获取任务进度')
  } catch (error) {
    console.error('获取任务详情失败:', error)
    ElMessage.error(error?.response?.data?.msg || '获取任务详情失败')
  } finally {
    detailLoading.value = false
  }
}

const stopDetailPollIfTerminal = () => {
  const t = detailTask.value
  if (!t) return
  const st = String(t.status || '').toUpperCase()
  if (st === 'SUCCESS' || st === 'FAILED' || st === 'CANCELLED') {
    if (detailPollTimer) {
      window.clearInterval(detailPollTimer)
      detailPollTimer = null
    }
  }
}

watch(detailVisible, (open) => {
  if (detailPollTimer) {
    window.clearInterval(detailPollTimer)
    detailPollTimer = null
  }
  if (open) {
    detailPollTimer = window.setInterval(() => {
      refreshTaskDetail()
    }, detailPollIntervalMs)
  }
})

const submitPoolSizeUpdate = async () => {
  const core = Number(poolForm.value.corePoolSize)
  const max = Number(poolForm.value.maximumPoolSize)
  if (!Number.isInteger(core) || !Number.isInteger(max) || core <= 0 || max <= 0) {
    ElMessage.warning('核心线程数和最大线程数必须是大于0的整数')
    return
  }
  if (core > max) {
    ElMessage.warning('核心线程数不能大于最大线程数')
    return
  }

  try {
    updatingPoolSize.value = true
    const res = await updateTaskPoolSize({
      corePoolSize: core,
      maximumPoolSize: max
    })
    const code = Number(res?.data?.code)
    if (code === 200) {
      ElMessage.success(res?.data?.msg || '线程池参数更新成功')
      await refreshAll()
      return
    }
    ElMessage.warning(res?.data?.msg || '线程池参数更新失败')
  } catch (error) {
    console.error('线程池参数更新失败:', error)
    ElMessage.error(error?.response?.data?.msg || '线程池参数更新失败')
  } finally {
    updatingPoolSize.value = false
  }
}

const formatDuration = (ms) => {
  const val = Number(ms || 0)
  if (!val) return '-'
  if (val < 1000) return `${val}ms`
  const sec = Math.floor(val / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

/** 阶段轨迹：进行中的阶段往往尚无 durationMs，避免显示 “· -” */
const formatStageTraceDuration = (trace) => {
  const st = String(trace?.status || '').toUpperCase()
  const val = Number(trace?.durationMs || 0)
  if ((st === 'RUNNING' || st === 'PENDING') && !val) {
    return st === 'RUNNING' ? '进行中' : '等待'
  }
  return formatDuration(trace?.durationMs)
}

const shortError = (text, limit = 56) => {
  const val = String(text || '').trim()
  if (!val) return '-'
  if (val.length <= limit) return val
  return `${val.slice(0, limit)}...`
}


const formatBytes = (bytes) => {
  const v = Number(bytes || 0)
  if (!v) return '-'
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(2)} KB`
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(2)} MB`
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`
}

watch(visible, (open) => {
  if (open) recalcDrawerWidth()
})

onMounted(async () => {
  recalcDrawerWidth()
  window.addEventListener('resize', recalcDrawerWidth)
  await refreshAll()
  timer = window.setInterval(refreshAll, refreshIntervalMs)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcDrawerWidth)
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
  if (detailPollTimer) {
    window.clearInterval(detailPollTimer)
    detailPollTimer = null
  }
})
</script>

<style scoped>
.task-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

:deep(.task-drawer .el-drawer__body) {
  padding: 16px 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.task-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

:deep(.task-drawer .el-drawer__title) {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.task-fab {
  position: fixed;
  right: 24px;
  bottom: 164px;
  z-index: 2100;
  width: 56px;
  height: 56px;
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

.task-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(36, 55, 82, 0.28);
}

.fab-core {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fab-icon {
  font-size: 24px;
}

.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 11px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.95) 100%);
  box-shadow: 0 10px 26px -16px rgba(15, 23, 42, 0.22);
}

.summary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.summary-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 13px;
  width: fit-content;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.75);
  color: #0f172a;
}

.status-pill.is-success {
  border-color: rgba(22, 163, 74, 0.28);
  background: rgba(236, 253, 245, 0.85);
  color: #065f46;
}

.status-pill.is-warning {
  border-color: rgba(194, 138, 54, 0.28);
  background: rgba(255, 251, 235, 0.9);
  color: #7c2d12;
}

.status-pill.is-danger {
  border-color: rgba(180, 35, 24, 0.24);
  background: rgba(255, 242, 242, 0.9);
  color: #7f1d1d;
}

.status-icon {
  font-size: 16px;
}

.summary-kpis {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-size: 12px;
}

.summary-kpis b {
  color: #0f172a;
  font-weight: 800;
}

.dot {
  opacity: 0.6;
}

.summary-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.summary-update {
  font-size: 12px;
  color: #64748b;
}

.refresh-btn {
  border-radius: 10px;
  font-weight: 700;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-item {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-item--editable {
  gap: 6px;
}

.metric-inline-btn {
  align-self: flex-end;
}

.metric-item--queue {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.metric-item--queue .metric-label {
  flex: 0 0 auto;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.queue-tags {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 0;
  align-items: stretch;
  width: 100%;
}

:deep(.queue-tags .el-tag) {
  width: 100%;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
}

.running-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  min-height: 360px;
  max-height: min(58vh, 520px);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.card-sub {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 12px;
  color: #64748b;
}

.card-sub-seg b {
  color: #0f172a;
  font-weight: 800;
}

.card-sub-seg--run b {
  color: #166534;
}

.card-sub-seg--queue b {
  color: #b45309;
}

.card-sub-dot {
  opacity: 0.45;
}

.running-list {
  max-height: none;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  padding-right: 4px;
  flex: 1 1 auto;
}

.running-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 10px 10px 10px 14px;
  background: linear-gradient(180deg, #ffffff 0%, rgba(248, 250, 252, 0.9) 100%);
  box-shadow: 0 10px 24px -18px rgba(15, 23, 42, 0.28);
  overflow-x: hidden;
  overflow-y: visible;
  min-width: 0;
  min-height: 112px;
  width: 100%;
  height: auto;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.running-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #94a3b8;
}

.running-item.is-running::before {
  background: #16a34a;
}

.running-item.is-queued::before,
.running-item.is-pending::before {
  background: #f59e0b;
}

.running-item.is-error::before,
.running-item.is-failed::before {
  background: #b42318;
}

.running-item.is-cancelled::before,
.running-item.is-canceled::before {
  background: #64748b;
}

.running-item:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 14px 32px -18px rgba(15, 23, 42, 0.32);
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.task-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-sub {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-stage-current {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.stage-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.stage-title {
  font-size: 12px;
  color: #64748b;
}

.stage-name {
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-stage-progress {
  width: 100%;
  min-width: 0;
}

.stage-percent {
  font-size: 12px;
  color: #475569;
  font-weight: 700;
  justify-self: end;
}

.stage-trace-list {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-trace-chip {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  font-size: 11px;
  color: #475569;
}

.stage-trace-chip.is-success {
  border-color: rgba(22, 163, 74, 0.28);
  background: rgba(236, 253, 245, 0.85);
  color: #166534;
}

.stage-trace-chip.is-running {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(239, 246, 255, 0.9);
  color: #1d4ed8;
}

.stage-trace-chip.is-failed {
  border-color: rgba(180, 35, 24, 0.24);
  background: rgba(255, 242, 242, 0.9);
  color: #991b1b;
}

.stage-trace-chip.is-skipped {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
}

.sub-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(241, 245, 249, 0.7);
  min-width: 0;
}

.sub-chip--file {
  flex: 1 1 100%;
  min-width: 0;
}

.sub-k {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.sub-v {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.sub-chip--file .sub-v {
  white-space: normal;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  line-height: 1.35;
  max-height: 2.75em;
}

.task-foot {
  margin-top: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.task-foot-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 160px;
}

.task-foot-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.task-id-pill {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-id-pill--link {
  cursor: pointer;
}

.task-id-pill--link:hover {
  border-color: rgba(37, 99, 235, 0.4);
  color: #1d4ed8;
}

.task-runtime {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.task-error {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(180, 35, 24, 0.24);
  background: rgba(255, 242, 242, 0.9);
  color: #991b1b;
  font-size: 12px;
  line-height: 1.4;
}

.runtime-chip {
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.86) 100%);
  color: #334155;
  font-weight: 700;
  line-height: 1.25;
  box-shadow: 0 4px 10px -8px rgba(15, 23, 42, 0.25);
}

:deep(.running-item .el-tag) {
  border-radius: 999px;
  font-weight: 800;
}

.cancel-btn,
.detail-btn {
  border-radius: 10px;
  font-weight: 700;
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
}

:deep(.detail-btn.el-button.is-text) {
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.28);
  background: rgba(239, 246, 255, 0.92);
}

:deep(.detail-btn.el-button.is-text:hover) {
  color: #1e40af;
  border-color: rgba(37, 99, 235, 0.42);
  background: rgba(219, 234, 254, 0.95);
}

:deep(.cancel-btn.el-button.is-text) {
  color: #b42318;
  border: 1px solid rgba(180, 35, 24, 0.24);
  background: rgba(255, 242, 242, 0.92);
}

:deep(.cancel-btn.el-button.is-text:hover) {
  color: #991b1b;
  border-color: rgba(180, 35, 24, 0.38);
  background: rgba(254, 226, 226, 0.95);
}
.system-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.92);
}

.system-row {
  display: grid;
  grid-template-columns: 82px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-top: 1px dashed rgba(148, 163, 184, 0.35);
}

.system-row:first-of-type {
  border-top: none;
  padding-top: 2px;
}

.system-label {
  font-size: 12px;
  color: #64748b;
}

.system-bar {
  min-width: 0;
}

.system-bar--text {
  font-size: 12px;
  color: #334155;
}

.system-val {
  font-size: 12px;
  color: #334155;
}
</style>
