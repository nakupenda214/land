<template>
<el-dialog
  v-model="dialogVisible"
  fullscreen
  append-to-body
  custom-class="calibration-dialog"
  modal-class="calibration-modal"
  :show-close="false"
  @closed="handleDialogClosed"
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
        @pointerdown="onSplitterMouseDown"
      />

      <div class="right-panel audit-split-layout__right">
        <div class="cali-right-panel">
          <section class="sum-info-section">
            <div
              class="cali-audit-strip"
              :class="isAuditPassed ? 'cali-audit-strip--passed' : 'cali-audit-strip--failed'"
            >
              <div class="cali-audit-strip__brand">
                <el-icon class="cali-audit-strip__icon" aria-hidden="true">
                  <component :is="isAuditPassed ? CircleCheck : WarningFilled" />
                </el-icon>
                <span class="cali-audit-strip__title">校验信息</span>
              </div>

              <div class="cali-audit-strip__metrics">
                <span class="cali-audit-metric">
                  <span class="cali-audit-metric__label">待确认</span>
                  <span
                    class="cali-audit-metric__value"
                    :class="{ 'cali-audit-metric__value--warn': hasPendingConfirmArea }"
                  >
                    {{ auditSummaryData.pendingConfirmArea }}㎡
                  </span>
                </span>
                <span class="cali-audit-metric__sep" aria-hidden="true" />
                <span class="cali-audit-metric">
                  <span class="cali-audit-metric__label">未知用途</span>
                  <span class="cali-audit-metric__value">{{ auditSummaryData.unknownUsageCount }}条</span>
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

              <div class="cali-audit-strip__actions">
                <el-tag
                  size="small"
                  effect="light"
                  round
                  :type="auditSummaryDisplay.isVerifiedTagType"
                >
                  {{ auditSummaryDisplay.isVerifiedText }}
                </el-tag>
              </div>
            </div>

            <div
              v-if="!isAuditPassed && hasAuditAppendContent"
              class="cali-audit-detail-panel"
            >
              <div class="cali-audit-detail-panel__body">
                <div v-if="hasUnknownUsagesDetail" class="audit-append-block">
                  <div class="audit-append-label">未知用途详情</div>
                  <div class="unknown-list unknown-list--panel">{{ auditSummaryData.unknownUsages }}</div>
                </div>
                <div v-if="calibrationUnknownPolicyVisible" class="audit-append-block calibration-unknown-policy">
                  <div class="audit-append-label">将未知用途归为已知</div>
                  <div v-loading="calibrationUnknownLoading" class="calibration-unknown-policy__body">
                    <div
                      v-if="!calibrationUnknownLoading && calibrationUnknownRows.length === 0"
                      class="calibration-unknown-policy__hint"
                    >
                      未找到待处理的未知用途记录（可能已在土地类型管理中处理）。
                    </div>
                    <div
                      v-for="row in calibrationUnknownRows"
                      :key="row.id"
                      class="calibration-unknown-policy__row"
                    >
                      <span class="calibration-unknown-policy__name" :title="row.usageName">{{ row.usageName }}</span>
                      <el-select
                        v-model="row.selectedTarget"
                        size="small"
                        placeholder="归属分类"
                        class="calibration-unknown-policy__select"
                      >
                        <el-option-group label="计容面积">
                          <el-option label="商业" value="calcCommercial" />
                          <el-option label="住宅" value="calcResidential" />
                          <el-option label="物管" value="calcPropMgmt" />
                          <el-option label="其他计容" value="calcOther" />
                        </el-option-group>
                        <el-option-group label="不计容面积">
                          <el-option label="社区用房" value="nonCalcCommunity" />
                          <el-option label="其他公用" value="nonCalcOther" />
                        </el-option-group>
                      </el-select>
                      <el-button
                        type="primary"
                        size="small"
                        :loading="savingCalibrationUnknownId === row.id"
                        @click="saveCalibrationUnknownRule(row)"
                      >
                        保存
                      </el-button>
                    </div>
                  </div>
                </div>
                <div v-if="hasVerificationErrorReason" class="audit-append-block">
                  <div class="audit-append-label">验证失败原因</div>
                  <div class="reason-text reason-text--panel">{{ auditSummaryData.verificationErrorReason }}</div>
                </div>
                <div v-if="hasVerificationErrorReason" class="audit-append-block verify-tip-block">
                  <div class="verify-tip-title">排查建议</div>
                  <div class="verify-tip-line">1. 请检查解析文件方向。</div>
                  <div class="verify-tip-line">2. 请审查户室面积对照表的部分数据是否被印章遮盖。</div>
                </div>
              </div>
            </div>
          </section>

          <section class="room-table-wrap">
            <div class="table-toolbar">
              <div class="left">
                <span class="toolbar-title">户室信息</span>
                <el-tag size="small" effect="plain" :type="isEditing ? 'warning' : 'info'">
                  {{ isEditing ? '编辑模式' : '查看模式' }}
                </el-tag>
                <span class="toolbar-count">{{ roomTableCountText }}</span>
              </div>
              <div class="table-toolbar__search">
                <el-input
                  v-model="roomTableKeyword"
                  size="small"
                  clearable
                  placeholder="搜索用途类别、用途、面积类型、备注…"
                  class="room-table-search-input"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <span
                  v-if="roomTableIsFiltering && showRoomInfoPagination"
                  class="room-table-search-hint"
                >
                  仅筛选当前页
                </span>
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
              class="room-table room-table--compact"
              :data="filteredRoomInfoData"
              :row-class-name="getRoomRowClassName"
              border
              stripe
              size="small"
              v-loading="roomInfoLoading"
              element-loading-text="加载户室数据中..."
              row-key="id"
              style="width: 100%;"
              :header-cell-style="ROOM_TABLE_HEADER_STYLE"
              :cell-style="ROOM_TABLE_CELL_STYLE"
            >
              <el-table-column prop="roomLevel" label="楼层" min-width="58" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomLevel || '-' }}</template>
                  <el-input v-else v-model="row.roomLevel" size="small" class="room-table-field" placeholder="楼层" />
                </template>
              </el-table-column>

              <el-table-column prop="roomNumber" label="房号" min-width="56" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomNumber || '-' }}</template>
                  <el-input v-else v-model="row.roomNumber" size="small" class="room-table-field" placeholder="房号" />
                </template>
              </el-table-column>

              <el-table-column prop="buildingArea" label="建㎡" min-width="68" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.buildingArea || '0.00' }}</template>
                  <el-input v-else v-model="row.buildingArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="innerArea" label="套㎡" min-width="68" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.innerArea || '0.00' }}</template>
                  <el-input v-else v-model="row.innerArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="balconyArea" label="阳㎡" min-width="60" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.balconyArea || '0.00' }}</template>
                  <el-input v-else v-model="row.balconyArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="sharedArea" label="摊㎡" min-width="68" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.sharedArea || '0.00' }}</template>
                  <el-input v-else v-model="row.sharedArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="usageCategory" label="类别" min-width="64" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.usageCategory || '未知' }}</template>
                  <span v-else class="room-table-editing-tag">{{ row.usageCategory || '未选' }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="roomUsage" label="用途" width="76" show-overflow-tooltip align="center">
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">
                    <span class="room-table-cell-ellipsis">{{ row.roomUsage || '-' }}</span>
                  </template>
                  <div v-else class="usage-edit-inline">
                    <el-popover
                      placement="bottom"
                      trigger="click"
                      :width="360"
                      :visible="usageEditorVisibleRowId === String(row.id)"
                    >
                      <div class="usage-editor-pop">
                        <div class="usage-editor-title">选择用途</div>
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
                                :label="`${item.usagePattern}（${item.usageCategoryText} / ${item.floorAreaTypeText}）`"
                                :value="item.usagePattern"
                              />
                            </el-select>
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
                        <el-button size="small" type="primary" link class="room-table-usage-btn" @click.stop="openUsageEditor(row)">
                          {{ row.roomUsage ? '改用途' : '选用途' }}
                        </el-button>
                      </template>
                    </el-popover>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="floorAreaType" label="类型" min-width="52" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <span
                    class="room-area-type"
                    :class="{
                      'room-area-type--buildable': row.floorAreaType === '计容',
                      'room-area-type--non-buildable': row.floorAreaType === '不计容'
                    }"
                  >
                    {{ row.floorAreaType }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" width="52" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">
                    <span class="room-table-cell-ellipsis">{{ row.remark || '-' }}</span>
                  </template>
                  <el-input v-else v-model="row.remark" size="small" class="room-table-field" placeholder="备注" />
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="72" align="center">
                <template #default="{ row }">
                  <div class="row-op-group row-op-group--compact">
                    <el-button
                      size="small"
                      link
                      type="primary"
                      :disabled="isEditing && !isRowEditing(row)"
                      @click="startRowEdit(row)"
                    >
                      {{ isRowEditing(row) ? '…' : '编' }}
                    </el-button>
                    <el-button
                      size="small"
                      link
                      type="danger"
                      :disabled="roomDeleteLoading"
                      @click="handleDeleteRoomRow(row)"
                    >
                      删
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="roomInfoData.length" class="room-table-compare">
              <div class="room-table-compare__table">
                <div class="room-table-compare__row room-table-compare__row--head">
                  <span class="room-table-compare__label" />
                  <span
                    v-for="item in summaryMetrics"
                    :key="`head-${item.key}`"
                    class="room-table-compare__cell room-table-compare__cell--head"
                    :class="{ 'room-table-compare__cell--mismatch': item.key === 'building' && buildingAreaMismatch }"
                  >
                    {{ item.title }}
                  </span>
                </div>
                <div class="room-table-compare__row">
                  <span class="room-table-compare__label">列表汇总</span>
                  <span
                    v-for="item in summaryMetrics"
                    :key="`manual-${item.key}`"
                    class="room-table-compare__cell"
                    :class="{ 'room-table-compare__cell--mismatch': item.key === 'building' && buildingAreaMismatch }"
                  >
                    {{ item.manual }}
                  </span>
                </div>
                <div class="room-table-compare__row">
                  <span class="room-table-compare__label">OCR</span>
                  <span
                    v-for="item in summaryMetrics"
                    :key="`ocr-${item.key}`"
                    class="room-table-compare__cell room-table-compare__cell--ocr"
                    :class="{ 'room-table-compare__cell--mismatch': item.key === 'building' && buildingAreaMismatch }"
                  >
                    {{ item.ocr }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="showRoomInfoPagination"
              class="room-table-pagination"
            >
              <el-pagination
                :current-page="roomInfoPageNum"
                :page-size="roomInfoPageSize"
                :total="roomInfoTotal"
                :page-sizes="[20, 50, 100, 200]"
                layout="total, sizes, prev, pager, next"
                small
                background
                @current-change="handleRoomInfoPageChange"
                @size-change="handleRoomInfoPageSizeChange"
              />
            </div>

            <el-empty
              v-if="!roomInfoLoading && filteredRoomInfoData.length === 0"
              :description="roomTableIsFiltering ? '未找到匹配的户室' : '暂无户室面积数据'"
            />
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
import { computed, reactive, ref, watch } from 'vue'
import { useCalibrationUnknownUsagePolicy, parseUnknownUsageNames } from '@/composables/file-upload/useCalibrationUnknownUsagePolicy'
import { useCalibrationRoomTableFilter } from '@/composables/file-upload/useCalibrationRoomTableFilter'
import { Loading, CircleCheck, WarningFilled, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import CalibrationHeader from '@/components/file-upload/CalibrationHeader.vue'
import CalibrationPdfToolbar from '@/components/file-upload/CalibrationPdfToolbar.vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
const ROOM_TABLE_HEADER_STYLE = {
  background: '#f1f5f9',
  color: '#334155',
  fontWeight: '600',
  fontSize: '10px',
  padding: '3px 1px'
}

const ROOM_TABLE_CELL_STYLE = {
  fontSize: '11px',
  padding: '2px 1px'
}

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  currentFile: { type: Object, default: null },
  isEditing: { type: Boolean, default: false },
  editingRowId: { type: [String, Number], default: '' },
  startRowEdit: { type: Function, required: true },
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
  roomInfoLoading: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  roomInfoTotal: { type: Number, default: 0 },
  roomInfoPageNum: { type: Number, default: 1 },
  roomInfoPageSize: { type: Number, default: 50 },
  goRoomInfoPage: { type: Function, default: null },
  goRoomInfoPageSizeChange: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue', 'closed', 'back'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleDialogClosed = () => {
  clearRoomTableKeyword()
  emit('closed')
}

const {
  keyword: roomTableKeyword,
  isFiltering: roomTableIsFiltering,
  filteredRoomInfoData,
  filteredCount: roomTableFilteredCount,
  clearKeyword: clearRoomTableKeyword
} = useCalibrationRoomTableFilter(() => props.roomInfoData)

const roomTableCountText = computed(() => {
  const total = props.roomInfoTotal > 0 ? props.roomInfoTotal : props.roomInfoData.length
  if (roomTableIsFiltering.value) {
    return `匹配 ${roomTableFilteredCount.value} / 本页 ${props.roomInfoData.length} 条`
  }
  return `共 ${total} 条`
})

watch(dialogVisible, (open) => {
  if (!open) clearRoomTableKeyword()
})

const auditSummaryDataRef = computed(() => props.auditSummaryData)
const projectIdRef = computed(() => props.projectId)
const handleRefreshSurveyReportRef = computed(() => props.handleRefreshSurveyReport)

const {
  calibrationUnknownRows,
  calibrationUnknownLoading,
  savingCalibrationUnknownId,
  saveCalibrationUnknownRule
} = useCalibrationUnknownUsagePolicy({
  dialogOpen: dialogVisible,
  projectId: projectIdRef,
  auditSummaryData: auditSummaryDataRef,
  handleRefreshSurveyReport: handleRefreshSurveyReportRef
})

const calibrationUnknownPolicyVisible = computed(() => {
  if (!dialogVisible.value) return false
  if (!String(props.projectId || '').trim()) return false
  return parseUnknownUsageNames(props.auditSummaryData?.unknownUsages).length > 0
})

const showRoomInfoPagination = computed(
  () => typeof props.goRoomInfoPage === 'function' && Number(props.roomInfoTotal || 0) > 0
)

const handleRoomInfoPageChange = (page) => {
  props.goRoomInfoPage?.(page)
}

const handleRoomInfoPageSizeChange = (size) => {
  props.goRoomInfoPageSizeChange?.(size)
}

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 50,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  }
})

