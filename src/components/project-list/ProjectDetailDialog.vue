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
      <div class="summary-card">
        <div class="card-title">面积汇总（人工）</div>
        <div class="card-lines">
          <div class="line"><span>建筑面积</span><strong>{{ roomSumInfo.buildingAreaSum }} ㎡</strong></div>
          <div class="line"><span>套内面积</span><strong>{{ roomSumInfo.innerAreaSum }} ㎡</strong></div>
          <div class="line"><span>阳台面积</span><strong>{{ roomSumInfo.balconyAreaSum }} ㎡</strong></div>
          <div class="line"><span>公摊面积</span><strong>{{ roomSumInfo.sharedAreaSum }} ㎡</strong></div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-title">校验信息</div>
        <div class="card-lines">
          <div class="line"><span>待确认面积</span><strong class="warn">{{ reportAuditInfo.pendingConfirmArea }} ㎡</strong></div>
          <div class="line"><span>未知用途数量</span><strong>{{ reportAuditInfo.unknownUsageCount }} 条</strong></div>
          <div class="line">
            <span>未知用途</span>
            <el-tag size="small" :type="reportAuditInfo.hasUnknownUsage === 1 ? 'warning' : 'success'">
              {{ reportAuditInfo.hasUnknownUsage === 1 ? '有' : '无' }}
            </el-tag>
          </div>
          <div class="line">
            <span>校验状态</span>
            <el-tag size="small" :type="reportAuditInfo.isVerified === 1 ? 'success' : 'danger'">
              {{ reportAuditInfo.isVerified === 1 ? '通过' : '不通过' }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-title">OCR 对比（来自实测报告查询）</div>
        <div class="card-lines">
          <div class="line"><span>建筑面积（OCR）</span><strong>{{ reportAuditInfo.roomInfoBuildingAreaSumFromOcr }} ㎡</strong></div>
          <div class="line"><span>套内面积（OCR）</span><strong>{{ reportAuditInfo.roomInfoInnerAreaSumFromOcr }} ㎡</strong></div>
          <div class="line"><span>阳台面积（OCR）</span><strong>{{ reportAuditInfo.roomInfoBalconyAreaSumFromOcr }} ㎡</strong></div>
          <div class="line"><span>公摊面积（OCR）</span><strong>{{ reportAuditInfo.roomInfoSharedAreaSumFromOcr }} ㎡</strong></div>
        </div>
      </div>
    </div>

    <div v-if="reportAuditInfo.verificationErrorReason && reportAuditInfo.verificationErrorReason !== '-'" class="verify-error">
      <span class="label">校验失败原因：</span>
      <span class="content">{{ reportAuditInfo.verificationErrorReason }}</span>
    </div>

    <div class="basic-info-edit">
      <div class="edit-form">
        <el-form label-position="top">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="不动产权证编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyCertificateNumber"
                  maxlength="80"
                  clearable
                  placeholder="解析为空时可手动补录"
                  @update:model-value="(v) => emit('update:propertyCertificateNumber', v)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同/批文编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyAreaConfirmationNoticeNumber"
                  maxlength="80"
                  clearable
                  placeholder="解析为空时可手动补录"
                  @update:model-value="(v) => emit('update:propertyAreaConfirmationNoticeNumber', v)"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <el-button class="save-basic-btn" type="primary" size="small" :loading="reportBasicInfoSaving" @click="emit('save-basic-info')">
          保存
        </el-button>
      </div>
    </div>

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
  gap: 10px;
}

.summary-card {
  border: 1px solid #e7edf6;
  border-radius: 10px;
  background: #f9fbff;
  padding: 10px 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
}

.card-lines {
  display: grid;
  gap: 6px;
}

.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #4b5563;
}

.line strong {
  color: #1f2937;
}

.line strong.warn {
  color: #d97706;
}

.verify-error {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  border-radius: 8px;
  font-size: 13px;
  color: #9f1239;
}

.verify-error .label {
  font-weight: 700;
  margin-right: 6px;
}

.basic-info-edit {
  margin-top: 10px;
  border: 1px solid #e6ebf3;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px 12px;
}

.edit-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.edit-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.edit-form :deep(.el-form) {
  flex: 1;
}

.edit-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.table-shell {
  border: 1px solid #e6ebf3;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  margin-top: 12px;
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

:deep(.save-basic-btn.el-button--primary) {
  border-color: #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
  font-weight: 600;
  height: 35px;
}

:deep(.save-basic-btn.el-button--primary:hover) {
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
}
</style>
