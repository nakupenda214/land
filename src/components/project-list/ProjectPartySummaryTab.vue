<template>
  <div ref="partySummaryTabRef" class="party-summary-tab">
    <section
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <header class="planning-hero">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Document /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">项目方实测汇总</span>
            <h2 class="planning-hero__title">主表</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="项目方汇总主表统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ formTotal }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">主表总数</span>
            </div>
          </div>
          <div
            class="planning-stat-tile"
            :class="activeFileRecordId ? 'planning-stat-tile--teal' : 'planning-stat-tile--amber'"
          >
            <div class="planning-stat-tile__icon">
              <el-icon><CircleCheck v-if="activeFileRecordId" /><Warning v-else /></el-icon>
            </div>
            <div class="planning-stat-tile__text planning-stat-tile__text--wide">
              <div class="planning-stat-tile__line planning-stat-tile__line--single">
                <span class="planning-stat-tile__pick">{{ activeFormSelectionText }}</span>
              </div>
              <span class="planning-stat-tile__label">当前主表</span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="主表操作">
          <el-button
            class="pr-btn pr-btn--ghost"
            size="small"
            :loading="formsLoading"
            @click="fetchForms"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </header>

      <div class="party-form-dashboard">
        <el-empty v-if="!formsLoading && !forms.length" class="party-form-empty" description="暂无项目方汇总主表数据" />

        <template v-else-if="forms.length">
          <div v-if="forms.length > 1 || formTotal > forms.length" class="party-form-toolbar">
            <div v-if="forms.length > 1" class="party-form-picker">
              <span class="party-form-picker__label">汇总文件</span>
              <el-radio-group
                v-model="activeFileRecordId"
                size="small"
                class="party-form-picker__group"
                @change="onActiveFileRecordChange"
              >
                <el-radio-button
                  v-for="(f, idx) in forms"
                  :key="String(f.fileRecordId)"
                  :label="String(f.fileRecordId)"
                >
                  第 {{ idx + 1 }} 份
                </el-radio-button>
              </el-radio-group>
            </div>
            <el-button
              v-if="forms.length < formTotal"
              class="party-form-load-more"
              link
              type="primary"
              :loading="formsLoadingMore"
              @click="fetchMoreForms"
            >
              加载更多（{{ forms.length }}/{{ formTotal }}）
            </el-button>
          </div>

          <div v-if="displayedForm" class="party-form-focus">
            <div class="party-form-meta" role="group" aria-label="当前主表状态">
              <div class="party-form-meta__tags">
                <el-tag size="small" effect="light" :type="parseStatusTagType[displayedForm.parseStatus] || 'info'">
                  解析 {{ parseStatusText[displayedForm.parseStatus] || '-' }}
                </el-tag>
                <el-tag size="small" effect="light" :type="Number(displayedForm.isParsed) === 1 ? 'success' : 'info'">
                  {{ Number(displayedForm.isParsed) === 1 ? '已解析' : '未解析' }}
                </el-tag>
                <span class="party-form-meta__fid" :title="String(displayedForm.fileRecordId || '')">
                  fileRecordId {{ shortFileRecordId(displayedForm.fileRecordId) }}
                </span>
              </div>
              <el-button class="op-btn audit-btn" size="small" type="primary" plain @click="openAudit(displayedForm)">
                审核
              </el-button>
            </div>

            <div class="party-declared-matrix-wrap">
              <table class="party-declared-matrix" aria-label="声明汇总：建筑面积、商业面积、住宅面积（㎡）">
                <tbody>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定建筑面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedTotalBuildingArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容建筑面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableTotalBuildingArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceTotalBuildingArea) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定商业面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedCommercialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容商业面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableCommercialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceCommercialArea) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定住宅面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedResidentialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容住宅面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableResidentialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceResidentialArea) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- 主表下方「项目方实测汇总行」列表：产品要求暂不展示；改 true 可恢复 UI 与请求 -->
    <section
      v-show="SHOW_PARTY_SUMMARY_ROWS_PANEL"
      ref="rowsPanelRef"
      class="rows-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="rowsLoading"
    >
      <header class="planning-hero planning-hero--rows">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap planning-hero__icon-wrap--teal" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Grid /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">明细</span>
            <h2 class="planning-hero__title">项目方实测汇总行</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="项目方汇总行统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ rows.length }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">
                <template v-if="rowTotal > rows.length">共 {{ rowTotal }} 条（当前页）</template>
                <template v-else>行数据总数</template>
              </span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="行表操作">
          <el-button
            class="pr-btn pr-btn--ghost"
            size="small"
            :loading="rowsLoading"
            :disabled="!rowQuery.projectId"
            @click="fetchRows"
          >
            <el-icon><Refresh /></el-icon>
            刷新明细
          </el-button>
        </div>
      </header>

      <div ref="rowsTableWrapRef" class="planning-table-wrap">
        <el-table
          ref="rowsTableRef"
          class="project-tab-el-table planning-el-table"
          :data="rows"
          border
          stripe
          row-key="id"
          :max-height="rowsTableHeight"
          scrollbar-always-on
        >
          <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
          <el-table-column prop="engineeringProject" label="工程项目/楼栋" min-width="160" show-overflow-tooltip />
          <el-table-column prop="contractApprovalNumber" label="合同/批文编号" min-width="160" show-overflow-tooltip />
          <el-table-column prop="phase" label="期数" width="90" align="center" />
          <el-table-column prop="actualTotalBuildingArea" label="实测总面积" width="120" align="right">
            <template #default="{ row }">{{ formatNum(row.actualTotalBuildingArea) }}</template>
          </el-table-column>
          <el-table-column prop="totalBuildableArea" label="计容合计" width="120" align="right">
            <template #default="{ row }">{{ formatNum(row.totalBuildableArea) }}</template>
          </el-table-column>
          <el-table-column prop="totalNonBuildableArea" label="不计容合计" width="130" align="right">
            <template #default="{ row }">{{ formatNum(row.totalNonBuildableArea) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        </el-table>

        <div
          v-show="rowsShowXScroll"
          class="planning-table-x-float"
          role="presentation"
          aria-hidden="true"
        >
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--left"
            :class="{ 'is-active': rowsCanScrollLeft }"
          />
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--right"
            :class="{ 'is-active': rowsCanScrollRight }"
          />
          <el-tooltip content="向左" placement="left">
            <el-button
              v-show="rowsCanScrollLeft"
              class="planning-table-x-float__fab planning-table-x-float__fab--left"
              circle
              type="primary"
              aria-label="向左查看更多列"
              @click="rowsScrollBy(-300)"
            >
              <el-icon><DArrowLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="向右" placement="right">
            <el-button
              v-show="rowsCanScrollRight"
              class="planning-table-x-float__fab planning-table-x-float__fab--right"
              circle
              type="primary"
              aria-label="向右查看更多列"
              @click="rowsScrollBy(300)"
            >
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="party-summary-pager">
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
      :main-form-draft="partySummaryMainFormDraft"
      @main-form-saved="onPartySummaryMainFormSaved"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { clampTableBodyHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import {
  Document,
  Files,
  CircleCheck,
  Warning,
  Refresh,
  DArrowLeft,
  DArrowRight,
  Grid
} from '@element-plus/icons-vue'
import { queryProjectPartySummaryForms, queryProjectPartySummaryRows } from '@/services/project.service'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import ProjectPartySummaryAuditDialog from '@/components/project-list/ProjectPartySummaryAuditDialog.vue'

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false }
})

