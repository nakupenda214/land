<template>
 <el-dialog
  v-model="dialogVisible"
  fullscreen
  custom-class="calibration-dialog"
  modal-class="calibration-modal"
  :show-close="false"
>
    <template #header="{ close }">
      <CalibrationHeader
        :current-file="currentFile"
        :is-editing="isEditing"
        :close-handler="close"
        @enter-edit="enterEditMode"
        @exit-edit="exitEditMode"
        @save-data="handleSaveData"
        @audit-pass="handleAuditPass"
      />
    </template>

    <div class="split-view">
      <div class="left-panel" v-loading="pdfLoading && currentViewType !== 'recognition'">
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

      <div class="right-panel">
        <div class="cali-right-panel">
          <section class="sum-info-section">
            <div class="sum-grid">
              <div class="sum-item"><span class="k">建筑面积总和：</span><span class="v">{{ auditSummaryData.roomInfoBuildingAreaSum }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">OCR 建筑面积总和：</span><span class="v danger">{{ auditSummaryData.roomInfoBuildingAreaSumFromOcr }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">套内面积总和：</span><span class="v">{{ auditSummaryData.roomInfoInnerAreaSum }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">OCR 套内面积总和：</span><span class="v danger">{{ auditSummaryData.roomInfoInnerAreaSumFromOcr }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">阳台面积总和：</span><span class="v">{{ auditSummaryData.roomInfoBalconyAreaSum }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">OCR 阳台面积总和：</span><span class="v danger">{{ auditSummaryData.roomInfoBalconyAreaSumFromOcr }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">分摊面积总和：</span><span class="v">{{ auditSummaryData.roomInfoSharedAreaSum }}</span><span class="u">㎡</span></div>
              <div class="sum-item"><span class="k">OCR 分摊面积总和：</span><span class="v danger">{{ auditSummaryData.roomInfoSharedAreaSumFromOcr }}</span><span class="u">㎡</span></div>
            </div>

            <div class="meta-row">
              <div class="meta-item"><span class="k">待确认面积：</span><span class="v warn">{{ auditSummaryData.pendingConfirmArea }}</span><span class="u">㎡</span></div>
              <div class="meta-item"><span class="k">未知用途：</span><span :class="['v', auditSummaryDisplay.hasUnknownUsageText === '有' ? 'danger' : 'ok']">{{ auditSummaryDisplay.hasUnknownUsageText }}</span></div>
              <div class="meta-item"><span class="k">未知用途数量：</span><span class="v danger">{{ auditSummaryData.unknownUsageCount }}</span><span class="u">条</span></div>
              <div class="meta-item"><span class="k">验证状态：</span><span :class="['v', auditSummaryDisplay.isVerifiedText === '已验证' ? 'ok' : 'muted']">{{ auditSummaryDisplay.isVerifiedText }}</span></div>
              <div class="meta-item full"><span class="k">未知用途详情：</span><span class="v">{{ auditSummaryData.unknownUsages }}</span></div>
              <div class="meta-item full"><span class="k">验证失败原因：</span><span class="v danger">{{ auditSummaryData.verificationErrorReason }}</span></div>
            </div>
          </section>

          <section class="room-table-wrap">
            <el-table
              class="room-table"
              :data="roomInfoData"
              border
              size="small"
              v-loading="roomInfoLoading"
              element-loading-text="加载户室数据中..."
              style="width: 100%;"
            >
              <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />

              <el-table-column prop="roomLevel" label="楼层" width="80" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.roomLevel || '-' }}</template>
                  <el-input v-else v-model="row.roomLevel" size="small" style="width: 70px" placeholder="请输入楼层" />
                </template>
              </el-table-column>

              <el-table-column prop="roomNumber" label="房号" width="100" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.roomNumber || '-' }}</template>
                  <el-input v-else v-model="row.roomNumber" size="small" style="width: 90px" placeholder="请输入房号" />
                </template>
              </el-table-column>

              <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.buildingArea || '0.00' }}</template>
                  <el-input v-else v-model="row.buildingArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.innerArea || '0.00' }}</template>
                  <el-input v-else v-model="row.innerArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.balconyArea || '0.00' }}</template>
                  <el-input v-else v-model="row.balconyArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="sharedArea" label="分摊面积(㎡)" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.sharedArea || '0.00' }}</template>
                  <el-input v-else v-model="row.sharedArea" size="small" style="width: 110px" type="number" placeholder="0.00" />
                </template>
              </el-table-column>

              <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.isCalculate === 1 ? '是' : '否' }}</template>
                  <el-select v-else v-model="row.isCalculate" size="small" style="width: 90px" placeholder="请选择">
                    <el-option label="是" :value="1" />
                    <el-option label="否" :value="0" />
                  </el-select>
                </template>
              </el-table-column>

              <el-table-column prop="usageCategory" label="用途类别" width="130" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.usageCategory || '未知' }}</template>
                  <el-select v-else v-model="row.usageCategory" size="small" style="width: 120px" placeholder="请选择">
                    <el-option label="住宅" value="住宅" />
                    <el-option label="商业/办公" value="商业/办公" />
                    <el-option label="物管用房" value="物管用房" />
                    <el-option label="社区用房" value="社区用房" />
                    <el-option label="其他计容" value="其他计容" />
                    <el-option label="其他公用" value="其他公用" />
                    <el-option label="未知" value="未知" />
                  </el-select>
                </template>
              </el-table-column>

              <el-table-column prop="roomUsage" label="用途" min-width="120" show-overflow-tooltip align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">{{ row.roomUsage || '-' }}</template>
                  <el-input v-else v-model="row.roomUsage" size="small" style="width: 100%" placeholder="请输入用途" />
                </template>
              </el-table-column>

              <el-table-column prop="floorAreaType" label="面积类型" width="90" align="center">
                <template #default="{ row }">
                  <template v-if="!isEditing">
                    <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">{{ row.floorAreaType }}</el-tag>
                  </template>
                  <el-select v-else v-model="row.floorAreaType" size="small" style="width: 80px" placeholder="请选择">
                    <el-option label="计容" value="计容" />
                    <el-option label="不计容" value="不计容" />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-if="!roomInfoLoading && roomInfoData.length === 0" description="暂无户室面积数据" />
          </section>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import CalibrationHeader from '@/components/file-upload/CalibrationHeader.vue'
