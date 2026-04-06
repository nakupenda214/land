<template>
  <div class="planning-tab">
    <div class="filter-panel">
      <div class="filter-row">
        <el-select v-model="formQuery.isParsed" class="filter-item" placeholder="解析状态" clearable>
          <el-option label="已解析" :value="1" />
          <el-option label="未解析" :value="0" />
        </el-select>
        <el-input
          v-model.trim="formQuery.projectName"
          class="filter-item"
          placeholder="项目名称（模糊）"
          clearable
          @keyup.enter="handleSearchForms"
        />
        <el-input
          v-model.trim="formQuery.constructionUnit"
          class="filter-item"
          placeholder="建设单位（模糊）"
          clearable
          @keyup.enter="handleSearchForms"
        />
      </div>
      <div class="filter-actions">
        <el-button type="primary" @click="handleSearchForms">查询</el-button>
        <el-button @click="handleResetForms">重置</el-button>
        <el-button :icon="Refresh" @click="fetchForms">刷新</el-button>
      </div>
    </div>

    <section class="panel forms-panel" v-loading="formsLoading">
      <div class="panel-header">
        <span class="panel-title">规划复核表主表</span>
        <span class="panel-sub">共 {{ formTotal }} 条</span>
      </div>
      <el-table
        :data="forms"
        border
        stripe
        row-key="id"
        :max-height="340"
        @row-click="handleFormRowClick"
      >
        <el-table-column type="index" width="64" label="序号" align="center" />
        <el-table-column prop="projectName" label="项目名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="constructionUnit" label="建设单位" min-width="180" show-overflow-tooltip />
        <el-table-column prop="designUnit" label="设计单位" min-width="180" show-overflow-tooltip />
        <el-table-column prop="constructionLocation" label="建设地点" min-width="140" show-overflow-tooltip />
        <el-table-column label="解析状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.isParsed) === 1 ? 'success' : 'info'" size="small" effect="light">
              {{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileRecordId" label="文件ID" width="120" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" plain @click.stop="openAudit(row)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="formTotal"
          :page-size="formQuery.pageSize"
          :current-page="formQuery.pageNum"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleFormSizeChange"
          @current-change="handleFormPageChange"
        />
      </div>
    </section>

    <section class="panel rows-panel" v-loading="rowsLoading">
      <div class="panel-header">
        <span class="panel-title">规划复核表行</span>
        <span class="panel-sub">共 {{ rowTotal }} 条</span>
      </div>
      <el-table
        :data="rows"
        border
        stripe
        row-key="id"
        :max-height="300"
      >
        <el-table-column type="index" width="110" label="序号" align="center" />
        <el-table-column prop="fileRecordId" label="文件ID" width="150" align="center" />
        <el-table-column prop="engineeringProject" label="工程项目/楼栋" min-width="150" show-overflow-tooltip />
        <el-table-column label="面积类别" width="180" align="center">
          <template #default="{ row }">{{ areaCategoryTextMap[row.areaCategory] || row.areaCategory || '-' }}</template>
        </el-table-column>
        <el-table-column prop="constructionNature" label="建设性质" width="200" align="center" />
        <el-table-column prop="buildingCount" label="栋数" width="150" align="center" />
        <el-table-column prop="aboveGroundFloors" label="地上层数" width="160" align="center" />
        <el-table-column prop="belowGroundFloors" label="地下层数" width="160" align="center" />
        <el-table-column prop="heightM" label="高度(m)" width="140" align="right">
          <template #default="{ row }">{{ formatNum(row.heightM) }}</template>
        </el-table-column>
        <el-table-column prop="baseAreaM2" label="基底面积(㎡)" width="170" align="right">
          <template #default="{ row }">{{ formatNum(row.baseAreaM2) }}</template>
        </el-table-column>
        <el-table-column prop="totalArea" label="总建筑面积(㎡)" width="180" align="right">
          <template #default="{ row }">{{ formatNum(row.totalArea) }}</template>
        </el-table-column>
        <el-table-column prop="farAboveGround" label="计容地上(㎡)" width="180" align="right">
          <template #default="{ row }">{{ formatNum(row.farAboveGround) }}</template>
        </el-table-column>
        <el-table-column prop="farBelowGround" label="计容地下(㎡)" width="180" align="right">
          <template #default="{ row }">{{ formatNum(row.farBelowGround) }}</template>
        </el-table-column>
      </el-table>
      <div class="pager-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="rowTotal"
          :page-size="rowQuery.pageSize"
          :current-page="rowQuery.pageNum"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleRowSizeChange"
          @current-change="handleRowPageChange"
        />
      </div>
    </section>

    <PlanningReviewAuditDialog
      v-model="auditDialogVisible"
      :project-id="currentAuditProjectId"
      :form-data="currentAuditForm"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { queryPlanningReviewForms, queryPlanningReviewRows } from '@/services/project.service'
import PlanningReviewAuditDialog from '@/components/project-list/PlanningReviewAuditDialog.vue'

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

const formsLoading = ref(false)
const rowsLoading = ref(false)
const forms = ref([])
const rows = ref([])
const formTotal = ref(0)
const rowTotal = ref(0)
const auditDialogVisible = ref(false)
const currentAuditForm = ref(null)
const activeFileRecordId = ref('')

const areaCategoryTextMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  OTHER_PENDING: '其他待定'
}

const formQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'updateTime',
  sortDirection: 'desc',
  projectId: '',
  isParsed: '',
  projectName: '',
  constructionUnit: ''
})

const rowQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'rowIndex',
  sortDirection: 'asc',
  projectId: '',
  fileRecordId: ''
})

const currentAuditProjectId = computed(() =>
  currentAuditForm.value?.projectId || props.projectId
)

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const value = Number(num)
  return Number.isNaN(value) ? '-' : value.toFixed(2)
}

const buildFormPayload = () => {
  const payload = {
    pageNum: formQuery.pageNum,
    pageSize: formQuery.pageSize,
    sortField: formQuery.sortField,
    sortDirection: formQuery.sortDirection,
    projectId: Number(formQuery.projectId)
  }
  if (formQuery.isParsed !== '' && formQuery.isParsed !== null && formQuery.isParsed !== undefined) {
    payload.isParsed = Number(formQuery.isParsed)
  }
  if (formQuery.projectName) payload.projectName = formQuery.projectName
  if (formQuery.constructionUnit) payload.constructionUnit = formQuery.constructionUnit
  return payload
}

const buildRowsPayload = () => {
  const payload = {
    pageNum: rowQuery.pageNum,
    pageSize: rowQuery.pageSize,
    sortField: rowQuery.sortField,
    sortDirection: rowQuery.sortDirection,
    projectId: Number(rowQuery.projectId)
  }
  if (rowQuery.fileRecordId) payload.fileRecordId = Number(rowQuery.fileRecordId)
  return payload
}

const fetchForms = async () => {
  if (!formQuery.projectId) {
    forms.value = []
    formTotal.value = 0
    return
  }
  formsLoading.value = true
  try {
    const res = await queryPlanningReviewForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      ElMessage.warning(res.data?.msg || '规划复核主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
  } catch (error) {
    console.error('查询规划复核主表失败:', error)
    forms.value = []
    formTotal.value = 0
    ElMessage.error('查询规划复核主表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const fetchRows = async () => {
  if (!rowQuery.projectId) {
    rows.value = []
    rowTotal.value = 0
    return
  }
  rowsLoading.value = true
  try {
    const res = await queryPlanningReviewRows(buildRowsPayload())
    if (res.data?.code !== 200) {
      rows.value = []
      rowTotal.value = 0
      ElMessage.warning(res.data?.msg || '规划复核表行查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    rows.value = parsed.records
    rowTotal.value = parsed.total
  } catch (error) {
    console.error('查询规划复核表行失败:', error)
    rows.value = []
    rowTotal.value = 0
    ElMessage.error('查询规划复核表行失败，请稍后重试')
  } finally {
    rowsLoading.value = false
  }
}

const handleSearchForms = () => {
  formQuery.pageNum = 1
  fetchForms()
}

const handleResetForms = () => {
  formQuery.pageNum = 1
  formQuery.pageSize = 20
  formQuery.isParsed = ''
  formQuery.projectName = ''
  formQuery.constructionUnit = ''
  fetchForms()
}

const handleFormPageChange = (page) => {
  formQuery.pageNum = page
  fetchForms()
}

const handleFormSizeChange = (size) => {
  formQuery.pageSize = size
  formQuery.pageNum = 1
  fetchForms()
}

const handleRowPageChange = (page) => {
  rowQuery.pageNum = page
  fetchRows()
}

const handleRowSizeChange = (size) => {
  rowQuery.pageSize = size
  rowQuery.pageNum = 1
  fetchRows()
}

const handleFormRowClick = (row) => {
  activeFileRecordId.value = String(row?.fileRecordId || '')
  rowQuery.fileRecordId = activeFileRecordId.value
  rowQuery.pageNum = 1
  fetchRows()
}

const openAudit = (row) => {
  currentAuditForm.value = row
  auditDialogVisible.value = true
}

watch(
  () => [props.projectId, props.active],
  async ([projectId, active]) => {
    const pid = projectId ? String(projectId) : ''
    formQuery.projectId = pid
    rowQuery.projectId = pid
    if (!pid) {
      forms.value = []
      formTotal.value = 0
      rows.value = []
      rowTotal.value = 0
      return
    }
    if (active) {
      formQuery.pageNum = 1
      rowQuery.pageNum = 1
      rowQuery.fileRecordId = ''
      activeFileRecordId.value = ''
      await Promise.all([fetchForms(), fetchRows()])
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.planning-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 290px);
  min-height: 620px;
}

.filter-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
}

.filter-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  flex: 1;
}

.filter-item {
  width: 100%;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

:deep(.filter-actions .el-button) {
  min-width: 82px;
  height: 34px;
  border-radius: 6px;
  font-weight: 600;
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

.panel {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #2a3a4f;
}

.panel-sub {
  color: #64748b;
  font-size: 13px;
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

:deep(.el-table th.el-table__cell) {
  background: #f7f9fc;
  color: #4b5d74;
  font-weight: 600;
}

@media (max-width: 1320px) {
  .planning-tab {
    height: auto;
    min-height: 0;
  }
}
</style>