/** 为 false 时隐藏下方汇总行面板且不请求行接口；确认废弃后可删整块模板与相关逻辑 */
const SHOW_PARTY_SUMMARY_ROWS_PANEL = false

const formsLoading = ref(false)
const formsLoadingMore = ref(false)
const rowsLoading = ref(false)
const forms = ref([])
const rows = ref([])
const formTotal = ref(0)
const rowTotal = ref(0)

const auditDialogVisible = ref(false)
const currentAuditFileRecordId = ref('')
const currentAuditFile = ref(null)
const activeFileRecordId = ref('')

const partySummaryMainFormDraft = ref(null)

const buildMainFormDraftFromRow = (row) => ({
  id: row?.id ?? null,
  isParsed: row?.isParsed ?? null,
  parseStatus: row?.parseStatus || '',
  remark: row?.remark || '',
  declaredTotals: {
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
  projectId: ''
})

const rowQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'rowIndex',
  sortDirection: 'asc',
  projectId: '',
  fileRecordId: ''
})

const partySummaryTabRef = ref(null)
const rowsPanelRef = ref(null)
const rowsTableRef = ref(null)
const rowsTableWrapRef = ref(null)
const rowsTableCap = ref(260)

let partySummaryResizeObserver = null

function measureRowsTableCap() {
  if (!SHOW_PARTY_SUMMARY_ROWS_PANEL) return
  const panel = rowsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.planning-hero')
  const pager = panel.querySelector('.party-summary-pager')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  const pg = pager ? pager.getBoundingClientRect().height : 0
  const cap = Math.max(100, Math.floor(ph - hh - pg - 1))
  rowsTableCap.value = cap
}

