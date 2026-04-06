<template>
  <el-dialog
    v-model="dialogVisible"
    title="项目方实测汇总表审核"
    fullscreen
    append-to-body
    :close-on-click-modal="false"
    class="party-summary-audit-dialog"
    @closed="handleClosed"
  >
    <div class="audit-layout">
      <section class="left-panel" v-loading="metaLoading || mdLoading || excelPreviewLoading">
        <div class="left-toolbar">
          <div class="file-name">{{ fileMeta.originalName || '项目方实测汇总表' }}</div>
          <div class="left-actions">
            <el-button size="small" :type="leftView === 'source' ? 'primary' : 'default'" @click="leftView = 'source'">原始文件</el-button>
            <el-button size="small" :type="leftView === 'excel' ? 'primary' : 'default'" @click="leftView = 'excel'">Excel预览</el-button>
            <el-button size="small" :type="leftView === 'markdown' ? 'primary' : 'default'" @click="leftView = 'markdown'">解析内容(MD)</el-button>
          </div>
        </div>

        <div v-if="leftView === 'source'" class="source-view">
          <div class="meta-quick-row">
            <span class="meta-chip">文件ID：{{ fileMeta.id || '-' }}</span>
            <span class="meta-chip">类型：{{ fileMeta.fileType || '-' }}</span>
            <span class="meta-chip">大小：{{ formatFileSize(fileMeta.fileSize) }}</span>
          </div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="文件名">{{ fileMeta.originalName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件类型">{{ fileMeta.fileType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件大小">{{ formatFileSize(fileMeta.fileSize) }}</el-descriptions-item>
            <el-descriptions-item label="上传时间">{{ formatDateTime(fileMeta.uploadTime) }}</el-descriptions-item>
            <el-descriptions-item label="GridFS ID">{{ fileMeta.gridfsId || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div class="source-tip">Excel 文件支持左侧“Excel预览”，如需完整原表格式可下载后查看。</div>

          <el-button type="primary" :disabled="!fileMeta.gridfsId" @click="downloadSourceFile">下载原始Excel</el-button>
        </div>

        <div v-else-if="leftView === 'excel'" class="excel-view">
          <div class="excel-toolbar">
            <span class="excel-sheet-label">工作表</span>
            <el-select v-model="selectedSheet" size="small" class="sheet-select" placeholder="选择工作表" @change="renderSheetPreview">
              <el-option v-for="name in excelSheetNames" :key="name" :label="name" :value="name" />
            </el-select>
            <span class="preview-tip">原表样式预览（前 300 行）</span>
          </div>
          <el-empty v-if="!excelColumns.length" description="暂无可预览内容" />
          <el-table
            v-else
            :data="excelRows"
            border
            height="100%"
            class="excel-preview-table"
            :header-cell-style="{ background: '#f1f5fb', color: '#40566f', fontWeight: 600 }"
          >
            <el-table-column prop="__rowNo" label="#" width="56" align="center" fixed="left" />
            <el-table-column
              v-for="col in excelColumns"
              :key="col.key"
              :prop="col.key"
              :label="col.label"
              :min-width="col.minWidth"
              show-overflow-tooltip
            />
          </el-table>
        </div>

        <div v-else class="md-view">
          <el-empty v-if="!recognitionMdContent" description="暂无解析内容" />
          <div v-else class="md-content" v-html="recognitionHtml" />
        </div>
      </section>

      <section class="right-panel">
        <div class="query-bar">
          <div class="query-left">
            <span class="row-count">共 {{ rowTotal }} 行</span>
            <el-tag size="small" type="info" effect="plain">summaryFormId: {{ summaryFormId || '-' }}</el-tag>
          </div>
          <div class="query-actions">
            <el-button size="small" type="primary" plain @click="openCreateDialog" :disabled="!canCreateRow">新增行</el-button>
            <el-button size="small" :icon="Refresh" @click="fetchRows">刷新</el-button>
          </div>
        </div>

        <div class="table-wrap" v-loading="rowsLoading">
          <el-table :data="rows" border stripe height="100%" row-key="id">
            <el-table-column type="index" label="序号" width="64" align="center" />
            <el-table-column prop="rowIndex" label="行号" width="80" align="center" />
            <el-table-column prop="engineeringProject" label="工程项目/楼栋" min-width="170" show-overflow-tooltip />
            <el-table-column prop="propertyCertificateNumber" label="不动产权证编号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="contractApprovalNumber" label="合同/批文编号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="phase" label="期数" width="82" align="center" />
            <el-table-column prop="actualTotalBuildingArea" label="实测总面积" width="120" align="right"><template #default="{ row }">{{ formatNum(row.actualTotalBuildingArea) }}</template></el-table-column>
            <el-table-column prop="actualCommercialArea" label="商业" width="96" align="right"><template #default="{ row }">{{ formatNum(row.actualCommercialArea) }}</template></el-table-column>
            <el-table-column prop="actualResidentialArea" label="住宅" width="96" align="right"><template #default="{ row }">{{ formatNum(row.actualResidentialArea) }}</template></el-table-column>
            <el-table-column prop="actualManagementRoomArea" label="物管" width="96" align="right"><template #default="{ row }">{{ formatNum(row.actualManagementRoomArea) }}</template></el-table-column>
            <el-table-column prop="actualOtherBuildableArea" label="其他计容" width="110" align="right"><template #default="{ row }">{{ formatNum(row.actualOtherBuildableArea) }}</template></el-table-column>
            <el-table-column prop="actualCommunityArea" label="社区" width="96" align="right"><template #default="{ row }">{{ formatNum(row.actualCommunityArea) }}</template></el-table-column>
            <el-table-column prop="actualOtherPublicArea" label="公用" width="96" align="right"><template #default="{ row }">{{ formatNum(row.actualOtherPublicArea) }}</template></el-table-column>
            <el-table-column prop="totalBuildableArea" label="计容合计" width="110" align="right"><template #default="{ row }">{{ formatNum(row.totalBuildableArea) }}</template></el-table-column>
            <el-table-column prop="totalNonBuildableArea" label="不计容合计" width="120" align="right"><template #default="{ row }">{{ formatNum(row.totalNonBuildableArea) }}</template></el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="150" align="center" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" text @click="openEditDialog(row)">编辑</el-button>
                <el-popconfirm title="确认删除该行？" @confirm="handleDeleteRow(row)">
                  <template #reference>
                    <el-button size="small" type="danger" text>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pager-row">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :total="rowTotal"
            :page-size="query.pageSize"
            :current-page="query.pageNum"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </section>
    </div>

    <el-dialog v-model="editDialogVisible" :title="isCreating ? '新增汇总行' : '编辑汇总行'" width="980px" append-to-body>
      <el-form label-position="top">
        <el-row :gutter="12">
          <el-col :span="4"><el-form-item label="行号"><el-input-number v-model="editForm.rowIndex" :min="1" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="工程项目/楼栋"><el-input v-model.trim="editForm.engineeringProject" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="不动产权证编号"><el-input v-model.trim="editForm.propertyCertificateNumber" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="合同/批文编号"><el-input v-model.trim="editForm.contractApprovalNumber" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="4"><el-form-item label="期数"><el-input-number v-model="editForm.phase" :min="1" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="实测总面积"><el-input-number v-model="editForm.actualTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="商业"><el-input-number v-model="editForm.actualCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="住宅"><el-input-number v-model="editForm.actualResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="物管"><el-input-number v-model="editForm.actualManagementRoomArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="6"><el-form-item label="其他计容"><el-input-number v-model="editForm.actualOtherBuildableArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="社区"><el-input-number v-model="editForm.actualCommunityArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="公用"><el-input-number v-model="editForm.actualOtherPublicArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="计容合计"><el-input-number v-model="editForm.totalBuildableArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="6"><el-form-item label="不计容合计"><el-input-number v-model="editForm.totalNonBuildableArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
          <el-col :span="9"><el-form-item label="房地产勘测报告书编号"><el-input v-model.trim="editForm.realEstateSurveyReportNumber" /></el-form-item></el-col>
          <el-col :span="9"><el-form-item label="房产面积确认告知书编号"><el-input v-model.trim="editForm.propertyAreaConfirmationNoticeNumber" /></el-form-item></el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model.trim="editForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSaveRow">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { downloadGridFsFile, queryFiles } from '@/services/file.service'
import {
  createProjectPartySummaryRow,
  deleteProjectPartySummaryRow,
  queryProjectPartySummaryRows,
  updateProjectPartySummaryRow
} from '@/services/project.service'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  fileRecordId: { type: [String, Number], default: '' },
  initialFile: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const leftView = ref('source')
const metaLoading = ref(false)
const mdLoading = ref(false)
const rowsLoading = ref(false)
const excelPreviewLoading = ref(false)
const saveLoading = ref(false)
const rows = ref([])
const rowTotal = ref(0)
const summaryFormId = ref('')

const recognitionMdContent = ref('')
const { recognitionHtml } = useRecognitionMarkdown({ recognitionMdContent })

const fileMeta = reactive({
  id: null,
  originalName: '',
  fileType: '',
  fileSize: 0,
  uploadTime: '',
  gridfsId: ''
})

const excelWorkbook = ref(null)
const excelSheetNames = ref([])
const selectedSheet = ref('')
const excelColumns = ref([])
const excelRows = ref([])

const query = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'rowIndex',
  sortDirection: 'asc'
})

const editDialogVisible = ref(false)
const isCreating = ref(false)
const editForm = reactive({
  id: null,
  rowIndex: 1,
  engineeringProject: '',
  propertyCertificateNumber: '',
  contractApprovalNumber: '',
  phase: 1,
  actualTotalBuildingArea: null,
  actualCommercialArea: null,
  actualResidentialArea: null,
  actualManagementRoomArea: null,
  actualOtherBuildableArea: null,
  actualCommunityArea: null,
  actualOtherPublicArea: null,
  totalBuildableArea: null,
  totalNonBuildableArea: null,
  realEstateSurveyReportNumber: '',
  propertyAreaConfirmationNoticeNumber: '',
  remark: ''
})

const canCreateRow = computed(() => Boolean(props.projectId && props.fileRecordId && summaryFormId.value))

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const val = Number(num)
  return Number.isNaN(val) ? '-' : val.toFixed(2)
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').split('.')[0]
}

const formatFileSize = (size) => {
  const n = Number(size || 0)
  if (!n || Number.isNaN(n)) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const toNullableNumber = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

const resetEditForm = () => {
  Object.assign(editForm, {
    id: null,
    rowIndex: 1,
    engineeringProject: '',
    propertyCertificateNumber: '',
    contractApprovalNumber: '',
    phase: 1,
    actualTotalBuildingArea: null,
    actualCommercialArea: null,
    actualResidentialArea: null,
    actualManagementRoomArea: null,
    actualOtherBuildableArea: null,
    actualCommunityArea: null,
    actualOtherPublicArea: null,
    totalBuildableArea: null,
    totalNonBuildableArea: null,
    realEstateSurveyReportNumber: '',
    propertyAreaConfirmationNoticeNumber: '',
    remark: ''
  })
}

const renderSheetPreview = () => {
  const workbook = excelWorkbook.value
  const sheetName = selectedSheet.value
  if (!workbook || !sheetName) {
    excelColumns.value = []
    excelRows.value = []
    return
  }
  const ws = workbook.Sheets[sheetName]
  if (!ws) {
    excelColumns.value = []
    excelRows.value = []
    return
  }
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
  if (!Array.isArray(matrix) || matrix.length === 0) {
    excelColumns.value = []
    excelRows.value = []
    return
  }

  const colCount = Math.max(...(matrix.map((r) => (Array.isArray(r) ? r.length : 0))), 1)
  const toColumnName = (index) => {
    let n = index + 1
    let result = ''
    while (n > 0) {
      const mod = (n - 1) % 26
      result = String.fromCharCode(65 + mod) + result
      n = Math.floor((n - mod) / 26)
    }
    return result
  }
  const cols = Array.from({ length: colCount }).map((_, idx) => ({
    key: `c${idx}`,
    label: toColumnName(idx),
    minWidth: 128
  }))
  const bodyRows = matrix.slice(0, 300).map((row, ridx) => {
    const r = {}
    cols.forEach((c, cidx) => {
      const cell = Array.isArray(row) ? row[cidx] : ''
      r[c.key] = cell == null ? '' : String(cell)
    })
    r.__rowNo = ridx + 1
    return r
  })

  excelColumns.value = cols
  excelRows.value = bodyRows
}

const fetchSummaryFormId = async () => {
  summaryFormId.value = ''
  if (!props.fileRecordId || !props.projectId) return
  try {
    const res = await axios.post('/api/project/project-party-summary-forms/query', {
      pageNum: 1,
      pageSize: 1,
      sortField: 'updateTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      fileRecordId: Number(props.fileRecordId)
    })
    if (res.data?.code !== 200) return
    const form = Array.isArray(res.data?.data?.records) ? res.data.data.records[0] : null
    if (form?.id) summaryFormId.value = String(form.id)
  } catch (error) {
    console.error('查询项目方实测汇总主表失败:', error)
  }
}

const fetchFileMeta = async () => {
  if (!props.fileRecordId) return
  metaLoading.value = true
  try {
    const fromProps = props.initialFile || null
    if (fromProps?.gridfsId) {
      Object.assign(fileMeta, {
        id: fromProps.id,
        originalName: fromProps.originalName || '',
        fileType: fromProps.fileType || '',
        fileSize: fromProps.fileSize || 0,
        uploadTime: fromProps.uploadTime || '',
        gridfsId: fromProps.gridfsId || ''
      })
      return
    }
    const res = await queryFiles({ pageNum: 1, pageSize: 1, fileId: String(props.fileRecordId) })
    const parsed = normalizePage(res.data?.data)
    const hit = parsed.records?.[0]
    if (!hit) {
      ElMessage.warning('未查询到该汇总表对应文件')
      return
    }
    Object.assign(fileMeta, {
      id: hit.id,
      originalName: hit.originalName || '',
      fileType: hit.fileType || '',
      fileSize: hit.fileSize || 0,
      uploadTime: hit.uploadTime || '',
      gridfsId: hit.gridfsId || ''
    })
  } catch (error) {
    console.error('查询项目方汇总表文件失败:', error)
    ElMessage.error('查询文件信息失败')
  } finally {
    metaLoading.value = false
  }
}

const fetchExcelPreview = async () => {
  excelPreviewLoading.value = true
  excelWorkbook.value = null
  excelSheetNames.value = []
  selectedSheet.value = ''
  excelColumns.value = []
  excelRows.value = []

  try {
    if (!fileMeta.gridfsId) return
    const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'arraybuffer' })
    const wb = XLSX.read(new Uint8Array(res.data), { type: 'array' })
    excelWorkbook.value = wb
    excelSheetNames.value = Array.isArray(wb.SheetNames) ? wb.SheetNames : []
    selectedSheet.value = excelSheetNames.value[0] || ''
    renderSheetPreview()
  } catch (error) {
    console.error('Excel 预览加载失败:', error)
    ElMessage.warning('Excel 预览加载失败，可使用下载查看原文件')
  } finally {
    excelPreviewLoading.value = false
  }
}

