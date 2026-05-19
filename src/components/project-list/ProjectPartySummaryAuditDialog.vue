<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    fullscreen
    append-to-body
    :close-on-click-modal="false"
    class="party-summary-audit-dialog"
    @closed="handleClosed"
  >
    <div ref="auditLayoutRef" class="audit-split-layout audit-split-layout--responsive party-audit-layout">
      <section class="left-panel audit-split-layout__left" :style="leftPanelStyle" v-loading="metaLoading || mdLoading || excelPreviewLoading">
        <div class="left-toolbar">
          <div class="file-name" :title="fileMeta.originalName || ''">{{ fileMeta.originalName || '项目方实测汇总表' }}</div>
          <div class="left-actions">
            <el-button size="small" :disabled="!fileMeta.gridfsId" @click="downloadSourceFile">下载原文件</el-button>
            <el-button size="small" :type="leftView === 'excel' ? 'primary' : 'default'" @click="leftView = 'excel'">原表预览</el-button>
            <el-button size="small" :type="leftView === 'markdown' ? 'primary' : 'default'" @click="leftView = 'markdown'">解析内容(MD)</el-button>
          </div>
        </div>

        <div ref="excelViewRef" v-show="leftView === 'excel'" class="excel-view">
          <VueOfficeExcelAsync
            v-if="excelPreviewSrc"
            :src="excelPreviewSrc"
            class="office-excel"
            @rendered="onExcelRendered"
            @error="onExcelError"
          />
          <el-empty v-else description="暂无可预览内容" />
        </div>

        <div v-show="leftView === 'markdown'" class="md-view">
          <el-empty v-if="!recognitionMdContent" description="暂无解析内容" />
          <div v-else class="md-content" v-html="recognitionHtml" />
        </div>
      </section>

      <div
        class="audit-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调节左右区域宽度"
        @pointerdown="onSplitterMouseDown"
      />

      <section class="right-panel audit-split-layout__right">
        <div class="right-pane right-pane--main">
            <div v-if="formEdit.id" class="main-form-edit-header">
              <el-tag size="small" type="info" effect="plain">主表 id: {{ formEdit.id }}</el-tag>
            </div>
            <div class="main-form-edit-body">
              <el-form label-position="top" class="main-form-edit-form">
                <div class="edit-block">
                  <div class="edit-block-title">项目方声明汇总 · 建筑面积（㎡）</div>
                  <el-row :gutter="12">
                    <el-col :span="8"><el-form-item label="合同约定建筑面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="计容建筑面积"><el-input-number v-model="formEdit.declaredTotals.buildableTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="建筑面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceTotalBuildingArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                  </el-row>
                </div>

                <div class="edit-block">
                  <div class="edit-block-title">项目方声明汇总 · 商业面积（㎡）</div>
                  <el-row :gutter="12">
                    <el-col :span="8"><el-form-item label="合同约定商业面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="计容商业面积"><el-input-number v-model="formEdit.declaredTotals.buildableCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="商业面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceCommercialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                  </el-row>
                </div>

                <div class="edit-block">
                  <div class="edit-block-title">项目方声明汇总 · 住宅面积（㎡）</div>
                  <el-row :gutter="12">
                    <el-col :span="8"><el-form-item label="合同约定住宅面积"><el-input-number v-model="formEdit.declaredTotals.contractAgreedResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="计容住宅面积"><el-input-number v-model="formEdit.declaredTotals.buildableResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                    <el-col :span="8"><el-form-item label="住宅面积差值"><el-input-number v-model="formEdit.declaredTotals.differenceResidentialArea" :precision="2" controls-position="right" class="w100" /></el-form-item></el-col>
                  </el-row>
                </div>

                <el-form-item label="备注">
                  <el-input v-model.trim="formEdit.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
                </el-form-item>
              </el-form>
            </div>
            <div class="main-form-edit-footer">
              <el-button @click="dialogVisible = false">关闭</el-button>
              <el-button type="primary" :loading="mainFormSaveLoading" @click="submitMainFormEdit">保存主表</el-button>
            </div>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { VueOfficeExcelAsync } from '@/components/project-list/lazyVueOfficeExcel.js'
