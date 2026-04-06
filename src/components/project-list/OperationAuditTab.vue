<template>
  <div class="audit-tab">
    <div class="filter-panel">
      <div class="filter-row">
        <el-input
          v-model.trim="queryForm.operatorId"
          class="filter-item"
          placeholder="操作人ID"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-select v-model="queryForm.operation" class="filter-item" placeholder="操作类型" clearable>
          <el-option v-for="item in operationOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="queryForm.targetType" class="filter-item" placeholder="目标类型" clearable>
          <el-option v-for="item in targetTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input
          v-model.trim="queryForm.targetId"
          class="filter-item"
          placeholder="目标ID"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-date-picker
          v-model="queryForm.operateTimeRange"
          class="filter-item"
          type="datetimerange"
          value-format="YYYY-MM-DDTHH:mm:ss"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          range-separator="至"
        />
      </div>

      <div class="filter-actions">
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button :icon="Refresh" @click="fetchLogs">刷新</el-button>
      </div>
    </div>

    <div class="table-panel" v-loading="loading">
      <el-table :data="logs" border stripe height="100%">
        <el-table-column :resizable="false" type="index" label="序号" width="72" align="center" :index="(idx) => idx + 1" />
        <el-table-column :resizable="false" prop="operatorName" label="操作人" width="160" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.operatorName || '-' }}</template>
        </el-table-column>
        <el-table-column :resizable="false" prop="operateTime" label="操作时间" width="200" align="center">
          <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
        </el-table-column>
        <el-table-column :resizable="false" prop="operation" label="操作类型" width="140" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ operationLabelMap[row.operation] || row.operation || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :resizable="false" prop="targetType" label="目标类型" width="150" align="center">
          <template #default="{ row }">{{ targetTypeLabelMap[row.targetType] || row.targetType || '-' }}</template>
        </el-table-column>
        <el-table-column :resizable="false" prop="targetId" label="目标ID" width="140" align="center" show-overflow-tooltip />
        <el-table-column :resizable="false" prop="changeSummary" label="行为" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">{{ formatChangeSummary(row.changeSummary) }}</template>
        </el-table-column>
      </el-table>

      <div class="pager-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="queryForm.pageSize"
          :current-page="queryForm.pageNum"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { queryOperationAuditLogs } from '@/services/project.service'

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  }
})

const operationOptions = [
  { label: '创建', value: 'CREATE' },
  { label: '更新', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '上传', value: 'UPLOAD' },
  { label: '移动', value: 'MOVE' }
]

const operationLabelMap = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  UPLOAD: '上传',
  MOVE: '移动'
}

const targetTypeLabelMap = {
  project: '项目',
  contract: '合同',
  land_parcel: '地块',
  room_info: '户室',
  survey_report: '实测报告',
  file: '文件',
  file_archive: '归档夹',
  usage_config: '用途配置'
}

const targetTypeOptions = Object.entries(targetTypeLabelMap).map(([value, label]) => ({ label, value }))

const loading = ref(false)
const logs = ref([])
const total = ref(0)

const queryForm = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'operateTime',
  sortDirection: 'desc',
  operatorId: '',
  operation: '',
  targetType: '',
  projectId: '',
  targetId: '',
  operateTimeRange: []
})

const normalizeResult = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

const formatChangeSummary = (value) => {
  if (value == null || value === '') return '-'
  const text = String(value).trim()
  if (!text || text === '[]') return '-'
  return text
}

const buildPayload = () => {
  const payload = {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    sortField: queryForm.sortField,
    sortDirection: queryForm.sortDirection
  }
  if (queryForm.operatorId) payload.operatorId = Number(queryForm.operatorId)
  if (queryForm.operation) payload.operation = queryForm.operation
  if (queryForm.targetType) payload.targetType = queryForm.targetType
  if (queryForm.projectId) payload.projectId = Number(queryForm.projectId)
  if (queryForm.targetId) payload.targetId = queryForm.targetId
  if (Array.isArray(queryForm.operateTimeRange) && queryForm.operateTimeRange.length === 2) {
    payload.operateTimeStart = queryForm.operateTimeRange[0]
    payload.operateTimeEnd = queryForm.operateTimeRange[1]
  }
  return payload
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await queryOperationAuditLogs(buildPayload())
    if (res.data?.code !== 200) {
      logs.value = []
      total.value = 0
      ElMessage.warning(res.data?.msg || '审计日志查询失败')
      return
    }
    const parsed = normalizeResult(res.data?.data)
    logs.value = parsed.records
    total.value = parsed.total
  } catch (error) {
    console.error('查询审计日志失败:', error)
    logs.value = []
    total.value = 0
    ElMessage.error('查询审计日志失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryForm.pageNum = 1
  fetchLogs()
}

const handleReset = () => {
  queryForm.pageNum = 1
  queryForm.pageSize = 20
  queryForm.operatorId = ''
  queryForm.operation = ''
  queryForm.targetType = ''
  queryForm.targetId = ''
  queryForm.operateTimeRange = []
  queryForm.projectId = props.projectId ? String(props.projectId) : ''
  fetchLogs()
}

const handleSizeChange = (size) => {
  queryForm.pageSize = size
  queryForm.pageNum = 1
  fetchLogs()
}

const handlePageChange = (page) => {
  queryForm.pageNum = page
  fetchLogs()
}

watch(
  () => [props.projectId, props.active],
  ([projectId, active]) => {
    queryForm.projectId = projectId ? String(projectId) : ''
    if (active) {
      queryForm.pageNum = 1
      fetchLogs()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.audit-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 300px);
  min-height: 560px;
}

.filter-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
}

.filter-row {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1.4fr;
  gap: 14px;
  align-items: center;
}

.filter-item {
  width: 100%;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

:deep(.filter-actions .el-button) {
  min-width: 76px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

:deep(.filter-actions .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.filter-actions .el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

.table-panel {
  flex: 1;
  min-height: 0;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.pager-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .el-pager li) {
  background: #f3f4f6;
  color: #475569;
}

@media (max-width: 1200px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .filter-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 760px) {
  .filter-row {
    grid-template-columns: 1fr;
  }
}
</style>
