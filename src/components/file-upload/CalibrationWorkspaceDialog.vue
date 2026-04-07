<template>
<el-dialog
  v-model="dialogVisible"
  fullscreen
  append-to-body
  custom-class="calibration-dialog"
  modal-class="calibration-modal"
  :show-close="false"
  @closed="emit('closed')"
>
    <template #header>
      <CalibrationHeader
        :current-file="currentFile"
        @back="emit('back')"
      />
    </template>

    <div ref="auditLayoutRef" class="split-view audit-split-layout audit-split-layout--responsive audit-split-layout--calibration">
      <div class="left-panel audit-split-layout__left" :style="leftPanelStyle" v-loading="pdfLoading && currentViewType !== 'recognition'">
        <CalibrationPdfToolbar
          :current-view-type="currentViewType"
          :is-preprocess-available="isPreprocessAvailable"
          @switch-view="switchView"
        />
        <div class="pdf-canvas">
          <div v-if="currentViewType !== 'recognition'" style="width: 100%; height: 100%;">
            <div
              v-if="pdfLoading"
              style="display: flex; justify-content: center; align-items: center; height: 100%; color: #fff;"
            >
              <el-icon size="32" color="#fff"><Loading /></el-icon>
              <span style="margin-left: 10px;">正在加载 PDF 文件...</span>
            </div>
            <iframe
              v-else-if="calibrationPdfUrl"
              :src="calibrationPdfUrl"
              style="display: block; width: 100%; height: 100%; border: none;"
              @load="pdfLoaded"
              @error="pdfLoadError"
            ></iframe>
            <div
              v-else
              style="display: flex; justify-content: center; align-items: center; height: 100%; color: #ccc;"
            >
              <span>PDF 文件加载失败</span>
            </div>
          </div>

          <div
            v-if="currentViewType === 'recognition'"
            style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box; background: #fff;"
          >
            <div
              v-if="recognitionMdLoading"
              style="display: flex; justify-content: center; align-items: center; height: 100%;"
            >
              <el-icon size="32" color="#409EFF"><Loading /></el-icon>
              <span style="margin-left: 10px; color: #606266;">正在加载识别文件（MD）...</span>
            </div>
            <div
              v-else
              class="md-content"
              style="width: 100%; min-height: 100%;"
              v-html="recognitionHtml"
            ></div>
          </div>
        </div>
      </div>

      <div
        class="audit-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调节左右区域宽度"
        @mousedown="onSplitterMouseDown"
      />

      <div class="right-panel audit-split-layout__right">
        <div class="cali-right-panel">
          <section class="sum-info-section">
            <div class="sum-layout">
              <div class="sum-grid">
                <article
                  v-for="item in summaryMetrics"
                  :key="item.key"
                  class="summary-card summary-card--ocr"
                >
                  <header class="summary-card__head">
                    <div class="summary-card__head-text">
                      <h3 class="summary-card__title">{{ item.title }}</h3>
                      <p class="summary-card__subtitle">列表汇总与 OCR 对比</p>
                    </div>
                  </header>
                  <div class="summary-card__body">
                    <div class="stat-row">
                      <span class="stat-row__label">列表汇总</span>
                      <span class="stat-row__value">{{ item.manual }}</span>
                      <span class="stat-row__unit">㎡</span>
                    </div>
                    <div class="stat-row">
                      <span class="stat-row__label">OCR</span>
                      <span class="stat-row__value stat-row__value--ocr">{{ item.ocr }}</span>
                      <span class="stat-row__unit">㎡</span>
                    </div>
                    <div class="stat-row">
                      <span class="stat-row__label">差值</span>
                      <span
                        :class="[
                          'stat-row__value',
                          Math.abs(item.delta) > 0.01 ? 'stat-row__value--warn' : 'stat-row__value--ok'
                        ]"
                      >{{ formatDelta(item.delta) }}</span>
                      <span class="stat-row__unit">㎡</span>
                    </div>
                  </div>
                </article>
              </div>

              <article class="summary-card summary-card--audit cali-audit-card">
                <header class="summary-card__head">
                  <div class="summary-card__icon" aria-hidden="true">
                    <el-icon><CircleCheck /></el-icon>
                  </div>
                  <div class="summary-card__head-text">
                    <h3 class="summary-card__title">校验信息</h3>
                    <p class="summary-card__subtitle">用途与面积校验结果</p>
                  </div>
                </header>
                <div class="summary-card__body">
                  <div class="stat-row">
                    <span class="stat-row__label">待确认面积</span>
                    <span class="stat-row__value stat-row__value--warn">{{ auditSummaryData.pendingConfirmArea }}</span>
                    <span class="stat-row__unit">㎡</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-row__label">未知用途数量</span>
                    <span class="stat-row__value">{{ auditSummaryData.unknownUsageCount }}</span>
                    <span class="stat-row__unit">条</span>
                  </div>
                  <div class="stat-row stat-row--tags">
                    <span class="stat-row__label">未知用途</span>
                    <span class="stat-row__tags">
                      <el-tag
                        size="small"
                        effect="light"
                        round
                        :type="auditSummaryDisplay.hasUnknownUsageText === '有' ? 'warning' : 'success'"
                      >
                        {{ auditSummaryDisplay.hasUnknownUsageText }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="stat-row stat-row--tags">
                    <span class="stat-row__label">验证状态</span>
                    <span class="stat-row__tags">
                      <el-tag
                        size="small"
                        effect="light"
                        round
                        :type="auditSummaryDisplay.isVerifiedText === '已验证' ? 'success' : 'danger'"
                      >
                        {{ auditSummaryDisplay.isVerifiedText }}
                      </el-tag>
                    </span>
                  </div>
                </div>
                <div class="summary-card__audit-append">
                  <div class="audit-append-block">
                    <div class="audit-append-label">未知用途详情</div>
                    <div class="unknown-list">{{ auditSummaryData.unknownUsages }}</div>
                  </div>
                  <div class="audit-append-block">
                    <div class="audit-append-label">验证失败原因</div>
                    <div class="reason-text">{{ auditSummaryData.verificationErrorReason }}</div>
                  </div>
                  <div
                    v-if="hasVerificationErrorReason"
                    class="audit-append-block verify-tip-block"
                  >
                    <div class="verify-tip-title">排查建议：</div>
                    <div class="verify-tip-line">1. 请检查解析文件方向。</div>
                    <div class="verify-tip-line">2. 请审查户室面积对照表的部分数据是否被印章遮盖。</div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="room-table-wrap">
            <div class="table-toolbar">
              <div class="left">
                <span class="toolbar-title">户室信息</span>
                <el-tag size="small" effect="plain" :type="isEditing ? 'warning' : 'info'">
                  {{ isEditing ? '编辑模式' : '查看模式' }}
                </el-tag>
                <span class="toolbar-count">共 {{ roomInfoData.length }} 条</span>
              </div>
              <div class="right">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="openCreateRoomDialog"
                >
                  新增户室
                </el-button>
                <el-button
                  v-if="isEditing"
                  size="small"
                  type="danger"
                  plain
                  @click="exitEditMode"
                >
                  退出编辑
                </el-button>
                <el-button v-if="isEditing" size="small" type="primary" @click="handleSaveData">保存修改</el-button>
              </div>
            </div>

            <el-table
              class="room-table"
              :data="roomInfoData"
              :row-class-name="getRoomRowClassName"
              border
              stripe
              size="small"
              v-loading="roomInfoLoading"
              element-loading-text="加载户室数据中..."
              row-key="id"
              style="width: 100%;"
              :header-cell-style="AUDIT_TABLE_HEADER_STYLE"
              :cell-style="AUDIT_TABLE_CELL_STYLE"
            >
              <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />

              <el-table-column prop="roomLevel" label="楼层" width="80" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomLevel || '-' }}</template>
                  <el-input v-else v-model="row.roomLevel" size="small" style="width: 70px" placeholder="请输入楼层" />
                </template>
              </el-table-column>

              <el-table-column prop="roomNumber" label="房号" width="100" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomNumber || '-' }}</template>
                  <el-input v-else v-model="row.roomNumber" size="small" style="width: 90px" placeholder="请输入房号" />
                </template>
              </el-table-column>

              <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.buildingArea || '0.00' }}</template>
                  <el-input v-else v-model="row.buildingArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.innerArea || '0.00' }}</template>
                  <el-input v-else v-model="row.innerArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.balconyArea || '0.00' }}</template>
                  <el-input v-else v-model="row.balconyArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="sharedArea" label="分摊面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.sharedArea || '0.00' }}</template>
                  <el-input v-else v-model="row.sharedArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="usageCategory" label="用途类别" width="130" align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.usageCategory || '未知' }}</template>
                  <el-tag v-else size="small" effect="plain" type="info">{{ row.usageCategory || '未选择' }}</el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="roomUsage" label="用途" min-width="120" show-overflow-tooltip align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">
                    <span>{{ row.roomUsage || '-' }}</span>
                  </template>
                  <div v-else class="usage-edit-inline">
                    <el-popover
                      placement="bottom"
                      trigger="click"
                      :width="360"
                      :visible="usageEditorVisibleRowId === String(row.id)"
                    >
                      <div class="usage-editor-pop">
                        <div class="usage-editor-title">选择用途类别与用途</div>
                        <el-form label-position="top" class="usage-editor-form">
                          <el-form-item label="用途">
                            <el-select
                              v-model="usageEditorDraft.roomUsage"
                              filterable
                              clearable
                              placeholder="请选择用途"
                              class="usage-editor-field"
                            >
                              <el-option
                                v-for="item in usageEditorOptions"
                                :key="item.id || `${item.usageCategory}-${item.usagePattern}`"
                                :label="`${item.usagePattern}（${item.usageCategoryText}）`"
                                :value="item.usagePattern"
                              />
                            </el-select>
                          </el-form-item>
                          <el-form-item label="自动匹配类别">
                            <el-tag v-if="usageEditorMatchedOption" type="info" effect="plain">
                              {{ usageEditorMatchedOption.usageCategoryText }} / {{ usageEditorMatchedOption.floorAreaTypeText }}
                            </el-tag>
                            <span v-else class="usage-auto-tip">选择用途后将自动匹配用途类别与面积类型</span>
                          </el-form-item>
                        </el-form>
                        <div class="usage-editor-actions">
                          <el-button text size="small" type="primary" @click="openCreateUsageDialogForRow(row)">新增用途</el-button>
                          <div>
                            <el-button size="small" @click="closeUsageEditor">取消</el-button>
                            <el-button size="small" type="primary" @click="applyUsageEditor(row)">应用</el-button>
                          </div>
                        </div>
                      </div>
                      <template #reference>
                        <el-button size="small" type="primary" plain @click.stop="openUsageEditor(row)">
                          {{ row.roomUsage ? '修改用途' : '选择类别与用途' }}
                        </el-button>
                      </template>
                    </el-popover>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="floorAreaType" label="面积类型" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.floorAreaType === '计容' ? 'success' : row.floorAreaType === '不计容' ? 'warning' : 'info'" size="small">
                    {{ row.floorAreaType }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="isCalculate" label="是否计算" width="90" align="center">
                <template #default="{ row }">
                  <template>{{ row.isCalculate === 1 ? '是' : '否' }}</template>
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="140" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.remark || '-' }}</template>
                  <el-input v-else v-model="row.remark" size="small" style="width: 100%" placeholder="请输入备注" />
                </template>
              </el-table-column>
              <el-table-column label="编辑" width="130" align="center" fixed="right">
                <template #default="{ row }">
                  <div class="row-op-group">
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="isEditing && !isRowEditing(row)"
                      @click="startRowEdit(row)"
                    >
                      {{ isRowEditing(row) ? '编辑中' : '编辑' }}
                    </el-button>
                    <el-button
                      size="small"
                      text
                      type="danger"
                      :disabled="roomDeleteLoading"
                      @click="handleDeleteRoomRow(row)"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-if="!roomInfoLoading && roomInfoData.length === 0" description="暂无户室面积数据" />
          </section>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="createRoomDialogVisible"
      title="新增户室"
      width="560px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form ref="createRoomFormRef" :model="createRoomForm" label-width="110px">
        <el-form-item label="用途类别" required>
          <el-select v-model="createRoomForm.usageCategory" placeholder="请选择用途类别" style="width: 100%">
            <el-option-group label="计容面积">
              <el-option label="商业" value="COMMERCIAL" />
              <el-option label="住宅" value="RESIDENTIAL" />
              <el-option label="物管" value="MANAGEMENT" />
              <el-option label="其他计容" value="OTHER_BUILDABLE" />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option label="社区用房" value="COMMUNITY" />
              <el-option label="其他公用" value="OTHER_PUBLIC" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="楼层">
              <el-input v-model="createRoomForm.roomLevel" placeholder="如 1层" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="房号">
              <el-input v-model="createRoomForm.roomNumber" placeholder="如 101" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="建筑面积(㎡)">
              <el-input v-model="createRoomForm.buildingArea" type="number" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="套内面积(㎡)">
              <el-input v-model="createRoomForm.innerArea" type="number" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="阳台面积(㎡)">
              <el-input v-model="createRoomForm.balconyArea" type="number" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分摊面积(㎡)">
              <el-input v-model="createRoomForm.sharedArea" type="number" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="createRoomForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createRoomDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roomCreateLoading" @click="handleSubmitCreateRoom">确认新增</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="usagePickerVisible"
      title="选择用途"
      width="760px"
      custom-class="usage-picker-dialog"
      append-to-body
      :close-on-click-modal="false"
    >
      <div class="usage-picker-toolbar">
        <el-input
          v-model.trim="usagePickerKeyword"
          placeholder="搜索用途名称/用途类别"
          clearable
        />
        <div class="usage-picker-actions">
          <el-button class="biz-btn action-ghost" @click="openCreateUsageDialog">新增用途</el-button>
          <el-button class="biz-btn action-ghost" :loading="usagePickerLoading" @click="loadUsagePickerOptions">刷新</el-button>
        </div>
      </div>

      <el-table
        :data="filteredUsagePickerOptions"
        height="360"
        border
        stripe
        row-key="id"
        highlight-current-row
        @row-click="handleUsagePickerRowClick"
      >
        <el-table-column type="index" label="序号" width="68" align="center" />
        <el-table-column prop="usagePattern" label="用途名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="usageCategoryText" label="用途类别" width="140" align="center" />
        <el-table-column prop="floorAreaTypeText" label="面积类型" width="120" align="center" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="applyUsagePicker(row)">选用</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="usagePickerVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createUsageDialogVisible"
      title="新增用途"
      width="520px"
      custom-class="create-usage-dialog"
      append-to-body
      :close-on-click-modal="false"
      @closed="resetCreateUsageForm"
    >
      <el-form ref="createUsageFormRef" :model="createUsageForm" :rules="createUsageFormRules" label-width="100px">
        <el-form-item label="用途名称" prop="usagePattern">
          <el-input v-model.trim="createUsageForm.usagePattern" placeholder="请输入用途名称，如：酒店式公寓" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select v-model="createUsageForm.usageCategory" placeholder="请选择用途类别" style="width: 100%">
            <el-option-group label="计容面积">
              <el-option
                v-for="item in usageCategoryCreateBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option
                v-for="item in usageCategoryCreateNonBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createUsageDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createUsageSubmitting" @click="handleSubmitCreateUsage">确认新增</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Loading, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import CalibrationHeader from '@/components/file-upload/CalibrationHeader.vue'
