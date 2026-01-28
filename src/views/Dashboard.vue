<template>
  <div class="dashboard-container">
    <!-- 搜索头部：新增多条件搜索表单 -->
    <div class="search-header-card">
      <div class="welcome-text">
        <h2><el-icon><DataBoard /></el-icon> 年度项目索引</h2>
        <p>多条件查询测绘项目列表</p>
      </div>

      <!-- 新增：多条件搜索表单 -->
      <div class="search-form">
        <el-form :model="searchForm" inline @submit.prevent="handleSearch">
          <el-form-item label="项目ID">
            <el-input 
              v-model="searchForm.projectId" 
              placeholder="请输入项目ID" 
              style="width: 120px"
              clearable
              type="number"
            />
          </el-form-item>
          <el-form-item label="项目名称">
            <el-input 
              v-model="searchForm.projectName" 
              placeholder="模糊查询项目名称" 
              style="width: 200px"
              clearable
            />
          </el-form-item>
          <el-form-item label="项目编号">
            <el-input 
              v-model="searchForm.projectCode" 
              placeholder="模糊查询项目编号" 
              style="width: 180px"
              clearable
            />
          </el-form-item>
          <el-form-item label="项目位置">
            <el-input 
              v-model="searchForm.location" 
              placeholder="模糊查询项目位置" 
              style="width: 180px"
              clearable
            />
          </el-form-item>
          <el-form-item label="规划用途">
            <el-input 
              v-model="searchForm.plannedUse" 
              placeholder="模糊查询规划用途" 
              style="width: 150px"
              clearable
            />
          </el-form-item>

          <!-- 新增：时间查询类型选择 -->
          <el-form-item label="时间查询类型">
            <el-select 
              v-model="searchForm.queryTimeType" 
              placeholder="选择类型" 
              style="width: 120px"
            >
              <el-option label="按年份" value="year" />
              <el-option label="按年月" value="month" />
            </el-select>
          </el-form-item>

          <!-- 动态切换：年份/年月选择器 -->
          <el-form-item label="项目时间">
            <!-- 年份选择器 -->
            <template v-if="searchForm.queryTimeType === 'year'">
              <el-date-picker
                v-model="searchForm.projectTimeYear"
                type="year"
                placeholder="选择年份"
                format="YYYY"
                value-format="YYYY"
                style="width: 120px"
                clearable
              />
            </template>
            <!-- 年月选择器（保留原逻辑） -->
            <template v-else>
              <el-date-picker
                v-model="searchForm.projectTimeMonth"
                type="month"
                placeholder="选择年月"
                format="YYYY.MM"
                value-format="YYYY.MM"
                style="width: 150px"
                clearable
              />
            </template>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleSearch">查询</el-button>
            <el-button icon="Refresh" @click="resetSearchForm" style="margin-left: 2 0px;">重置</el-button>
            <el-button icon="Refresh" @click="handleRefresh" style="margin-left: 100px;">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="content-area">
      <el-card class="project-list-card" shadow="never" v-loading="loading">
        <template #header>
          <div class="card-header">
            <span class="title">测绘项目清单</span>
            <el-tag type="info" effect="plain">共 {{ total }} 个项目</el-tag>
          </div>
        </template>
        
        <el-empty v-if="currentProjectList.length === 0 && !loading" description="暂无项目数据" />
        
        <!-- 项目列表表格：ID升序排列 -->
        <el-table v-else :data="currentProjectList" border stripe style="width: 100%">
          <!-- <el-table-column prop="id" label="ID" width="80" align="center"  /> -->
          <el-table-column label="ID" type="index" :index="index => index + 1" width="80" align="center" />
          <el-table-column prop="projectName" label="项目名称" min-width="200">
            <template #default="{ row }">
              <span style="font-weight: bold; color: #333">{{ row.projectName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="projectCode" label="项目内部编号" width="200">
             <template #default="{ row }">{{ row.projectCode || '-' }}</template>
          </el-table-column>
          <el-table-column prop="projectTime" label="项目时间" width="200" align="center" />
          <el-table-column prop="createTime" label="创建时间" width="200" align="center">
             <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button type="primary" round icon="Right" @click="enterProject(row)">进入项目档案</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页组件 -->
        <div class="pagination-container" v-if="total > 0">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DataBoard, Right, Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

// ========== 1. 分页相关变量 ==========
const pageNum = ref(1)        // 当前页码（从1开始）
const pageSize = ref(20)      // 每页条数
const total = ref(0)          // 总项目数
const loading = ref(false)    // 加载状态

// ========== 2. 搜索条件：新增时间查询类型 + 年份/年月字段 ==========
const searchForm = reactive({
  projectId: '',        // 项目ID（精确）
  projectName: '',      // 项目名称（模糊）
  projectCode: '',      // 项目编号（模糊）
  location: '',         // 项目位置（模糊）
  plannedUse: '',       // 规划用途（模糊）
  queryTimeType: 'year',// 时间查询类型：year（年份）/month（年月）
  projectTimeYear: '',  // 年份选择值（如2025）
  projectTimeMonth: ''  // 年月选择值（如2025.11）
})

// ========== 3. 项目列表数据 ==========
const currentProjectList = ref([])

// ========== 4. 核心：请求项目列表（调整排序为ID升序） ==========
const fetchProjects = async () => {
  loading.value = true
  try {
    // 处理项目时间参数（兼容后端xxxx.xx格式）
    let projectTime = ''
    if (searchForm.queryTimeType === 'year' && searchForm.projectTimeYear) {
      // 年份转成：2025 → 2025.00
      projectTime = `${searchForm.projectTimeYear}`
    } else if (searchForm.queryTimeType === 'month' && searchForm.projectTimeMonth) {
      // 年月直接用选择的值（如2025.11）
      projectTime = searchForm.projectTimeMonth
    }

    // 构造接口请求参数
    const requestData = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      sortField: 'id',          // 改为按ID排序
      sortDirection: 'asc',     // 改为升序（从小到大）
      // 只传递非空的查询条件
      ...(searchForm.projectId && { projectId: Number(searchForm.projectId) }),
      ...(searchForm.projectName && { projectName: searchForm.projectName }),
      ...(searchForm.projectCode && { projectCode: searchForm.projectCode }),
      ...(searchForm.location && { location: searchForm.location }),
      ...(searchForm.plannedUse && { plannedUse: searchForm.plannedUse }),
      ...(projectTime && { projectTime }) // 传递处理后的项目时间
    }

    // 调用POST接口
    const res = await axios.post('/api/project/projects/query', requestData)
    if (res.data.code === 200) {
      currentProjectList.value = res.data.data.records || []  // 分页数据在records里
      total.value = res.data.data.total || 0                 // 总条数
    } else {
      ElMessage.error(res.data.msg || '获取项目列表失败')
    }
  } catch (error) {
    console.error('请求失败：', error)
    ElMessage.error('无法连接到服务器，请重试')
  } finally {
    loading.value = false
  }
}

// ========== 1. 刷新功能（添加成功提示） ==========
const handleRefresh = async () => {
  loading.value = true
  try {
    await fetchProjects() // 等待请求完成
    ElMessage.success('数据刷新成功！') // 刷新成功提示
  } catch (error) {
    ElMessage.error('数据刷新失败，请重试！')
  } finally {
    loading.value = false
  }
}

// ========== 2. 查询功能（补充成功提示） ==========
const handleSearch = async () => {
  pageNum.value = 1
  loading.value = true
  try {
    await fetchProjects()
    ElMessage.success(`查询成功！共找到 ${total.value} 条项目数据`)
  } catch (error) {
    ElMessage.error('查询失败，请重试！')
  } finally {
    loading.value = false
  }
}

// ========== 3. 重置功能（优化提示） ==========
const resetSearchForm = async () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  searchForm.queryTimeType = 'year'
  pageNum.value = 1
  loading.value = true
  try {
    await fetchProjects()
    ElMessage.success('查询条件已重置，数据已刷新！')
  } catch (error) {
    ElMessage.error('重置失败，请重试！')
  } finally {
    loading.value = false
  }
}



