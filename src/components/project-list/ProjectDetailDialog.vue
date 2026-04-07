<template>
  <el-dialog
    v-model="visible"
    title="楼栋实测明细"
    width="1220px"
    top="5vh"
    class="no-print detail-dialog"
    :close-on-click-modal="true"
    :destroy-on-close="false"
  >
    <div class="summary-grid">
      <article class="summary-card summary-card--manual">
        <header class="summary-card__head">
          <div class="summary-card__icon" aria-hidden="true">
            <el-icon><Histogram /></el-icon>
          </div>
          <div class="summary-card__head-text">
            <h3 class="summary-card__title">面积汇总（人工）</h3>
            <p class="summary-card__subtitle">解析后的户室面积加总</p>
          </div>
        </header>
        <div class="summary-card__body">
          <div class="stat-row">
            <span class="stat-row__label">建筑面积</span>
            <span class="stat-row__value">{{ roomSumInfo.buildingAreaSum }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">套内面积</span>
            <span class="stat-row__value">{{ roomSumInfo.innerAreaSum }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">阳台面积</span>
            <span class="stat-row__value">{{ roomSumInfo.balconyAreaSum }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">公摊面积</span>
            <span class="stat-row__value">{{ roomSumInfo.sharedAreaSum }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
        </div>
      </article>

      <article class="summary-card summary-card--audit">
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
            <span class="stat-row__value stat-row__value--warn">{{ reportAuditInfo.pendingConfirmArea }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">未知用途数量</span>
            <span class="stat-row__value">{{ reportAuditInfo.unknownUsageCount }}</span>
            <span class="stat-row__unit">条</span>
          </div>
          <div class="stat-row stat-row--tags">
            <span class="stat-row__label">未知用途</span>
            <span class="stat-row__tags">
              <el-tag size="small" effect="light" round :type="reportAuditInfo.hasUnknownUsage === 1 ? 'warning' : 'success'">
                {{ reportAuditInfo.hasUnknownUsage === 1 ? '有' : '无' }}
              </el-tag>
            </span>
          </div>
          <div class="stat-row stat-row--tags">
            <span class="stat-row__label">校验状态</span>
            <span class="stat-row__tags">
              <el-tag size="small" effect="light" round :type="reportAuditInfo.isVerified === 1 ? 'success' : 'danger'">
                {{ reportAuditInfo.isVerified === 1 ? '通过' : '不通过' }}
              </el-tag>
            </span>
          </div>
        </div>
      </article>

      <article class="summary-card summary-card--ocr">
        <header class="summary-card__head">
          <div class="summary-card__icon" aria-hidden="true">
            <el-icon><Document /></el-icon>
          </div>
          <div class="summary-card__head-text">
            <h3 class="summary-card__title">OCR 对比</h3>
            <p class="summary-card__subtitle">来自实测报告查询页 OCR 字段</p>
          </div>
        </header>
        <div class="summary-card__body">
          <div class="stat-row">
            <span class="stat-row__label">建筑面积（OCR）</span>
            <span class="stat-row__value">{{ reportAuditInfo.roomInfoBuildingAreaSumFromOcr }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">套内面积（OCR）</span>
            <span class="stat-row__value">{{ reportAuditInfo.roomInfoInnerAreaSumFromOcr }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">阳台面积（OCR）</span>
            <span class="stat-row__value">{{ reportAuditInfo.roomInfoBalconyAreaSumFromOcr }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
          <div class="stat-row">
            <span class="stat-row__label">公摊面积（OCR）</span>
            <span class="stat-row__value">{{ reportAuditInfo.roomInfoSharedAreaSumFromOcr }}</span>
            <span class="stat-row__unit">㎡</span>
          </div>
        </div>
      </article>
    </div>

    <div v-if="reportAuditInfo.verificationErrorReason && reportAuditInfo.verificationErrorReason !== '-'" class="verify-error">
      <el-icon class="verify-error__icon"><WarningFilled /></el-icon>
      <div>
        <span class="verify-error__label">校验失败原因</span>
        <p class="verify-error__content">{{ reportAuditInfo.verificationErrorReason }}</p>
      </div>
    </div>

    <section class="basic-info-panel">
      <div class="basic-info-panel__body">
        <el-form class="basic-info-form" label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="不动产权证编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyCertificateNumber"
                  maxlength="80"
                  clearable
                  placeholder="请输入或从报告中核对后补录"
                  @update:model-value="(v) => emit('update:propertyCertificateNumber', v)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同 / 批文编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyAreaConfirmationNoticeNumber"
                  maxlength="80"
                  clearable
                  placeholder="请输入或从报告中核对后补录"
                  @update:model-value="(v) => emit('update:propertyAreaConfirmationNoticeNumber', v)"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <div class="basic-info-panel__actions">
          <el-button
            class="save-basic-btn"
            type="primary"
            :loading="reportBasicInfoSaving"
            @click="emit('save-basic-info')"
          >
            <el-icon class="save-basic-btn__ico"><Select /></el-icon>
            保存
          </el-button>
        </div>
      </div>
    </section>

    <div class="table-shell">
      <div class="table-toolbar">
        <span class="title">户室列表</span>
        <div class="toolbar-right">
          <span class="count">共 {{ roomInfoData.length }} 条</span>
          <el-button
            class="jump-btn"
            size="small"
            type="default"
            :disabled="!canJumpAudit"
            @click="emit('jump-audit', currentDetailRow)"
          >
            审核
          </el-button>
        </div>
      </div>

      <div ref="tableContainer" class="table-container">
        <el-table
          :data="roomInfoData"
          border
          stripe
          size="small"
          height="100%"
          v-loading="detailLoading"
          element-loading-text="加载户室数据中..."
        >
          <el-table-column label="序号" type="index" width="60" align="center" :index="(index) => index + 1" />
          <el-table-column prop="roomLevel" label="楼层" width="80" align="center" />
          <el-table-column prop="roomNumber" label="房号" width="100" align="center" />
          <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center" />
          <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center" />
          <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center" />
          <el-table-column prop="sharedArea" label="公摊面积(㎡)" width="120" align="center" />
          <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.isCalculate === 1 ? 'red-text' : ''">
                {{ row.isCalculate === 1 ? '是' : '否' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="usageCategory" label="用途类别" width="120" align="center" />
          <el-table-column prop="roomUsage" label="用途" min-width="120" show-overflow-tooltip align="center" />
          <el-table-column prop="floorAreaType" label="面积类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                {{ row.floorAreaType }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="resize-handle-bottom" @mousedown="startResize" />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Histogram, CircleCheck, Document, WarningFilled, Select } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  roomSumInfo: { type: Object, required: true },
  reportAuditInfo: { type: Object, required: true },
  roomInfoData: { type: Array, default: () => [] },
  detailLoading: { type: Boolean, default: false },
  currentDetailRow: { type: Object, default: null },
  canJumpAudit: { type: Boolean, default: false },
  reportBasicInfoForm: {
    type: Object,
    required: true
  },
  reportBasicInfoSaving: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'jump-audit',
  'save-basic-info',
  'update:propertyCertificateNumber',
  'update:propertyAreaConfirmationNoticeNumber'
])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tableContainer = ref(null)
const isResizing = ref(false)
let stopResize = null

const startResize = (event) => {
  const container = tableContainer.value
  if (!container) return
  isResizing.value = true
  const startY = event.clientY
  const startHeight = container.offsetHeight

  const handleMouseMove = (moveEvent) => {
    if (!isResizing.value) return
    const nextHeight = Math.max(280, Math.min(760, startHeight + (moveEvent.clientY - startY)))
    container.style.height = `${nextHeight}px`
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  stopResize = handleMouseUp
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onBeforeUnmount(() => {
  if (stopResize) stopResize()
})
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
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

.verify-error {
  margin-top: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(251, 113, 133, 0.45);
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.95) 0%, rgba(255, 228, 230, 0.55) 100%);
  font-size: 13px;
  color: #9f1239;
}

.verify-error__icon {
  flex-shrink: 0;
  font-size: 20px;
  margin-top: 2px;
  color: #e11d48;
}

.verify-error__label {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
  color: #be123c;
}

.verify-error__content {
  margin: 0;
  line-height: 1.55;
  color: #881337;
}

.basic-info-panel {
  margin-top: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.97) 0%, rgba(241, 245, 249, 0.5) 100%);
  box-shadow: 0 8px 24px -18px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.basic-info-panel__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px 20px;
  padding: 14px 16px 16px;
}

.basic-info-form {
  min-width: 0;
}

.basic-info-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.basic-info-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
  font-size: 12.5px;
}

.basic-info-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.basic-info-panel__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 2px;
}

:deep(.save-basic-btn.el-button--primary) {
  min-height: 40px;
  padding: 10px 22px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 20px -10px rgba(29, 78, 216, 0.65);
}

:deep(.save-basic-btn.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

.save-basic-btn__ico {
  margin-right: 4px;
  font-size: 16px;
}

.table-shell {
  border: 1px solid #e6ebf3;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  margin-top: 14px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #edf1f7;
  padding: 10px 12px;
  background: #fbfcff;
}

.table-toolbar .title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.table-toolbar .count {
  font-size: 12px;
  color: #6b7280;
}

:deep(.jump-btn.el-button) {
  border: 1px solid #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
  border-radius: 8px;
  font-weight: 600;
  padding: 6px 12px;
}

:deep(.jump-btn.el-button:hover) {
  border-color: #b8d3ec;
  background: #d7e7f8;
  color: #163a5a;
}

.table-container {
  height: 500px;
  min-height: 280px;
}

.resize-handle-bottom {
  height: 8px;
  cursor: ns-resize;
  background: linear-gradient(180deg, #f3f5f9 0%, #e9edf4 100%);
  border-top: 1px solid #edf1f7;
}

.red-text {
  color: #f56c6c;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .basic-info-panel__body {
    grid-template-columns: 1fr;
  }

  .basic-info-panel__actions {
    justify-content: stretch;
  }

  :deep(.save-basic-btn.el-button--primary) {
    width: 100%;
  }
}
</style>

<style>
/* 弹窗标题与内边距，类挂在 teleport 后的 dialog 上需非 scoped */
.detail-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px -20px rgba(15, 23, 42, 0.28);
}

.detail-dialog .el-dialog__header {
  padding: 16px 20px 12px;
  margin: 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.detail-dialog .el-dialog__title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--biz-text, #1f2d3d);
}

.detail-dialog .el-dialog__body {
  padding: 16px 20px 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 55%, #eef2f6 100%);
}
</style>
