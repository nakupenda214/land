<template>
  <el-card class="info-config-card no-print" shadow="never">
    <div class="card-title" style="text-align: center;">
      <span class="title-text">商住比及面积核算对比</span>
    </div>

    <el-table
      :data="tableTotalData"
      border
      style="width: 630px; margin: 0 auto;"
      :header-cell-style="{ background: '#f0f2f5', color: '#333', fontWeight: 'bold', textAlign: 'center' }"
      :cell-style="{ textAlign: 'center' }"
    >
      <el-table-column prop="label" label="核算指标" width="150" />
      <el-table-column prop="contract" label="合同约定值" width="180" />
      <el-table-column prop="measured" label="实测值" width="180" />
      <el-table-column prop="diff" label="差值(A - B)" width="120">
        <template #default="{ row }">
          <span v-if="row.isArea" :class="Number(row.diff) >= 0 ? 'text-green' : 'text-red'" style="font-weight: bold;">
            {{ row.diff }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  tableTotalData: {
    type: Array,
    default: () => []
  }
})
</script>

