<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="panel-head">
        <span>发送记录管理</span>
        <el-button @click="fetchData">刷新</el-button>
      </div>
    </template>

    <div class="filters">
      <el-select v-model="query.scene" placeholder="场景" clearable>
        <el-option v-for="item in scenes" :key="item.code" :label="item.label || item.description || item.code" :value="item.code" />
      </el-select>
      <el-select v-model="query.channel" placeholder="渠道" clearable>
        <el-option v-for="item in channels" :key="item.code" :label="item.label" :value="item.code" />
      </el-select>
      <el-input v-model.trim="query.recipient" placeholder="接收人" clearable @keyup.enter="handleSearch" />
      <el-select v-model="query.status" placeholder="发送状态" clearable>
        <el-option label="SUCCESS" value="SUCCESS" />
        <el-option label="FAILED" value="FAILED" />
        <el-option label="PENDING" value="PENDING" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column type="index" label="序号" width="70" />
      <el-table-column prop="scene" label="通知场景" width="180">
        <template #default="{ row }">{{ sceneMap[row.scene] || row.scene || '-' }}</template>
      </el-table-column>
      <el-table-column prop="channel" label="渠道" width="110" align="center">
        <template #default="{ row }">{{ channelMap[row.channel] || row.channel || '-' }}</template>
      </el-table-column>
      <el-table-column prop="recipient" label="接收人" min-width="180" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100" align="center" />
      <el-table-column prop="sendTime" label="发送时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.sendTime || row.createTime) }}</template>
      </el-table-column>
      <el-table-column prop="content" label="发送内容" min-width="280" show-overflow-tooltip />
      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-popconfirm title="确认删除该记录吗？" @confirm="handleDelete(row)">
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
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  deleteNotificationLog,
  notificationResponse,
  queryNotificationLogs
} from '@/services/notification-management.service'

const props = defineProps({
  channels: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] }
})

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 10, sortField: 'createTime', sortDirection: 'desc', scene: '', channel: '', recipient: '', status: '' })

const channelMap = computed(() => Object.fromEntries((props.channels || []).map((i) => [i.code, i.label || i.code])))
const sceneMap = computed(() => Object.fromEntries((props.scenes || []).map((i) => [i.code, i.label || i.description || i.code])))

const formatDateTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-')

const buildQuery = () => {
  const payload = { pageNum: query.pageNum, pageSize: query.pageSize, sortField: query.sortField, sortDirection: query.sortDirection }
  if (query.scene) payload.scene = query.scene
  if (query.channel) payload.channel = query.channel
  if (query.recipient) payload.recipient = query.recipient
  if (query.status) payload.status = query.status
  return payload
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await queryNotificationLogs(buildQuery())
    if (!notificationResponse.ok(res)) {
      ElMessage.warning(res?.data?.msg || '查询发送记录失败')
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
    ElMessage.error('查询发送记录失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { query.pageNum = 1; fetchData() }
const handleReset = () => {
  Object.assign(query, { pageNum: 1, pageSize: 10, sortField: 'createTime', sortDirection: 'desc', scene: '', channel: '', recipient: '', status: '' })
  fetchData()
}

const handleDelete = async (row) => {
  try {
    const res = await deleteNotificationLog(row.id)
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

defineExpose({ fetchData })
onMounted(fetchData)
</script>

<style scoped>
.panel-card { border-radius: 10px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
.filters { display: grid; grid-template-columns: 1fr 1fr 1.2fr 1fr auto auto; gap: 8px; margin-bottom: 12px; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
