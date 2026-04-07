<template>
  <el-card class="info-config-card no-print" shadow="never">
    <div class="comparison-shell">
      <div class="comparison-head">
        <div class="comparison-head__title-wrap">
          <div class="comparison-head__title">面积核算对比</div>
          <div class="comparison-head__sub">来源于后端三组口径数据（系统计算 / 项目方声明 / 规划复核）</div>
        </div>
        <el-checkbox-group v-model="checkedGroupKeys" class="comparison-group-picker">
          <el-checkbox v-for="group in groupMeta" :key="group.key" :label="group.key">
            {{ group.title }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <div class="comparison-grid-wrap">
        <article v-for="group in displayGroups" :key="group.key" class="comparison-card">
          <header class="comparison-card__header">
            <h4 class="comparison-card__title">{{ group.title }}</h4>
            <el-tag size="small" effect="plain" :type="group.available ? 'success' : 'info'">
              {{ group.available ? '数据可用' : '暂无数据' }}
            </el-tag>
          </header>
          <el-table
            class="comparison-table"
            :data="group.rows"
            border
            stripe
            size="small"
            :show-header="true"
          >
            <el-table-column prop="label" label="维度" min-width="130" />
            <el-table-column prop="contractAgreedArea" label="合同约定面积" min-width="140" align="right" />
            <el-table-column prop="buildableArea" label="计容面积" min-width="120" align="right" />
            <el-table-column prop="difference" label="差值" min-width="120" align="right" />
          </el-table>
        </article>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  areaComparison: {
    type: Object,
    default: () => ({
      systemCalculated: {},
      projectPartyDeclared: {},
      planningCalculated: {},
      dataCompleteness: {}
    })
  },
  selectedGroups: {
    type: Array,
    default: () => ['systemCalculated', 'projectPartyDeclared', 'planningCalculated']
  }
})

const emit = defineEmits(['update:selectedGroups'])

const groupMeta = [
  { key: 'systemCalculated', title: '系统计算口径', availableField: 'systemCalculatedAvailable' },
  { key: 'projectPartyDeclared', title: '项目方声明口径', availableField: 'projectPartyDeclaredAvailable' },
  { key: 'planningCalculated', title: '规划复核口径', availableField: 'planningCalculatedAvailable' }
]

const formatArea = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

const checkedGroupKeys = computed({
  get: () => props.selectedGroups,
  set: (value) => emit('update:selectedGroups', value)
})

const buildRows = (tripleLine) => [
  {
    label: '建筑面积',
    contractAgreedArea: formatArea(tripleLine?.totalBuilding?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.totalBuilding?.buildableArea),
    difference: formatArea(tripleLine?.totalBuilding?.difference)
  },
  {
    label: '商业面积',
    contractAgreedArea: formatArea(tripleLine?.commercial?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.commercial?.buildableArea),
    difference: formatArea(tripleLine?.commercial?.difference)
  },
  {
    label: '住宅面积',
    contractAgreedArea: formatArea(tripleLine?.residential?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.residential?.buildableArea),
    difference: formatArea(tripleLine?.residential?.difference)
  }
]

const displayGroups = computed(() =>
  groupMeta
    .filter((meta) => checkedGroupKeys.value.includes(meta.key))
    .map((meta) => ({
      key: meta.key,
      title: meta.title,
      available: Boolean(props.areaComparison?.dataCompleteness?.[meta.availableField]),
      rows: buildRows(props.areaComparison?.[meta.key])
    }))
)
</script>

<style scoped>
.comparison-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comparison-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px 20px;
  flex-wrap: wrap;
}

.comparison-head__title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.comparison-head__sub {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.comparison-group-picker {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.comparison-grid-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.comparison-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 6px 20px -16px rgba(15, 23, 42, 0.45);
}

.comparison-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.85);
}

.comparison-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

::deep(.comparison-table .el-table__header th) {
  background-color: #f8fafc !important;
  color: #334155;
  font-weight: 700;
}
</style>
