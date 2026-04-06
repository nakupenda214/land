<template>
  <div class="party-summary-tab">
    <div class="filter-panel">
      <div class="filter-row">
        <el-select v-model="formQuery.isParsed" class="filter-item" placeholder="是否已解析" clearable>
          <el-option label="已解析" :value="1" />
          <el-option label="未解析" :value="0" />
        </el-select>
        <el-select v-model="formQuery.parseStatus" class="filter-item" placeholder="解析状态" clearable>
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
        </el-select>
        <el-input v-model.trim="formQuery.propertyCertificateNumber" class="filter-item" placeholder="不动产权证编号（模糊）" clearable @keyup.enter="handleSearchForms" />
        <el-input v-model.trim="formQuery.contractApprovalNumber" class="filter-item" placeholder="合同/批文编号（模糊）" clearable @keyup.enter="handleSearchForms" />
      </div>
      <div class="filter-actions">
        <el-button type="primary" @click="handleSearchForms">查询</el-button>
        <el-button @click="handleResetForms">重置</el-button>
        <el-button :icon="Refresh" @click="fetchForms">刷新</el-button>
      </div>
    </div>

    <section class="panel forms-panel" v-loading="formsLoading">
      <div class="panel-header titlebar">
        <span class="panel-title">项目方实测汇总主表</span>
        <span class="panel-sub">共 {{ formTotal }} 条</span>
      </div>
      <el-table :data="forms" border stripe row-key="id" :max-height="350" @row-click="handleFormRowClick">
        <el-table-column type="index" width="64" label="序号" align="center" />
        <el-table-column prop="fileRecordId" label="文件ID" width="110" align="center" />
        <el-table-column prop="phase" label="期数" width="90" align="center" />
        <el-table-column prop="propertyCertificateNumber" label="不动产权证编号" min-width="170" show-overflow-tooltip />
        <el-table-column prop="contractApprovalNumber" label="合同/批文编号" min-width="170" show-overflow-tooltip />
        <el-table-column label="解析状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="parseStatusTagType[row.parseStatus] || 'info'">{{ parseStatusText[row.parseStatus] || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否已解析" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="light" :type="Number(row.isParsed) === 1 ? 'success' : 'info'">{{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click.stop="openFormEdit(row)">编辑</el-button>
            <el-button size="small" type="primary" plain @click.stop="openAudit(row)">审核</el-button>
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
      <div class="panel-header titlebar">
        <span class="panel-title">项目方实测汇总行</span>
        <span class="panel-sub">共 {{ rowTotal }} 条</span>
      </div>
      <el-table :data="rows" border stripe row-key="id" :max-height="300">
        <el-table-column type="index" width="64" label="序号" align="center" />
        <el-table-column prop="rowIndex" label="行号" width="90" align="center" />
        <el-table-column prop="engineeringProject" label="工程项目/楼栋" min-width="160" show-overflow-tooltip />
        <el-table-column prop="contractApprovalNumber" label="合同/批文编号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="phase" label="期数" width="90" align="center" />
        <el-table-column prop="actualTotalBuildingArea" label="实测总面积" width="120" align="right"><template #default="{ row }">{{ formatNum(row.actualTotalBuildingArea) }}</template></el-table-column>
        <el-table-column prop="totalBuildableArea" label="计容合计" width="120" align="right"><template #default="{ row }">{{ formatNum(row.totalBuildableArea) }}</template></el-table-column>
        <el-table-column prop="totalNonBuildableArea" label="不计容合计" width="130" align="right"><template #default="{ row }">{{ formatNum(row.totalNonBuildableArea) }}</template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
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

    <ProjectPartySummaryAuditDialog
      v-model="auditDialogVisible"
      :project-id="projectId"
      :file-record-id="currentAuditFileRecordId"
      :initial-file="currentAuditFile"
    />

    <el-dialog v-model="formEditVisible" title="编辑项目方实测汇总主表" width="760px" append-to-body>
      <el-form label-position="top">
        <el-row :gutter="12">
          <el-col :span="6"><el-form-item label="期数"><el-input-number v-model="formEdit.phase" :min="1" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="9"><el-form-item label="不动产权证编号"><el-input v-model.trim="formEdit.propertyCertificateNumber" /></el-form-item></el-col>
          <el-col :span="9"><el-form-item label="合同/批文编号"><el-input v-model.trim="formEdit.contractApprovalNumber" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="合同约定建筑面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="计容建筑面积"><el-input-number v-model="formEdit.declaredTotals.buildableTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="建筑面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="合同约定商业面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="计容商业面积"><el-input-number v-model="formEdit.declaredTotals.buildableCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="商业面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="合同约定住宅面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="计容住宅面积"><el-input-number v-model="formEdit.declaredTotals.buildableResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="住宅面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="解析状态">
              <el-select v-model="formEdit.parseStatus" clearable class="w100">
                <el-option label="成功" value="SUCCESS" />
                <el-option label="失败" value="FAILED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否已解析">
              <el-select v-model="formEdit.isParsed" clearable class="w100">
                <el-option label="已解析" :value="1" />
                <el-option label="未解析" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model.trim="formEdit.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="formEditLoading" @click="submitFormEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  queryProjectPartySummaryForms,
  queryProjectPartySummaryRows,
  updateProjectPartySummaryForm
} from '@/services/project.service'
import ProjectPartySummaryAuditDialog from '@/components/project-list/ProjectPartySummaryAuditDialog.vue'

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false }
})