const fetchMarkdown = async () => {
  if (!props.fileRecordId) {
    recognitionMdContent.value = '# 缺少 fileRecordId，无法查询解析内容'
    return
  }
  mdLoading.value = true
  try {
    const res = await axios.post('/api/data-tables/ocr-execution-results/query', {
      fileRecordId: Number(props.fileRecordId),
      pageNum: 1,
      pageSize: 20,
      sortField: 'createTime',
      sortDirection: 'desc'
    })
    const hit = res.data?.data?.records?.[0]
    recognitionMdContent.value = hit?.markdownContent || '# 暂无解析内容'
  } catch (error) {
    console.error('加载项目方汇总表MD失败:', error)
    recognitionMdContent.value = '# 解析内容加载失败'
  } finally {
    mdLoading.value = false
  }
}

const fetchRows = async () => {
  if (!props.fileRecordId) {
    rows.value = []
    rowTotal.value = 0
    return
  }
  rowsLoading.value = true
  try {
    const res = await queryProjectPartySummaryRows({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      sortField: query.sortField,
      sortDirection: query.sortDirection,
      fileRecordId: Number(props.fileRecordId)
    })
    if (res.data?.code !== 200) {
      rows.value = []
      rowTotal.value = 0
      ElMessage.warning(res.data?.msg || '查询汇总行失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    rows.value = parsed.records
    rowTotal.value = parsed.total
    if (!summaryFormId.value && parsed.records?.[0]?.summaryFormId) {
      summaryFormId.value = String(parsed.records[0].summaryFormId)
    }
  } catch (error) {
    console.error('查询项目方汇总行失败:', error)
    rows.value = []
    rowTotal.value = 0
    ElMessage.error('查询汇总行失败，请稍后重试')
  } finally {
    rowsLoading.value = false
  }
}

const buildSavePayload = () => ({
  id: isCreating.value ? undefined : Number(editForm.id),
  rowIndex: toNullableNumber(editForm.rowIndex),
  engineeringProject: editForm.engineeringProject || null,
  propertyCertificateNumber: editForm.propertyCertificateNumber || null,
  contractApprovalNumber: editForm.contractApprovalNumber || null,
  phase: toNullableNumber(editForm.phase),
  actualTotalBuildingArea: toNullableNumber(editForm.actualTotalBuildingArea),
  actualCommercialArea: toNullableNumber(editForm.actualCommercialArea),
  actualResidentialArea: toNullableNumber(editForm.actualResidentialArea),
  actualManagementRoomArea: toNullableNumber(editForm.actualManagementRoomArea),
  actualOtherBuildableArea: toNullableNumber(editForm.actualOtherBuildableArea),
  actualCommunityArea: toNullableNumber(editForm.actualCommunityArea),
  actualOtherPublicArea: toNullableNumber(editForm.actualOtherPublicArea),
  totalBuildableArea: toNullableNumber(editForm.totalBuildableArea),
  totalNonBuildableArea: toNullableNumber(editForm.totalNonBuildableArea),
  realEstateSurveyReportNumber: editForm.realEstateSurveyReportNumber || null,
  propertyAreaConfirmationNoticeNumber: editForm.propertyAreaConfirmationNoticeNumber || null,
  remark: editForm.remark || null
})

const openCreateDialog = () => {
  if (!canCreateRow.value) {
    ElMessage.warning('缺少 summaryFormId，无法新增。请先刷新右侧数据。')
    return
  }
  isCreating.value = true
  resetEditForm()
  editDialogVisible.value = true
}

const openEditDialog = (row) => {
  isCreating.value = false
  resetEditForm()
  Object.assign(editForm, {
    id: row.id,
    rowIndex: row.rowIndex ?? 1,
    engineeringProject: row.engineeringProject || '',
    propertyCertificateNumber: row.propertyCertificateNumber || '',
    contractApprovalNumber: row.contractApprovalNumber || '',
    phase: row.phase ?? 1,
    actualTotalBuildingArea: row.actualTotalBuildingArea,
    actualCommercialArea: row.actualCommercialArea,
    actualResidentialArea: row.actualResidentialArea,
    actualManagementRoomArea: row.actualManagementRoomArea,
    actualOtherBuildableArea: row.actualOtherBuildableArea,
    actualCommunityArea: row.actualCommunityArea,
    actualOtherPublicArea: row.actualOtherPublicArea,
    totalBuildableArea: row.totalBuildableArea,
    totalNonBuildableArea: row.totalNonBuildableArea,
    realEstateSurveyReportNumber: row.realEstateSurveyReportNumber || '',
    propertyAreaConfirmationNoticeNumber: row.propertyAreaConfirmationNoticeNumber || '',
    remark: row.remark || ''
  })
  editDialogVisible.value = true
}

const handleSaveRow = async () => {
  saveLoading.value = true
  try {
    if (isCreating.value) {
      const payload = {
        projectId: Number(props.projectId),
        fileRecordId: Number(props.fileRecordId),
        summaryFormId: Number(summaryFormId.value),
        ...buildSavePayload()
      }
      delete payload.id
      const res = await createProjectPartySummaryRow(payload)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '新增失败')
        return
      }
      ElMessage.success(res.data?.msg || '新增成功')
    } else {
      const payload = buildSavePayload()
      const res = await updateProjectPartySummaryRow(payload)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '更新失败')
        return
      }
      ElMessage.success(res.data?.msg || '更新成功')
    }
    editDialogVisible.value = false
    await fetchRows()
  } catch (error) {
    console.error('保存项目方汇总行失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saveLoading.value = false
  }
}