import { downloadGridFsFile, queryFiles } from '@/services/file.service'
import { updateProjectPartySummaryForm } from '@/services/project.service'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  fileRecordId: { type: [String, Number], default: '' },
  initialFile: { type: Object, default: null },
  /** 主表表单初始数据（来自主表列表行）；缺省时打开后按 fileRecordId 从接口拉取 */
  mainFormDraft: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'main-form-saved'])

const dialogTitle = computed(() => '项目方实测汇总表')

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const leftView = ref('excel')
const metaLoading = ref(false)
const mdLoading = ref(false)
const excelPreviewLoading = ref(false)

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

const excelPreviewSrc = ref(null)
const excelViewRef = ref(null)

/** vue-office 内置 x-spreadsheet 只监听 window resize，容器变宽不会重绘，需手动触发 */
const debounce = (fn, ms) => {
  let t = 0
  return (...args) => {
    clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}

const fireSpreadsheetWindowResize = () => {
  window.dispatchEvent(new Event('resize'))
}

const debouncedSpreadsheetResize = debounce(fireSpreadsheetWindowResize, 80)

const triggerSpreadsheetLayout = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      fireSpreadsheetWindowResize()
    })
  })
}

let excelResizeObserver = null

const unbindExcelViewResizeObserver = () => {
  excelResizeObserver?.disconnect()
  excelResizeObserver = null
}

const bindExcelViewResizeObserver = () => {
  unbindExcelViewResizeObserver()
  const el = excelViewRef.value
  if (!el || typeof ResizeObserver === 'undefined') return
  excelResizeObserver = new ResizeObserver(() => {
    debouncedSpreadsheetResize()
  })
  excelResizeObserver.observe(el)
}

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  onSplitEnd: triggerSpreadsheetLayout
})

onUnmounted(() => {
  unbindExcelViewResizeObserver()
})

const mainFormSaveLoading = ref(false)

const emptyDeclaredTotals = () => ({
  contractAgreedTotalBuildingArea: null,
  buildableTotalBuildingArea: null,
  differenceTotalBuildingArea: null,
  contractAgreedCommercialArea: null,
  buildableCommercialArea: null,
  differenceCommercialArea: null,
  contractAgreedResidentialArea: null,
  buildableResidentialArea: null,
  differenceResidentialArea: null
})

const formEdit = reactive({
  id: null,
  remark: '',
  declaredTotals: emptyDeclaredTotals()
})

const resetMainFormEdit = () => {
  Object.assign(formEdit, {
    id: null,
    remark: '',
    declaredTotals: emptyDeclaredTotals()
  })
}

const assignMainFormFromDraft = (draft) => {
  if (!draft) {
    resetMainFormEdit()
    return
  }
  const dt = draft.declaredTotals && typeof draft.declaredTotals === 'object' ? draft.declaredTotals : {}
  Object.assign(formEdit, {
    id: draft.id ?? null,
    remark: draft.remark || '',
    declaredTotals: { ...emptyDeclaredTotals(), ...dt }
  })
}

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const toNullableNumber = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

const onExcelRendered = () => {
  excelPreviewLoading.value = false
  triggerSpreadsheetLayout()
}

const onExcelError = (e) => {
  excelPreviewLoading.value = false
  console.error('Excel 预览渲染失败:', e)
  ElMessage.error('Excel 预览失败，可尝试下载原文件查看')
}