import CalibrationPdfToolbar from '@/components/file-upload/CalibrationPdfToolbar.vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import { AUDIT_TABLE_HEADER_STYLE, AUDIT_TABLE_CELL_STYLE } from '@/constants/auditTableStyles'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  currentFile: { type: Object, default: null },
  isEditing: { type: Boolean, default: false },
  editingRowId: { type: [String, Number], default: '' },
  startRowEdit: { type: Function, required: true },
  handleUsageCategoryChange: { type: Function, default: null },
  exitEditMode: { type: Function, required: true },
  handleSaveData: { type: Function, required: true },
  handleRefreshSurveyReport: { type: Function, default: null },
  handleCreateRoom: { type: Function, default: null },
  handleDeleteRoom: { type: Function, default: null },
  roomCreateLoading: { type: Boolean, default: false },
  roomDeleteLoading: { type: Boolean, default: false },
  reportRefreshLoading: { type: Boolean, default: false },
  handleAuditPass: { type: Function, default: null },
  calibrationLoading: { type: Boolean, default: false },
  currentViewType: { type: String, default: 'original' },
  isPreprocessAvailable: { type: Boolean, default: false },
  switchView: { type: Function, required: true },
  pdfLoading: { type: Boolean, default: false },
  calibrationPdfUrl: { type: String, default: '' },
  pdfLoaded: { type: Function, required: true },
  pdfLoadError: { type: Function, required: true },
  recognitionMdLoading: { type: Boolean, default: false },
  recognitionHtml: { type: String, default: '' },
  auditSummaryData: { type: Object, required: true },
  auditSummaryDisplay: { type: Object, required: true },
  roomInfoData: { type: Array, required: true },
  roomInfoLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'closed', 'back'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 50,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  }
})

