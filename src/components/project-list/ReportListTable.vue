<template>
  <div class="tab-content">
    <el-table
      :data="reportList"
      style="width: 100%"
      stripe
      border
      :header-cell-style="{ background: '#F5F7FA', color: '#333' }"
    >
      <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
      <el-table-column prop="name" label="报告文件名称" min-width="300">
        <template #default="{ row }">
          <div style="display: flex; align-items: center;">
            <el-icon style="margin-right: 8px; font-size: 16px; color: #67C23A;"><Collection /></el-icon>
            <span style="font-weight: 500">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="build" label="对应楼栋" width="150" align="center" />
      <el-table-column prop="version" label="版本号" width="100" align="center">
        <template #default="{ row }">v{{ row.version }}.0</template>
      </el-table-column>
      <el-table-column prop="size" label="文件大小" width="120" align="center" />
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="View" @click="emit('preview', row)">在线查看</el-button>
          <el-button link type="primary" icon="Download" @click="emit('download', row)">下载PDF</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Collection } from '@element-plus/icons-vue'

defineProps({
  reportList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['preview', 'download'])
</script>