const isAuditPassed = computed(() => Number(props.auditSummaryData?.isVerified) === 1)

const hasVerificationErrorReason = computed(() => {
  const reason = String(props.auditSummaryData?.verificationErrorReason || '').trim()
  return !!reason && reason !== '-' && reason.toLowerCase() !== 'null'
})

const hasUnknownUsagesDetail = computed(() => {
  const text = String(props.auditSummaryData?.unknownUsages || '').trim()
  return !!text && text !== '-' && text !== '{}' && text.toLowerCase() !== 'null'
})

const hasAuditAppendContent = computed(
  () =>
    hasUnknownUsagesDetail.value ||
    calibrationUnknownPolicyVisible.value ||
    hasVerificationErrorReason.value
)

const getRoomRowClassName = ({ row }) => {
  const classes = []
  if (row?.usageCategory === '未知') classes.push('unknown-usage-row')
  if (Number(row?.isCalculate ?? 0) !== 1) classes.push('non-calculate-row')
  return classes.join(' ')
}
const isRowEditing = (row) => {
  if (!props.isEditing || !props.editingRowId || !row?.id) return false
  return String(row.id) === String(props.editingRowId)
}
const toNumber = (value) => Number(value || 0)
const AREA_COMPARE_TOLERANCE = 0.01

