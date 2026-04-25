<template>
  <section class="panel agent-panel">
    <header class="panel-header">
      <div class="heading">
        <h3>智能体知识管理</h3>
      </div>
      <div class="actions">
        <el-input v-model="query.title" placeholder="按标题检索" clearable class="search" @keyup.enter="loadData" />
        <el-select v-model="query.type" clearable placeholder="类型" style="width: 130px">
          <el-option label="DOCUMENT" value="DOCUMENT" />
          <el-option label="QA" value="QA" />
          <el-option label="FAQ" value="FAQ" />
        </el-select>
        <el-button :loading="loading" @click="loadData">刷新列表</el-button>
        <el-button type="primary" @click="openCreateDialog">新增知识</el-button>
      </div>
    </header>

    <el-table :data="rows" border stripe v-loading="loading" class="knowledge-table">
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="title-cell">
            <span class="title-mark" />
            <span>{{ row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="110">
        <template #default="{ row }">
          <el-tag effect="plain" :type="typeTagType(row.type)">{{ row.type || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="question" label="问题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="embeddingStatus" label="向量状态" width="130">
        <template #default="{ row }">
          <el-tag effect="dark" :type="embeddingTagType(row.embeddingStatus)">
            {{ row.embeddingStatus || 'UNKNOWN' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="召回" width="90">
        <template #default="{ row }">
          <el-tag :type="row.isRecall ? 'success' : 'info'">{{ row.isRecall ? '开启' : '关闭' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedTime" label="更新时间" width="170" />
      <el-table-column label="操作" width="310" fixed="right">
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

    <div class="pager">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :total="total"
        @current-change="onPageChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑智能体知识' : '新增智能体知识'"
      width="720px"
      append-to-body
      lock-scroll
    >
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model.trim="form.title" maxlength="100" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="DOCUMENT">DOCUMENT</el-radio-button>
            <el-radio-button label="QA">QA</el-radio-button>
            <el-radio-button label="FAQ">FAQ</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.type === 'DOCUMENT'">
          <el-form-item label="文档文件">
            <el-upload :auto-upload="false" :limit="1" :on-change="onFileChange">
              <el-button>选择文件</el-button>
            </el-upload>
            <div class="hint">当前仅支持单文件上传，提交后后端会自动做切分与向量化。</div>
          </el-form-item>
          <el-form-item label="切分器">
            <el-select v-model="form.splitterType" placeholder="默认 TOKEN" style="width: 200px">
              <el-option label="TOKEN" value="TOKEN" />
              <el-option label="PARAGRAPH" value="PARAGRAPH" />
              <el-option label="SENTENCE" value="SENTENCE" />
              <el-option label="RECURSIVE" value="RECURSIVE" />
              <el-option label="SEMANTIC" value="SEMANTIC" />
            </el-select>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="问题">
            <el-input v-model.trim="form.question" />
          </el-form-item>
          <el-form-item label="答案内容">
            <el-input v-model.trim="form.content" type="textarea" :rows="5" />
          </el-form-item>
        </template>
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
  queryAgentKnowledge,
  createAgentKnowledge,
  updateAgentKnowledge,
  deleteAgentKnowledge,
  recallAgentKnowledge,
  retryAgentKnowledgeEmbedding
} from '@/services/agent-management.service'

const props = defineProps({
  agentId: { type: String, required: true }
})

const emit = defineEmits(['updated'])

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const uploadFile = ref(null)
const rows = ref([])
const total = ref(0)

const query = reactive({
  title: '',
  type: '',
  pageNum: 1,
  pageSize: 10
})

const form = reactive({
  title: '',
  type: 'QA',
  question: '',
  content: '',
  splitterType: 'TOKEN'
})

function typeTagType(type) {
  if (type === 'DOCUMENT') return 'warning'
  if (type === 'FAQ') return 'success'
  return 'primary'
}

function embeddingTagType(status) {
  const value = (status || '').toUpperCase()
  if (value === 'COMPLETED') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'PROCESSING') return 'warning'
  return 'info'
}

function resetForm() {
  form.title = ''
  form.type = 'QA'
  form.question = ''
  form.content = ''
  form.splitterType = 'TOKEN'
  uploadFile.value = null
}

async function loadData() {
  loading.value = true
  try {
    const data = await queryAgentKnowledge({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      title: query.title || undefined,
      type: query.type || undefined
    })
    rows.value = data.records || []
    total.value = data.total || 0
    emit('updated')
  } catch (error) {
    ElMessage.error(error.message || '加载智能体知识失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(page) {
  query.pageNum = page
  loadData()
}

function openCreateDialog() {
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.title = row.title || ''
  form.type = row.type || 'QA'
  form.question = row.question || ''
  form.content = row.content || ''
  form.splitterType = row.splitterType || 'TOKEN'
  uploadFile.value = null
  dialogVisible.value = true
}

function onFileChange(uploadFileItem) {
  uploadFile.value = uploadFileItem?.raw || null
}

async function submitForm() {
  if (!form.title) {
    ElMessage.warning('标题不能为空')
    return
  }
  if (form.type === 'DOCUMENT' && !editingId.value && !uploadFile.value) {
    ElMessage.warning('DOCUMENT 类型必须上传文件')
    return
  }
  if (form.type !== 'DOCUMENT' && (!form.question || !form.content)) {
    ElMessage.warning('QA/FAQ 类型必须填写问题与答案')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateAgentKnowledge(editingId.value, { title: form.title, content: form.content })
      ElMessage.success('智能体知识已更新')
    } else {
      const payload = new FormData()
      payload.append('agentId', props.agentId)
      payload.append('title', form.title)
      payload.append('type', form.type)
      payload.append('splitterType', form.splitterType)
      if (form.question) payload.append('question', form.question)
      if (form.content) payload.append('content', form.content)
      if (uploadFile.value) payload.append('file', uploadFile.value)
      await createAgentKnowledge(payload)
      ElMessage.success('智能体知识已创建')
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
    await recallAgentKnowledge(row.id, !row.isRecall)
    ElMessage.success('召回状态已更新')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '更新召回状态失败')
  }
}

async function retryEmbedding(row) {
  try {
    await retryAgentKnowledgeEmbedding(row.id)
    ElMessage.success('已提交重试请求')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '重试失败')
  }
}

async function removeItem(row) {
  try {
    await ElMessageBox.confirm(`确认删除知识「${row.title || row.id}」？`, '删除确认', { type: 'warning' })
    await deleteAgentKnowledge(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(loadData)
defineExpose({ loadData, getCount: () => total.value })
</script>

<style scoped>
.panel {
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #e0defa;
  background:
    radial-gradient(720px 250px at 100% 0%, rgba(137, 124, 245, 0.14), transparent 48%),
    linear-gradient(180deg, #ffffff 0%, #faf9ff 100%);
  box-shadow: 0 12px 32px rgba(42, 34, 90, 0.08);
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
  color: #2f2c66;
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
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.hint {
  margin-top: 6px;
  color: #7f76b3;
  font-size: 12px;
}
.knowledge-table :deep(.el-table__header-wrapper th) {
  background: #f4f2ff;
  color: #433f7a;
  font-weight: 700;
}
.knowledge-table :deep(.el-table__row td) {
  padding-top: 12px;
  padding-bottom: 12px;
}
.title-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #312f64;
}
.title-mark {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(135deg, #8f76ff 0%, #4d85ff 100%);
  box-shadow: 0 0 0 4px rgba(143, 118, 255, 0.14);
}
.agent-panel :deep(.el-button.is-link) {
  padding: 2px 4px;
  font-weight: 600;
}
.agent-panel :deep(.el-button.is-link + .el-button.is-link) {
  margin-left: 6px;
}
</style>
