<template>
  <div class="dashboard-container">
    
    <div class="search-header-card">
      <div class="welcome-text">
        <h2><el-icon><DataBoard /></el-icon> 年度项目索引</h2>
        <p>请选择年份以查看当年的测绘项目列表</p>
      </div>
      <div class="filter-area">
        <span class="label">选择归档年份：</span>
        <el-select v-model="selectedYear" placeholder="请选择年份" size="large" style="width: 160px" @change="handleYearChange">
          <el-option label="2026 年度" value="2026" />
          <el-option label="2025 年度" value="2025" />
          <el-option label="2024 年度" value="2024" />
        </el-select>
      </div>
    </div>

    <div class="content-area">
      <el-empty v-if="!selectedYear" description="请先在右上方选择一个年份" image-size="200" />
      <el-card v-else class="project-list-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title">{{ selectedYear }} 年度测绘项目清单</span>
            <el-tag type="info" effect="plain">共 {{ currentProjectList.length }} 个项目</el-tag>
          </div>
        </template>
        <el-table :data="currentProjectList" border stripe style="width: 100%">
          <el-table-column prop="id" label="序号" width="80" align="center" />
          <el-table-column prop="name" label="项目名称" min-width="200">
            <template #default="{ row }"><span style="font-weight: bold; color: #333">{{ row.name }}</span></template>
          </el-table-column>
          <el-table-column prop="code" label="项目内部编号" width="180" />
          <el-table-column prop="developer" label="开发建设单位" width="250" show-overflow-tooltip />
          <el-table-column prop="status" label="归档状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === '已归档' ? 'success' : 'warning'" effect="dark">{{ row.status }}</el-tag>
            </template>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DataBoard, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const selectedYear = ref('2026') // 默认值

const allProjectsDatabase = [
  { id: '1', year: '2026', name: '锦园雅境府（2026新）', code: 'XM-2026-001', developer: '长沙中建地产有限公司', status: '进行中' },
  { id: '2', year: '2025', name: '滨江壹号院二期', code: 'XM-2025-088', developer: '滨江置业集团', status: '已归档' },
  { id: '3', year: '2025', name: '梅溪湖国际研发中心', code: 'XM-2025-042', developer: '梅溪湖投资发展有限公司', status: '已归档' },
  { id: '4', year: '2024', name: '高铁新城·未来之光', code: 'XM-2024-112', developer: '高铁新城建设局', status: '已归档' }
]

const currentProjectList = computed(() => {
  return allProjectsDatabase.filter(p => p.year === selectedYear.value)
})

const handleYearChange = () => {
  ElMessage.success(`已切换至 ${selectedYear.value} 年度数据`)
}

// 【关键修改】跳转时带上年份和ID，供ProjectList页面自动回填
const enterProject = (row) => {
  router.push({ 
    path: '/projects', 
    query: { 
      year: row.year,
      projectId: row.id 
    } 
  }) 
  ElMessage.info(`正在打开：${row.name}`)
}
</script>

<style scoped>
/* 样式保持不变，略 */
.dashboard-container { padding: 20px; background-color: #f5f7fa; min-height: 90vh; }
.search-header-card { background: white; padding: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.welcome-text h2 { margin: 0 0 8px 0; color: #303133; font-size: 22px; display: flex; align-items: center; gap: 8px; }
.filter-area { display: flex; align-items: center; gap: 15px; }
.project-list-card { border-radius: 12px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>