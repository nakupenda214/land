<template>
  <div class="dashboard-page">
    <el-card shadow="never" class="dashboard-card filter-card">
      <div class="filter-panel">
        <div class="filter-brand">
          <div class="brand-icon-wrap">
            <el-icon class="brand-icon"><DataAnalysis /></el-icon>
          </div>
          <div class="brand-copy">
            <div class="brand-title-row">
              <span class="brand-title">首页项目工作台</span>
              <span class="brand-pill">总项目 {{ total }}</span>
            </div>
            <p class="brand-desc">支持多维条件筛选，快速进入项目详情进行档案、合同和实测数据处理</p>
          </div>
        </div>
        <div class="filter-row">
          <el-input
            v-model.trim="queryForm.projectName"
            class="filter-item"
            placeholder="项目名称"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><OfficeBuilding /></el-icon></template>
          </el-input>
          <el-input
            v-model.trim="queryForm.projectCode"
            class="filter-item"
            placeholder="项目编号"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><Tickets /></el-icon></template>
          </el-input>
          <el-input
            v-model.trim="queryForm.location"
            class="filter-item"
            placeholder="项目位置"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><Location /></el-icon></template>
          </el-input>
          <el-input
            v-model.trim="queryForm.plannedUse"
            class="filter-item"
            placeholder="规划用途"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><CollectionTag /></el-icon></template>
          </el-input>
          <el-date-picker
            v-model="queryForm.projectTimeRange"
            class="filter-item"
            type="monthrange"
            range-separator="至"
            start-placeholder="开始月"
            end-placeholder="结束月"
            clearable
            unlink-panels
          />
        </div>
        <div class="filter-actions">
          <el-button class="biz-btn action-primary" :loading="tableLoading" @click="handleSearch">查询</el-button>
          <el-button class="biz-btn action-ghost" :disabled="tableLoading" @click="handleReset">重置</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="dashboard-card table-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-title">项目清单</div>
          <div class="project-count">共有项目：{{ total }} 个</div>
          <div class="selected-count">已勾选：{{ selectedRows.length }} 个</div>
        </div>
        <div class="table-actions">
          <el-button class="biz-btn action-ghost" :disabled="selectedRows.length === 0" @click="handlePrintSelected">
            打印报表
          </el-button>
          <el-button class="biz-btn action-ghost" :loading="tableLoading" @click="fetchList">刷新</el-button>
        </div>
      </div>

      <el-table
        :data="tableData"
        border
        stripe
        class="project-table"
        height="calc(100vh - 300px)"
        :row-class-name="getRowClassName"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column prop="projectName" label="项目名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="150" show-overflow-tooltip />
        <el-table-column prop="location" label="项目位置" min-width="180" show-overflow-tooltip />
        <el-table-column prop="plannedUse" label="规划用途" min-width="130" show-overflow-tooltip />
        <el-table-column prop="projectTime" label="项目时间" min-width="120" align="center" />
        <el-table-column prop="surveyReportFileCount" label="实测报告数" width="120" align="center" />
        <el-table-column prop="contractFileCount" label="合同文件数" width="120" align="center" />
        <el-table-column prop="transferor" label="出让方" min-width="160" show-overflow-tooltip />
        <el-table-column prop="transferee" label="受让方" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="350" align="center" fixed="right">
          <template #default="{ row }">
            <el-space :size="40">
              <el-button class="biz-btn action-primary btn-sm" @click="goProject(row)">进入项目</el-button>
              <el-button class="biz-btn action-danger btn-sm" @click="handleDeleteProject(row)">删除项目</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-wrap">
        <el-pagination
          v-model:current-page="queryForm.pageNum"
          v-model:page-size="queryForm.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <DashboardPrintBlock
      :is-printing="isPrinting"
      :print-title="printTitle"
      :print-time="printTime"
      :headers="printData.headers"
      :records="printData.records"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CollectionTag, DataAnalysis, Location, OfficeBuilding, Tickets } from '@element-plus/icons-vue'
import { deleteProjectById, queryProjectDetails } from '@/services/project.service'
import { useDashboardPrint } from '@/composables/dashboard/useDashboardPrint'
import { usePrint } from '@/hooks/usePrint.ts'
import DashboardPrintBlock from '@/components/dashboard/DashboardPrintBlock.vue'

const router = useRouter()

const queryForm = reactive({
  pageNum: 1,
  pageSize: 20,
  projectName: '',
  projectCode: '',
  location: '',
  plannedUse: '',
  projectTimeRange: []
})

const tableLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedRows = ref([])

const { buildPrintData } = useDashboardPrint()
const { isPrinting, triggerPrint } = usePrint()
const printRows = ref([])
const printTitle = ref('项目详情打印报表')

