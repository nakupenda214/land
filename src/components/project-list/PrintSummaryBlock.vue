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

    <table class="native-print-table info-table" style="margin-top: 20px;">
      <tbody>
        <tr v-for="row in normalizedTableTotalData" :key="row.label">
          <td>{{ row.leftLabel }}</td>
          <td>{{ row.contract }}</td>
          <td>{{ row.rightLabel }}</td>
          <td>{{ row.measured }}</td>
          <td>差值</td>
          <td>{{ row.isArea ? row.diff : '-' }}</td>
        </tr>
      </tbody>
    </table>

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
  tableTotalData: {
    type: Array,
    default: () => []
  }
})

const labelMap = {
  合同约定建筑面积: '计容建筑面积',
  合同约定商业面积: '计容商业面积',
  合同约定住宅面积: '计容住宅面积'
}

const normalizedTableTotalData = computed(() =>
  (props.tableTotalData || []).map((row) => ({
    ...row,
    leftLabel: row.label,
    rightLabel: labelMap[row.label] || '计容面积'
  }))
)
</script>
