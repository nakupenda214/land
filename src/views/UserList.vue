<template>
  <el-card class="user-card">
    <div class="toolbar">
      <el-input v-model="search" placeholder="搜索姓名/工号" prefix-icon="Search" style="width: 200px; margin-right: 10px;" />
      <el-button type="primary" icon="Plus" color="#A0C4FF" style="color: white">新增用户</el-button>
    </div>

    <el-table :data="userList" stripe style="width: 100%">
      <el-table-column prop="id" label="工号" width="100" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="role" label="角色">
        <template #default="{ row }">
          <el-tag :type="row.role === 'Admin' ? 'danger' : ''">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态">
         <template #default="{ row }">
           <el-switch v-model="row.status" active-color="#13ce66" inactive-color="#ff4949" />
         </template>
      </el-table-column>
      <el-table-column prop="lastLogin" label="最后登录时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default>
          <el-button link type="primary" size="small">编辑</el-button>
          <el-button link type="warning" size="small">重置密码</el-button>
          <el-button link type="danger" size="small">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'

const search = ref('')
const userList = ref([
  { id: '1001', name: '管理员', role: 'Admin', status: true, lastLogin: '2026-01-15 09:30' },
  { id: '1002', name: '张三', role: '操作员', status: true, lastLogin: '2026-01-14 17:20' },
  { id: '1003', name: '李四', role: '操作员', status: false, lastLogin: '2025-12-30 10:00' },
  { id: '1004', name: '王五', role: '审核员', status: true, lastLogin: '2026-01-15 08:45' },
])
</script>

<style scoped>
.user-card { border-radius: 12px; }
.toolbar { margin-bottom: 20px; display: flex; }
</style>