const formsLoading = ref(false)
const rowsLoading = ref(false)
const forms = ref([])
const rows = ref([])
const formTotal = ref(0)
const rowTotal = ref(0)

const auditDialogVisible = ref(false)
const currentAuditFileRecordId = ref('')
const currentAuditFile = ref(null)

const formEditVisible = ref(false)
const formEditLoading = ref(false)
const formEdit = reactive({
  id: null,
  phase: null,
  propertyCertificateNumber: '',
  contractApprovalNumber: '',
  isParsed: null,
  parseStatus: '',
  remark: '',
  declaredTotals: {
    contractAgreedTotalBuildingArea: null,
    buildableTotalBuildingArea: null,
    differenceTotalBuildingArea: null,
    contractAgreedCommercialArea: null,
    buildableCommercialArea: null,
    differenceCommercialArea: null,
    contractAgreedResidentialArea: null,
    buildableResidentialArea: null,
    differenceResidentialArea: null
  }
})

const parseStatusText = {
  SUCCESS: '成功',
  PARTIAL: '成功',
  FAILED: '失败'
}

const parseStatusTagType = {
  SUCCESS: 'success',
  PARTIAL: 'success',
  FAILED: 'danger'
}

const formQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'updateTime',
  sortDirection: 'desc',
  projectId: '',
  isParsed: '',
  parseStatus: '',
  propertyCertificateNumber: '',
  contractApprovalNumber: ''
})

const rowQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'rowIndex',
  sortDirection: 'asc',
  projectId: '',
  fileRecordId: ''
})

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

