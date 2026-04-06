<template>
  <div class="contract-workbench">
    <div class="workbench-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">合同及地块信息</span>
        <el-tag v-if="selectedContract.id" class="active-contract-tag" type="info" effect="plain">
          当前操作合同：{{ selectedContract.contractNumber || `ID ${selectedContract.id}` }}
        </el-tag>
        <span v-else class="toolbar-sub">请先在合同列表中选中一条合同，再新增地块</span>
      </div>
      <div class="toolbar-actions">
        <el-button class="toolbar-btn refresh-btn" @click="emit('refresh-contracts')">刷新数据</el-button>
        <el-button
          class="toolbar-btn add-btn"
          type="primary"
          :disabled="!selectedContract.id"
          @click="emit('add-land-parcel')"
        >
          {{ selectedContract.id ? `为当前合同：${selectedContract.contractNumber || `ID ${selectedContract.id}`} 新增地块` : '请先选择合同' }}
        </el-button>
      </div>
    </div>

    <div class="workbench-body">
      <section class="contracts-panel">
        <div class="panel-header">
          <span class="panel-title">合同列表</span>
          <div class="panel-meta">
            <el-tag type="info" effect="plain">共 {{ contractLandList.length }} 条</el-tag>
            <el-tag v-if="selectedContract.id" type="success" effect="plain">已选中合同</el-tag>
          </div>
        </div>

        <el-table
          :data="contractLandList"
          border
          stripe
          height="100%"
          scrollbar-always-on
          highlight-current-row
          row-key="id"
          @row-click="(row) => emit('contract-row-click', row)"
        >
          <el-table-column :resizable="false" label="序号" type="index" width="60" align="center" :index="index => index + 1" />
          <el-table-column :resizable="false" prop="contractNumber" label="合同编号" min-width="170" show-overflow-tooltip />
          <el-table-column :resizable="false" prop="contractType" label="合同类型" width="120" align="center" />
          <el-table-column :resizable="false" prop="transferor" label="出让方" min-width="170" show-overflow-tooltip />
          <el-table-column :resizable="false" prop="transferee" label="受让方" min-width="170" show-overflow-tooltip />
          <el-table-column :resizable="false" prop="totalArea" label="总面积(㎡)" width="120" align="right" />
          <el-table-column :resizable="false" prop="residentialArea" label="住宅面积(㎡)" width="120" align="right" />
          <el-table-column :resizable="false" prop="commercialArea" label="商业面积(㎡)" width="120" align="right" />
          <el-table-column :resizable="false" label="创建时间" width="170" align="center" show-overflow-tooltip>
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column :resizable="false" label="更新时间" width="170" align="center" show-overflow-tooltip>
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column :resizable="false" prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          <el-table-column :resizable="false" label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <el-button class="edit-action-btn" type="primary" size="small" @click.stop="emit('edit-contract', row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="parcels-panel" :class="{ collapsed: parcelCollapsed }">
        <div class="panel-header">
          <div class="parcel-header-left">
            <span class="panel-title">地块信息</span>
            <template v-if="selectedContract.id">
              <el-tag class="contract-code-tag" type="info" effect="plain">当前合同：{{ selectedContract.contractNumber || '-' }}</el-tag>
              <el-tag type="success" effect="plain">地块 {{ currentLandParcelList.length }} 条</el-tag>
            </template>
          </div>
          <div class="panel-actions">
            <el-button class="collapse-btn" text type="primary" @click="toggleParcelPanel">
              {{ parcelCollapsed ? '展开地块' : '收起地块' }}
            </el-button>
          </div>
        </div>

        <div v-if="parcelCollapsed" class="parcel-summary">
          <span v-if="selectedContract.id">
            已收起。当前合同 {{ selectedContract.contractNumber || '-' }}，共 {{ currentLandParcelList.length }} 条地块。
          </span>
          <span v-else>已收起。请先在左侧选择合同。</span>
        </div>

        <template v-else>
          <el-empty
            v-if="!selectedContract.id"
            description="请先在左侧选择一条合同，再查看对应地块"
          />
          <el-table v-else :data="currentLandParcelList" border stripe height="100%" scrollbar-always-on row-key="id">
            <el-table-column :resizable="false" label="序号" type="index" width="100" align="center" :index="index => index + 1" />
            <el-table-column :resizable="false" prop="parcelCode" label="地块编号" min-width="150" show-overflow-tooltip />
            <el-table-column :resizable="false" prop="parcelName" label="地块名称" min-width="150" show-overflow-tooltip />
          <el-table-column :resizable="false" label="规划用途" width="180" align="center">
            <template #default="{ row }">
              {{ plannedUseLabelMap[row.plannedUse] || row.plannedUse || '-' }}
            </template>
          </el-table-column>
            <el-table-column :resizable="false" prop="totalArea" label="总面积(㎡)" width="150" align="right" />
            <el-table-column :resizable="false" prop="residentialArea" label="住宅面积(㎡)" width="180" align="right" />
            <el-table-column :resizable="false" prop="commercialArea" label="商业面积(㎡)" width="180" align="right" />
            <el-table-column :resizable="false" prop="commercialResidentialRatio" label="商住比" width="180" align="center" />
            <el-table-column :resizable="false" label="操作" width="250" align="center" fixed="right">
              <template #default="{ row }">
                <el-button class="edit-action-btn" type="primary" size="medium" @click="emit('edit-land-parcel', row)">编辑</el-button>
                <el-button link type="danger" size="medium" @click="emit('delete-land-parcel', row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

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
  'refresh-contracts',
  'add-contract',
  'contract-row-click',
  'edit-contract',
  'delete-contract',
  'add-land-parcel',
  'edit-land-parcel',
  'delete-land-parcel'
])

const plannedUseLabelMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  COMMERCIAL_AND_RESIDENTIAL: '商住混合'
}

const parcelCollapsed = ref(false)
const toggleParcelPanel = () => {
  parcelCollapsed.value = !parcelCollapsed.value
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const str = String(value)
  return str.replace('T', ' ').slice(0, 19)
}
</script>

<style scoped>
.contract-workbench {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workbench-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5ecf6;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 12px 14px;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #213043;
}

.toolbar-sub {
  font-size: 13px;
  color: #6b7280;
}

.active-contract-tag {
  max-width: 360px;
}

:deep(.active-contract-tag .el-tag__content) {
  display: inline-block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-actions {
  display: inline-flex;
  gap: 8px;
}

.toolbar-btn {
  border-radius: 6px;
  font-weight: 600;
}

.refresh-btn {
  border-color: #c8ddf1;
  background: #ffffff;
  color: #1f4e79;
}

.add-btn {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

.add-btn:hover {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

.workbench-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 360px);
  min-height: 560px;
}

.contracts-panel,
.parcels-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5ecf6;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.contracts-panel {
  flex: 0 0 48%;
}

.parcels-panel {
  flex: 1 1 52%;
}

.parcels-panel.collapsed {
  min-height: auto;
  height: fit-content;
  flex: 0 0 auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  min-width: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #2a3a4f;
}

.panel-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.parcel-header-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.panel-actions {
  flex-shrink: 0;
}

:deep(.collapse-btn.el-button) {
  color: #1f4e79;
  font-weight: 600;
}

:deep(.collapse-btn.el-button:hover) {
  color: #163a5a;
  background: #eef4fb;
}

:deep(.edit-action-btn.el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.edit-action-btn.el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

.contract-code-tag {
  max-width: 230px;
}

:deep(.contract-code-tag .el-tag__content) {
  display: inline-block;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.parcel-summary {
  border: 1px dashed #cfd9e8;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #617089;
  background: #f9fbff;
}

:deep(.el-table .el-table__cell) {
  padding-top: 9px;
  padding-bottom: 9px;
}

:deep(.el-table th.el-table__cell) {
  background: #f7f9fc;
  color: #4b5d74;
  font-weight: 600;
}

:deep(.parcels-panel .el-button + .el-button) {
  margin-left: 25px;
}


:deep(.el-table__row:hover > td.el-table__cell) {
  background: #f7fbff !important;
}

:deep(.el-table .el-table__body-wrapper) {
  overflow: auto !important;
}

@media (max-width: 1500px) {
  .workbench-body {
    height: auto;
    min-height: 0;
  }

  .contracts-panel,
  .parcels-panel {
    height: 420px;
  }

  .parcels-panel.collapsed {
    height: auto;
  }
}
</style>