function measureAllPartySummaryCaps() {
  measureRowsTableCap()
}

const rowsTableHeight = computed(() => clampTableBodyHeight(rowsTableCap.value, rows.value.length))

/** 当前展示的汇总主表（默认第一份或与 activeFileRecordId 对应） */
const displayedForm = computed(() => {
  const list = forms.value
  if (!list.length) return null
  const id = String(activeFileRecordId.value || '')
  if (!id) return list[0]
  return list.find((f) => String(f.fileRecordId) === id) || list[0]
})

const activeFormSelectionText = computed(() => {
  const list = forms.value
  if (!list.length) return '暂无主表'
  const id = String(activeFileRecordId.value || '')
  const idx = list.findIndex((f) => String(f.fileRecordId) === id)
  const n = idx >= 0 ? idx + 1 : 1
  if (list.length === 1 && formTotal.value <= 1) return '本项 1 份汇总表'
  return `第 ${n} 份 · 已加载 ${list.length}${formTotal.value > list.length ? ` / 共 ${formTotal.value}` : ''}`
})

const shortFileRecordId = (fid) => {
  const s = String(fid ?? '')
  if (!s) return '—'
  return s.length > 16 ? `${s.slice(0, 16)}…` : s
}

function ensureActiveFormSelection() {
  const list = forms.value
  if (!list.length) {
    activeFileRecordId.value = ''
    return
  }
  const cur = String(activeFileRecordId.value || '')
  if (!list.some((f) => String(f.fileRecordId) === cur)) {
    activeFileRecordId.value = String(list[0].fileRecordId || '')
  }
  onActiveFileRecordChange()
}

function onActiveFileRecordChange() {
  const row = forms.value.find((f) => String(f.fileRecordId) === String(activeFileRecordId.value))
  handleFormRowClick(row || {})
}

onMounted(() => {
  nextTick(() => {
    measureAllPartySummaryCaps()
    if (typeof ResizeObserver !== 'undefined') {
      partySummaryResizeObserver = new ResizeObserver(() => measureAllPartySummaryCaps())
      if (partySummaryTabRef.value) partySummaryResizeObserver.observe(partySummaryTabRef.value)
    }
  })
})

onBeforeUnmount(() => {
  partySummaryResizeObserver?.disconnect()
  partySummaryResizeObserver = null
})

watch([() => forms.value.length, () => rows.value.length], () => {
  nextTick(() => {
    measureAllPartySummaryCaps()
  })
})

watch(
  () => [rowQuery.pageNum, rowQuery.pageSize],
  () => nextTick(measureAllPartySummaryCaps)
)

const {
  showXScrollProxy: rowsShowXScroll,
  canScrollLeft: rowsCanScrollLeft,
  canScrollRight: rowsCanScrollRight,
  scrollTableBy: rowsScrollBy
} = useSummaryTableHorizontalScroll(rowsTableRef, rows)

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