const hasVerificationErrorReason = computed(() => {
  const reason = String(props.auditSummaryData?.verificationErrorReason || '').trim()
  return !!reason && reason !== '-' && reason.toLowerCase() !== 'null'
})
const getRoomRowClassName = ({ row }) => {
  return row?.usageCategory === '未知' ? 'unknown-usage-row' : ''
}
const isRowEditing = (row) => {
  if (!props.isEditing || !props.editingRowId || !row?.id) return false
  return String(row.id) === String(props.editingRowId)
}
const toNumber = (value) => Number(value || 0)
const summaryMetrics = computed(() => [
  {
    key: 'building',
    title: '建筑面积',
    manual: toNumber(props.auditSummaryData.roomInfoBuildingAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoBuildingAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoBuildingAreaSum) - toNumber(props.auditSummaryData.roomInfoBuildingAreaSumFromOcr)
  },
  {
    key: 'inner',
    title: '套内面积',
    manual: toNumber(props.auditSummaryData.roomInfoInnerAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoInnerAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoInnerAreaSum) - toNumber(props.auditSummaryData.roomInfoInnerAreaSumFromOcr)
  },
  {
    key: 'balcony',
    title: '阳台面积',
    manual: toNumber(props.auditSummaryData.roomInfoBalconyAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoBalconyAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoBalconyAreaSum) - toNumber(props.auditSummaryData.roomInfoBalconyAreaSumFromOcr)
  },
  {
    key: 'shared',
    title: '分摊面积',
    manual: toNumber(props.auditSummaryData.roomInfoSharedAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoSharedAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoSharedAreaSum) - toNumber(props.auditSummaryData.roomInfoSharedAreaSumFromOcr)
  }
])
const formatDelta = (value) => {
  const num = Number(value || 0)
  if (num > 0) return `+${num.toFixed(2)}`
  return num.toFixed(2)
}

