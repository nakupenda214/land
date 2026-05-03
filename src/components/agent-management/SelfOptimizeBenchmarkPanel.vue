<template>
  <section class="selfopt-panel">
    <div class="panel-head">
      <h4>基准用例管理（第一版）</h4>
      <span class="tip">当前后端仅开放新增接口</span>
    </div>

    <el-form :model="form" label-width="120px" class="bench-form">
      <el-form-item label="用户问题">
        <el-input v-model.trim="form.userQuery" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
      </el-form-item>
      <el-form-item label="期望节点">
        <el-input v-model.trim="form.expectedNode" />
      </el-form-item>
      <el-form-item label="期望结果">
        <el-input v-model.trim="form.expectedResult" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
      </el-form-item>
      <el-form-item label="期望行数">
        <el-input-number v-model="form.expectedCount" :min="0" :step="1" controls-position="right" />
        <span class="field-hint">事实一致性校验用；可不填</span>
      </el-form-item>
      <el-form-item label="用例类型">
        <el-input v-model.trim="form.caseType" placeholder="如 regression / retrieval" />
      </el-form-item>
      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="1" :max="10" />
      </el-form-item>
      <el-form-item label="必须通过">
        <el-switch v-model="form.mustPass" />
      </el-form-item>
      <el-form-item label="容错阈值">
        <el-input-number v-model="form.toleranceThreshold" :min="0" :max="1" :step="0.01" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitLoading" @click="submitCase">新增用例</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="records" stripe empty-text="暂无新增记录">
      <el-table-column prop="caseId" label="caseId" min-width="190" show-overflow-tooltip />
      <el-table-column prop="caseType" label="caseType" width="120" />
      <el-table-column prop="priority" label="priority" width="100" />
      <el-table-column prop="mustPass" label="mustPass" width="100">
        <template #default="{ row }">{{ row.mustPass ? 'true' : 'false' }}</template>
      </el-table-column>
      <el-table-column prop="expectedCount" label="expectedCount" width="120" />
      <el-table-column prop="userQuery" label="userQuery" min-width="260" show-overflow-tooltip />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatBenchmarkUpdateTime(row.updateTime) }}</template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup>
import { useSelfOptimizeBenchmarkPanel } from '@/composables/agent-management/useSelfOptimizeBenchmarkPanel.js'
import { formatBenchmarkUpdateTime } from '@/utils/selfopt-benchmark-record.js'

const { form, submitLoading, records, submitCase } = useSelfOptimizeBenchmarkPanel()
</script>

<style scoped>
.selfopt-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-head h4 {
  margin: 0;
  color: #1e3a5f;
}

.tip {
  font-size: 12px;
  color: #64748b;
}

.bench-form {
  border: 1px solid #dbe7f8;
  border-radius: 12px;
  padding: 14px 14px 2px;
  background: #fbfdff;
}

.field-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #64748b;
}
</style>
