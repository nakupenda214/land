
<template>
  <div class="macaron-container">
    
    <div class="action-header">
      <div class="project-info">
        <span class="sub-title">当前作业项目</span>
        <div class="project-selector-wrapper">
          <el-select 
              v-model="currentProject" 
              size="large" 
              class="macaron-select" 
              style="width: 260px;" 
              placeholder="请输入关键词搜索项目" 
              filterable 
              clearable
              no-match-text="未找到相关项目"
            >
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
                      
          <el-button 
            type="primary" 
            size="large" 
            style="margin-left: 15px; font-weight: bold;" 
            @click="showCreateProject = true"
          >
            <el-icon style="font-size: 16px; margin-right: 6px;"><Plus /></el-icon>
            新建项目
          </el-button>
        </div>
      </div>

      <div class="action-buttons">
         <el-button 
            color="#A0C4FF" 
            size="large" 
            :icon="Upload" 
            round 
            :disabled="!currentProject" 
            @click="openUploadDialog"
            class="upload-btn-main"
         >
            + 批量上传文件
         </el-button>
      </div>
    </div>

    <el-card class="task-card" shadow="never" v-loading="tableLoading">
      <el-empty v-if="!currentProject" description="请先在左上角选择或新建一个项目" />
      
      <div >
    
        <div style="margin-bottom: 15px; display: flex; gap: 10px;">
            <el-button 
            type="danger" 
            icon="Delete" 
            @click="batchDelete" 
            :disabled="selectedRows.length === 0"
            :loading="batchLoading"
          >
            批量删除
          </el-button>
          <el-button 
            type="primary" 
            icon="Search" 
            @click="batchParse" 
            :disabled="!canBatchParse"
            :loading="batchLoading"
          >
            批量解析
          </el-button>
        </div>
        <div style="display: flex; gap: 20px;margin-bottom: 20px; align-items: center">
          <el-select 
            v-model="filterStatus" 
            placeholder="筛选状态" 
            clearable 
            style="width: 140px" 
            @change="refreshData"
          >
            <el-option label="解析失败" value="PARSE_FAIL" />
            <el-option label="解析中" value="PARSING" />
            <el-option label="待解析" value="WAITING_PARSE" />
            <el-option label="解析完成" value="PARSE_COMPLETE" />
            <el-option label="待审核" value="UNPARSEABLE" />
          </el-select>
        </div>
      

        <el-table 
        
        :data="fileTableData" 
        style="width: 100%" 
        class="custom-table"
        :header-cell-style="{background:'#F5F7FA', color:'#606266', height: '50px'}"
        :row-class-name="() => 'no-hover-highlight'"
        @selection-change="handleSelectionChange"
        highlight-current-row="false"
      > 
        <el-table-column type="selection" width="120" align="center" />
        <el-table-column label="预览" width="120" align="center">
          <template #default="{ row }">
            <el-image 
              style="width: 200px; height: 60px; border-radius: 6px; border: 1px solid #e4e7ed;z-index: 9999;"
              :src="row.thumbnailUrl" 
              :preview-src-list="[row.thumbnailUrl]"
              fit="cover"
              preview-z-index="99999"
            >
              <template #error>
                <div class="image-slot" style="display:flex; justify-content:center; align-items:center; height:100%; color:#909399;">
                  <el-icon><Picture/></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="文件名/编号" min-width="200">
           <template #default="{ row }">
             <div class="file-name-cell">
               <span style="font-weight: 600; font-size: 15px; color: #303133;">{{ row.name }}</span>
               <span v-if="row.phase" style="font-size: 12px; color: #999; margin-top: 4px;">第 {{ row.phase }} 期</span>
             </div>
           </template>
        </el-table-column>
        
        <el-table-column prop="type" label="文件类型" width="400">
           <template #default="{ row }">
             <el-tag :color="row.type === 'contract' ? '#FFF0F0' : '#F0F9EB'" 
                     :style="{ color: row.type === 'contract' ? '#F56C6C' : '#67C23A', border: '1px solid ' + (row.type === 'contract' ? '#FAB6B6' : '#b3e19d') }"
                     effect="light">
               {{ row.type === 'contract' ? '合同文件' : '实测报告' }}
             </el-tag>
           </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="400">
          <template #default="{ row }">
            <div class="status-badge">
               <el-tooltip 
                 v-if="row.status === 'PARSE_FAIL'" 
                 :content="row.errorMessage || '解析发生未知错误'" 
                 placement="top"
               >
                 <div style="display:flex; align-items:center; cursor:pointer;">
                   <span class="dot" :style="{ background: statusMap[row.status]?.color }"></span>
                   <span :style="{ color: statusMap[row.status]?.color, fontWeight: 'bold' }">{{ statusMap[row.status]?.text }}</span>
                   <el-icon style="margin-left:4px; color:#F56C6C"><Warning /></el-icon>
                 </div>
               </el-tooltip>

               <div v-else style="display:flex; align-items:center;">
                 <span class="dot" :style="{ background: statusMap[row.status]?.color || '#909399' }"></span>
                 <span :style="{ color: statusMap[row.status]?.color || '#606266' }">
                   {{ statusMap[row.status]?.text || '未知状态' }}
                 </span>
               </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="400" align="right" header-align="center">
          <template #default="{ row }">
            <el-space :size="75">
              <el-button 
                v-if="['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status)" 
                link 
                type="primary" 
                @click="startProcessing(row)"
              >
                {{ row.status === 'PARSE_FAIL' ? '重试解析' : '开始解析' }}
              </el-button>


              <el-button 
                v-if="row.status === 'PARSE_COMPLETE'" 
                link 
                type="primary" 
                @click="startProcessing(row)"
              >
                重新解析
              </el-button>

              <el-button 
                v-if="['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL'].includes(row.status)" 
                color="#A0C4FF" 
                size="small" 
                round 
                style="color:white" 
                @click="openCalibration(row)"
              >
                <el-icon style="margin-right:4px"><EditPen /></el-icon> 
                {{ row.status === 'UNPARSEABLE' ? '人工校对' : '审核' }}
              </el-button>

              <el-button 
                v-if="row.status === 'AUDIT_PASS'" 
                link 
                type="success" 
                @click="openCalibration(row)"
              >
                查看详情
              </el-button>

              

              <el-popconfirm title="确定删除该文件吗?" @confirm="deleteFile(row)" confirm-button-type="danger">
                <template #reference><el-button link type="danger" icon="Delete"></el-button></template>
              </el-popconfirm>
             </el-space>
            </template>
           </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="showCreateProject" title="新建测绘归档项目" width="500px" style="border-radius: 12px;">
      <el-form :model="newProjectForm" label-position="top">
        <el-form-item label="项目名称"><el-input v-model="newProjectForm.projectName" placeholder="请输入工程名称" /></el-form-item>
        <el-form-item label="项目时间" prop="projectTime">
          <el-date-picker
            v-model="newProjectForm.projectTime"
            type="month"
            format="YYYY年MM月"
            value-format="YYYY年MM月"
            placeholder="请选择业务时间"
            style="width: 100%;"
            :locale="zhCn"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateProject = false" round>取消</el-button>
        <el-button type="primary" round @click="handleCreateProject">立即创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialogVisible" title="批量文件上传" width="600px" style="border-radius: 12px;" @closed="handleUploadDialogClosed">
      <el-form label-position="top">
        <el-row :gutter="20">
          <el-col :span="14">
            <el-form-item label="请确认本次上传的文件类型：">
               <el-radio-group v-model="tempUploadType" fill="#A0C4FF">
                  <el-radio-button value="CONTRACT">合同文件</el-radio-button>
                  <el-radio-button value="SURVEY_REPORT">实测报告</el-radio-button>
               </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="所属期数：" v-if="tempUploadType === 'SURVEY_REPORT'">
               <el-input-number v-model="uploadPhase" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
            <el-form-item label="所属期数：" v-else>
               <el-input disabled placeholder="无需填写" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-upload ref="uploadRef" class="upload-demo" drag action="#" :auto-upload="false" :on-change="handleFileChange" :on-remove="handleFileRemove" multiple :file-list="tempFiles">
          <div class="upload-content">
            <el-icon class="el-icon--upload" style="font-size: 48px; margin-bottom: 10px; color: #A0C4FF;"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖拽到此处，或 <em style="color: #409EFF; font-style: normal;">点击选择</em></div>
          </div>
        </el-upload>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <span style="color: #606266; font-size: 13px;">已选择 <strong>{{ tempFiles.length }}</strong> 个文件</span>
          <div>
             <el-button @click="uploadDialogVisible = false" round>取消</el-button>
             <el-button color="#A0C4FF" style="color:white" round class="upload-confirm-btn" @click="confirmUpload" :disabled="tempFiles.length === 0">确认上传</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showCalibration" fullscreen class="calibration-dialog" :show-close="false">
      <template #header="{ close }">
        <div class="cali-header">
           <div class="header-left">
             <el-button icon="Back" round @click="close" style="margin-right: 15px;">返回列表</el-button>
             <div class="file-title-block">
               <span class="title">智能审核模式</span>
               <span class="sub-name">{{ currentFile?.name }}</span>
             </div>
           </div>
           <div class="header-right">
             <el-tag v-if="currentFile?.status !== 'AUDIT_PASS'" type="warning" effect="dark" round size="large" style="margin-right: 15px;">AI 解析结果</el-tag>
             <el-tag v-else type="success" effect="dark" round size="large" style="margin-right: 15px;"><el-icon><CircleCheck /></el-icon> 已审核通过</el-tag>
             <el-button type="primary" plain round icon="DocumentChecked" @click="handleSaveData">保存修改</el-button>
             <el-button type="success" round icon="Stamp" @click="handleAuditPass" :disabled="currentFile?.status === 'AUDIT_PASS'">{{ currentFile?.status === 'AUDIT_PASS' ? '已审核' : '审核通过' }}</el-button>
           </div>
        </div>
      </template>

      <div class="split-view" v-loading="calibrationLoading">
        <div class="left-panel">
          <div class="pdf-canvas">
             <iframe v-if="calibrationPdfUrl" :src="calibrationPdfUrl" style="width:100%; height:100%; border:none;"></iframe>
             <el-empty v-else description="PDF 加载中..." />
          </div>
        </div>
        <div class="right-panel">
           <div style="padding: 20px; width: 100%;">
             <el-empty description="暂无解析数据" />
           </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted ,watch,onUnmounted } from 'vue'