const handleDeleteRow = async (row) => {
  if (!row?.id) {
    ElMessage.warning('缺少行ID，无法删除')
    return
  }
  try {
    const res = await deleteProjectPartySummaryRow(Number(row.id))
    if (res.data?.code !== 200) {
      ElMessage.error(res.data?.msg || '删除失败')
      return
    }
    ElMessage.success(res.data?.msg || '删除成功')
    if (rows.value.length === 1 && query.pageNum > 1) query.pageNum -= 1
    await fetchRows()
  } catch (error) {
    console.error('删除项目方汇总行失败:', error)
    ElMessage.error('删除失败，请稍后重试')
  }
}

const downloadSourceFile = async () => {
  if (!fileMeta.gridfsId) {
    ElMessage.warning('缺少 gridfsId，无法下载')
    return
  }
  try {
    const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'blob' })
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileMeta.originalName || '项目方实测汇总表.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载项目方汇总表失败:', error)
    ElMessage.error('下载失败')
  }
}

const handlePageChange = (page) => {
  query.pageNum = page
  fetchRows()
}

const handleSizeChange = (size) => {
  query.pageSize = size
  query.pageNum = 1
  fetchRows()
}

const handleClosed = () => {
  leftView.value = 'source'
  rows.value = []
  rowTotal.value = 0
  summaryFormId.value = ''
  recognitionMdContent.value = ''
  excelWorkbook.value = null
  excelSheetNames.value = []
  selectedSheet.value = ''
  excelColumns.value = []
  excelRows.value = []
  editDialogVisible.value = false
  isCreating.value = false
  resetEditForm()
}

