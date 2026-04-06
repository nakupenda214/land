<template>
  <el-card class="table-card no-print" shadow="never">
    <template #header>
      <div class="summary-header">
        <div class="title-row">
          <h3 class="main-report-title">{{ currentProjectInfo.name || '请选择项目' }} 房产实测信息汇总表</h3>
          <div class="stats-row in-title">
            <span class="stat-item">已上传实测报告：<strong>{{ surveyStats.total }}</strong> 份</span>
            <span class="stat-item">解析成功：<strong>{{ surveyStats.success }}</strong> 份</span>
            <span class="stat-item">校验通过：<strong>{{ surveyStats.verified }}</strong> 份</span>
            <span class="stat-item danger">校验不通过：<strong>{{ surveyStats.unverified }}</strong> 份</span>
          </div>
          <div class="header-actions">
            <el-button class="tool-btn print-btn" @click="$emit('print')">打印报表</el-button>
            <el-button class="tool-btn export-btn" @click="$emit('export')">导出 Excel</el-button>
          </div>
          <el-button
            type="primary"
            icon="Refresh"
            :loading="parsedRefreshLoading"
            :disabled="!currentProjectInfo.id"
            @click="$emit('refresh-parsed')"
            class="refresh-btn parsed-btn"
          >
            刷新文件列表
          </el-button>
        </div>
      </div>
    </template>

    <el-table
      :data="displayTableData"
      border
      style="width: 100%"
      :max-height="summaryTableMaxHeight"
      :row-class-name="tableRowClassName"
      :header-cell-style="{ background: '#F5F7FA', color: '#333', fontWeight: 'bold', textAlign: 'center', fontSize: '12px', padding: '4px 0' }"
      :cell-style="{ fontSize: '12px', padding: '4px 0' }"
      :virtual-scroll="false"
    >
      <el-table-column label="序号" type="index" width="50" align="center" fixed :index="(index) => index + 1" />
      <el-table-column label="工程名称" width="160" fixed>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" style="font-weight: bold" @click="$emit('view-detail', row)">
            {{ row.projectName }} <el-icon style="margin-left: 2px"><View /></el-icon>
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="fileOriginalName" label="文件原始名" width="220" show-overflow-tooltip />
      <el-table-column prop="certNo" label="不动产权证编号" width="200" show-overflow-tooltip />
      <el-table-column prop="contractNo" label="合同/批文编号" width="180" show-overflow-tooltip />
      <el-table-column prop="phase" label="期数" width="100" align="center" />
      <el-table-column prop="totalArea" label="实测总面积" width="150" align="right" />

      <el-table-column label="计容建筑面积" align="center">
        <el-table-column prop="calcCommercial" label="商业" width="130" align="right">
          <template #default="{ row }">{{ row.calcCommercial }}</template>
        </el-table-column>
        <el-table-column prop="calcResidential" label="住宅" width="130" align="right">
          <template #default="{ row }">{{ row.calcResidential }}</template>
        </el-table-column>
        <el-table-column prop="calcPropMgmt" label="物管" width="130" align="right">
          <template #default="{ row }">{{ row.calcPropMgmt }}</template>
        </el-table-column>
        <el-table-column prop="calcOther" label="其他" width="130" align="right">
          <template #default="{ row }">{{ row.calcOther }}</template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="不计容建筑面积" align="center">
        <el-table-column prop="nonCalcCommunity" label="社区" width="130" align="right">
          <template #default="{ row }">{{ row.nonCalcCommunity }}</template>
        </el-table-column>
        <el-table-column prop="nonCalcOther" label="公用" width="130" align="right">
          <template #default="{ row }">{{ row.nonCalcOther }}</template>
        </el-table-column>
      </el-table-column>

      <el-table-column prop="reportNo" label="报告书编号" width="130" show-overflow-tooltip />
      <el-table-column prop="remarks" label="备注" min-width="80" />
      <el-table-column prop="pendingConfirmArea" label="待确认面积" width="120" align="center" />
      <el-table-column prop="hasUnknownUsage" label="是否有未知用途" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.hasUnknownUsage === 1 ? 'warning' : 'success'" size="small">
            {{ row.hasUnknownUsage === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isVerified" label="验证状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getVerifiedTagType(row.isVerified)" size="small">
            {{ getVerifiedText(row.isVerified) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="unknownUsages" label="未知用途详情" min-width="150" show-overflow-tooltip />
      <el-table-column prop="verificationErrorReason" label="验证失败原因" min-width="200" show-overflow-tooltip />
    </el-table>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { View } from '@element-plus/icons-vue'

const props = defineProps({
  currentProjectInfo: {
    type: Object,
    required: true
  },
  surveyStats: {
    type: Object,
    required: true
  },
  refreshBtnLoading: {
    type: Boolean,
    default: false
  },
  parsedRefreshLoading: {
    type: Boolean,
    default: false
  },
  isRefreshCd: {
    type: Boolean,
    default: false
  },
  cdRemaining: {
    type: Number,
    default: 0
  },
  displayTableData: {
    type: Array,
    default: () => []
  }
})

defineEmits(['refresh-survey', 'refresh-parsed', 'view-detail', 'print', 'export'])

const summaryTableMaxHeight = computed(() => (props.displayTableData.length > 8 ? 620 : undefined))

const normalizeVerifiedFlag = (value) => {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

const getVerifiedText = (value) => {
  const normalized = normalizeVerifiedFlag(value)
  if (normalized === 1) return '验证通过'
  if (normalized === 0) return '验证不通过'
  return '未知'
}

const getVerifiedTagType = (value) => {
  const normalized = normalizeVerifiedFlag(value)
  if (normalized === 1) return 'success'
  if (normalized === 0) return 'danger'
  return 'info'
}

const tableRowClassName = ({ row }) => normalizeVerifiedFlag(row?.isVerified) === 0 ? 'summary-row-unverified' : ''
</script>

<style scoped>
.table-card {
  min-height: 0;
}

.summary-header {
  display: block;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
}

.stats-row.in-title {
  flex: 1 1 auto;
  justify-content: flex-start;
  margin-top: 0;
  gap: 12px;
}

.main-report-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  background: #f4f6f8;
  border: 1px solid #e8edf2;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  line-height: 1;
  color: #606266;
  white-space: nowrap;
}

.stat-item strong {
  color: #409eff;
  margin: 0 4px;
}

.stat-item.danger strong {
  color: #f56c6c;
}

.refresh-btn {
  min-width: 172px;
  height: 40px;
  border-radius: 18px;
  font-weight: 600;
}

.parsed-btn {
  min-width: 154px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

:deep(.tool-btn.el-button) {
  min-width: 172px;
  height: 40px;
  padding: 0 14px;
  border-radius: 6px;
  font-weight: 600;
}

:deep(.print-btn.el-button) {
  border: 1px solid #c8ddf1;
  background: #ffffff;
  color: #1f4e79;
}

:deep(.print-btn.el-button:hover) {
  border-color: #b8d3ec;
  background: #f3f8fe;
  color: #163a5a;
}

:deep(.export-btn.el-button) {
  border: 1px solid #c8ddf1;
  background: #ffffff;
  color: #1f4e79;
}

:deep(.export-btn.el-button:hover) {
  border-color: #b8d3ec;
  background: #f3f8fe;
  color: #163a5a;
}

:deep(.el-table .summary-row-unverified > td.el-table__cell) {
  background-color: #fff1f0 !important;
}

@media (max-width: 1024px) {
  .title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .stats-row.in-title {
    justify-content: flex-start;
    gap: 10px;
  }

  .refresh-btn {
    width: 100%;
  }

  .header-actions {
    margin-left: 0;
  }
}
</style>
