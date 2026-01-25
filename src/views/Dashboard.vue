<template>
  <div class="dashboard-container">
    
    <div class="search-header-card">
      <div class="welcome-text">
        <h2><el-icon><DataBoard /></el-icon> 年度项目索引</h2>
        <p>请选择年份以查看当年的测绘项目列表</p>
      </div>
      <div class="filter-area">
        <span class="label">选择归档年份：</span>
        <el-select 
          v-model="selectedYear" 
          placeholder="全部年份" 
          size="large" 
          style="width: 160px" 
          clearable 
          @change="handleYearChange"
        >
          <el-option label="全部年份" value="" />
          <el-option 
            v-for="year in yearOptions" 
            :key="year" 
            :label="year + ' 年度'" 
            :value="year" 
          />
        </el-select>
      </div>
    </div>

    <div class="content-area">
      <el-card class="project-list-card" shadow="never" v-loading="loading">
        <template #header>
          <div class="card-header">
            <span class="title">
              {{ selectedYear ? selectedYear + ' 年度' : '历年所有' }}测绘项目清单
            </span>
            <el-tag type="info" effect="plain">共 {{ currentProjectList.length }} 个项目</el-tag>
          </div>
        </template>
        
        <el-empty v-if="currentProjectList.length === 0 && !loading" description="暂无项目数据" />
        
        <el-table v-else :data="currentProjectList" border stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column prop="projectName" label="项目名称" min-width="200">
            <template #default="{ row }">
              <span style="font-weight: bold; color: #333">{{ row.projectName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="projectCode" label="项目内部编号" width="180">
             <template #default="{ row }">{{ row.projectCode || '-' }}</template>
          </el-table-column>
          <el-table-column prop="projectTime" label="项目时间" width="150" align="center" />
          <el-table-column prop="createTime" label="创建时间" width="180" align="center">
             <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button type="primary" round icon="Right" @click="enterProject(row)">进入项目档案</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DataBoard, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const selectedYear = ref('') // 默认为空，表示“全部”
const loading = ref(false)
const allProjectsDatabase = ref([]) // 存储从后端拿到的原始数据

// 1. 获取后端数据
const fetchProjects = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/project/list')
    if (res.data.code === 200) {
      allProjectsDatabase.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取项目列表失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('无法连接到服务器')
  } finally {
    loading.value = false
  }
}

// 2. 动态计算所有可用的年份 (从 projectTime 中提取)
// 假设 projectTime 格式如 "2025年11月"
const yearOptions = computed(() => {
  const years = new Set()
  allProjectsDatabase.value.forEach(p => {
    if (p.projectTime) {
      // 提取前4位作为年份
      const y = p.projectTime.substring(0, 4)
      if (!isNaN(y)) {
        years.add(y)
      }
    }
  })
  // 转为数组并降序排列 (2026, 2025...)
  return Array.from(years).sort().reverse()
})

// 3. 根据所选年份筛选项目
const currentProjectList = computed(() => {
  if (!selectedYear.value) {
    return allProjectsDatabase.value
  }
  return allProjectsDatabase.value.filter(p => {
    return p.projectTime && p.projectTime.startsWith(selectedYear.value)
  })
})

const handleYearChange = () => {
  if (selectedYear.value) {
    ElMessage.success(`已切换至 ${selectedYear.value} 年度数据`)
  } else {
    ElMessage.info('已显示所有年份数据')
  }
}

// 进入详情
const enterProject = (row) => {
  // 提取年份，如果没有就默认为 '2026'
  const year = row.projectTime ? row.projectTime.substring(0, 4) : '2026'
  
  router.push({ 
    path: '/projects', 
    query: { 
      year: year,
      projectId: String(row.id) // 确保传的是字符串
    } 
  }) 
  ElMessage.info(`正在打开：${row.projectName}`)
}

// 工具函数：格式化时间 (去掉T后面的毫秒等)
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').split('.')[0]
}

// 页面加载时自动拉取
onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.dashboard-container { padding: 20px; background-color: #f5f7fa; min-height: 90vh; }
.search-header-card { background: white; padding: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.welcome-text h2 { margin: 0 0 8px 0; color: #303133; font-size: 22px; display: flex; align-items: center; gap: 8px; }
.filter-area { display: flex; align-items: center; gap: 15px; }
.project-list-card { border-radius: 12px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>