watch(
  () => [dialogVisible.value, props.fileRecordId],
  async ([visible, fileRecordId]) => {
    if (!visible || !fileRecordId) return
    query.pageNum = 1
    await fetchFileMeta()
    await Promise.all([fetchSummaryFormId(), fetchMarkdown(), fetchRows(), fetchExcelPreview()])
  }
)
</script>

<style scoped>
:deep(.party-summary-audit-dialog .el-dialog__body) {
  padding: 12px;
}

.audit-layout {
  display: grid;
  grid-template-columns: 45% 55%;
  gap: 12px;
  height: calc(100vh - 120px);
  min-height: 700px;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
}

.left-panel,
.right-panel {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.left-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6edf5;
}

.file-name {
  min-width: 0;
  flex: 1;
  color: #334155;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-actions {
  display: inline-flex;
  gap: 8px;
}

.meta-quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d8e3ef;
  border-radius: 999px;
  background: #f7fbff;
  color: #334155;
  font-size: 12px;
}

.source-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-tip {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  padding: 8px 10px;
  border: 1px dashed #d4dde8;
  background: #f8fafc;
  border-radius: 6px;
}

.excel-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
  flex: 1;
}

.excel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.excel-sheet-label {
  font-size: 13px;
  color: #475569;
}

.sheet-select {
  width: 220px;
}

