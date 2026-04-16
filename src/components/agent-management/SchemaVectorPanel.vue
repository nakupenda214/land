<template>
  <section class="panel schema-panel">
    <header class="panel-header">
      <div class="heading">
        <p class="panel-kicker">Schema Vector</p>
        <h3>Schema 向量管理</h3>
        <p>可视化对齐：状态查看、手动刷新、清空、重载 YAML 后刷新</p>
      </div>
      <div class="actions">
        <el-button :loading="loading" @click="loadStatus">刷新状态</el-button>
        <el-button type="primary" :loading="refreshing" @click="refreshVectors">手动刷新向量</el-button>
        <el-button :loading="reloading" @click="reloadAndRefresh">重载 YAML 并刷新</el-button>
        <el-button type="danger" plain :loading="clearing" @click="clearVectors">清空向量</el-button>
      </div>
    </header>

    <el-row :gutter="12" class="status-cards">
      <el-col :span="8">
        <div class="status-card">
          <label>向量召回开关</label>
          <strong>{{ status.vectorEnabled ? '开启' : '关闭' }}</strong>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="status-card">
          <label>YAML 集合数</label>
          <strong>{{ status.configuredCollectionCount }}</strong>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="status-card">
          <label>已索引向量数</label>
          <strong>{{ status.indexedVectorDocCount }}</strong>
        </div>
      </el-col>
    </el-row>

    <el-table :data="tableRows" border stripe v-loading="loading" class="schema-table">
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
        <el-button :loading="yamlLoading" @click="loadYaml">重新加载 YAML</el-button>
        <el-button type="primary" :loading="yamlSaving" @click="saveYaml(false)">保存 YAML</el-button>
        <el-button type="success" :loading="yamlSaving" @click="saveYaml(true)">保存并刷新向量</el-button>
      </div>
    </div>
    <div class="yaml-meta">
      <span>文件路径：{{ yamlPath || '-' }}</span>
      <span>当前哈希：{{ status.currentSchemaHash || '-' }}</span>
      <span>已索引哈希：{{ status.indexedSchemaHash || '-' }}</span>
    </div>
    <el-input
      v-model="yamlContent"
      type="textarea"
      :rows="18"
      resize="vertical"
      placeholder="在这里编辑 mongo-schema.yaml 内容"
      class="yaml-editor"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  clearSchemaVector,
  getSchemaYaml,
  getSchemaVectorStatus,
  listSchemaCollections,
  refreshSchemaVector,
  reloadAndRefreshSchemaVector,
  updateSchemaYaml
} from '@/services/agent-management.service'

const props = defineProps({
  agentId: { type: String, required: true }
})

const loading = ref(false)
const refreshing = ref(false)
const reloading = ref(false)
const clearing = ref(false)
const yamlLoading = ref(false)
const yamlSaving = ref(false)
const yamlContent = ref('')
const yamlPath = ref('')
const collectionDetails = ref([])
const status = reactive({
  vectorEnabled: false,
  configuredCollectionCount: 0,
  indexedVectorDocCount: 0,
  indexedSchemaHash: '',
  currentSchemaHash: '',
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

async function loadStatus() {
  loading.value = true
  try {
    const data = await getSchemaVectorStatus(props.agentId)
    status.vectorEnabled = Boolean(data?.vectorEnabled)
    status.configuredCollectionCount = Number(data?.configuredCollectionCount || 0)
    status.indexedVectorDocCount = Number(data?.indexedVectorDocCount || 0)
    status.configuredCollections = data?.configuredCollections || []
    status.indexedCollections = data?.indexedCollections || []
    status.indexedSchemaHash = data?.indexedSchemaHash || ''
    status.currentSchemaHash = data?.currentSchemaHash || ''
  } catch (error) {
    ElMessage.error(error.message || '加载 Schema 向量状态失败')
  } finally {
    loading.value = false
  }
}

async function loadYaml() {
  yamlLoading.value = true
  try {
    const data = await getSchemaYaml()
    yamlContent.value = data?.yamlContent || ''
    yamlPath.value = data?.yamlPath || ''
  } catch (error) {
    ElMessage.error(error.message || '加载 Schema YAML 失败')
  } finally {
    yamlLoading.value = false
  }
}

async function loadCollectionDetails() {
  try {
    collectionDetails.value = await listSchemaCollections()
  } catch (error) {
    collectionDetails.value = []
  }
}

async function refreshVectors() {
  refreshing.value = true
  try {
    const count = await refreshSchemaVector(props.agentId)
    ElMessage.success(`Schema 向量刷新完成，写入 ${Number(count || 0)} 条`)
    await loadStatus()
    await loadCollectionDetails()
  } catch (error) {
    ElMessage.error(error.message || 'Schema 向量刷新失败')
  } finally {
    refreshing.value = false
  }
}

async function reloadAndRefresh() {
  reloading.value = true
  try {
    const count = await reloadAndRefreshSchemaVector(props.agentId)
    ElMessage.success(`已重载 YAML 并刷新，写入 ${Number(count || 0)} 条`)
    await loadStatus()
    await loadCollectionDetails()
    await loadYaml()
  } catch (error) {
    ElMessage.error(error.message || '重载并刷新失败')
  } finally {
    reloading.value = false
  }
}

async function clearVectors() {
  try {
    await ElMessageBox.confirm('确认清空当前 agent 的 Schema 向量吗？', '危险操作确认', { type: 'warning' })
    clearing.value = true
    await clearSchemaVector(props.agentId)
    ElMessage.success('Schema 向量已清空')
    await loadStatus()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '清空 Schema 向量失败')
    }
  } finally {
    clearing.value = false
  }
}

async function saveYaml(refreshVector) {
  if (!yamlContent.value.trim()) {
    ElMessage.warning('YAML 内容不能为空')
    return
  }
  yamlSaving.value = true
  try {
    const count = await updateSchemaYaml({ yamlContent: yamlContent.value, refreshVector }, props.agentId)
    if (refreshVector) {
      ElMessage.success(`YAML 已保存并刷新向量，写入 ${Number(count || 0)} 条`)
    } else {
      ElMessage.success('YAML 已保存')
    }
    await loadStatus()
    await loadCollectionDetails()
    await loadYaml()
  } catch (error) {
    ElMessage.error(error.message || '保存 YAML 失败')
  } finally {
    yamlSaving.value = false
  }
}

onMounted(async () => {
  await loadStatus()
  await loadYaml()
  await loadCollectionDetails()
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
.panel-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #2d8e70;
  font-weight: 700;
}
h3 {
  margin: 0;
  font-size: 20px;
  color: #1b5a48;
}
p {
  margin: 4px 0 0;
  color: #4c7f70;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.status-cards {
  margin-bottom: 16px;
}
.status-card {
  border: 1px solid #cfe7dc;
  background: #f7fffc;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.status-card label {
  color: #5f8f82;
  font-size: 12px;
}
.status-card strong {
  color: #215445;
  font-size: 20px;
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
.yaml-meta {
  margin: 8px 0;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #5d8d80;
  font-size: 12px;
}
.yaml-editor :deep(textarea) {
  font-family: Consolas, 'Courier New', monospace;
}
</style>
