<template>
  <el-card class="table-card no-print" shadow="never">
    <template #header>
      <div class="summary-header">
        <div class="title-row">
          <h3 class="main-report-title">{{ currentProjectInfo.name || '请选择项目' }} 房产实测信息汇总表</h3>
          <el-button
            type="primary"
            icon="Refresh"
            :loading="refreshBtnLoading"
            :disabled="isRefreshCd || !currentProjectInfo.id"
            @click="$emit('refresh-survey')"
            class="refresh-btn"
          >
            <span v-if="!isRefreshCd">刷新实测报告数据</span>
            <span v-else>冷却中（{{ cdRemaining }}s）</span>
          </el-button>
        </div>
        <div class="stats-row">
          <span class="stat-item">已上传实测报告：<strong>{{ surveyStats.total }}</strong> 份</span>
          <span class="stat-item">解析成功：<strong>{{ surveyStats.success }}</strong> 份</span>
          <span class="stat-item">校验通过：<strong>{{ surveyStats.verified }}</strong> 份</span>
          <span class="stat-item danger">校验不通过：<strong>{{ surveyStats.unverified }}</strong> 份</span>
        </div>
      </div>
    </template>

    <el-table
      :data="displayTableData"
      border
      style="width: 100%"
      max-height="500"
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
      <el-table-column prop="certNo" label="不动产权证编号" width="200" show-overflow-tooltip />
      <el-table-column prop="contractNo" label="合同/批文编号" width="180" show-overflow-tooltip />
      <el-table-column prop="phase" label="期数" width="100" align="center" />
      <el-table-column prop="totalArea" label="实测总面积" width="150" align="right" />

      <el-table-column label="计容建筑面积" align="center">
        <el-table-column prop="calcCommercial" label="商业" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'calcCommercial') }">{{ row.calcCommercial }}</span></template>
        </el-table-column>
        <el-table-column prop="calcResidential" label="住宅" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'calcResidential') }">{{ row.calcResidential }}</span></template>
        </el-table-column>
        <el-table-column prop="calcPropMgmt" label="物管" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'calcPropMgmt') }">{{ row.calcPropMgmt }}</span></template>
        </el-table-column>
        <el-table-column prop="calcOther" label="其他" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'calcOther') }">{{ row.calcOther }}</span></template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="不计容建筑面积" align="center">
        <el-table-column prop="nonCalcCommunity" label="社区" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'nonCalcCommunity') }">{{ row.nonCalcCommunity }}</span></template>
        </el-table-column>
        <el-table-column prop="nonCalcOther" label="公用" width="130" align="right">
          <template #default="{ row }"><span :class="{ 'highlight-val': isTarget(row, 'nonCalcOther') }">{{ row.nonCalcOther }}</span></template>
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
      <el-table-column prop="unknownUsageCount" label="未知用途数量" width="120" align="center" />
      <el-table-column prop="isVerified" label="验证状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isVerified === 1 ? 'success' : 'danger'" size="small">
            {{ row.isVerified === 1 ? '验证通过' : '验证不通过' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="unknownUsages" label="未知用途详情" min-width="150" show-overflow-tooltip />
      <el-table-column prop="verificationErrorReason" label="验证失败原因" min-width="200" show-overflow-tooltip />
    </el-table>
  </el-card>
</template>

<script setup>
import { View } from '@element-plus/icons-vue'

defineProps({
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
  },
  isTarget: {
    type: Function,
    required: true
  }
})

defineEmits(['refresh-survey', 'view-detail'])
</script>

<style scoped>
.summary-header {
  display: block;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  padding: 6px 12px;
  font-size: 13px;
  color: #606266;
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
  height: 36px;
  border-radius: 18px;
  font-weight: 600;
}

.highlight-val {
  color: #409eff;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>