.preview-tip {
  font-size: 12px;
  color: #94a3b8;
}

.excel-preview-table {
  flex: 1;
  min-height: 0;
  font-size: 12px;
}

.excel-preview-table :deep(.el-table__row td.el-table__cell) {
  background: #fff;
}

.excel-preview-table :deep(.el-table__row td.el-table__cell:first-child) {
  background: #f8fbff;
  color: #60758f;
  font-weight: 600;
}

.md-view {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e5ecf6;
  border-radius: 6px;
  background: #f8fbff;
  padding: 10px;
}

.md-content :deep(pre) {
  background: #f1f5f9;
  padding: 10px;
  border-radius: 6px;
  overflow: auto;
}

.query-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #e4ebf4;
  border-radius: 8px;
  background: #f8fbff;
}

.query-left,
.query-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.row-count {
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  border: 1px solid #e3eaf3;
  border-radius: 8px;
  overflow: hidden;
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

:deep(.party-summary-audit-dialog .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.party-summary-audit-dialog .el-button--primary:hover) {
  background: #dbe9f7;
  border-color: #b9d3ec;
  color: #163d63;
}

:deep(.party-summary-audit-dialog .el-dialog__header) {
  border-bottom: 1px solid #e4ebf4;
  margin-right: 0;
  padding-bottom: 14px;
}

:deep(.el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

@media (max-width: 1440px) {
  .audit-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .left-panel {
    height: 540px;
  }

  .right-panel {
    height: 680px;
  }
}
</style>
