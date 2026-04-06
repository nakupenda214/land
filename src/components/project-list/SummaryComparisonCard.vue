<template>
  <el-card class="info-config-card no-print" shadow="never">
    <div class="comparison-wrap">
      <div class="comparison-title">面积核算对比</div>
      <div class="comparison-layout">
        <div class="comparison-main comparison-panel">
          <div class="comparison-grid">
            <template v-for="(row, index) in normalizedRows" :key="`${row.label}-${index}`">
              <div class="cell label">{{ row.leftLabel }}</div>
              <div class="cell value">{{ row.contract }}</div>
              <div class="cell label">{{ row.rightLabel }}</div>
              <div class="cell value">{{ row.measured }}</div>
              <div class="cell label diff-label">差值</div>
              <div class="cell diff">{{ row.diff }}</div>
            </template>
          </div>
        </div>
      </div>
      <div class="allocation-note">
        物管和其他总和为
        <strong>{{ pooledAreaText }}</strong>，
        分摊到商业为
        <strong>{{ pooledToCommercialText }}</strong>，
        分摊到住宅为
        <strong>{{ pooledToResidentialText }}</strong>。
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tableTotalData: {
    type: Array,
    default: () => []
  },
  debugSums: {
    type: Object,
    default: () => ({
      commercial: 0,
      residential: 0,
      management: 0,
      otherBuildable: 0,
      pooledArea: 0,
      pooledToCommercial: 0,
      pooledToResidential: 0,
      measuredCommercial: 0,
      measuredResidential: 0
    })
  }
})

const labelMap = {
  合同约定建筑面积: '计容建筑面积',
  合同约定商业面积: '计容商业面积',
  合同约定住宅面积: '计容住宅面积'
}

const normalizedRows = computed(() =>
  (props.tableTotalData || []).map((row) => ({
    ...row,
    leftLabel: row.label,
    rightLabel: labelMap[row.label] || '计容面积'
  }))
)

const pooledAreaText = computed(() => Number(props.debugSums?.pooledArea || 0).toFixed(2))
const pooledToCommercialText = computed(() => Number(props.debugSums?.pooledToCommercial || 0).toFixed(2))
const pooledToResidentialText = computed(() => Number(props.debugSums?.pooledToResidential || 0).toFixed(2))
</script>

<style scoped>
.comparison-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.comparison-title {
  width: 100%;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.comparison-layout {
  width: min(1120px, 100%);
  display: block;
  align-items: stretch;
}

.comparison-main {
  min-width: 0;
}

.comparison-grid {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.2fr 1fr 0.8fr 1fr;
}

.cell {
  padding: 10px 8px;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  font-size: 14px;
  color: #303133;
}

.cell.label {
  background: #fafafa;
  font-weight: 500;
}

.cell.label.diff-label {
  text-align: center;
}

.cell.value,
.cell.diff {
  text-align: center;
  font-weight: 600;
}

.cell.diff {
  color: #606266;
}

.comparison-grid > :nth-last-child(-n + 6) {
  border-bottom: none;
}

.comparison-grid > :nth-child(6n) {
  border-right: none;
}

.allocation-note {
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.8;
}

.allocation-note strong {
  color: #111827;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .comparison-grid {
    grid-template-columns: 1fr 0.85fr 1fr 0.85fr 0.65fr 0.8fr;
  }

  .cell {
    font-size: 13px;
  }
}
</style>