import { UploadFilled, Upload, Document, EditPen, Back, Check, Warning, Picture, Delete, Plus, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, List, DocumentChecked, Stamp, CircleCheck, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'


const statusMap = {
  'UPLOADING': { text: '上传中', color: '#909399' },
  'WAITING_PARSE': { text: '等待解析', color: '#909399' },
  'PENDING': { text: '排队中', color: '#409EFF' },
  'PARSING': { text: '正在解析', color: '#409EFF' }, // 蓝色
  'PARSE_FAIL': { text: '解析失败', color: '#F56C6C' }, // 红色
  'PARSE_COMPLETE': { text: '解析完成', color: '#67C23A' }, // 绿色
  'UNPARSEABLE': { text: '不可解析', color: '#E6A23C' }, // 橙色
  'AUDITING': { text: '审核中', color: '#E6A23C' },
  'AUDIT_PASS': { text: '已入库', color: '#67C23A' },
  'AUDIT_FAIL': { text: '审核驳回', color: '#F56C6C' }
}

// --- 1. 项目数据 ---
const projectOptions = ref([])
const currentProject = ref('')
const showCreateProject = ref(false)

// 批量操作核心变量（必须加）
const selectedRows = ref([]) // 存储选中行
const batchLoading = ref(false) // 批量操作加载状态
const canBatchParse = computed(() => {
  return selectedRows.value.some(row => ['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status))
})

// 批量操作 - 监听表格选中行变化
const handleSelectionChange = (val) => {
  selectedRows.value = val // 同步选中行到变量
}

// 批量删除
const batchDelete = () => {
  if (selectedRows.value.length === 0) return
  ElMessageBox.confirm(
    `确认删除选中的 ${selectedRows.value.length} 个文件？删除后无法恢复！`,
    '批量删除',
    { type: 'warning', confirmButtonText: '确认删除' }
  ).then(async () => {
    batchLoading.value = true
    try {
      // 循环调用现有删除接口（如需批量接口，可替换为一次请求）
      await Promise.all(selectedRows.value.map(row => 
        axios.delete(`/api/file/${row.rawId}`)
      ))
      ElMessage.success(`成功删除 ${selectedRows.value.length} 个文件`)
      refreshData() // 刷新列表
      selectedRows.value = [] // 清空选中
    } catch (err) {
      console.error('批量删除失败：', err)
      ElMessage.error('部分文件删除失败，请重试')
    } finally {
      batchLoading.value = false
    }
  })
}

// 批量解析
const batchParse = () => {
  if (!canBatchParse.value) return
  ElMessageBox.confirm(
    `确认解析选中的可解析文件（${selectedRows.value.filter(row => ['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status)).length} 个）？`,
    '批量解析',
    { type: 'primary', confirmButtonText: '立即开始' }
  ).then(async () => {
    batchLoading.value = true
    try {
      // 仅处理可解析的行，同步更新前端状态
      const parseRows = selectedRows.value.filter(row => ['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status))
      await Promise.all(parseRows.map(row => {
        row.status = 'PENDING' // 前端先置为排队中
        return axios.post(`/api/file/parse/${row.rawId}`)
      }))
      ElMessage.success('批量解析任务已提交，后台处理中')
      checkPolling(fileTableData.value) // 触发轮询
      selectedRows.value = [] // 清空选中
    } catch (err) {
      console.error('批量解析失败：', err)
      ElMessage.error('部分文件解析请求失败，请重试')
    } finally {
      batchLoading.value = false
    }
  })
}




const fetchProjectList = async () => {
  try {
    const res = await axios.get('/api/project/list')
    if (res.data.code === 200) {
      projectOptions.value = res.data.data.map(item => ({
        id: String(item.id),
        name: item.projectName 
      }))
    }
  } catch (error) {
    console.error('获取项目列表失败', error)
  }
}

onMounted(() => {
  fetchProjectList()
})

// --- 2. 文件数据 ---
const fileTableData = ref([])
const tableLoading = ref(false)
let pollingTimer = null // 轮询定时器
const filterStatus = ref('')
const refreshData = async () => {
  if (!currentProject.value) { fileTableData.value = []; return }
  tableLoading.value = true
  const pid = currentProject.value
  try {
    // 构造请求体 FileQueryDTO
    const queryParams = {
      projectId: pid,
      // 如果有筛选状态就传，没有就不传(或传null)
      fileState: filterStatus.value || null, 
      
      
      // fileContextType: 'SURVEY_REPORT', 
      pageNum: 1,
      pageSize: 9999 // 暂时不分页，
      // 拉取全部匹配项
    }

    const res = await axios.post('/api/file/query', queryParams)

    //const res = await axios.get(`/api/file/project/${pid}`)
    

   
    // 👉👉👉 【调试重点】在这里打印！ 👈👈👈
    console.log('🔥 1. 接口完整响应:', res)
    console.log('🔥 2. 后端返回的数据主体 (res.data):', res.data)
    console.log('🔥 3. 真正的数据内容 (res.data.data):', res.data.data)

    const list = []
    
    // 【修复3】智能判断是“数组”还是“分页对象”
    // 如果 res.data.data 本身是数组，就用它；
    // 如果是对象且有 rows (MyBatis-Plus常见)，就用 rows；
    // 如果是对象且有 list，就用 list。
    let rawList = []
    // 优先判断 data 本身是不是数组
    if (Array.isArray(res.data.data)) {
        rawList = res.data.data
    } 
    // 【关键修复】这里加上对 records 的判断
    else if (res.data.data && Array.isArray(res.data.data.records)) {
        rawList = res.data.data.records
    }
    // 兼容其他情况
    else if (res.data.data && Array.isArray(res.data.data.rows)) {
        rawList = res.data.data.rows 
    } else if (res.data.data && Array.isArray(res.data.data.list)) {
        rawList = res.data.data.list 
    }

    console.log('✅ 最终提取到的列表数组:', rawList)
    if (res.data.code === 200 ) {
      rawList.forEach(item => {
        // 映射文件类型：CONTRACT→contract（合同），SURVEY_REPORT→survey（实测报告）
        let fileType = 'survey' // 默认实测报告
        if (item.fileContextType === 'CONTRACT') {
          fileType = 'contract'
        } else if (item.fileContextType === 'SURVEY_REPORT') {
          fileType = 'survey'
        }

        // 组装前端表格需要的字段
        list.push({
          id: item.id, // 前端表格行ID
          rawId: item.id, // 后端文件主键ID（用于删除、解析等接口调用）
          fileId: item.gridfsId, // 文件存储的gridfsId（用于下载、预览）
          name: item.originalName || '未命名文件', // 文件名
          type: fileType, // 区分合同/实测报告
          phase: null, // 新接口返回中无phase字段，暂时设为null（如需展示可后续补充）
          status: item.fileState || 'WAITING_PARSE', // 文件状态（匹配statusMap的key）
          errorMessage: item.parseMessage, // 解析错误信息
          thumbnailUrl: item.thumbGridfsId 
            ? `/api/file/download/gridfs/${item.thumbGridfsId}` 
            : 'https://placehold.co/150/e0e0e0/808080?text=NoThumb' // 缩略图
        })
      })
    }
    fileTableData.value = list
    
    // 开启轮询：如果有文件处于 PENDING 或 PARSING 状态
    checkPolling(list)

  } catch (error) { console.error(error) } finally { tableLoading.value = false }
}

// 轮询检查
const checkPolling = (list) => {
  const hasPending = list.some(item => ['PENDING', 'PARSING'].includes(item.status))
  if (hasPending && !pollingTimer) {
    pollingTimer = setInterval(() => {
      // 静默刷新，不显示 loading
      refreshDataSilent()
    }, 3000) // 每3秒查一次
  } else if (!hasPending && pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 静默刷新 (不转圈)
const refreshDataSilent = async () => {
  if (!currentProject.value) return
  const pid = currentProject.value
  try {
    // 请求新的统一接口
    const res = await axios.get(`/api/file/project/${pid}`)
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      // 优化：只更新状态字段，避免整个表格闪烁
      res.data.data.forEach(newItem => {
        // 找到前端列表中对应的行
        const oldItem = fileTableData.value.find(item => item.rawId === newItem.id)
        if (oldItem) {
          // 只更新状态和错误信息，其他字段不变
          oldItem.status = newItem.fileState || oldItem.status
          oldItem.errorMessage = newItem.parseMessage || oldItem.errorMessage
        }
      })
    }
  } catch(e) {
    console.error('静默刷新文件状态失败：', e)
  }
}

onMounted(() => {
  const savedProjectId = localStorage.getItem('savedCurrentProject')
  if (savedProjectId) {
    currentProject.value = savedProjectId
    refreshData() // 自动请求该项目的文件列表
  }
})

// 2. 当选择项目变化时，把项目ID存到 localStorage
watch(currentProject, (newProjectId) => {
  if (newProjectId) {
    localStorage.setItem('savedCurrentProject', newProjectId)
    refreshData()
  } else {
    localStorage.removeItem('savedCurrentProject')
    fileTableData.value = []
  }
})

// 销毁组件时清除轮询
onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})





// --- 3. 核心逻辑 ---

const newProjectForm = reactive({
  projectName: '', 
  projectTime: ''  
})

const handleCreateProject = () => {
  if (!newProjectForm.projectName) return ElMessage.warning('请输入项目名称')
  if (!newProjectForm.projectTime) return ElMessage.warning('请输入项目时间（例：2025年11月）')
  
  const loadingInstance = ElMessage({
    message: '正在创建项目...',
    type: 'info',
    icon: Loading,
    duration: 0,
  })

  axios.post('/api/project/create', null, {
    params: {
      projectName: newProjectForm.projectName, 
      projectTime: newProjectForm.projectTime   
    },
  })
  .then(res => {
    loadingInstance.close()
    if (res.data.code === 200) {
      ElMessage.success('项目创建成功！')
      const newId = String(res.data.data ? res.data.data.id : Date.now());
      projectOptions.value.push({ 
        id: newId, 
        name: newProjectForm.projectName 
      })
      currentProject.value = newId
      showCreateProject.value = false
      newProjectForm.projectName = ''
      newProjectForm.projectTime = ''
    } else {
      ElMessage.error(res.data.msg || '创建失败，请重试')
    }
  })
  .catch(err => {
    loadingInstance.close()
    console.error(err)
    ElMessage.error('网络错误或服务器异常')
  })
}

const reParse = (row) => { row.status = 0; startProcessing(row) }

// 【功能：删除文件】
const deleteFile = (row) => {
  // 接口：DELETE /file/{fileId}
  // row.rawId 是我们在 refreshData 映射时存储的真实后端 ID
  axios.delete(`/api/file/${row.rawId}`)
    .then(res => {
      if (res.data.code === 200) {
        ElMessage.success('文件及相关数据已完全删除')
        
        // 删除成功后，立即刷新列表
        refreshData()
      } else {
        ElMessage.error(res.data.msg || '删除失败')
      }
    })
    .catch(err => {
      console.error('删除出错:', err)
      ElMessage.error('网络错误或服务器异常')
    })
}

// --- 上传逻辑 ---
const uploadDialogVisible = ref(false)
const tempUploadType = ref('SURVEY_REPORT')
const uploadPhase = ref(1) 
const tempFiles = ref([])
const uploadRef = ref(null) // 【新增】引用 upload 组件实例

const openUploadDialog = () => { 
  // 【优化点 1】清空之前的文件列表
  tempFiles.value = []
  if(uploadRef.value) {
    uploadRef.value.clearFiles() // 调用 Element Plus 方法清空内部状态
  }
  uploadPhase.value = 1 
  uploadDialogVisible.value = true 
  console.log('打开弹窗，清空后文件数：', tempFiles.value.length); // 新增日志
}

const handleFileChange = (file, fileList) => { 
  // 同步 fileList 到 tempFiles
  tempFiles.value = fileList
  console.log('当前选中文件数：', tempFiles.value.length);
}

const handleFileRemove = (file, fileList) => {
  tempFiles.value = fileList
}

// 弹窗关闭后的清理 (双保险)
const handleUploadDialogClosed = () => {
  tempFiles.value = []
  if(uploadRef.value) uploadRef.value.clearFiles()
}

// 确认上传
const confirmUpload = () => {
  if(tempFiles.value.length === 0) return ElMessage.warning('请先选择文件')
  
  
  const typeName = tempUploadType.value === 'CONTRACT' ? '合同文件' : '实测报告'
  
  const msg = `
    <div style="text-align: left; font-size: 14px;">
      <p style="margin-bottom: 8px;">请核对本次上传任务信息：</p>
      <ul style="list-style: none; padding-left: 10px; background: #f5f7fa; padding: 10px; border-radius: 4px;">
        <li><strong>文件数量：</strong> <span style="color: #409EFF; font-weight: bold; font-size: 16px;">${tempFiles.value.length}</span> 份</li>
        <li><strong>归属项目：</strong> ${projectOptions.value.find(p => p.id === currentProject.value)?.name || '未知项目'}</li>
        ${ tempUploadType.value === 'survey' ? `<li><strong>所属期数：</strong> <span style="color: #E6A23C; font-weight: bold;">第 ${uploadPhase.value} 期</span></li>` : '' }
        <li><strong>文件类型：</strong> <span style="color: #F56C6C; font-weight: bold;">${typeName}</span></li>
      </ul>
      <p style="margin-top: 10px; color: #909399; font-size: 12px;">确认无误后系统将自动开始解析数据。</p>
    </div>
  `

  ElMessageBox.confirm(msg, '确认开始上传？', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确认并上传',
    cancelButtonText: '检查一下',
    type: 'info',
    center: true
  }).then(() => {
    handleRealUpload()
  }).catch(() => {})
}

const handleRealUpload = () => {
  if (!currentProject.value) return ElMessage.warning('请先选择作业项目')
  if (tempFiles.value.length === 0) return ElMessage.warning('请至少选择一个文件')

  const loadingInstance = ElMessage({
    message: '正在上传文件，请稍候...',
    type: 'info',
    icon: Loading,
    duration: 0,
  })

  const formData = new FormData()
  tempFiles.value.forEach(file => {
    formData.append('files', file.raw) 
  })

  axios.post('/api/file/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: {
      projectId: currentProject.value,
      fileContextType: tempUploadType.value, 
      phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : undefined
    }
  })
  .then(res => {
    loadingInstance.close()

    if (res.data.code === 200) {
      ElMessage.success(`成功上传 ${tempFiles.value.length} 个文件！`)
      refreshData()
      uploadDialogVisible.value = false
      // 关闭后会自动触发 @closed 事件清理文件列表
    } else {
      ElMessage.error(res.data.msg || '上传失败，服务器返回错误')
    }
  })
  .catch(err => {
    loadingInstance.close()
    console.error('上传出错:', err)
    ElMessage.error('上传超时或网络连接失败')
  })
}

const startProcessing = (row) => {
  ElMessageBox.confirm(`确认对文件 "${row.name}" 开始智能解析吗？`, '启动解析', {
    confirmButtonText: '立即开始',
    cancelButtonText: '取消',
    type: 'primary'
  }).then(() => {
    // 接口：/file/parse/{id}
    // 注意：row.rawId 是我们在 refreshData 里存的后端真实 ID
    axios.post(`/api/file/parse/${row.rawId}`)
      .then(res => {
        if (res.data.code === 200) {
          ElMessage.success('任务提交成功，系统正在后台解析...')
          
          // 1. 立即更新前端状态为 "排队中"
          // 这样 UI 会立刻变蓝，并且触发下面的轮询检查
          row.status = 'PENDING' 
          
          // 2. 触发轮询机制 (复用之前的逻辑)
          // 如果轮询没开，这行代码会把它开起来；如果开着，就什么也不做
          checkPolling(fileTableData.value)
        } else {
          ElMessage.error(res.data.msg || '解析请求被拒绝')
        }
      })
      .catch(err => {
        console.error('启动解析失败:', err)
        ElMessage.error('无法连接到解析服务')
      })
  }).catch(() => {})
}


// --- 4. 校对与审核 ---


const showCalibration = ref(false)
const calibrationLoading = ref(false)
const currentFile = ref(null)
const calibrationPdfUrl = ref('')

const openCalibration = async (row) => {
  currentFile.value = row
  showCalibration.value = true
  calibrationLoading.value = true
  calibrationPdfUrl.value = ''

  try {
    // 1. 恢复/补全文件详情请求（或注释掉相关逻辑）
    const infoRes = await axios.get(`/api/file/info/${row.rawId}`) // 取消注释
    if (infoRes.data.code === 200) {
      const gridfsId = infoRes.data.data.gridfsId
      calibrationPdfUrl.value = `/api/file/download/gridfs/${gridfsId}`
    }
    // 若暂时不实现，直接注释掉if逻辑：
    // calibrationPdfUrl.value = `/api/file/download/gridfs/${row.fileId}` // 用row里的fileId
  } catch (error) {
    ElMessage.error('文件详情加载失败')
  } finally {
    calibrationLoading.value = false
  }
}

const handleSaveData = () => { ElMessage.success('保存成功') }
const handleAuditPass = () => { ElMessage.success('审核通过'); showCalibration.value = false; refreshData() }

// 分页等
const pdfPage = ref(1)
const extractedTables = ref([])

</script>

<style scoped>
/* 保持原有 CSS 不变 */
.macaron-container { padding: 20px; min-height: 80vh; background-color: #f5f7fa; }

.action-header {  display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 30px 25px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.project-info { display: flex; align-items: center; gap: 16px; }
.sub-title { font-size: 14px; color: #606266; white-space: nowrap; }
.project-selector-wrapper { display: flex; align-items: center; gap: 15px; }
.task-card { border-radius: 12px; border: 1px solid #ebeef5; min-height: 500px; padding: 24px; box-sizing: border-box; }
.status-badge { display: flex; align-items: center; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; display: inline-block; }
.dot.gray { background: #c0c4cc; } .dot.green { background: #67c23a; } .dot.blue { background: #409eff; animation: pulse 1.5s infinite; } .dot.purple { background: #9d8cff; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.7; } }
:deep(.custom-table .el-table__row) { height: 90px; }
:deep(.custom-table .el-table__cell) { padding: 12px 10px; box-sizing: border-box; }
:deep(.custom-table .el-table__header .el-table__cell) { padding: 12px 10px; height: 50px; box-sizing: border-box; }
:deep(.el-table-column[label="预览"]) { width: 120px !important; }
:deep(.el-table-column[label="预览"] .el-table__cell) { white-space: normal; overflow: visible; }
.file-name-cell { display: flex; flex-direction: column; justify-content: center; height: 100%; padding-left: 4px; }
.upload-btn-main { padding: 12px 24px; }
.upload-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; }
.upload-tip { margin-top: 10px; font-size: 12px; color: #909399; }
.cali-header { display: flex; justify-content: space-between; padding: 16px 24px; height: 100%; align-items: center; background: white; border-bottom: 1px solid #f0f2f5; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.header-left { display: flex; align-items: center; gap: 20px; }
.file-title-block { margin-left: 0; display: flex; flex-direction: column; }
.file-title-block .title { font-weight: 700; font-size: 18px; color: #1f2329; }
.file-title-block .sub-name { font-size: 14px; color: #86909c; margin-top: 2px; }
.header-right { display: flex; align-items: center; gap: 16px; }
:deep(.header-right .el-tag--warning) { padding: 6px 12px; font-size: 14px; }
:deep(.header-right .el-button--success) { padding: 8px 20px; font-size: 14px; }
.split-view { display: flex; height: calc(100vh - 80px); background: #f0f2f5; }
.left-panel { width: 50%; display: flex; flex-direction: column; background: #525659; border-right: 1px solid #dcdfe6; }
.pdf-toolbar { height: 48px; background: #fff; border-bottom: 1px solid #ccc; display: flex; align-items: center; justify-content: center; }
.divider { width: 1px; height: 20px; background: #ddd; margin: 0 15px; }
.pdf-canvas { flex: 1; display: flex; justify-content: center; align-items: center; flex-direction: column; color: #ccc; }
.right-panel { width: 50%; overflow-y: auto; padding: 0; background: #f2f4f7; }
.excel-sheet-card { background: white; margin: 20px; border: 1px solid #dcdfe6; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); overflow: hidden; }
.excel-header { background: #e8f4ff; padding: 10px 15px; border-bottom: 1px solid #dcdfe6; }
.sheet-title { font-weight: bold; color: #409eff; font-size: 14px; display: flex; align-items: center; }
.error-highlight :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #F56C6C inset !important; background-color: #fef0f0; }
:deep(.project-selector-wrapper .el-button--primary) { display: flex; align-items: center; justify-content: center; padding: 12px 28px !important; gap: 6px; }
:deep(.project-selector-wrapper .el-select--large .el-input__wrapper) { padding: 8px 15px !important; box-sizing: border-box; }
:deep(.project-selector-wrapper .el-button--primary .el-button__content) { display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px; }
:deep(.upload-demo .el-upload__file-list) {
  margin-top: 20px; /* 增加列表与上传区域的间距 */
}
:deep(.upload-confirm-btn:not(:disabled)) {
  background-color: #A0C4FF !important;
  border-color: #A0C4FF !important;
  color: white !important;
  cursor: pointer;
}

/* 无文件（禁用）的样式：灰色（暗着） */
:deep(.upload-confirm-btn:disabled) {
  background-color: #e0e0e0 !important;
  border-color: #e0e0e0 !important;
  color: #999 !important;
  cursor: not-allowed;
}
/* 强制取消表格行 hover/选中时的背景（覆盖 Element 默认样式） */
:deep(.custom-table .el-table__body .el-table__row.no-hover-highlight:hover > td) {
  background-color: transparent !important;
  box-shadow: none !important; /* 移除hover时的阴影 */
  color: inherit !important;
}

/* 强制提升预览弹窗的层级到最高（覆盖所有元素） */
:deep(.el-image-viewer) {
  z-index: 999999 !important; /* 比之前更高，确保覆盖任何弹窗/遮罩 */
}

/* 预览图片本身的层级也要确保高于表格 */
:deep(.el-image) {
  position: relative;
  z-index: 1000 !important;
}
/* 新增：确保多选列的复选框可点击，不受行样式影响 */
:deep(.custom-table .el-table__column--selection .el-checkbox) {
  z-index: 999; /* 提升复选框层级 */
  cursor: pointer;
}
/* 确保多选列的单元格padding正常 */
:deep(.custom-table .el-table__column--selection .el-table__cell) {
  padding: 0 !important;
  text-align: center;
}


</style>
