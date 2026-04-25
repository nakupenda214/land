<template>
  <section class="panel few-shot-panel">
    <header class="panel-header">
      <div class="heading">
        <h3>Few Shot 管理</h3>
      </div>
      <div class="actions">
        <el-input
          v-model="keyword"
          placeholder="检索问题、MQL 或备注"
          clearable
          class="search"
          @keyup.enter="loadData"
        />
        <el-select v-model="enabledFilter" clearable placeholder="状态" style="width: 120px" @change="loadData">
          <el-option label="已启用" :value="true" />
          <el-option label="已停用" :value="false" />
        </el-select>
        <el-button :loading="refreshingVector" @click="refreshVectorStore">刷新向量库</el-button>
        <el-button type="primary" @click="openCreateDialog">新增样本</el-button>
      </div>
    </header>

    <el-table :data="rows" border stripe v-loading="loading" class="knowledge-table">
      <el-table-column prop="question" label="问题" min-width="230" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="question-cell">
            <span class="question-mark" />
            <span>{{ row.question }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="mqlJson" label="MQL 样本" min-width="360" show-overflow-tooltip />
      <el-table-column prop="note" label="备注" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.note || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用中' : '已停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedTime" label="更新时间" width="170" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link @click="toggleEnabled(row)">
            {{ row.enabled ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 Few Shot' : '新增 Few Shot'" width="760px">
      <el-form label-position="top">
        <el-form-item label="问题">
          <el-input v-model.trim="form.question" maxlength="200" placeholder="例如：统计 2025 年有多少个项目" />
        </el-form-item>
        <el-form-item label="MQL JSON">
          <el-input v-model.trim="form.mqlJson" type="textarea" :rows="8" placeholder='{"op":"aggregate","collection":"project"...}' />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model.trim="form.note"
            type="textarea"
            :rows="3"
            maxlength="300"
            placeholder="补充这个样本的适用口径、字段陷阱或注意事项"
          />
        </el-form-item>
        <el-form-item label="启用抽样">
          <el-switch v-model="form.enabled" inline-prompt active-text="开" inactive-text="关" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listFewShot,
  createFewShot,
  updateFewShot,
  deleteFewShot,
  updateFewShotEnabled,
  refreshFewShotVectorStore
} from '@/services/agent-management.service'

const emit = defineEmits(['updated'])

const loading = ref(false)
const refreshingVector = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const keyword = ref('')
const enabledFilter = ref('')
const rows = ref([])

const form = reactive({
  question: '',
  mqlJson: '',
  note: '',
  enabled: true
})

function resetForm() {
  form.question = ''
  form.mqlJson = ''
  form.note = ''
  form.enabled = true
}

async function loadData() {
  loading.value = true
  try {
    rows.value = await listFewShot(keyword.value || undefined, enabledFilter.value === '' ? undefined : enabledFilter.value)
    emit('updated')
  } catch (error) {
    ElMessage.error(error.message || '加载 few-shot 失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.question = row.question || ''
  form.mqlJson = row.mqlJson || ''
  form.note = row.note || ''
  form.enabled = row.enabled !== false
  dialogVisible.value = true
}

async function submitForm() {
  if (!form.question || !form.mqlJson) {
    ElMessage.warning('问题和 MQL JSON 不能为空')
    return
  }
  submitting.value = true
  try {
    const payload = {
      question: form.question,
      mqlJson: form.mqlJson,
      note: form.note || undefined,
      enabled: form.enabled
    }
    if (editingId.value) {
      await updateFewShot(editingId.value, payload)
      ElMessage.success('Few-shot 已更新')
    } else {
      await createFewShot(payload)
      ElMessage.success('Few-shot 已创建')
    }
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function toggleEnabled(row) {
  try {
    await updateFewShotEnabled(row.id, !row.enabled)
    ElMessage.success('启用状态已更新')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '更新状态失败')
  }
}

async function removeItem(row) {
  try {
    await ElMessageBox.confirm(`确认删除 few-shot「${row.question || row.id}」？`, '删除确认', { type: 'warning' })
    await deleteFewShot(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

async function refreshVectorStore() {
  refreshingVector.value = true
  try {
    const count = await refreshFewShotVectorStore()
    await loadData()
    ElMessage.success(`Few-shot 向量已刷新，写入 ${Number(count || 0)} 条`)
    if (!rows.value.length && (String(keyword.value || '').trim() || enabledFilter.value !== '')) {
      ElMessage.info('当前筛选条件下暂无数据，可清空关键词/状态后重试')
    }
  } catch (error) {
    ElMessage.error(error.message || '刷新 few-shot 向量失败')
  } finally {
    refreshingVector.value = false
  }
}

onMounted(loadData)
defineExpose({ loadData, getCount: () => rows.value.length })
</script>

<style scoped>
.panel {
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #d8e6df;
  background:
    radial-gradient(720px 260px at 100% 0%, rgba(72, 177, 155, 0.16), transparent 50%),
    linear-gradient(180deg, #ffffff 0%, #f8fcfb 100%);
  box-shadow: 0 12px 32px rgba(29, 73, 66, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.heading {
  display: flex;
  flex-direction: column;
}

h3 {
  margin: 0;
  font-size: 20px;
  color: #1e4e46;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  width: 260px;
}

.knowledge-table :deep(.el-table__header-wrapper th) {
  background: #eef8f4;
  color: #275249;
  font-weight: 700;
}

.knowledge-table :deep(.el-table__row td) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.question-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #224e46;
}

.question-mark {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(135deg, #35a58e 0%, #ebb85c 100%);
  box-shadow: 0 0 0 4px rgba(53, 165, 142, 0.12);
}

.few-shot-panel :deep(.el-button.is-link) {
  padding: 2px 4px;
  font-weight: 600;
}

.few-shot-panel :deep(.el-button.is-link + .el-button.is-link) {
  margin-left: 6px;
}
</style>
