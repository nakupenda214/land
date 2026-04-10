<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="panel-head">
        <span>通知订阅者管理</span>
        <div class="actions">
          <el-button @click="fetchData">刷新</el-button>
          <el-button type="primary" @click="openCreate">新增订阅者</el-button>
        </div>
      </div>
    </template>

    <div class="filters">
      <el-input v-model.trim="query.name" placeholder="订阅名称" clearable @keyup.enter="handleSearch" />
      <el-input v-model.trim="query.recipient" placeholder="接收目标（邮箱地址/站内用户ID）" clearable @keyup.enter="handleSearch" />
      <el-select v-model="query.channel" placeholder="渠道" clearable>
        <el-option v-for="item in channels" :key="item.code" :label="item.label" :value="item.code" />
      </el-select>
      <el-select v-model="query.active" placeholder="状态" clearable>
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column type="index" label="序号" width="70" />
      <el-table-column prop="name" label="订阅名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="recipient" label="接收目标" min-width="200" show-overflow-tooltip />
      <el-table-column prop="channel" label="渠道" width="120" align="center">
        <template #default="{ row }">{{ channelMap[row.channel] || row.channel || '-' }}</template>
      </el-table-column>
      <el-table-column prop="subscribedScenes" label="订阅场景" min-width="240">
        <template #default="{ row }">
          <el-tag v-for="scene in (row.subscribedScenes || [])" :key="scene" size="small" class="tag-gap">
            {{ sceneMap[scene] || scene }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="active" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="Number(row.active) === 1 ? 'success' : 'info'">{{ Number(row.active) === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该订阅者吗？" @confirm="handleDelete(row)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑订阅者' : '新增订阅者'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="订阅名称" prop="name">
          <el-input v-model.trim="form.name" maxlength="128" />
        </el-form-item>
        <el-form-item :label="recipientLabel" prop="recipient">
          <el-input v-model.trim="form.recipient" maxlength="128" :placeholder="recipientPlaceholder" />
        </el-form-item>
        <el-form-item label="通知渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道">
            <el-option v-for="item in channels" :key="item.code" :label="item.label" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="订阅场景" prop="subscribedScenes">
          <el-select v-model="form.subscribedScenes" multiple collapse-tags placeholder="请选择订阅场景">
            <el-option v-for="item in scenes" :key="item.code" :label="item.label || item.description || item.code" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="active">
          <el-radio-group v-model="form.active">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
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
  createSubscriber,
  deleteSubscriber,
  notificationResponse,
  querySubscribers,
  updateSubscriber
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

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortDirection: 'desc',
  name: '',
  recipient: '',
  channel: '',
  active: undefined
})

const emptyForm = () => ({
  name: '',
  recipient: '',
  channel: '',
  subscribedScenes: [],
  active: 1
})
const form = reactive(emptyForm())

const rules = {
  recipient: [{ required: true, message: '请输入接收目标', trigger: 'blur' }],
  channel: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  subscribedScenes: [{ type: 'array', required: true, min: 1, message: '至少选择一个订阅场景', trigger: 'change' }],
  active: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const channelMap = computed(() => Object.fromEntries((props.channels || []).map((i) => [i.code, i.label || i.code])))
const sceneMap = computed(() => Object.fromEntries((props.scenes || []).map((i) => [i.code, i.label || i.description || i.code])))
const recipientLabel = computed(() => {
  if (form.channel === 'EMAIL') return '邮箱地址'
  if (form.channel === 'IN_SITE') return '站内接收用户ID'
  return '接收目标'
})
const recipientPlaceholder = computed(() => {
  if (form.channel === 'EMAIL') return '示例：user@example.com'
  if (form.channel === 'IN_SITE') return '示例：1001（系统用户ID）'
  return '请先选择通知渠道'
})

const buildQuery = () => {
  const payload = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    sortField: query.sortField,
    sortDirection: query.sortDirection
  }
  if (query.name) payload.name = query.name
  if (query.recipient) payload.recipient = query.recipient
  if (query.channel) payload.channel = query.channel
  if (query.active !== undefined && query.active !== null && query.active !== '') payload.active = Number(query.active)
  return payload
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await querySubscribers(buildQuery())
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '查询订阅者失败')
      rows.value = []
      total.value = 0
      return
    }
    const page = notificationResponse.normalizePage(res)
    rows.value = page.list
    total.value = page.total
  } catch (error) {
    console.error('查询订阅者失败:', error)
    rows.value = []
    total.value = 0
    ElMessage.error('查询订阅者失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNum = 1
  fetchData()
}

const handleReset = () => {
  query.pageNum = 1
  query.pageSize = 10
  query.name = ''
  query.recipient = ''
  query.channel = ''
  query.active = undefined
  fetchData()
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

const openEdit = (row) => {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name || '',
    recipient: row.recipient || '',
    channel: row.channel || '',
    subscribedScenes: Array.isArray(row.subscribedScenes) ? row.subscribedScenes : [],
    active: Number(row.active) === 1 ? 1 : 0
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      name: form.name || '',
      recipient: form.recipient,
      channel: form.channel,
      subscribedScenes: form.subscribedScenes,
      active: Number(form.active)
    }
    const res = editingId.value ? await updateSubscriber(editingId.value, payload) : await createSubscriber(payload)
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '保存失败')
      return
    }
    ElMessage.success(editingId.value ? '更新成功' : '新增成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('保存订阅者失败:', error)
    ElMessage.error('保存失败，请检查输入')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    const res = await deleteSubscriber(row.id)
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    console.error('删除订阅者失败:', error)
    ElMessage.error('删除失败')
  }
}

defineExpose({ fetchData })

onMounted(fetchData)
</script>

<style scoped>
.panel-card { border-radius: 10px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
.actions { display: inline-flex; gap: 8px; }
.filters { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr 1fr auto auto; gap: 8px; margin-bottom: 12px; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
.tag-gap { margin: 2px 6px 2px 0; }
</style>
