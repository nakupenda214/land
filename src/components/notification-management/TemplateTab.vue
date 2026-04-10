<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="panel-head">
        <span>通知模板管理</span>
        <div class="actions">
          <el-button @click="fetchData">刷新</el-button>
          <el-button @click="initDefaultTemplates">初始化示例模板</el-button>
          <el-button type="primary" @click="openCreate">新增模板</el-button>
        </div>
      </div>
    </template>

    <div class="filters">
      <el-select v-model="query.scene" placeholder="场景" clearable>
        <el-option v-for="item in scenes" :key="item.code" :label="item.label || item.description || item.code" :value="item.code" />
      </el-select>
      <el-select v-model="query.channel" placeholder="渠道" clearable>
        <el-option v-for="item in channels" :key="item.code" :label="item.label" :value="item.code" />
      </el-select>
      <el-input v-model.trim="query.title" placeholder="标题" clearable @keyup.enter="handleSearch" />
      <el-select v-model="query.active" placeholder="状态" clearable>
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="同一通知场景仅允许配置一个模板，请按场景维护唯一模板。"
      class="scene-unique-alert"
    />

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column type="index" label="序号" width="70" />
      <el-table-column prop="scene" label="通知场景" width="180">
        <template #default="{ row }">{{ sceneMap[row.scene] || row.scene || '-' }}</template>
      </el-table-column>
      <el-table-column prop="channel" label="渠道" width="110" align="center">
        <template #default="{ row }">{{ channelMap[row.channel] || row.channel || '-' }}</template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="content" label="模板内容" min-width="320" show-overflow-tooltip />
      <el-table-column prop="active" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="Number(row.active) === 1 ? 'success' : 'info'">{{ Number(row.active) === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该模板吗？" @confirm="handleDelete(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="(p) => { query.pageNum = p; fetchData() }"
        @size-change="(s) => { query.pageSize = s; query.pageNum = 1; fetchData() }"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑模板' : '新增模板'" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="通知场景" prop="scene">
          <el-select v-model="form.scene" placeholder="请选择场景">
            <el-option v-for="item in scenes" :key="item.code" :label="item.label || item.description || item.code" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道">
            <el-option v-for="item in channels" :key="item.code" :label="item.label" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title"><el-input v-model.trim="form.title" maxlength="128" /></el-form-item>
        <el-form-item label="内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="4" maxlength="2000" /></el-form-item>
        <el-form-item label="可用占位符">
          <div class="placeholder-box">
            <div class="placeholder-hint">点击下方占位符可插入到内容末尾：</div>
            <div class="placeholder-tags">
              <el-tag
                v-for="item in placeholderOptions"
                :key="item.key"
                class="placeholder-tag"
                type="info"
                effect="plain"
                @click="insertPlaceholder(item.key)"
              >
                {{ item.key }}
              </el-tag>
            </div>
            <div class="placeholder-desc">
              <div v-for="item in placeholderOptions" :key="`desc-${item.key}`">
                <code>{{ item.key }}</code>：{{ item.label }}
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="active">
          <el-radio-group v-model="form.active"><el-radio :value="1">启用</el-radio><el-radio :value="0">禁用</el-radio></el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createTemplate,
  deleteTemplate,
  notificationResponse,
  queryTemplates,
  updateTemplate
} from '@/services/notification-management.service'

const props = defineProps({
  channels: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] }
})

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const total = ref(0)
const editingId = ref(null)
const dialogVisible = ref(false)
const formRef = ref(null)

const query = reactive({ pageNum: 1, pageSize: 10, sortField: 'createTime', sortDirection: 'desc', scene: '', channel: '', title: '', active: undefined })
const form = reactive({ scene: '', channel: '', title: '', content: '', active: 1 })
const placeholderOptions = [
  { key: '{projectName}', label: '项目名称（来自项目主数据）' },
  { key: '{fileName}', label: '文件名称（原始上传文件名）' },
  { key: '{taskId}', label: '解析任务ID' },
  { key: '{projectId}', label: '项目ID' },
  { key: '{fileId}', label: '文件ID' },
  { key: '{status}', label: '任务状态（success/failed）' },
  { key: '{errorMessage}', label: '失败原因（失败场景可用）' },
  { key: '{scene}', label: '通知场景编码' }
]