const toNullableNumber = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
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
  if (formQuery.parseStatus) payload.parseStatus = formQuery.parseStatus
  if (formQuery.propertyCertificateNumber) payload.propertyCertificateNumber = formQuery.propertyCertificateNumber
  if (formQuery.contractApprovalNumber) payload.contractApprovalNumber = formQuery.contractApprovalNumber
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
    const res = await queryProjectPartySummaryForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      ElMessage.warning(res.data?.msg || '项目方汇总主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
  } catch (error) {
    console.error('查询项目方汇总主表失败:', error)
    forms.value = []
    formTotal.value = 0
    ElMessage.error('查询项目方汇总主表失败，请稍后重试')
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
    const res = await queryProjectPartySummaryRows(buildRowsPayload())
    if (res.data?.code !== 200) {
      rows.value = []
      rowTotal.value = 0
      ElMessage.warning(res.data?.msg || '项目方汇总行查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    rows.value = parsed.records
    rowTotal.value = parsed.total
  } catch (error) {
    console.error('查询项目方汇总行失败:', error)
    rows.value = []
    rowTotal.value = 0
    ElMessage.error('查询项目方汇总行失败，请稍后重试')
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
  formQuery.parseStatus = ''
  formQuery.propertyCertificateNumber = ''
  formQuery.contractApprovalNumber = ''
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
  rowQuery.fileRecordId = String(row?.fileRecordId || '')
  rowQuery.pageNum = 1
  fetchRows()
}

const openAudit = (row) => {
  currentAuditFileRecordId.value = String(row?.fileRecordId || '')
  currentAuditFile.value = {
    id: row?.fileRecordId,
    fileRecordId: row?.fileRecordId,
    originalName: `项目方实测汇总表-${row?.fileRecordId || '-'}`,
    fileType: 'XLSX'
  }
  auditDialogVisible.value = true
}

const openFormEdit = (row) => {
  formEdit.id = row?.id || null
  formEdit.phase = row?.phase ?? null
  formEdit.propertyCertificateNumber = row?.propertyCertificateNumber || ''
  formEdit.contractApprovalNumber = row?.contractApprovalNumber || ''
  formEdit.isParsed = row?.isParsed ?? null
  formEdit.parseStatus = row?.parseStatus || ''
  formEdit.remark = row?.remark || ''
  formEdit.declaredTotals = {
    contractAgreedTotalBuildingArea: row?.declaredTotals?.contractAgreedTotalBuildingArea ?? null,
    buildableTotalBuildingArea: row?.declaredTotals?.buildableTotalBuildingArea ?? null,
    differenceTotalBuildingArea: row?.declaredTotals?.differenceTotalBuildingArea ?? null,
    contractAgreedCommercialArea: row?.declaredTotals?.contractAgreedCommercialArea ?? null,
    buildableCommercialArea: row?.declaredTotals?.buildableCommercialArea ?? null,
    differenceCommercialArea: row?.declaredTotals?.differenceCommercialArea ?? null,
    contractAgreedResidentialArea: row?.declaredTotals?.contractAgreedResidentialArea ?? null,
    buildableResidentialArea: row?.declaredTotals?.buildableResidentialArea ?? null,
    differenceResidentialArea: row?.declaredTotals?.differenceResidentialArea ?? null
  }
  formEditVisible.value = true
}

const submitFormEdit = async () => {
  if (!formEdit.id) {
    ElMessage.warning('缺少主表ID，无法更新')
    return
  }
  formEditLoading.value = true
  try {
    const payload = {
      id: Number(formEdit.id),
      phase: toNullableNumber(formEdit.phase),
      propertyCertificateNumber: formEdit.propertyCertificateNumber || null,
      contractApprovalNumber: formEdit.contractApprovalNumber || null,
      isParsed: toNullableNumber(formEdit.isParsed),
      parseStatus: formEdit.parseStatus || null,
      remark: formEdit.remark || null,
      declaredTotals: {
        contractAgreedTotalBuildingArea: toNullableNumber(formEdit.declaredTotals.contractAgreedTotalBuildingArea),
        buildableTotalBuildingArea: toNullableNumber(formEdit.declaredTotals.buildableTotalBuildingArea),
        differenceTotalBuildingArea: toNullableNumber(formEdit.declaredTotals.differenceTotalBuildingArea),
        contractAgreedCommercialArea: toNullableNumber(formEdit.declaredTotals.contractAgreedCommercialArea),
        buildableCommercialArea: toNullableNumber(formEdit.declaredTotals.buildableCommercialArea),
        differenceCommercialArea: toNullableNumber(formEdit.declaredTotals.differenceCommercialArea),
        contractAgreedResidentialArea: toNullableNumber(formEdit.declaredTotals.contractAgreedResidentialArea),
        buildableResidentialArea: toNullableNumber(formEdit.declaredTotals.buildableResidentialArea),
        differenceResidentialArea: toNullableNumber(formEdit.declaredTotals.differenceResidentialArea)
      }
    }
    const res = await updateProjectPartySummaryForm(payload)
    if (res.data?.code !== 200) {
      ElMessage.error(res.data?.msg || '更新失败')
      return
    }
    ElMessage.success(res.data?.msg || '更新成功')
    formEditVisible.value = false
    await fetchForms()
  } catch (error) {
    console.error('更新项目方汇总主表失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    formEditLoading.value = false
  }
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
      await Promise.all([fetchForms(), fetchRows()])
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.party-summary-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
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
  grid-template-columns: 150px 150px minmax(0, 1fr) minmax(0, 1fr);
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
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #24364b;
}

.panel-sub {
  font-size: 12px;
  color: #77879b;
}

.titlebar {
  margin: 0 -12px 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #e4ebf4;
  background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
}

.rows-panel {
  min-height: 320px;
}

.pager-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.w100 {
  width: 100%;
}

:deep(.el-table th.el-table__cell) {
  background: #f7f9fc;
  color: #4b5d74;
  font-weight: 600;
}

:deep(.el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

@media (max-width: 1400px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    justify-content: flex-end;
  }
}
</style>