const createRoomDialogVisible = ref(false)
const createRoomFormRef = ref(null)
const createRoomForm = reactive({
  usageCategory: '',
  roomLevel: '',
  roomNumber: '',
  buildingArea: '',
  innerArea: '',
  balconyArea: '',
  sharedArea: '',
  remark: '',
  roomUsage: '',
  floorAreaType: ''
})

const usagePresetMap = {
  RESIDENTIAL: { roomUsage: '住宅', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMERCIAL: { roomUsage: '商业', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  MANAGEMENT: { roomUsage: '物管', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  OTHER_BUILDABLE: { roomUsage: '其他计容', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMUNITY: { roomUsage: '社区用房', floorAreaType: 'NON_BUILDABLE', floorAreaTypeText: '不计容' },
  OTHER_PUBLIC: { roomUsage: '其他公用', floorAreaType: 'NON_BUILDABLE', floorAreaTypeText: '不计容' },
  UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN', floorAreaTypeText: '未知' }
}

const derivedRoomPreset = computed(() => {
  return usagePresetMap[createRoomForm.usageCategory] || { roomUsage: '-', floorAreaType: 'UNKNOWN', floorAreaTypeText: '-' }
})

const resetCreateRoomForm = () => {
  createRoomForm.usageCategory = ''
  createRoomForm.roomLevel = ''
  createRoomForm.roomNumber = ''
  createRoomForm.buildingArea = ''
  createRoomForm.innerArea = ''
  createRoomForm.balconyArea = ''
  createRoomForm.sharedArea = ''
  createRoomForm.remark = ''
  createRoomForm.roomUsage = ''
  createRoomForm.floorAreaType = ''
}

const openCreateRoomDialog = () => {
  resetCreateRoomForm()
  createRoomDialogVisible.value = true
}

const handleSubmitCreateRoom = async () => {
  if (!createRoomForm.usageCategory) {
    ElMessage.warning('请先选择用途类别')
    return
  }
  if (typeof props.handleCreateRoom !== 'function') return
  const ok = await props.handleCreateRoom({
    ...createRoomForm,
    roomUsage: derivedRoomPreset.value.roomUsage,
    floorAreaType: derivedRoomPreset.value.floorAreaType
  })
  if (ok) {
    createRoomDialogVisible.value = false
    resetCreateRoomForm()
  }
}

const handleDeleteRoomRow = async (row) => {
  if (typeof props.handleDeleteRoom !== 'function') return
  await props.handleDeleteRoom(row)
}

const usagePickerVisible = ref(false)
const usagePickerLoading = ref(false)
const usagePickerKeyword = ref('')
const usagePickerOptions = ref([])
const usagePickerTargetRow = ref(null)
const createUsageDialogVisible = ref(false)
const createUsageSubmitting = ref(false)
const createUsageFormRef = ref(null)
const createUsageForm = reactive({
  usagePattern: '',
  usageCategory: ''
})
const createUsageFormRules = {
  usagePattern: [{ required: true, message: '请输入用途名称', trigger: 'blur' }],
  usageCategory: [{ required: true, message: '请选择用途类别', trigger: 'change' }]
}

const usageCategoryLabelMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  MANAGEMENT: '物管',
  OTHER_BUILDABLE: '其他计容',
  COMMUNITY: '社区用房',
  OTHER_PUBLIC: '其他公用',
  UNKNOWN: '未知'
}

const usageCategoryCreateOptions = [
  { label: '商业', value: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  { label: '住宅', value: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  { label: '物管', value: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  { label: '其他计容', value: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  { label: '社区用房', value: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  { label: '其他公用', value: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
]
const usageCategoryCreateBuildableOptions = usageCategoryCreateOptions.filter((item) => item.floorAreaType === 'BUILDABLE')
const usageCategoryCreateNonBuildableOptions = usageCategoryCreateOptions.filter((item) => item.floorAreaType === 'NON_BUILDABLE')

const floorAreaTypeLabelMap = {
  BUILDABLE: '计容',
  NON_BUILDABLE: '不计容',
  UNKNOWN: '未知'
}

const normalizeUsageCategoryText = (value) => {
  const key = String(value || '').trim().toUpperCase()
  return usageCategoryLabelMap[key] || usageCategoryLabelMap.UNKNOWN
}

const normalizeFloorAreaTypeText = (value) => {
  const key = String(value || '').trim().toUpperCase()
  return floorAreaTypeLabelMap[key] || floorAreaTypeLabelMap.UNKNOWN
}

const usageCategoryTextToCodeMap = Object.entries(usageCategoryLabelMap).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {})

const normalizeUsageCategoryCode = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'UNKNOWN'
  const upper = raw.toUpperCase()
  if (usageCategoryLabelMap[upper]) return upper
  return usageCategoryTextToCodeMap[raw] || 'UNKNOWN'
}

const ensureUsageOptionsLoaded = async () => {
  if (usagePickerLoading.value || usagePickerOptions.value.length) return
  await loadUsagePickerOptions()
}

const usageEditorVisibleRowId = ref('')
const usageEditorDraft = reactive({
  roomUsage: ''
})

const usageEditorOptions = computed(() => usagePickerOptions.value)

const usageEditorMatchedOption = computed(() => {
  const usage = String(usageEditorDraft.roomUsage || '').trim()
  if (!usage) return null
  return usagePickerOptions.value.find((item) => String(item.usagePattern || '').trim() === usage) || null
})

const openUsageEditor = async (row) => {
  usagePickerTargetRow.value = row
  usageEditorVisibleRowId.value = String(row?.id || '')
  usageEditorDraft.roomUsage = String(row?.roomUsage || '').trim()
  await ensureUsageOptionsLoaded()
}

const closeUsageEditor = () => {
  usageEditorVisibleRowId.value = ''
}

const applyUsageEditor = (row) => {
  if (!usageEditorDraft.roomUsage) {
    ElMessage.warning('请选择用途')
    return
  }
  const matched = usagePickerOptions.value.find((item) =>
    String(item.usagePattern || '').trim() === String(usageEditorDraft.roomUsage || '').trim()
  )
  if (!matched) {
    ElMessage.warning('未找到对应用途配置，请先新增用途')
    return
  }

  row.usageCategory = matched.usageCategoryText
  row.roomUsage = matched.usagePattern || usageEditorDraft.roomUsage
  row.floorAreaType = matched.floorAreaTypeText || row.floorAreaType
  if (typeof props.handleUsageCategoryChange === 'function') {
    props.handleUsageCategoryChange(row)
  }
  closeUsageEditor()
}

const filteredUsagePickerOptions = computed(() => {
  const keyword = String(usagePickerKeyword.value || '').trim().toLowerCase()
  if (!keyword) return usagePickerOptions.value
  return usagePickerOptions.value.filter((item) =>
    [item.usagePattern, item.usageCategoryText, item.floorAreaTypeText]
      .map((v) => String(v || '').toLowerCase())
      .some((v) => v.includes(keyword))
  )
})

const loadUsagePickerOptions = async () => {
  usagePickerLoading.value = true
  try {
    const res = await axios.get('/api/usage-config/list', { params: { _t: Date.now() } })
    if (res.data?.code !== 200) {
      usagePickerOptions.value = []
      return
    }
    usagePickerOptions.value = (res.data?.data || []).map((item) => ({
      id: item.id,
      usagePattern: item.usagePattern || '-',
      usageCategory: String(item.usageCategory || '').toUpperCase(),
      floorAreaType: String(item.floorAreaType || '').toUpperCase(),
      usageCategoryText: normalizeUsageCategoryText(item.usageCategory),
      floorAreaTypeText: normalizeFloorAreaTypeText(item.floorAreaType)
    }))
  } catch (error) {
    console.error('获取用途映射失败:', error)
    ElMessage.error('获取用途映射失败，请稍后重试')
    usagePickerOptions.value = []
  } finally {
    usagePickerLoading.value = false
  }
}

const openUsagePicker = async (row) => {
  usagePickerTargetRow.value = row
  usagePickerKeyword.value = ''
  usagePickerVisible.value = true
  if (!usagePickerOptions.value.length) {
    await loadUsagePickerOptions()
  }
}

const applyUsagePicker = (item) => {
  const target = usagePickerTargetRow.value
  if (!target || !item) return
  target.usageCategory = item.usageCategoryText
  target.floorAreaType = item.floorAreaTypeText
  target.roomUsage = item.usagePattern || target.roomUsage
  usagePickerVisible.value = false
}

const handleUsagePickerRowClick = (row) => {
  applyUsagePicker(row)
}

const resolveFloorAreaTypeByCategory = (usageCategory) => {
  return usageCategoryCreateOptions.find((item) => item.value === usageCategory)?.floorAreaType || 'BUILDABLE'
}

const resetCreateUsageForm = () => {
  if (createUsageFormRef.value) {
    createUsageFormRef.value.clearValidate()
  }
  createUsageForm.usagePattern = ''
  createUsageForm.usageCategory = ''
}

const openCreateUsageDialog = () => {
  resetCreateUsageForm()
  createUsageDialogVisible.value = true
}

const openCreateUsageDialogForRow = async (row) => {
  usagePickerTargetRow.value = row
  await ensureUsageOptionsLoaded()
  resetCreateUsageForm()
  createUsageForm.usageCategory = normalizeUsageCategoryCode(row?.usageCategory) === 'UNKNOWN'
    ? ''
    : normalizeUsageCategoryCode(row?.usageCategory)
  createUsageDialogVisible.value = true
}

const handleSubmitCreateUsage = async () => {
  if (!createUsageFormRef.value || createUsageSubmitting.value) return
  try {
    await createUsageFormRef.value.validate()
  } catch {
    return
  }

  createUsageSubmitting.value = true
  try {
    const usageCategory = String(createUsageForm.usageCategory || '').toUpperCase()
    const usagePattern = String(createUsageForm.usagePattern || '').trim()
    const floorAreaType = resolveFloorAreaTypeByCategory(usageCategory)

    const payload = {
      usagePattern,
      usageCategory,
      floorAreaType,
      isRegex: 0,
      priority: 100,
      status: 1,
      remark: '审核界面新增',
      collectionName: ''
    }
    const res = await axios.post('/api/usage-config', payload)
    if (res.data?.code !== 200) {
      ElMessage.error(res.data?.msg || '新增用途失败')
      return
    }

    ElMessage.success('新增用途成功')
    createUsageDialogVisible.value = false
    await loadUsagePickerOptions()

    const created = usagePickerOptions.value.find((item) => {
      return String(item.usagePattern || '').trim() === usagePattern &&
        String(item.usageCategory || '').trim().toUpperCase() === usageCategory
    })
    if (created) {
      applyUsagePicker(created)
    }
  } catch (error) {
    console.error('新增用途失败:', error)
    ElMessage.error('新增用途失败，请稍后重试')
  } finally {
    createUsageSubmitting.value = false
  }
}
</script>


<style>
/* 只针对这个 dialog 的遮罩层（modal-class） */
.el-overlay.calibration-modal {
  overflow: hidden !important;
}

/* overlay 内层容器：撑满视口，禁止滚动 */
.el-overlay.calibration-modal .el-overlay-dialog {
  padding: 0 !important;
  align-items: stretch !important;
  overflow: hidden !important;
}

/* fullscreen dialog：改成 flex 布局，彻底禁用 dialog 自身滚动 */
.el-overlay.calibration-modal .el-dialog.is-fullscreen {
  margin: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;

  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;   /* ✅ 不允许整页滚 */
}

/* header 固定 */
.el-overlay.calibration-modal .el-dialog__header {
  flex: 0 0 auto;
  padding: 0 !important;
}

/* body 吃满剩余高度，且自身不滚（滚动交给你指定的区域，比如表格 body-wrapper） */
.el-overlay.calibration-modal .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 !important;

  overflow: hidden !important;   /* ✅ body 不滚 */
  display: flex;
  flex-direction: column;        /* ✅ split-view 才能按高度伸展 */
}
</style>

<style scoped>


.split-view.audit-split-layout {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  background: #f0f2f5;
  height: 100%;
}

.audit-split-layout--calibration .audit-splitter {
  background: #94a3b8;
}

.audit-split-layout--calibration .audit-splitter:hover {
  background: #7c8aa0;
}

.audit-split-layout--calibration .audit-splitter::after {
  background: #e2e8f0;
  opacity: 0.95;
}

.left-panel{
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #525659;
}

.pdf-canvas {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pdf-canvas > div {
  flex: 1 1 auto;
  min-height: 0;
}

.right-panel{
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  background: #f2f4f7;
  padding: 16px;
  box-sizing: border-box;
}

.cali-right-panel{
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;   /* ✅不滚 */
  display: flex;
  flex-direction: column;
}

/* summary 固定在上面 */
.sum-info-section{
  flex: 0 0 auto;
  max-height: min(560px, 52vh);
  overflow: auto;
  padding-right: 2px;
}

/* 表格容器占剩余高度，但自身不滚 */
.room-table-wrap{
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;   /* ✅不滚 */
  display: flex;
  flex-direction: column;
}

/* el-table 必须拿到高度（不然 body-wrapper 没法算出滚动区） */
:deep(.room-table){
  flex: 1 1 auto;
  min-height: 0;
  height: 0;          /* ✅关键：让它吃剩余高度 */
}

:deep(.room-table .el-table__inner-wrapper){
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
:deep(.room-table .el-table__body-wrapper){
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto !important;
}
/* 如果内部用了 el-scrollbar，补齐高度 */
:deep(.room-table .el-scrollbar){ height: 100%; }
:deep(.room-table .el-scrollbar__wrap){ overflow: auto !important; }




.sum-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-content: start;
}

.sum-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 14px;
  align-items: start;
}

.cali-audit-card {
  min-height: 0;
  align-self: stretch;
}

.summary-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 10px 28px -16px rgba(15, 23, 42, 0.12);
}

.summary-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 14px 0 0 14px;
}

.summary-card--manual::before {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.summary-card--audit::before {
  background: linear-gradient(180deg, #10b981 0%, #047857 100%);
}

.summary-card--ocr::before {
  background: linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%);
}

.summary-card__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px 10px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
}

.summary-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.summary-card--manual .summary-card__icon {
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 6px 14px -6px rgba(29, 78, 216, 0.55);
}

.summary-card--audit .summary-card__icon {
  background: linear-gradient(145deg, #10b981 0%, #059669 100%);
  box-shadow: 0 6px 14px -6px rgba(5, 150, 105, 0.45);
}

.summary-card--ocr .summary-card__icon {
  background: linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%);
  box-shadow: 0 6px 14px -6px rgba(124, 58, 237, 0.45);
}

.summary-card__head-text {
  min-width: 0;
}

.summary-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--biz-text, #1f2d3d);
  line-height: 1.3;
}

.summary-card__subtitle {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--biz-subtext, #64748b);
}

.summary-card__body {
  padding: 10px 12px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  background: rgba(248, 250, 252, 0.65);
}

.stat-row:nth-child(even) {
  background: rgba(241, 245, 249, 0.75);
}

.stat-row--tags {
  grid-template-columns: minmax(0, 1fr) auto;
}

.stat-row__label {
  color: #64748b;
  font-weight: 500;
}

.stat-row__value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  font-size: 14px;
  text-align: right;
}

.stat-row__value--warn {
  color: #c2410c;
}

.stat-row__value--ok {
  color: #15803d;
}

.stat-row__value--ocr {
  color: #2563eb;
}

.stat-row__unit {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  min-width: 1.5em;
  text-align: right;
}

.stat-row__tags {
  display: flex;
  justify-content: flex-end;
  grid-column: 2 / -1;
}

.stat-row--tags .stat-row__label {
  align-self: center;
}

.summary-card__audit-append {
  padding: 0 12px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgba(226, 232, 240, 0.55);
  margin-top: 2px;
  padding-top: 10px;
}

.audit-append-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.unknown-list {
  display: block;
  max-height: 110px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  border: 1px solid #e5eaf3;
  border-radius: 6px;
  background: #f8fbff;
  color: #2563eb;
  white-space: pre-wrap;
  line-height: 1.5;
}

.reason-text {
  display: block;
  max-height: 76px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff3f2;
  color: #b42318;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}

.verify-tip-block {
  display: block;
  padding: 8px 10px;
  border: 1px dashed #fbc4c4;
  border-radius: 8px;
  background: #fff7f7;
}

.verify-tip-title {
  font-size: 13px;
  font-weight: 600;
  color: #b42318;
  margin-bottom: 4px;
}

.verify-tip-line {
  font-size: 12px;
  line-height: 1.6;
  color: #b54708;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 0 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
}

.table-toolbar .left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.toolbar-count,
.table-toolbar .right {
  font-size: 12px;
  color: #6b7280;
}

.row-op-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.usage-picker-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.usage-picker-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.usage-edit-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: center;
}

.usage-editor-pop {
  padding: 2px 2px 0;
}

.usage-editor-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.usage-editor-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.usage-editor-field {
  width: 100%;
}

.usage-editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.usage-auto-tip {
  color: #64748b;
  font-size: 12px;
}

:deep(.table-toolbar .el-button--primary),
:deep(.el-dialog__footer .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
  font-weight: 600;
}

:deep(.table-toolbar .el-button--primary:hover),
:deep(.el-dialog__footer .el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

:deep(.table-toolbar .el-button--danger),
:deep(.el-dialog__footer .el-button--danger) {
  background: #fff3f2;
  border-color: #f7c4bf;
  color: #b42318;
  font-weight: 600;
}

:deep(.table-toolbar .el-button--danger:hover),
:deep(.el-dialog__footer .el-button--danger:hover) {
  background: #ffe9e7;
  border-color: #f1a9a1;
  color: #912018;
}

:deep(.room-table td.el-table__cell),
:deep(.room-table th.el-table__cell) {
  padding-top: 8px;
  padding-bottom: 8px;
}

:deep(.room-table .unknown-usage-row > td.el-table__cell) {
  background: #fff1f0 !important;
}

:global(.usage-picker-dialog .el-dialog__header),
:global(.create-usage-dialog .el-dialog__header) {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #edf2f8;
}

:global(.usage-picker-dialog .el-dialog__body),
:global(.create-usage-dialog .el-dialog__body) {
  padding: 14px 16px;
}

:global(.usage-picker-dialog .el-dialog__footer),
:global(.create-usage-dialog .el-dialog__footer) {
  padding: 10px 16px 14px;
  border-top: 1px solid #edf2f8;
}





@media (max-width: 1280px) {
  .split-view.audit-split-layout--calibration .left-panel {
    height: 42%;
    min-height: 320px;
    border-bottom: 1px solid #dcdfe6;
  }

  .split-view.audit-split-layout--calibration .right-panel {
    flex: 1 1 auto;
    height: auto;
    min-height: 0;
    padding: 12px;
  }

  .sum-layout {
    grid-template-columns: 1fr;
  }

  .sum-grid {
    grid-template-columns: 1fr;
  }

  .table-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
  }
}
</style>