const rules = {
  scene: [{ required: true, message: '请选择场景', trigger: 'change' }],
  channel: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  active: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const channelMap = computed(() => Object.fromEntries((props.channels || []).map((i) => [i.code, i.label || i.code])))
const sceneMap = computed(() => Object.fromEntries((props.scenes || []).map((i) => [i.code, i.label || i.description || i.code])))

const buildQuery = () => {
  const payload = { pageNum: query.pageNum, pageSize: query.pageSize, sortField: query.sortField, sortDirection: query.sortDirection }
  if (query.scene) payload.scene = query.scene
  if (query.channel) payload.channel = query.channel
  if (query.title) payload.title = query.title
  if (query.active !== undefined && query.active !== null && query.active !== '') payload.active = Number(query.active)
  return payload
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await queryTemplates(buildQuery())
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '查询模板失败')
      rows.value = []
      total.value = 0
      return
    }
    const page = notificationResponse.normalizePage(res)
    rows.value = page.list
    total.value = page.total
  } catch (error) {
    console.error(error)
    rows.value = []
    total.value = 0
    ElMessage.error('查询模板失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { query.pageNum = 1; fetchData() }
const handleReset = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, sortField: 'createTime', sortDirection: 'desc', scene: '', channel: '', title: '', active: undefined })
  fetchData()
}
const openCreate = () => {
  editingId.value = null
  Object.assign(form, { scene: '', channel: '', title: '', content: '', active: 1 })
  dialogVisible.value = true
}
const openEdit = (row) => {
  editingId.value = row.id
  Object.assign(form, { scene: row.scene || '', channel: row.channel || '', title: row.title || '', content: row.content || '', active: Number(row.active) === 1 ? 1 : 0 })
  dialogVisible.value = true
}
const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { scene: form.scene, channel: form.channel, title: form.title || '', content: form.content || '', active: Number(form.active) }
    const res = editingId.value ? await updateTemplate(editingId.value, payload) : await createTemplate(payload)
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '保存失败')
      return
    }
    ElMessage.success(editingId.value ? '更新成功' : '新增成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const insertPlaceholder = (key) => {
  const token = String(key || '').trim()
  if (!token) return
  form.content = `${form.content || ''}${token}`
}
const handleDelete = async (row) => {
  try {
    const res = await deleteTemplate(row.id)
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const buildDefaultTemplates = () => {
  const sceneCodes = (props.scenes || []).map((i) => i.code).filter(Boolean)
  const defaults = []
  if (sceneCodes.includes('PARSE_SUCCESS')) {
    defaults.push(
      {
        scene: 'PARSE_SUCCESS',
        channel: 'EMAIL',
        title: '土地项目解析成功通知',
        content: '项目【{projectName}】文件【{fileName}】已解析完成，请登录系统查看。任务号：{taskId}',
        active: 1
      },
    )
  }
  if (sceneCodes.includes('PARSE_FAILED')) {
    defaults.push(
      {
        scene: 'PARSE_FAILED',
        channel: 'EMAIL',
        title: '土地项目解析失败告警',
        content: '项目【{projectName}】文件【{fileName}】解析失败：{errorMessage}，请及时处理。',
        active: 1
      },
    )
  }
  if (sceneCodes.includes('VALIDATION_ALERT')) {
    defaults.push(
      {
        scene: 'VALIDATION_ALERT',
        channel: 'EMAIL',
        title: '数据校验告警',
        content: '项目【{projectName}】触发数据校验告警：{alertSummary}，请尽快复核。',
        active: 1
      }
    )
  }
  if (sceneCodes.includes('BATCH_UPLOAD_COMPLETE')) {
    defaults.push(
      {
        scene: 'BATCH_UPLOAD_COMPLETE',
        channel: 'IN_SITE',
        title: '批量上传完成',
        content: '项目【{projectName}】批量上传任务已完成，成功 {successCount} 个，失败 {failedCount} 个。',
        active: 1
      }
    )
  }
  return defaults
}

const initDefaultTemplates = async () => {
  const samples = buildDefaultTemplates()
  if (!samples.length) {
    ElMessage.warning('当前没有可初始化的场景模板')
    return
  }
  saving.value = true
  let successCount = 0
  for (const tpl of samples) {
    try {
      const res = await createTemplate(tpl)
      if (notificationResponse.ok(res)) successCount += 1
    } catch (error) {
      console.error('创建示例模板失败:', error)
    }
  }
  saving.value = false
  if (successCount > 0) {
    ElMessage.success(`已创建 ${successCount} 条示例模板`)
    fetchData()
    return
  }
  ElMessage.warning('示例模板创建失败，可能已存在同类模板')
}

defineExpose({ fetchData })
onMounted(fetchData)
</script>

<style scoped>
.panel-card { border-radius: 10px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
.actions { display: inline-flex; gap: 8px; }
.filters { display: grid; grid-template-columns: 1fr 1fr 1.2fr 1fr auto auto; gap: 8px; margin-bottom: 12px; }
.scene-unique-alert { margin-bottom: 10px; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
.placeholder-box { width: 100%; padding: 8px 10px; border: 1px dashed #d4dce8; border-radius: 6px; background: #f8fbff; }
.placeholder-hint { margin-bottom: 8px; color: #475569; font-size: 12px; }
.placeholder-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.placeholder-tag { cursor: pointer; }
.placeholder-desc { font-size: 12px; color: #64748b; line-height: 1.65; }
</style>