/** 按 fileRecordId 拉取主表一行；供无 mainFormDraft 时填充右侧主表表单 */
const fetchSummaryFormRow = async () => {
  if (!props.fileRecordId || !props.projectId) return null
  try {
    const res = await axios.post('/api/project/project-party-summary-forms/query', {
      pageNum: 1,
      pageSize: 1,
      sortField: 'updateTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      fileRecordId: Number(props.fileRecordId)
    })
    if (res.data?.code !== 200) return null
    return Array.isArray(res.data?.data?.records) ? res.data.data.records[0] : null
  } catch (error) {
    console.error('查询项目方实测汇总主表失败:', error)
    return null
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
  excelPreviewSrc.value = null
  try {
    if (!fileMeta.gridfsId) return
    const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'arraybuffer' })
    excelPreviewSrc.value = res.data
  } catch (error) {
    console.error('Excel 预览加载失败:', error)
    ElMessage.warning('Excel 预览加载失败，可使用「下载原文件」查看')
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

const handleClosed = () => {
  leftView.value = 'excel'
  recognitionMdContent.value = ''
  excelPreviewSrc.value = null
  resetMainFormEdit()
  mainFormSaveLoading.value = false
}

const submitMainFormEdit = async () => {
  if (!formEdit.id) {
    ElMessage.warning('缺少主表ID，无法更新')
    return
  }
  mainFormSaveLoading.value = true
  try {
    const payload = {
      id: Number(formEdit.id),
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
    emit('main-form-saved')
  } catch (error) {
    console.error('更新项目方汇总主表失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    mainFormSaveLoading.value = false
  }
}

watch(
  () => [dialogVisible.value, props.fileRecordId, props.mainFormDraft],
  async ([visible, fileRecordId]) => {
    if (!visible || !fileRecordId) return
    if (props.mainFormDraft) {
      assignMainFormFromDraft(props.mainFormDraft)
    } else {
      const formRow = await fetchSummaryFormRow()
      if (formRow) assignMainFormFromDraft(formRow)
      else resetMainFormEdit()
    }
    await fetchFileMeta()
    await Promise.all([fetchMarkdown(), fetchExcelPreview()])
  }
)

watch(
  () => [dialogVisible.value, excelPreviewSrc.value],
  async () => {
    await nextTick()
    unbindExcelViewResizeObserver()
    if (!dialogVisible.value || !excelPreviewSrc.value) return
    bindExcelViewResizeObserver()
    triggerSpreadsheetLayout()
  },
  { flush: 'post' }
)

watch(leftView, (v) => {
  if (v === 'excel') {
    triggerSpreadsheetLayout()
  }
})
</script>

<style scoped>
:deep(.party-summary-audit-dialog .el-dialog__body) {
  padding: 12px;
}

.party-audit-layout {
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
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.excel-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  position: relative;
  border: 1px solid #e5ecf6;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.office-excel {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
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

.main-form-edit-header {
  flex-shrink: 0;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 55%, #ffffff 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.main-form-edit-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 12px;
  padding: 18px 20px 20px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, #f1f5f9 0%, #f8fafc 12%, #ffffff 42%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.75) inset,
    0 8px 24px -18px rgba(15, 23, 42, 0.12);
  scrollbar-gutter: stable;
}

.main-form-edit-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid #e4ebf4;
}

.main-form-edit-form .edit-block {
  margin-bottom: 16px;
  padding: 16px 16px 8px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 2px 8px -4px rgba(15, 23, 42, 0.08);
}

.main-form-edit-form .edit-block:last-of-type {
  margin-bottom: 8px;
}

.main-form-edit-form .edit-block-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f172a;
  margin: 0 0 14px;
  padding: 0 0 10px 12px;
  border-left: 4px solid #3b82f6;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  line-height: 1.35;
}

.main-form-edit-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.main-form-edit-form :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  line-height: 1.35;
}

.main-form-edit-form :deep(.el-input__wrapper),
.main-form-edit-form :deep(.el-input-number) {
  border-radius: 8px;
}

.right-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.w100 {
  width: 100%;
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

@media (max-width: 1280px) {
  .party-audit-layout {
    height: auto;
    min-height: 0;
  }

  .party-audit-layout .left-panel {
    height: 540px;
  }

  .party-audit-layout .right-panel {
    height: 680px;
    min-width: 0;
  }
}
</style>
