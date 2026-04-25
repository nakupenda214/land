<template>
  <section class="panel schema-panel">
    <header class="panel-header">
      <div class="heading">
        <h3>Schema 管理</h3>
      </div>
      <div class="actions">
        <el-tooltip content="刷新上方统计与下方表格（不读 YAML 文件、不写向量）" placement="bottom">
          <el-button :loading="loading" @click="refreshOverview">刷新概览</el-button>
        </el-tooltip>
        <el-tooltip content="按服务端当前已加载的 Schema 重算并写入 Milvus（不从磁盘重读 YAML）" placement="bottom">
          <el-button type="primary" :loading="refreshing" @click="refreshVectors">重算向量</el-button>
        </el-tooltip>
        <el-tooltip content="删除当前 agent 在 Milvus 中的 Schema 向量数据" placement="bottom">
          <el-button type="danger" plain :loading="clearing" @click="clearVectors">清空向量</el-button>
        </el-tooltip>
      </div>
    </header>

    <el-table :data="tableRows" border stripe v-loading="loading" class="schema-table" @row-click="onSchemaRowClick">
      <el-table-column prop="name" label="集合名" min-width="220" />
      <el-table-column label="字段数" width="90">
        <template #default="{ row }">{{ row.fieldCount }}</template>
      </el-table-column>
      <el-table-column label="字段预览" min-width="360" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.fieldsPreview || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="configured" label="YAML 配置" width="120">
        <template #default="{ row }">
          <el-tag :type="row.configured ? 'success' : 'info'">{{ row.configured ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="indexed" label="已向量化" width="120">
        <template #default="{ row }">
          <el-tag :type="row.indexed ? 'success' : 'warning'">{{ row.indexed ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="yaml-header">
      <h4>Schema YAML 编辑</h4>
      <div class="yaml-actions">
        <el-tooltip content="丢弃编辑器内容，从磁盘重新载入 YAML（不写向量）" placement="top">
          <el-button :loading="yamlLoading" @click="loadYaml">从磁盘加载 YAML</el-button>
        </el-tooltip>
        <el-tooltip content="将当前编辑器内容写入磁盘，并按新 YAML 重算写入 Milvus" placement="top">
          <el-button type="primary" :loading="yamlSaving" @click="saveYamlAndRefresh">保存并写入向量</el-button>
        </el-tooltip>
      </div>
    </div>
    <YamlCodeEditor v-model="yamlContent" height="clamp(320px, 70vh, 560px)" />

    <div class="mix-preview-block">
      <div class="yaml-header">
        <h4>Mix 选表派生视图</h4>
        <div class="yaml-actions">
          <el-button :loading="viewPreviewLoading" @click="previewView">刷新派生视图</el-button>
        </div>
      </div>
      <div class="yaml-meta">
        <span>限定集合（可选）：</span>
        <el-input
          v-model="viewPreviewCollectionsText"
          size="small"
          style="width: 420px"
          placeholder="逗号分隔；留空则包含 YAML 中全部已声明集合"
        />
      </div>
      <YamlCodeEditor :model-value="viewPreviewSnippet" height="clamp(180px, 32vh, 320px)" readonly />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import YamlCodeEditor from '@/components/common/YamlCodeEditor.vue'
import {
  clearSchemaVector,
  getSchemaYaml,
  getSchemaVectorStatus,
  listSchemaCollections,
  previewSchemaMixView,
  refreshSchemaVector,
  updateSchemaYaml
} from '@/services/agent-management.service'

const props = defineProps({
  agentId: { type: String, required: true }
})
const emit = defineEmits(['status-updated'])

const loading = ref(false)
const refreshing = ref(false)
const clearing = ref(false)
const yamlLoading = ref(false)
const yamlSaving = ref(false)
const yamlContent = ref('')
const collectionDetails = ref([])
const viewPreviewLoading = ref(false)
const viewPreviewCollectionsText = ref('')
const viewPreviewSnippet = ref('')
const status = reactive({
  configuredCollectionCount: 0,
  indexedVectorDocCount: 0,
  configuredCollections: [],
  indexedCollections: []
})

const tableRows = computed(() => {
  const all = new Set([...(status.configuredCollections || []), ...(status.indexedCollections || [])])
  const detailMap = new Map((collectionDetails.value || []).map((x) => [x.collectionName, x]))
  return Array.from(all).map((name) => ({
    name,
    configured: (status.configuredCollections || []).includes(name),
    indexed: (status.indexedCollections || []).includes(name),
    fieldCount: Number(detailMap.get(name)?.fieldCount || 0),
    fieldsPreview: (detailMap.get(name)?.fields || []).slice(0, 6).join(' | ')
  }))
})

async function loadStatus(options = {}) {
  const { manageLoading = true } = options
  if (manageLoading) loading.value = true
  try {
    const data = await getSchemaVectorStatus(props.agentId)
    status.configuredCollectionCount = Number(data?.configuredCollectionCount || 0)
    status.indexedVectorDocCount = Number(data?.indexedVectorDocCount || 0)
    status.configuredCollections = data?.configuredCollections || []
    status.indexedCollections = data?.indexedCollections || []
    emit('status-updated', {
      configuredCollectionCount: status.configuredCollectionCount,
      indexedVectorDocCount: status.indexedVectorDocCount
    })
  } catch (error) {
    ElMessage.error(error.message || '加载 Schema 向量状态失败')
    emit('status-updated', {
      configuredCollectionCount: 0,
      indexedVectorDocCount: 0
    })
  } finally {
    if (manageLoading) loading.value = false
  }
}

/** 仅刷新统计与集合表（不读 YAML、不写向量） */
async function refreshOverview() {
  loading.value = true
  try {
    await loadStatus({ manageLoading: false })
    await loadCollectionDetails()
  } finally {
    loading.value = false
  }
}

function onSchemaRowClick(row) {
  if (!row?.name) return
  viewPreviewCollectionsText.value = row.name
  previewView()
}

async function loadYaml() {
  yamlLoading.value = true
  try {
    const data = await getSchemaYaml()
    yamlContent.value = data?.yamlContent || ''
  } catch (error) {
    ElMessage.error(error.message || '加载 Schema YAML 失败')
  } finally {
    yamlLoading.value = false
  }
  try {
    await previewView()
  } catch {
    /* 预览失败不阻断 YAML 已载入 */
  }
}

async function loadCollectionDetails() {
  try {
    collectionDetails.value = await listSchemaCollections()
  } catch (error) {
    collectionDetails.value = []
  }
}

async function previewView() {
  viewPreviewLoading.value = true
  try {
    const cols = viewPreviewCollectionsText.value
      .split(/[,，\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
    const data = await previewSchemaMixView(cols)
    viewPreviewSnippet.value = data?.snippet || ''
  } catch (error) {
    ElMessage.error(error.message || '加载视图预览失败')
    viewPreviewSnippet.value = ''
  } finally {
    viewPreviewLoading.value = false
  }
}

async function refreshVectors() {
  refreshing.value = true
  try {
    const count = await refreshSchemaVector(props.agentId)
    ElMessage.success(`已按当前 Schema 重算向量，写入 ${Number(count || 0)} 条`)
    await refreshOverview()
  } catch (error) {
    ElMessage.error(error.message || 'Schema 向量刷新失败')
  } finally {
    refreshing.value = false
  }
}

async function clearVectors() {
  try {
    await ElMessageBox.confirm('确认清空当前 agent 的 Schema 向量吗？', '危险操作确认', { type: 'warning' })
    clearing.value = true
    await clearSchemaVector(props.agentId)
    ElMessage.success('Schema 向量已清空')
    await refreshOverview()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '清空 Schema 向量失败')
    }
  } finally {
    clearing.value = false
  }
}

async function saveYamlAndRefresh() {
  if (!yamlContent.value.trim()) {
    ElMessage.warning('YAML 内容不能为空')
    return
  }
  yamlSaving.value = true
  try {
    const count = await updateSchemaYaml({ yamlContent: yamlContent.value, refreshVector: true }, props.agentId)
    ElMessage.success(`YAML 已保存并写入向量，写入 ${Number(count || 0)} 条`)
    await refreshOverview()
    await loadYaml()
  } catch (error) {
    ElMessage.error(error.message || '保存 YAML 失败')
  } finally {
    yamlSaving.value = false
  }
}

onMounted(async () => {
  await refreshOverview()
  await loadYaml()
})
</script>

<style scoped>
.panel {
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #d8ebdf;
  background:
    radial-gradient(700px 200px at 100% 0%, rgba(108, 214, 173, 0.18), transparent 48%),
    linear-gradient(180deg, #ffffff 0%, #f5fffb 100%);
  box-shadow: 0 10px 26px rgba(20, 66, 53, 0.08);
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
  color: #1b5a48;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.schema-table :deep(.el-table__header-wrapper th) {
  background: #ebfaf3;
  color: #285f4f;
  font-weight: 700;
}
.yaml-header {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.yaml-header h4 {
  margin: 0;
  color: #1f5948;
}
.yaml-actions {
  display: flex;
  gap: 8px;
}
.yaml-header + .yaml-code-editor {
  margin-top: 10px;
}
.yaml-meta {
  margin: 8px 0;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #5d8d80;
  font-size: 12px;
}
.mix-preview-block {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px dashed rgba(31, 89, 72, 0.22);
}
.schema-table :deep(.el-table__body tr) {
  cursor: pointer;
}
</style>