import CalibrationPdfToolbar from '@/components/file-upload/CalibrationPdfToolbar.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  currentFile: { type: Object, default: null },
  isEditing: { type: Boolean, default: false },
  enterEditMode: { type: Function, required: true },
  exitEditMode: { type: Function, required: true },
  handleSaveData: { type: Function, required: true },
  handleAuditPass: { type: Function, required: true },
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

const emit = defineEmits(['update:modelValue', 'closed'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
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


.split-view{
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
  background: #f0f2f5;
  height: 100%;  
}

.left-panel{
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #525659;
  border-right: 1px solid #dcdfe6;
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
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 12px 22px;
  padding-bottom: 14px;
  border-bottom: 1px dashed #e4e7ed;
}

.sum-item,
.meta-item {
  font-size: 14px;
  line-height: 1.65;
}

.meta-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 10px 22px;
}

.meta-item.full {
  grid-column: 1 / -1;
  word-break: break-all;
}

.k {
  color: #606266;
  font-weight: 600;
}

.v {
  color: #409eff;
}

.v.warn {
  color: #e6a23c;
}

.v.danger {
  color: #f56c6c;
}

.v.ok {
  color: #67c23a;
}

.v.muted {
  color: #909399;
}

.u {
  color: #909399;
  margin-left: 2px;
}





@media (max-width: 1200px) {
  .split-view {
    display: flex;
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    max-width: 100%;
  }

  .left-panel {
    height: 42%;
    min-height: 320px;
    border-right: none;
    border-bottom: 1px solid #dcdfe6;
  }

  .right-panel {
    flex: 1 1 auto;
    height: auto;
    min-height: 0;
    padding: 12px;
  }
}
</style>