const formatMonth = (dateValue) => {
  if (!dateValue) return ''
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

const buildPayload = () => {
  const [start, end] = queryForm.projectTimeRange || []
  return {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    sortField: 'updateTime',
    sortDirection: 'desc',
    projectName: queryForm.projectName || undefined,
    projectCode: queryForm.projectCode || undefined,
    location: queryForm.location || undefined,
    plannedUse: queryForm.plannedUse || undefined,
    projectTimeStart: start ? formatMonth(start) : undefined,
    projectTimeEnd: end ? formatMonth(end) : undefined
  }
}

const fetchList = async () => {
  tableLoading.value = true
  try {
    const res = await queryProjectDetails(buildPayload())
    const data = res.data?.data || {}
    tableData.value = Array.isArray(data.records) ? data.records : []
    total.value = Number(data.total || 0)
  } catch (error) {
    console.error('查询项目详情失败:', error)
    ElMessage.error(error?.response?.data?.msg || '查询失败，请稍后重试')
  } finally {
    tableLoading.value = false
  }
}

const handleSearch = async () => {
  queryForm.pageNum = 1
  await fetchList()
}

const handleReset = async () => {
  queryForm.projectName = ''
  queryForm.projectCode = ''
  queryForm.location = ''
  queryForm.plannedUse = ''
  queryForm.projectTimeRange = []
  queryForm.pageNum = 1
  queryForm.pageSize = 20
  await fetchList()
}

const goProject = (row) => {
  const projectId = row?.id
  if (!projectId) {
    ElMessage.warning('当前项目ID缺失，无法进入项目页')
    return
  }
  router.push({
    name: 'ProjectList',
    query: { projectId: String(projectId) }
  })
}

const handlePrintSingle = (row) => {
  if (!row || typeof row !== 'object') {
    ElMessage.warning('当前行数据为空，无法打印')
    return
  }
  printRows.value = [row]
  printTitle.value = '项目详情打印报表'
  triggerPrint()
}

const handlePrintSelected = () => {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选需要打印的项目')
    return
  }
  printRows.value = [...selectedRows.value]
  printTitle.value = `项目详情打印报表（共 ${selectedRows.value.length} 项）`
  triggerPrint()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = Array.isArray(rows) ? rows : []
}

const getRowClassName = ({ row }) => {
  const id = row?.id
  if (!id) return ''
  return selectedRows.value.some((item) => item?.id === id) ? 'row-selected' : ''
}

const handleDeleteProject = async (row) => {
  const projectId = row?.id
  if (!projectId) {
    ElMessage.warning('当前项目ID缺失，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定删除项目“${row.projectName || projectId}”吗？删除前需确保项目下无文件且无进行中的文件任务。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const res = await deleteProjectById(projectId)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '项目删除成功')
      await fetchList()
      return
    }
    ElMessage.error(res.data?.msg || '项目删除失败')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    console.error('删除项目失败:', error)
    ElMessage.error(error?.response?.data?.msg || '删除失败，请稍后重试')
  }
}

const printTime = computed(() => new Date().toLocaleString())
const printData = computed(() => buildPrintData(printRows.value))

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 96px);
  padding: 4px 2px 0;
}

.dashboard-card {
  border-color: #d7dfe9;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.filter-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  overflow-x: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 14px 16px;
  padding: 14px;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, #ffffff 0%, var(--home-panel-grad-start) 100%);
}

.filter-brand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 260px;
  max-width: 380px;
}

.brand-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #2563eb 0%, #1e40af 100%);
  box-shadow: 0 10px 24px -12px rgba(30, 64, 175, 0.75);
}

.brand-icon {
  color: #fff;
  font-size: 22px;
}

.brand-copy {
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.brand-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
}

.brand-pill {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.brand-desc {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #607286;
}

.filter-row {
  flex: 1 1 720px;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1.4fr;
  gap: 14px;
  align-items: center;
}

.filter-item {
  width: 100%;
  min-width: 0;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-left: 12px;
  border-left: 1px dashed #d3ddea;
}

.filter-card :deep(.el-input__wrapper),
.filter-card :deep(.el-range-editor.el-input__wrapper) {
  border-radius: 8px;
  min-height: 38px;
}

.filter-card :deep(.el-input__prefix .el-icon) {
  color: #64748b;
}

.btn-sm {
  min-width: 92px;
  height: 34px;
  padding: 0 10px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 14px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, #f9fbff 0%, #f2f7fc 100%);
  padding: 10px 12px;
  margin-bottom: 10px;
}

.table-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.table-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.project-count {
  font-size: 13px;
  font-weight: 600;
  color: #5f6f87;
}

.selected-count {
  font-size: 12px;
  color: #516173;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #dbe4ef;
  background: #fff;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-table {
  flex: 1;
}
:deep(.project-table .el-table__body tr.row-selected > td.el-table__cell) {
  background: #edf4fb !important;
}

:deep(.project-table .el-table__header th.el-table__cell) {
  background: #f5f8fc;
  color: #4f5f77;
  font-weight: 700;
}

:deep(.project-table td.el-table__cell) {
  color: #374a62;
}

.biz-btn.action-primary {
  color: #1f4e79 !important;
  background: #e8f2fc !important;
  border-color: #c8ddf1 !important;
  font-weight: 600;
}

.biz-btn.action-primary:hover {
  color: #163a5a !important;
  background: #d7e7f8 !important;
  border-color: #b8d3ec !important;
}

.biz-btn.action-ghost {
  color: #44566e;
  background: #f4f7fb;
  border-color: #d2dce8;
  font-weight: 600;
}

.biz-btn.action-ghost:hover {
  color: #1f2937;
  background: #eaf0f7;
  border-color: #b6c4d8;
}

.biz-btn.action-danger {
  color: #b42318;
  background: #fff3f2;
  border-color: #f7c4bf;
}

.biz-btn.action-danger:hover {
  color: #912018;
  background: #ffe9e7;
  border-color: #f1a9a1;
}

:deep(.pager-wrap .el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  border-color: #c8ddf1 !important;
  color: #1f4e79 !important;
}

:deep(.pager-wrap .el-pagination.is-background .btn-next),
:deep(.pager-wrap .el-pagination.is-background .btn-prev),
:deep(.pager-wrap .el-pagination.is-background .el-pager li) {
  background: #f8fafc;
  color: #64748b;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

@media (max-width: 1400px) {
  .filter-panel {
    align-items: stretch;
  }

  .filter-brand {
    max-width: none;
  }

  .filter-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .filter-actions {
    justify-content: flex-end;
    border-left: none;
    padding-left: 0;
  }
}

@media (max-width: 992px) {
  .filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
