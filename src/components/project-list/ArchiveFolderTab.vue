<template>
  <div class="archive-tab">
    <div class="tab-content">
      <div class="archive-toolbar">
        <div class="toolbar-left">
          <el-tag type="info" effect="plain">项目：{{ projectNameText }}</el-tag>
          <span class="folder-count">归档夹数量：{{ archiveList.length }}</span>
        </div>
        <div class="toolbar-actions">
          <el-button :icon="Refresh" @click="fetchArchives" :disabled="!projectId" :loading="archiveLoading">
            刷新
          </el-button>
          <el-button type="primary" :icon="FolderAdd" @click="openCreateDialog" :disabled="!projectId">
            新建归档夹
          </el-button>
        </div>
      </div>

      <div class="explorer-split">
        <section class="tree-panel" v-loading="archiveLoading">
          <el-empty v-if="!projectId" description="请先选择项目后查看归档目录" />
          <el-tree
            v-else-if="treeData.length"
            class="archive-tree"
            :data="treeData"
            node-key="id"
            :props="treeProps"
            :expand-on-click-node="false"
            default-expand-all
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node-row" :class="{ selected: data.archiveId && data.archiveId === selectedArchiveId }">
                <el-icon class="folder-icon">
                  <FolderOpened v-if="data.nodeType === 'project'" />
                  <Folder v-else />
                </el-icon>
                <span class="node-name">{{ data.name }}</span>
                <span class="node-actions">
                  <el-popconfirm
                    v-if="data.nodeType === 'archive'"
                    title="确认删除该归档夹？"
                    @confirm="handleDeleteArchive(data)"
                  >
                    <template #reference>
                      <el-button
                        type="danger"
                        text
                        :icon="Delete"
                        @click.stop
                        title="删除归档夹"
                      />
                    </template>
                  </el-popconfirm>
                </span>
              </div>
            </template>
          </el-tree>
          <el-empty v-else description="暂无归档夹" />
        </section>

        <section class="table-panel" v-loading="fileLoading">
          <header class="table-header">
            <div class="title">文件列表</div>
            <div class="subtitle">{{ selectedArchiveName || '请选择左侧归档夹' }}</div>
          </header>
          <el-empty v-if="!selectedArchiveId" description="选择归档夹后展示文件" />
          <el-table v-else :data="archiveFiles" stripe border height="100%">
            <el-table-column type="index" label="序号" width="64" align="center" />
            <el-table-column prop="originalName" label="文件名" min-width="240" show-overflow-tooltip />
            <el-table-column prop="fileType" label="类型" width="90" align="center" />
            <el-table-column prop="fileState" label="状态" width="120" align="center" />
            <el-table-column label="大小" width="110" align="center">
              <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
            </el-table-column>
            <el-table-column label="上传时间" min-width="180" align="center">
              <template #default="{ row }">{{ formatDateTime(row.uploadTime) }}</template>
            </el-table-column>
          </el-table>
          <div class="file-count" v-if="selectedArchiveId">共 {{ fileTotal }} 个文件</div>
        </section>
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" title="新建归档夹" width="420px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model.trim="createForm.name"
            maxlength="30"
            show-word-limit
            placeholder="例如：现场图片"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreateArchive">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Folder, FolderAdd, FolderOpened, Refresh } from '@element-plus/icons-vue'
import { createProjectArchive, deleteProjectArchive, getProjectArchives, queryFiles } from '@/services/file.service'

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: ''
  },
  projectName: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  }
})

const archiveLoading = ref(false)
const fileLoading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const createFormRef = ref(null)
const archiveList = ref([])
const archiveFiles = ref([])
const fileTotal = ref(0)
const selectedArchiveId = ref(null)
const selectedArchiveName = ref('')
const createForm = ref({
  name: ''
})

const projectNameText = computed(() => props.projectName || '未选择项目')

const createRules = {
  name: [
    { required: true, message: '请输入归档夹名称', trigger: 'blur' },
    { min: 2, max: 30, message: '名称长度需在 2 到 30 个字符', trigger: 'blur' }
  ]
}

const treeProps = {
  label: 'name',
  children: 'children'
}

const treeData = computed(() => {
  if (!props.projectId || archiveList.value.length === 0) return []
  return [
    {
      id: `project-${props.projectId}`,
      name: projectNameText.value,
      nodeType: 'project',
      children: archiveList.value.map((item) => ({
        id: `archive-${item.id}`,
        archiveId: item.id,
        name: item.name,
        kind: item.kind,
        nodeType: 'archive'
      }))
    }
  ]
})

