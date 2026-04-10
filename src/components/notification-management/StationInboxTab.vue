<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="panel-head">
        <span>站内信收件箱（未读）</span>
        <div class="actions">
          <el-button :loading="loadingProjects" @click="loadProjects">刷新项目</el-button>
          <el-button :loading="loading" @click="fetchMessages">刷新消息</el-button>
          <el-button type="primary" plain :disabled="!rows.length" :loading="marking" @click="markAllRead">全部标为已读</el-button>
        </div>
      </div>
    </template>

    <div class="filters">
      <el-select v-model="selectedProjectIds" multiple collapse-tags collapse-tags-tooltip placeholder="选择项目（可多选）" style="width: 420px">
        <el-option v-for="item in projectOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="fetchMessages">查询未读</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column type="index" label="序号" width="70" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="scene" label="场景" width="180">
        <template #default="{ row }">{{ sceneMap[row.scene] || row.scene || '-' }}</template>
      </el-table-column>
      <el-table-column prop="projectId" label="项目ID" width="100" align="center" />
      <el-table-column prop="content" label="内容" min-width="360" show-overflow-tooltip />
      <el-table-column prop="sentAt" label="发送时间" width="180">
        <template #default="{ row }">{{ formatTime(row.sentAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="markSingleRead(row)">标记已读</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjectList } from '@/services/project.service'
import { fetchUnreadStationNotifications, markStationNotificationsRead } from '@/services/station-notification.service'

const props = defineProps({
  scenes: { type: Array, default: () => [] }
})

const loadingProjects = ref(false)
const loading = ref(false)
const marking = ref(false)
const rows = ref([])
const projectOptions = ref([])
const selectedProjectIds = ref([])

const sceneMap = computed(() => Object.fromEntries((props.scenes || []).map((s) => [s.code, s.label || s.description || s.code])))

const formatTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-')

const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const res = await getProjectList()
    if (res?.data?.code !== 200) {
      ElMessage.warning(res?.data?.msg || '项目列表加载失败')
      return
    }
    const list = Array.isArray(res?.data?.data) ? res.data.data : []
    projectOptions.value = list.map((p) => ({ id: String(p.id), name: p.projectName || p.name || `项目${p.id}` }))
    if (!selectedProjectIds.value.length) {
      selectedProjectIds.value = projectOptions.value.map((p) => p.id)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('项目列表加载失败')
  } finally {
    loadingProjects.value = false
  }
}

const fetchMessages = async () => {
  if (!selectedProjectIds.value.length) {
    ElMessage.warning('请先选择项目')
    return
  }
  loading.value = true
  try {
    const res = await fetchUnreadStationNotifications(selectedProjectIds.value)
    if (res?.data?.code !== 200) {
      rows.value = []
      ElMessage.warning(res?.data?.msg || '站内信未读查询失败')
      return
    }
    rows.value = Array.isArray(res?.data?.data) ? res.data.data : []
  } catch (error) {
    console.error(error)
    rows.value = []
    ElMessage.error('站内信未读查询失败')
  } finally {
    loading.value = false
  }
}

const markSingleRead = async (row) => {
  const id = String(row?.id || '').trim()
  if (!id) return
  marking.value = true
  try {
    const res = await markStationNotificationsRead([id])
    if (res?.data?.code !== 200) {
      ElMessage.warning(res?.data?.msg || '标记已读失败')
      return
    }
    rows.value = rows.value.filter((item) => String(item.id) !== id)
    ElMessage.success('已标记为已读')
  } catch (error) {
    console.error(error)
    ElMessage.error('标记已读失败')
  } finally {
    marking.value = false
  }
}

const markAllRead = async () => {
  const ids = rows.value.map((row) => String(row.id)).filter(Boolean)
  if (!ids.length) return
  marking.value = true
  try {
    const res = await markStationNotificationsRead(ids)
    if (res?.data?.code !== 200) {
      ElMessage.warning(res?.data?.msg || '全部标记已读失败')
      return
    }
    rows.value = []
    ElMessage.success('全部消息已标记为已读')
  } catch (error) {
    console.error(error)
    ElMessage.error('全部标记已读失败')
  } finally {
    marking.value = false
  }
}

onMounted(async () => {
  await loadProjects()
  await fetchMessages()
})
</script>

<style scoped>
.panel-card { border-radius: 10px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
.actions { display: inline-flex; gap: 8px; }
.filters { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
</style>