const summaryMetrics = computed(() => [
  {
    key: 'building',
    title: '建筑面积(㎡)',
    manual: toNumber(props.auditSummaryData.roomInfoBuildingAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoBuildingAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoBuildingAreaSum) - toNumber(props.auditSummaryData.roomInfoBuildingAreaSumFromOcr)
  },
  {
    key: 'inner',
    title: '套内面积(㎡)',
    manual: toNumber(props.auditSummaryData.roomInfoInnerAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoInnerAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoInnerAreaSum) - toNumber(props.auditSummaryData.roomInfoInnerAreaSumFromOcr)
  },
  {
    key: 'balcony',
    title: '阳台面积(㎡)',
    manual: toNumber(props.auditSummaryData.roomInfoBalconyAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoBalconyAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoBalconyAreaSum) - toNumber(props.auditSummaryData.roomInfoBalconyAreaSumFromOcr)
  },
  {
    key: 'shared',
    title: '分摊面积(㎡)',
    manual: toNumber(props.auditSummaryData.roomInfoSharedAreaSum).toFixed(2),
    ocr: toNumber(props.auditSummaryData.roomInfoSharedAreaSumFromOcr).toFixed(2),
    delta: toNumber(props.auditSummaryData.roomInfoSharedAreaSum) - toNumber(props.auditSummaryData.roomInfoSharedAreaSumFromOcr)
  }
])