const formatFileSize = (bytes) => {
  const value = Number(bytes || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text
}

const clearFiles = () => {
  selectedArchiveId.value = null
  selectedArchiveName.value = ''
  archiveFiles.value = []
  fileTotal.value = 0
}

const fetchArchiveFiles = async (archiveId) => {
  if (!props.projectId || !archiveId) {
    clearFiles()
    return
  }

  fileLoading.value = true
  try {
    const res = await queryFiles({
      pageNum: 1,
      pageSize: 200,
      sortField: 'uploadTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      archiveId
    })

    const payload = res.data?.data
    const records = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.records)
        ? payload.records
        : Array.isArray(payload?.list)
          ? payload.list
          : Array.isArray(payload?.rows)
            ? payload.rows
            : []

    archiveFiles.value = records
    fileTotal.value = Number(payload?.total ?? records.length)
  } catch (error) {
    console.error('查询归档文件失败:', error)
    archiveFiles.value = []
    fileTotal.value = 0
    ElMessage.error('查询归档文件失败，请稍后重试')
  } finally {
    fileLoading.value = false
  }
}

const fetchArchives = async () => {
  if (!props.projectId) {
    archiveList.value = []
    clearFiles()
    return
  }

  archiveLoading.value = true
  try {
    const res = await getProjectArchives(props.projectId)
    if (res.data?.code === 200 && Array.isArray(res.data.data)) {
      archiveList.value = res.data.data
      if (archiveList.value.length > 0) {
        const firstArchive = archiveList.value[0]
        selectedArchiveId.value = firstArchive.id
        selectedArchiveName.value = firstArchive.name
        fetchArchiveFiles(firstArchive.id)
      } else {
        clearFiles()
      }
    } else {
      archiveList.value = []
      clearFiles()
      ElMessage.warning(res.data?.msg || '归档夹列表返回异常')
    }
  } catch (error) {
    console.error('获取归档夹列表失败:', error)
    archiveList.value = []
    clearFiles()
    ElMessage.error('获取归档夹列表失败，请稍后重试')
  } finally {
    archiveLoading.value = false
  }
}

const openCreateDialog = () => {
  createForm.value = { name: '' }
  createDialogVisible.value = true
}

const submitCreateArchive = async () => {
  if (!createFormRef.value || !props.projectId) return

  try {
    await createFormRef.value.validate()
  } catch {
    return
  }

  createLoading.value = true
  try {
    const payload = {
      projectId: Number(props.projectId),
      name: createForm.value.name
    }

    const res = await createProjectArchive(payload)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '归档夹创建成功')
      createDialogVisible.value = false
      fetchArchives()
    } else {
      ElMessage.warning(res.data?.msg || '归档夹创建失败')
    }
  } catch (error) {
    console.error('创建归档夹失败:', error)
    ElMessage.error('创建归档夹失败，请稍后重试')
  } finally {
    createLoading.value = false
  }
}

const handleDeleteArchive = async (nodeData) => {
  if (!props.projectId || !nodeData?.archiveId) return

  try {
    const res = await deleteProjectArchive(Number(props.projectId), Number(nodeData.archiveId))
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '归档夹删除成功')
      if (selectedArchiveId.value === nodeData.archiveId) {
        clearFiles()
      }
      fetchArchives()
    } else {
      ElMessage.warning(res.data?.msg || '归档夹删除失败')
    }
  } catch (error) {
    console.error('删除归档夹失败:', error)
    ElMessage.error(error?.response?.data?.msg || '删除归档夹失败')
  }
}

const handleNodeClick = (data) => {
  if (!data?.archiveId) return
  selectedArchiveId.value = data.archiveId
  selectedArchiveName.value = data.name
  fetchArchiveFiles(data.archiveId)
}

watch(
  () => [props.projectId, props.active],
  ([projectId, active]) => {
    if (projectId && active) {
      fetchArchives()
      return
    }
    if (!projectId) {
      archiveList.value = []
      clearFiles()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.archive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f8f9fb;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.folder-count {
  color: #606266;
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.explorer-split {
  display: flex;
  align-items: stretch;
  gap: 12px;
  min-height: 560px;
  width: 100%;
  overflow-x: auto;
}

.tree-panel,
.table-panel {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  padding: 10px;
  min-height: 560px;
}

.tree-panel {
  flex: 0 0 320px;
  overflow: auto;
}

.archive-tree {
  --el-tree-node-hover-bg-color: #e8f3ff;
  --el-tree-text-color: #303133;
  font-size: 14px;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 30px;
}

.tree-node-row.selected {
  background: #e8f3ff;
}

.folder-icon {
  color: #d0892c;
}

.node-name {
  color: #303133;
}

.node-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
}

.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.table-header .title {
  font-weight: 600;
  color: #303133;
}

.table-header .subtitle {
  font-size: 13px;
  color: #606266;
}

.file-count {
  margin-top: 10px;
  color: #606266;
  font-size: 13px;
}
</style>
