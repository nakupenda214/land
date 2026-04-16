<template>
  <section class="panel business-panel">
    <header class="panel-header">
      <div class="heading">
        <p class="panel-kicker">Business Knowledge</p>
        <h3>BusinessKnowledge 管理</h3>
        <p>可视化对齐：列表、创建、更新、召回、重试向量化、刷新向量库</p>
      </div>
      <div class="actions">
        <el-input v-model="keyword" placeholder="按术语检索" clearable class="search" @keyup.enter="loadData" />
        <el-button type="primary" @click="openCreateDialog">新增术语</el-button>
        <el-button :loading="refreshing" @click="refreshVector">刷新向量库</el-button>
      </div>
    </header>

    <el-table :data="rows" border stripe v-loading="loading" class="knowledge-table">
      <el-table-column prop="businessTerm" label="业务术语" min-width="180">
        <template #default="{ row }">
          <div class="term-cell">
            <span class="term-dot" />
            <span>{{ row.businessTerm }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="术语说明" min-width="280" show-overflow-tooltip />
      <el-table-column prop="synonyms" label="同义词" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="synonym-pill">{{ row.synonyms || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="embeddingStatus" label="向量状态" width="130">
        <template #default="{ row }">
          <el-tag effect="dark" :type="embeddingTagType(row.embeddingStatus)">
            {{ row.embeddingStatus || 'UNKNOWN' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="召回" width="90">
        <template #default="{ row }">
          <el-tag effect="light" :type="row.isRecall ? 'success' : 'info'">{{ row.isRecall ? '开启' : '关闭' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="290" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link @click="toggleRecall(row)">
            {{ row.isRecall ? '关闭召回' : '开启召回' }}
          </el-button>
          <el-button link @click="retryEmbedding(row)">重试向量化</el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑业务术语' : '新增业务术语'" width="640px">
      <el-form label-position="top">
        <el-form-item label="业务术语">
          <el-input v-model.trim="form.businessTerm" maxlength="80" />
        </el-form-item>
        <el-form-item label="术语说明">
          <el-input v-model.trim="form.description" type="textarea" :rows="4" maxlength="400" />
        </el-form-item>
        <el-form-item label="同义词">
          <el-input v-model.trim="form.synonyms" placeholder="多个词可用逗号分隔" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listBusinessKnowledge,
  createBusinessKnowledge,
  updateBusinessKnowledge,
  deleteBusinessKnowledge,
  recallBusinessKnowledge,
  retryBusinessKnowledgeEmbedding,
  refreshBusinessKnowledgeVector
} from '@/services/agent-management.service'

const props = defineProps({
  agentId: { type: String, required: true }
})

const emit = defineEmits(['updated'])

const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const keyword = ref('')
const rows = ref([])
const form = reactive({
  businessTerm: '',
  description: '',
  synonyms: ''
})

function embeddingTagType(status) {
  const value = (status || '').toUpperCase()
  if (value === 'COMPLETED') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'PROCESSING') return 'warning'
  return 'info'
}

function resetForm() {
  form.businessTerm = ''
  form.description = ''
  form.synonyms = ''
}

async function loadData() {
  loading.value = true
  try {
    rows.value = await listBusinessKnowledge(props.agentId, keyword.value || undefined)
    emit('updated')
  } catch (error) {
    ElMessage.error(error.message || '加载业务知识失败')
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
  form.businessTerm = row.businessTerm || ''
  form.description = row.description || ''
  form.synonyms = row.synonyms || ''
  dialogVisible.value = true
}

async function submitForm() {
  if (!form.businessTerm || !form.description) {
    ElMessage.warning('术语和说明不能为空')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateBusinessKnowledge(editingId.value, { ...form, agentId: props.agentId })
      ElMessage.success('业务术语已更新')
    } else {
      await createBusinessKnowledge({ ...form, agentId: props.agentId, isRecall: 1 })
      ElMessage.success('业务术语已创建')
    }
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function toggleRecall(row) {
  try {
    await recallBusinessKnowledge(row.id, !row.isRecall)
    ElMessage.success('召回状态已更新')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '更新召回状态失败')
  }
}

async function retryEmbedding(row) {
  try {
    await retryBusinessKnowledgeEmbedding(row.id)
    ElMessage.success('已提交重试请求')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '重试失败')
  }
}

async function refreshVector() {
  refreshing.value = true
  try {
    await refreshBusinessKnowledgeVector(props.agentId)
    ElMessage.success('向量库刷新任务已提交')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

async function removeItem(row) {
  try {
    await ElMessageBox.confirm(`确认删除术语「${row.businessTerm || row.id}」？`, '删除确认', { type: 'warning' })
    await deleteBusinessKnowledge(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(loadData)
defineExpose({ loadData, getCount: () => rows.value.length })
</script>

<style scoped>
.panel {
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #d9e4fb;
  background:
    radial-gradient(700px 220px at 0% 0%, rgba(111, 162, 255, 0.12), transparent 45%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 30px rgba(24, 52, 90, 0.08);
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
.panel-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #5f7eb0;
  font-weight: 700;
}
h3 {
  margin: 0;
  font-size: 20px;
  color: #16365f;
}
p {
  margin: 4px 0 0;
  color: #6d7e98;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.search {
  width: 240px;
}
.knowledge-table :deep(.el-table__header-wrapper th) {
  background: #f2f7ff;
  color: #2a4770;
  font-weight: 700;
}
.knowledge-table :deep(.el-table__row td) {
  padding-top: 12px;
  padding-bottom: 12px;
}
.term-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #223e66;
}
.term-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a8bff 0%, #6b6bff 100%);
  box-shadow: 0 0 0 4px rgba(74, 139, 255, 0.15);
}
.synonym-pill {
  display: inline-block;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #395f91;
}
</style>

<style scoped>
.business-panel :deep(.el-button.is-link) {
  padding: 2px 4px;
  font-weight: 600;
}
.business-panel :deep(.el-button.is-link + .el-button.is-link) {
  margin-left: 6px;
}
</style>