const buildFormPayload = () => ({
  pageNum: formQuery.pageNum,
  pageSize: formQuery.pageSize,
  sortField: formQuery.sortField,
  sortDirection: formQuery.sortDirection,
  projectId: Number(formQuery.projectId)
})

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
    activeFileRecordId.value = ''
    return
  }
  formQuery.pageNum = 1
  formsLoading.value = true
  try {
    const res = await queryProjectPartySummaryForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      ElMessage.warning(res.data?.msg || '项目方汇总主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
    await nextTick()
    ensureActiveFormSelection()
  } catch (error) {
    console.error('查询项目方汇总主表失败:', error)
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    ElMessage.error('查询项目方汇总主表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const fetchMoreForms = async () => {
  if (!formQuery.projectId) return
  if (formsLoading.value || formsLoadingMore.value) return
  if (forms.value.length >= formTotal.value) return
  const nextPage = formQuery.pageNum + 1
  formsLoadingMore.value = true
  try {
    const res = await queryProjectPartySummaryForms({
      ...buildFormPayload(),
      pageNum: nextPage
    })
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '加载更多失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    formTotal.value = parsed.total
    if (parsed.records.length) {
      forms.value = [...forms.value, ...parsed.records]
      formQuery.pageNum = nextPage
    }
  } catch (error) {
    console.error('加载项目方汇总主表失败:', error)
    ElMessage.error('加载更多失败，请稍后重试')
  } finally {
    formsLoadingMore.value = false
  }
}

const fetchRows = async () => {
  if (!SHOW_PARTY_SUMMARY_ROWS_PANEL) {
    rows.value = []
    rowTotal.value = 0
    return
  }
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
  const fid = String(row?.fileRecordId || '')
  if (fid) activeFileRecordId.value = fid
  if (!SHOW_PARTY_SUMMARY_ROWS_PANEL) {
    rowQuery.fileRecordId = ''
    return
  }
  rowQuery.fileRecordId = activeFileRecordId.value
  rowQuery.pageNum = 1
  fetchRows()
}

const openAudit = (row) => {
  partySummaryMainFormDraft.value = buildMainFormDraftFromRow(row)
  currentAuditFileRecordId.value = String(row?.fileRecordId || '')
  currentAuditFile.value = {
    id: row?.fileRecordId,
    fileRecordId: row?.fileRecordId,
    originalName: `项目方实测汇总表-${row?.fileRecordId || '-'}`,
    fileType: 'XLSX'
  }
  auditDialogVisible.value = true
}

const onPartySummaryMainFormSaved = () => {
  fetchForms()
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
      activeFileRecordId.value = ''
      return
    }
    if (active) {
      formQuery.pageNum = 1
      rowQuery.pageNum = 1
      rowQuery.fileRecordId = ''
      activeFileRecordId.value = ''
      if (SHOW_PARTY_SUMMARY_ROWS_PANEL) {
        await Promise.all([fetchForms(), fetchRows()])
      } else {
        rows.value = []
        rowTotal.value = 0
        await fetchForms()
      }
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
  height: calc(100vh - 275px);
  min-height: 620px;
}

.forms-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.party-form-dashboard {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.45);
}

.party-form-empty {
  margin: 24px auto;
}

.party-form-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
}

.party-form-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
}

.party-form-picker__label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  flex-shrink: 0;
}

.party-form-picker__group {
  flex: 1 1 auto;
  min-width: 0;
}

.party-form-load-more {
  flex-shrink: 0;
}

