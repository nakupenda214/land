<template>
  <section class="selfopt-panel">
    <div class="panel-head">
      <h4>优化版本管理</h4>
      <span class="tip">说明：版本记录来源于本页/任务页执行记录</span>
    </div>

    <el-form :inline="true">
      <el-form-item label="versionId">
        <el-input v-model.trim="versionId" placeholder="输入 versionId 验证/回滚" style="width: 300px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" plain :loading="verifyLoading" @click="verifyVersion">触发验证</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="warning" plain :loading="rollbackLoading" @click="rollbackVersion">执行回滚</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="records" stripe empty-text="暂无版本记录">
      <el-table-column prop="versionId" label="versionId" min-width="190" show-overflow-tooltip />
      <el-table-column prop="taskId" label="taskId" min-width="190" show-overflow-tooltip />
      <el-table-column prop="actionType" label="动作类型" min-width="170" show-overflow-tooltip />
      <el-table-column label="执行状态" width="110">
        <template #default="{ row }">
          <span :class="statusPillClass(row.executeStatus)">{{ normalizeTaskStatus(row.executeStatus) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="验证状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="verifyTagType(row.verifyStatus)">{{ row.verifyStatus || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="quickVerify(row.versionId)">验证</el-button>
          <el-button size="small" text type="warning" @click="quickRollback(row.versionId)">回滚</el-button>
          <el-button size="small" text @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="版本详情" width="min(1000px, 95vw)">
      <el-input :model-value="detailText" type="textarea" :autosize="{ minRows: 16, maxRows: 36 }" readonly />
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { rollbackOptimizationVersion, verifyOptimizationVersion } from '@/services/agent-management.service.js'
import { normalizeTaskStatus, statusPillClass, verifyTagType } from './selfopt-status-present.js'

const state = ref({ versions: [] })
const versionId = ref('')
const verifyLoading = ref(false)
const rollbackLoading = ref(false)
const detailVisible = ref(false)
const detailText = ref('')

const records = computed(() => state.value.versions || [])

function saveState(next) {
  state.value = next
}

function upsertVersionRecord(stateObj, record) {
  const key = String(record?.versionId || '').trim()
  if (!key) return stateObj
  const list = [...(stateObj?.versions || [])]
  const idx = list.findIndex((x) => String(x?.versionId || '') === key)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...record, updateTime: Date.now() }
  } else {
    list.unshift({ ...record, updateTime: Date.now() })
  }
  return { ...stateObj, versions: list.slice(0, 200) }
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function showDetail(row) {
  detailText.value = JSON.stringify(row || {}, null, 2)
  detailVisible.value = true
}

async function verifyById(rawVersionId) {
  const id = String(rawVersionId || '').trim()
  if (!id) {
    ElMessage.warning('请先输入 versionId')
    return
  }
  const data = await verifyOptimizationVersion(id)
  const next = upsertVersionRecord(state.value, {
    versionId: id,
    verifyStage: data?.verifyStage || '',
    verifyStatus: data?.verifyStatus || '',
    passRate: data?.passRate,
    totalCount: data?.totalCount,
    failedCaseList: data?.failedCaseList || [],
    errorMessage: data?.errorMessage || '',
    detail: data
  })
  saveState(next)
}

async function rollbackById(rawVersionId) {
  const id = String(rawVersionId || '').trim()
  if (!id) {
    ElMessage.warning('请先输入 versionId')
    return
  }
  const data = await rollbackOptimizationVersion(id)
  const next = upsertVersionRecord(state.value, {
    versionId: id,
    rollback: data?.rollback === true,
    executeStatus: data?.rollback === true ? 'ROLLBACK' : 'FAILED',
    detail: data
  })
  saveState(next)
}

async function verifyVersion() {
  verifyLoading.value = true
  try {
    await verifyById(versionId.value)
    ElMessage.success('版本验证完成')
  } catch (e) {
    ElMessage.error(e?.message || '验证失败')
  } finally {
    verifyLoading.value = false
  }
}

async function quickVerify(id) {
  verifyLoading.value = true
  try {
    await verifyById(id)
    ElMessage.success('版本验证完成')
  } catch (e) {
    ElMessage.error(e?.message || '验证失败')
  } finally {
    verifyLoading.value = false
  }
}

async function rollbackVersion() {
  rollbackLoading.value = true
  try {
    await rollbackById(versionId.value)
    ElMessage.success('版本回滚完成')
  } catch (e) {
    ElMessage.error(e?.message || '回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}

async function quickRollback(id) {
  rollbackLoading.value = true
  try {
    await rollbackById(id)
    ElMessage.success('版本回滚完成')
  } catch (e) {
    ElMessage.error(e?.message || '回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}
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
</style>

