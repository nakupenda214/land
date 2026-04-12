<template>
  <el-card class="user-card">
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索用户名（模糊）"
        clearable
        style="width: 220px; margin-right: 10px"
        @keyup.enter="loadList"
      />
      <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
      <el-button :icon="Refresh" @click="loadList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="realName" label="姓名" width="120" />
      <el-table-column label="权限类型" width="130">
        <template #default="{ row }">
          <el-tag :type="tagType(row.userType)" size="small">{{ userTypeLabel(row.userType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机" width="130" />
      <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isActive === 1"
            :disabled="togglingId === row.id"
            @change="(v) => onToggleActive(row, v)"
          />
        </template>
      </el-table-column>
      <el-table-column label="最后登录" width="170">
        <template #default="{ row }">
          {{ formatTime(row.lastLogin) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadList"
        @size-change="loadList"
      />
    </div>

    <p class="hint">
      权限说明：<strong>超级管理员</strong>、<strong>管理员</strong>、<strong>开发人员</strong>、<strong>普通用户</strong>（自助注册默认）。提升权限请通过接口
      <code>/user/create</code> 或由库内更新 <code>user_type</code>。
    </p>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import axios from 'axios'
import { userTypeLabel } from '@/constants/userTypes'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const togglingId = ref(null)

function tagType(userType) {
  if (userType === 'SUPER_ADMIN') return 'danger'
  if (userType === 'ADMIN') return 'warning'
  if (userType === 'DEVELOPER') return 'success'
  return 'info'
}

function formatTime(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') return v.replace('T', ' ').slice(0, 19)
  return String(v)
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    const k = keyword.value.trim()
    if (k) params.username = k
    const { data } = await axios.get('/api/user/list', { params })
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '加载失败')
      return
    }
    rows.value = Array.isArray(data.data) ? data.data : []
    total.value = typeof data.total === 'number' ? data.total : 0
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function onToggleActive(row, active) {
  togglingId.value = row.id
  try {
    const url = active ? `/api/user/enable/${row.id}` : `/api/user/disable/${row.id}`
    const { data } = await axios.put(url)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '操作失败')
      return
    }
    row.isActive = active ? 1 : 0
    ElMessage.success(data.msg || '已更新')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '操作失败')
  } finally {
    togglingId.value = null
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」？`, '确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    const { data } = await axios.delete(`/api/user/delete/${row.id}`)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '删除失败')
      return
    }
    ElMessage.success(data.msg || '已删除')
    loadList()
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '删除失败')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.user-card {
  border-radius: 12px;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.hint {
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.hint code {
  font-size: 11px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