.party-form-focus {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.party-form-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.party-form-meta__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.party-form-meta__fid {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #64748b;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-declared-matrix-wrap {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.party-declared-matrix {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  border: none;
  font-size: 14px;
  line-height: 1.4;
  color: #334155;
}

.party-declared-matrix__caption {
  caption-side: top;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  padding: 10px 14px 6px;
}

.party-declared-matrix td {
  border-right: 1px solid rgba(226, 232, 240, 0.95);
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  padding: 12px 10px;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}

.party-declared-matrix td:last-child {
  border-right: none;
}

.party-declared-matrix tbody tr:first-child td {
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.party-declared-matrix tbody tr:last-child td {
  border-bottom: none;
}

.party-declared-matrix tbody tr:nth-child(odd) .party-declared-matrix__value {
  background: rgba(255, 255, 255, 0.65);
}

.party-declared-matrix tbody tr:nth-child(even) .party-declared-matrix__value {
  background: rgba(248, 250, 252, 0.85);
}

.party-declared-matrix tbody tr .party-declared-matrix__label {
  background: #f8fafc;
}

.party-declared-matrix__label {
  font-weight: 700;
  font-size: 13px;
  color: #475569;
  width: 18%;
}

.party-declared-matrix__value {
  font-weight: 700;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  width: 15%;
}

:deep(.party-form-picker__group .el-radio-button__inner) {
  border-radius: 8px;
  font-weight: 600;
}

:deep(.party-form-picker__group .el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 8px 0 0 8px;
}

:deep(.party-form-picker__group .el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 8px 8px 0;
}

.rows-panel {
  flex: 1 1 auto;
  min-height: 200px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.planning-panel--modern.project-tab-panel {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 40px -22px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.planning-hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.92) 45%, rgba(241, 245, 249, 0.88) 100%);
  flex-shrink: 0;
  min-height: 64px;
  box-sizing: border-box;
}

.planning-hero::after {
  content: '';
  position: absolute;
  right: -16%;
  top: -50%;
  width: 40%;
  height: 180%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.08), transparent 72%);
  pointer-events: none;
}

.planning-hero__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 200px;
  min-width: 0;
  z-index: 1;
}

.planning-hero__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow:
    0 8px 18px -10px rgba(29, 78, 216, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.planning-hero__icon-wrap--teal {
  background: linear-gradient(145deg, #14b8a6 0%, #0f766e 100%);
  box-shadow:
    0 8px 18px -10px rgba(15, 118, 110, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.planning-hero__icon {
  font-size: 21px;
  color: #fff;
}

.planning-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.planning-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.planning-stat-grid {
  position: relative;
  z-index: 1;
  flex: 1 1 260px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.rows-panel .planning-stat-grid {
  grid-template-columns: minmax(0, 1fr);
  max-width: 220px;
}

.planning-stat-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.planning-stat-tile--slate .planning-stat-tile__icon {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.planning-stat-tile--teal .planning-stat-tile__icon {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.planning-stat-tile--amber .planning-stat-tile__icon {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.planning-stat-tile__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.planning-stat-tile__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.planning-stat-tile__text--wide {
  flex: 1;
}

.planning-stat-tile__line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1.1;
}

.planning-stat-tile__line--single {
  width: 100%;
}

.planning-stat-tile__value {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.planning-stat-tile__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.planning-stat-tile__pick {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.planning-stat-tile__label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.planning-hero__actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.pr-btn {
  width: auto;
  min-width: 104px;
  justify-content: center;
  border-radius: 9px;
  font-weight: 600;
}

:deep(.pr-btn--ghost) {
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
}

:deep(.pr-btn--ghost:hover) {
  border-color: #94a3b8;
  background: #fff;
  color: #0f172a;
}

.planning-table-wrap {
  position: relative;
  min-height: 0;
  padding: 0;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.rows-panel .planning-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
}

.party-summary-pager {
  flex-shrink: 0;
  padding: 8px 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(248, 250, 252, 0.85);
  display: flex;
  justify-content: flex-end;
}

.planning-table-x-float {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.planning-table-x-float__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.planning-table-x-float__edge--left {
  left: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent);
}

.planning-table-x-float__edge--right {
  right: 0;
  background: linear-gradient(270deg, rgba(15, 23, 42, 0.06), transparent);
}

.planning-table-x-float__edge.is-active {
  opacity: 1;
}

.planning-table-x-float__fab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  box-shadow: 0 8px 24px -8px rgba(29, 78, 216, 0.55);
  border: none;
}

.planning-table-x-float__fab--left {
  left: 6px;
}

.planning-table-x-float__fab--right {
  right: 6px;
}

:deep(.planning-el-table.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #334155;
}

:deep(.planning-el-table .el-table__header th) {
  font-weight: 700;
  font-size: 12px;
}

.w100 {
  width: 100%;
}

:deep(.party-summary-pager .el-pagination) {
  --el-color-primary: #2563eb;
}

:deep(.party-summary-pager .el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

@media (max-width: 1320px) {
  .party-summary-tab {
    height: auto;
    min-height: 0;
  }
}
</style>