const buildingAreaMismatch = computed(() => {
  const building = summaryMetrics.value.find((item) => item.key === 'building')
  if (!building) return false
  return Math.abs(building.delta) > AREA_COMPARE_TOLERANCE
})

const hasPendingConfirmArea = computed(
  () => toNumber(props.auditSummaryData?.pendingConfirmArea) > AREA_COMPARE_TOLERANCE
)

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

/* summary 固定高度，不参与滚动，避免展开详情时挤压下方表格 */
.sum-info-section{
  flex: 0 0 auto;
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

:deep(.room-table--compact.el-table) {
  width: 100% !important;
}

:deep(.room-table--compact .el-table__header),
:deep(.room-table--compact .el-table__body) {
  width: 100% !important;
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




.cali-audit-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: #fff;
  box-shadow: 0 8px 22px -18px rgba(15, 23, 42, 0.18);
}

.cali-audit-strip--passed {
  border-color: rgba(34, 197, 94, 0.35);
  background: linear-gradient(90deg, rgba(240, 253, 244, 0.95) 0%, #fff 42%);
}

.cali-audit-strip--failed {
  border-color: rgba(248, 113, 113, 0.35);
  background: linear-gradient(90deg, rgba(254, 242, 242, 0.92) 0%, #fff 42%);
}

.cali-audit-strip__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cali-audit-strip__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

.cali-audit-strip--passed .cali-audit-strip__icon {
  background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
}

.cali-audit-strip--failed .cali-audit-strip__icon {
  background: linear-gradient(145deg, #f97316 0%, #dc2626 100%);
}

.cali-audit-strip__title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.cali-audit-strip__metrics {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.cali-audit-metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cali-audit-metric__label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.cali-audit-metric__value {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  white-space: nowrap;
}

.cali-audit-metric__value--warn {
  color: #c2410c;
}

.cali-audit-metric__sep {
  width: 1px;
  height: 14px;
  background: rgba(148, 163, 184, 0.45);
  flex-shrink: 0;
}

.cali-audit-strip__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.cali-audit-detail-panel {
  margin-top: 8px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  max-height: min(220px, 28vh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.2);
}

.cali-audit-detail-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.unknown-list--panel,
.reason-text--panel {
  max-height: none;
}

.calibration-unknown-policy__body {
  min-height: 32px;
}

.calibration-unknown-policy__hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  padding: 4px 0;
}

.calibration-unknown-policy__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
}

.calibration-unknown-policy__row:last-child {
  border-bottom: none;
}

.calibration-unknown-policy__name {
  flex: 1 1 120px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calibration-unknown-policy__select {
  flex: 1 1 160px;
  min-width: 140px;
}

.room-table-compare {
  flex: 0 0 auto;
  margin-top: 8px;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.room-table-compare__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.room-table-compare__table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.room-table-compare__row {
  display: grid;
  grid-template-columns: 96px repeat(4, minmax(108px, 1fr));
  align-items: center;
  min-height: 36px;
  min-width: 560px;
  border-top: 1px solid #f1f5f9;
}

.room-table-compare__row:first-child {
  border-top: none;
}

.room-table-compare__row--head {
  background: #fafbfd;
}

.room-table-compare__label {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-right: 1px solid #f1f5f9;
}

.room-table-compare__cell {
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  text-align: center;
  border-right: 1px solid #f1f5f9;
}

.room-table-compare__cell:last-child {
  border-right: none;
}

.room-table-compare__cell--head {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.room-table-compare__cell--ocr {
  color: #2563eb;
}

.room-table-compare__cell--mismatch {
  color: #dc2626 !important;
  background: #fef2f2;
}

.room-table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 10px 4px 4px;
  flex-wrap: wrap;
  gap: 8px;
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
  flex-wrap: wrap;
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
  flex: 0 1 auto;
  min-width: 0;
}

.table-toolbar__search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 360px;
}

.room-table-search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.room-table-search-hint {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
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

:deep(.room-table--compact .el-table__cell .cell) {
  padding-left: 2px;
  padding-right: 2px;
  line-height: 1.25;
}

:deep(.room-table--compact .el-table__body td.el-table__cell) {
  padding-top: 2px;
  padding-bottom: 2px;
}

:deep(.room-table--compact .el-table__header th.el-table__cell) {
  padding-top: 3px;
  padding-bottom: 3px;
}

:deep(.room-table--compact .el-table__body tr) {
  font-variant-numeric: tabular-nums;
}

.room-table-cell-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.room-table-field {
  width: 100%;
}

.room-table-field :deep(.el-input__wrapper) {
  padding: 0 4px;
}

.room-table-editing-tag {
  font-size: 11px;
  color: #64748b;
}

.room-area-type {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.room-area-type--buildable {
  color: #15803d;
}

.room-area-type--non-buildable {
  color: #b45309;
}

.room-table-usage-btn {
  padding: 0;
  font-size: 11px;
}

.row-op-group--compact {
  gap: 0;
}

.row-op-group--compact :deep(.el-button) {
  padding: 0 2px;
  font-size: 11px;
  min-height: 20px;
}

:deep(.room-table .unknown-usage-row > td.el-table__cell),
:deep(.room-table .non-calculate-row > td.el-table__cell) {
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

  .table-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
  }
}

</style>
