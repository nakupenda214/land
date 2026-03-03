<template>
  <Teleport to="#print-target" v-if="isPrinting">
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
      <thead>
        <tr>
          <th style="width: 150px;">核算指标</th>
          <th style="width: 180px;">合同约定值</th>
          <th style="width: 180px;">实测值</th>
          <th style="width: 120px;">差值(A - B)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in tableTotalData" :key="row.label">
          <td>{{ row.label }}</td>
          <td>{{ row.contract }}</td>
          <td>{{ row.measured }}</td>
          <td style="font-weight: bold;">
            <span v-if="row.isArea" :style="{ color: Number(row.diff) >= 0 ? '#67C23A' : '#F56C6C' }">
              {{ row.diff }}
            </span>
            <span v-else>-</span>
          </td>
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
defineProps({
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
</script>