// 每页条数改变
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  fetchProjects()
}

// 当前页码改变
const handleCurrentChange = (newPage) => {
  pageNum.value = newPage
  fetchProjects()
}

// ========== 6. 原有功能保留：进入项目详情 ==========
const enterProject = (row) => {
  // 提取年份（兼容年份/年月格式）
  const year = row.projectTime ? row.projectTime.substring(0, 4) : '2026'
  
  router.push({ 
    path: '/projects', 
    query: { 
      year: year,
      projectId: String(row.id)
    } 
  }) 
  ElMessage.info(`正在打开：${row.projectName}`)
}

// ========== 7. 工具函数：格式化时间 ==========
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').split('.')[0]
}

// ========== 8. 页面加载时初始化 ==========
onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.dashboard-container { padding: 20px; background-color: #f5f7fa; min-height: 90vh; }

/* 搜索头部：适配多条件表单 */
.search-header-card { 
  background: white; 
  padding: 20px 30px; 
  border-radius: 12px; 
  margin-bottom: 20px; 
}
.welcome-text h2 { 
  margin: 0 0 8px 0; 
  color: #303133; 
  font-size: 22px; 
  display: flex; 
  align-items: center; 
  gap: 8px; 
}
.welcome-text p { margin: 0; color: #606266; }
.search-form { margin-top: 15px; }

/* 项目列表卡片 */
.project-list-card { border-radius: 12px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

/* 分页容器 */
.pagination-container { 
  margin-top: 20px; 
  text-align: right; 
}


</style>