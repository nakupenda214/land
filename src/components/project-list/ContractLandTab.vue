<template>
  <div class="tab-content">
    <el-card shadow="never" class="mb-20">
      <template #header>
        <div class="card-header">
          <span class="main-report-title">合同信息列表</span>
          <el-button type="primary" size="small" icon="Plus" @click="emit('add-contract')">新增合同</el-button>
        </div>
      </template>
      <el-table :data="contractLandList" border style="width: 100%" @row-click="(row) => emit('contract-row-click', row)">
        <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
        <el-table-column prop="contractNumber" label="合同编号" width="180" />
        <el-table-column prop="contractType" label="合同类型" width="150" align="center" />
        <el-table-column prop="transferor" label="出让方" min-width="200" show-overflow-tooltip />
        <el-table-column prop="transferee" label="受让方" min-width="200" show-overflow-tooltip />
        <el-table-column prop="totalArea" label="合同总面积(㎡)" width="150" align="right" />
        <el-table-column prop="plannedUse" label="规划用途" width="120" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="Edit" @click="emit('edit-contract', row)">编辑</el-button>
            <el-button link type="danger" size="small" icon="Delete" @click="emit('delete-contract', row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" v-if="selectedContract.id">
      <template #header>
        <div class="card-header">
          <span class="main-report-title">{{ selectedContract.contractNumber }} - 地块信息列表</span>
          <el-button type="primary" size="small" icon="Plus" @click="emit('add-land-parcel')">新增地块</el-button>
        </div>
      </template>
      <el-table :data="currentLandParcelList" border style="width: 100%">
        <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
        <el-table-column prop="parcelCode" label="地块编号" min-width="120" />
        <el-table-column prop="parcelName" label="地块名称" width="150" />
        <el-table-column prop="plannedUse" label="规划用途" width="120" />
        <el-table-column prop="totalArea" label="地块总面积(㎡)" width="150" align="right" />
        <el-table-column prop="residentialArea" label="住宅面积(㎡)" width="150" align="right" />
        <el-table-column prop="commercialArea" label="商业面积(㎡)" width="150" align="right" />
        <el-table-column prop="floorAreaRatio" label="容积率" width="100" align="center" />
        <el-table-column prop="commercialResidentialRatio" label="商住比" width="100" align="center" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="Edit" @click="emit('edit-land-parcel', row)">编辑</el-button>
            <el-button link type="danger" size="small" icon="Delete" @click="emit('delete-land-parcel', row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  contractLandList: {
    type: Array,
    default: () => []
  },
  selectedContract: {
    type: Object,
    default: () => ({ id: '', contractNumber: '' })
  },
  currentLandParcelList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'add-contract',
  'contract-row-click',
  'edit-contract',
  'delete-contract',
  'add-land-parcel',
  'edit-land-parcel',
  'delete-land-parcel'
])
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.mb-20 {
  margin-bottom: 20px;
}
</style>
