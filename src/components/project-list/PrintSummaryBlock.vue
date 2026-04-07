<template>
  <Teleport v-if="isPrinting" to="#print-target">
    <div class="print-info-section">
      <div class="print-title">{{ currentProjectInfo.name || '项目' }}房产实测信息汇总表</div>
      <div class="print-meta-row">
        <span>打印日期：{{ currentPrintDate }}</span>
        <span>单位：平方米</span>
      </div>
    </div>

    <table class="native-print-table data-table">
      <thead>
        <tr>
          <th rowspan="2">序号</th>
          <th rowspan="2">工程名称</th>
          <th rowspan="2">不动产权证编号</th>
          <th rowspan="2">合同/批文编号</th>
          <th rowspan="2">期数</th>
          <th rowspan="2">实测总面积</th>
          <th colspan="4">计容建筑面积</th>
          <th colspan="2">不计容建筑面积</th>
          <th rowspan="2">报告书编号</th>
        </tr>
        <tr>
          <th>商业</th>
          <th>住宅</th>
          <th>物管</th>
          <th>其他</th>
          <th>社区</th>
          <th>公用</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in displayTableData" :key="row.id">
          <td>{{ index + 1 }}</td>
          <td>{{ row.projectName }}</td>
          <td>{{ row.certNo }}</td>
          <td>{{ row.contractNo }}</td>
          <td>{{ row.phase }}</td>
          <td>{{ row.totalArea }}</td>
          <td>{{ row.calcCommercial }}</td>
          <td>{{ row.calcResidential }}</td>
          <td>{{ row.calcPropMgmt }}</td>
          <td>{{ row.calcOther }}</td>
          <td>{{ row.nonCalcCommunity }}</td>
          <td>{{ row.nonCalcOther }}</td>
          <td>{{ row.reportNo }}</td>
        </tr>
      </tbody>
    </table>

    <section v-for="group in selectedPrintGroups" :key="group.key" class="print-comparison-group">
      <div class="print-group-title">{{ group.title }}</div>
      <table class="native-print-table info-table" style="margin-top: 8px;">
        <thead>
          <tr>
            <th>维度</th>
            <th>合同约定面积</th>
            <th>计容面积</th>
            <th>差值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in group.rows" :key="`${group.key}-${row.label}`">
            <td>{{ row.label }}</td>
            <td>{{ row.contractAgreedArea }}</td>
            <td>{{ row.buildableArea }}</td>
            <td>{{ row.difference }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="print-footer">
      <div class="print-signatures">
        <div>制表人：__________</div>
        <div>审核人：__________</div>
        <div>日期：__________</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isPrinting: {
    type: Boolean,
    default: false
  },
  currentProjectInfo: {
    type: Object,
    required: true
  },
  currentPrintDate: {
    type: String,
    required: true
  },
  displayTableData: {
    type: Array,
    default: () => []
  },
  areaComparison: {
    type: Object,
    default: () => ({
      systemCalculated: {},
      projectPartyDeclared: {},
      planningCalculated: {}
    })
  },
  selectedComparisonGroups: {
    type: Array,
    default: () => ['systemCalculated', 'projectPartyDeclared', 'planningCalculated']
  }
})

const groupMeta = [
  { key: 'systemCalculated', title: '系统计算口径' },
  { key: 'projectPartyDeclared', title: '项目方声明口径' },
  { key: 'planningCalculated', title: '规划复核口径' }
]

const formatArea = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

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

const selectedPrintGroups = computed(() =>
  groupMeta
    .filter((meta) => props.selectedComparisonGroups.includes(meta.key))
    .map((meta) => ({
      key: meta.key,
      title: meta.title,
      rows: buildRows(props.areaComparison?.[meta.key])
    }))
)
</script>
