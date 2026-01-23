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
            placeholder="请选择或新建项目"
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

    <el-card class="task-card" shadow="never">
      <el-empty v-if="!currentProject" description="请先在左上角选择或新建一个项目" />
      <el-empty v-else-if="filteredFileList.length === 0" description="暂无文件，请点击右上角上传" image-size="120" />

      <el-table 
        v-else
        :data="filteredFileList" 
        style="width: 100%" 
        class="custom-table"
        :header-cell-style="{background:'#F5F7FA', color:'#606266', height: '50px'}"
      >
        <el-table-column label="预览" width="120" align="center">
          <template #default="{ row }">
            <el-image 
              style="width: 60px; height: 60px; border-radius: 6px; border: 1px solid #e4e7ed; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
              :src="row.thumbnailUrl" 
              :preview-src-list="[row.thumbnailUrl]"
              fit="cover"
            >
              <template #error>
                <div class="image-slot"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="文件名" min-width="250">
           <template #default="{ row }">
             <div class="file-name-cell">
               <span style="font-weight: 600; font-size: 15px; color: #303133;">{{ row.name }}</span>
               <span v-if="row.phase" style="font-size: 12px; color: #999; margin-top: 4px;">第 {{ row.phase }} 期</span>
             </div>
           </template>
        </el-table-column>
        
        <el-table-column prop="type" label="文件类型" width="140">
           <template #default="{ row }">
             <el-tag :color="row.type === 'contract' ? '#FFF0F0' : '#F0F9EB'" 
                     :style="{ color: row.type === 'contract' ? '#F56C6C' : '#67C23A', border: '1px solid ' + (row.type === 'contract' ? '#FAB6B6' : '#b3e19d') }"
                     effect="light">
               {{ row.type === 'contract' ? '合同文件' : '实测报告' }}
             </el-tag>
           </template>
        </el-table-column>
        
        <el-table-column prop="status" label="智能解析状态" width="240">
          <template #default="{ row }">
            <div class="status-badge">
               <span v-if="row.status === 0" class="dot gray"></span><span v-if="row.status === 0">等待解析</span>
               <span v-if="row.status === 1" class="dot blue"></span><span v-if="row.status === 1">OCR 识别中...</span>
               <span v-if="row.status === 2" class="dot purple"></span><span v-if="row.status === 2" style="color: #9d8cff; font-weight:bold">AI 清洗中...</span>
               <span v-if="row.status === 3" class="dot green"></span><span v-if="row.status === 3" style="color: #67c23a">待审核</span>
               <span v-if="row.status === 4" class="dot blue"></span><span v-if="row.status === 4" style="color: #409eff; font-weight:bold">已审核入库</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="300" align="right">
          <template #default="{ row }">
            <el-space :size="10">
              <el-button v-if="row.status === 0" link type="primary" @click="startProcessing(row)">开始解析</el-button>
              
              <el-button v-if="row.status === 3 || row.status === 4" link type="warning" @click="reParse(row)">重新解析</el-button>

              <el-button v-if="row.status === 3 || row.status === 4" color="#A0C4FF" size="small" round style="color:white" @click="openCalibration(row)">
                <el-icon style="margin-right:4px"><EditPen /></el-icon> {{ row.status === 4 ? '查看/修改' : '审核' }}
              </el-button>

              <el-popconfirm title="确定删除该文件吗?" @confirm="deleteFile(row.id)" confirm-button-type="danger">
                <template #reference>
                  <el-button link type="danger" icon="Delete">删除</el-button>
                </template>
              </el-popconfirm>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showCreateProject" title="新建测绘归档项目" width="500px" style="border-radius: 12px;">
      <el-form :model="newProjectForm" label-position="top">
        <el-form-item label="项目名称"><el-input v-model="newProjectForm.name" placeholder="请输入工程名称" /></el-form-item>
        <el-form-item label="开发建设单位"><el-input v-model="newProjectForm.developer" placeholder="请输入开发商全称" /></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="newProjectForm.code" placeholder="选填" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateProject = false" round>取消</el-button>
        <el-button type="primary" round @click="handleCreateProject">立即创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialogVisible" title="批量文件上传" width="550px" style="border-radius: 12px;">
      <el-form label-position="top">
        <el-row :gutter="20">
          <el-col :span="14">
            <el-form-item label="请确认本次上传的文件类型：">
               <el-radio-group v-model="tempUploadType" fill="#A0C4FF">
                  <el-radio-button label="contract">合同文件</el-radio-button>
                  <el-radio-button label="survey">实测报告</el-radio-button>
               </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="所属期数：">
               <el-input-number v-model="uploadPhase" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-upload class="upload-demo" drag action="#" :auto-upload="false" :on-change="handleFileChange" multiple>
          <div class="upload-content">
            <el-icon class="el-icon--upload" style="font-size: 48px; margin-bottom: 10px;"><upload-filled /></el-icon>
            <div class="el-upload__text" style="margin-bottom: 15px;">将文件拖拽到此处，或</div>
            <el-button type="primary" size="default" round>点击选择文件</el-button>
            <div class="upload-tip">支持 PDF, Excel, JPG 格式</div>
          </div>
        </el-upload>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <span style="color: #999; font-size: 12px;">已选择 {{ tempFiles.length }} 个文件</span>
          <div>
             <el-button @click="uploadDialogVisible = false" round>取消</el-button>
             <el-button color="#A0C4FF" style="color:white" round @click="confirmUpload">确认上传</el-button>
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
             <el-tag v-if="currentFile?.status !== 4" type="warning" effect="dark" round size="large" style="margin-right: 15px;">AI 标记异动: 1 处</el-tag>
             <el-tag v-else type="success" effect="dark" round size="large" style="margin-right: 15px;"><el-icon><CircleCheck /></el-icon> 已审核通过</el-tag>
             <el-button type="primary" plain round icon="DocumentChecked" @click="handleSaveData">保存修改</el-button>
             <el-button type="success" round icon="Stamp" @click="handleAuditPass" :disabled="currentFile?.status === 4">{{ currentFile?.status === 4 ? '已审核' : '审核通过' }}</el-button>
           </div>
        </div>
      </template>

      <div class="split-view">
        <div class="left-panel">
          <div class="pdf-toolbar">
            <el-button-group>
              <el-button size="small" icon="ArrowLeft">上一页</el-button>
              <el-input-number v-model="pdfPage" size="small" :min="1" :max="20" :controls="false" style="width: 60px; margin: 0 5px;" />
              <span style="font-size: 12px; margin-right: 5px;"> / 20</span>
              <el-button size="small" icon="ArrowRight">下一页</el-button>
            </el-button-group>
            <div class="divider"></div>
            <el-button-group>
               <el-button size="small" icon="ZoomOut"></el-button>
               <span style="font-size: 12px; margin: 0 8px;">100%</span>
               <el-button size="small" icon="ZoomIn"></el-button>
            </el-button-group>
          </div>
          <div class="pdf-canvas">
             <el-empty description="PDF 预览区域 (模拟)" image-size="100" />
             <div class="pdf-mock-text">当前显示第 {{ pdfPage }} 页</div>
          </div>
        </div>

        <div class="right-panel">
           <div style="padding: 20px; width: 100%;">
             <el-alert title="请对照左侧 PDF 原件核对以下明细数据（支持直接编辑表格）" type="info" show-icon style="margin-bottom: 20px;" />
             <div v-for="(table, tIndex) in extractedTables" :key="tIndex" class="excel-sheet-card">
                <div class="excel-header">
                   <div class="sheet-title"><el-icon style="margin-right: 5px"><List /></el-icon> 表 {{ tIndex + 1 }}: {{ table.title }}</div>
                </div>
                <el-table :data="table.rows" border stripe style="width: 100%" :header-cell-style="{background:'#f5f7fa', color:'#606266', fontWeight:'bold'}">
                  <el-table-column v-for="(col, cIndex) in table.columns" :key="cIndex" :prop="col.prop" :label="col.label" :min-width="col.width || 120">
                    <template #default="scope">
                      <el-input v-model="scope.row[col.prop].value" size="small" :class="{'error-highlight': scope.row[col.prop].isError}">
                         <template #suffix v-if="scope.row[col.prop].isError">
                           <el-tooltip content="AI置信度低，请核对" placement="top"><el-icon color="#F56C6C"><Warning /></el-icon></el-tooltip>
                         </template>
                      </el-input>
                    </template>
                  </el-table-column>
                </el-table>
             </div>
             <div style="height: 100px;"></div>
           </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { UploadFilled, Upload, Document, EditPen, Back, Check, Warning, Picture, Delete, Plus, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, List, DocumentChecked, Stamp, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// --- 1. 项目数据 ---
const projectOptions = ref([
  { id: '1', name: '锦园雅境府（2023新）' },
  { id: '2', name: '滨江壹号院二期' }
])
const currentProject = ref('1')
const showCreateProject = ref(false)
const newProjectForm = reactive({ name: '', developer: '', code: '' })

// --- 2. 文件数据 ---
const allFiles = ref([
  { id: 1, name: '锦园雅境府1栋_实测报告.pdf', type: 'survey', status: 3, projectId: '1', thumbnailUrl: 'https://via.placeholder.com/150/e0e0e0/808080?text=PDF', phase: 1 },
  { id: 2, name: '合同副本_2023.pdf', type: 'contract', status: 0, projectId: '1', thumbnailUrl: 'https://via.placeholder.com/150/FFD6A5/808080?text=Contract', phase: 1 },
  { id: 3, name: '滨江二期_测绘草图.pdf', type: 'survey', status: 0, projectId: '2', thumbnailUrl: 'https://via.placeholder.com/150/CAFFBF/808080?text=Sketch', phase: 2 }
])

const filteredFileList = computed(() => {
  if (!currentProject.value) return []
  return allFiles.value.filter(file => file.projectId === currentProject.value)
})

// --- 3. 核心逻辑 ---
const handleCreateProject = () => {
  if (!newProjectForm.name) return ElMessage.warning('请输入项目名称')
  const newId = Date.now().toString()
  projectOptions.value.push({ id: newId, name: newProjectForm.name })
  currentProject.value = newId
  showCreateProject.value = false
  ElMessage.success('项目创建成功')
}

const reParse = (row) => { row.status = 0; startProcessing(row) }
const deleteFile = (id) => { allFiles.value = allFiles.value.filter(f => f.id !== id); ElMessage.success('文件已删除') }

// --- 上传逻辑 ---
const uploadDialogVisible = ref(false)
const tempUploadType = ref('survey')
const uploadPhase = ref(1) // 新增：默认1期
const tempFiles = ref([])

const openUploadDialog = () => { 
  tempFiles.value = []
  uploadPhase.value = 1 
  uploadDialogVisible.value = true 
}
const handleFileChange = (file) => { tempFiles.value.push(file) }

// 【修改点】确认上传前增加弹窗提示，文件类型加红加粗
const confirmUpload = () => {
  if(tempFiles.value.length === 0) return ElMessage.warning('请先选择文件')
  
  const typeName = tempUploadType.value === 'contract' ? '土地/房产合同' : '房产实测报告'
  
  const msg = `
    <div style="text-align: left; font-size: 14px;">
      <p style="margin-bottom: 8px;">请核对本次上传任务信息：</p>
      <ul style="list-style: none; padding-left: 10px; background: #f5f7fa; padding: 10px; border-radius: 4px;">
        <li><strong>文件数量：</strong> <span style="color: #409EFF; font-weight: bold; font-size: 16px;">${tempFiles.value.length}</span> 份</li>
        <li><strong>归属项目：</strong> 锦园雅境府（2023新）</li>
        <li><strong>所属期数：</strong> <span style="color: #E6A23C; font-weight: bold;">第 ${uploadPhase.value} 期</span></li>
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
  tempFiles.value.forEach(f => {
    allFiles.value.push({ 
      id: Date.now() + Math.random(), 
      name: f.name, 
      type: tempUploadType.value, 
      status: 0, 
      projectId: currentProject.value,
      thumbnailUrl: 'https://via.placeholder.com/150/e0e0e0/808080?text=NewFile',
      phase: uploadPhase.value // 记录期数
    })
  })
  uploadDialogVisible.value = false
  ElMessage.success('上传成功，任务已添加')
}

const startProcessing = (row) => {
  ElMessageBox.confirm('是否启用 AI 大模型进行深度清洗？', '智能解析', { confirmButtonText: '启用', cancelButtonText: '取消' })
    .then(() => runProcess(row, true))
    .catch(() => runProcess(row, false))
}
const runProcess = (row, useAI) => {
  row.status = 1
  setTimeout(() => {
    if (useAI) { row.status = 2; setTimeout(() => row.status = 3, 2000) }
    else { row.status = 3 }
  }, 1000)
}

// --- 4. 校对与审核 ---
const showCalibration = ref(false)
const currentFile = ref(null)
const pdfPage = ref(14)

const extractedTables = ref([
  {
    title: "各户型计容面积统计表",
    columns: [ { prop: 'roomNo', label: '房号/部位', width: 100 }, { prop: 'usage', label: '用途', width: 100 }, { prop: 'area', label: '实测面积(㎡)', width: 120 }, { prop: 'shared', label: '分摊面积(㎡)', width: 120 }, { prop: 'total', label: '合计(㎡)', width: 120 } ],
    rows: [
      { roomNo: { value: '101', isError: false }, usage: { value: '住宅', isError: false }, area: { value: '120.50', isError: false }, shared: { value: '12.30', isError: false }, total: { value: '132.80', isError: false } },
      { roomNo: { value: '102', isError: false }, usage: { value: '住宅', isError: false }, area: { value: '122.00', isError: false }, shared: { value: '0.00', isError: true }, total: { value: '122.00', isError: true } },
      { roomNo: { value: '103', isError: false }, usage: { value: '住宅', isError: false }, area: { value: '89.50', isError: false }, shared: { value: '9.10', isError: false }, total: { value: '98.60', isError: false } }
    ]
  },
  {
    title: "公摊部位明细表",
    columns: [ { prop: 'name', label: '功能区名称' }, { prop: 'location', label: '所在位置' }, { prop: 'calcArea', label: '计算面积' } ],
    rows: [
      { name: { value: '门厅', isError: false }, location: { value: '一层核心筒', isError: false }, calcArea: { value: '45.20', isError: false } },
      { name: { value: '电梯井', isError: false }, location: { value: '全楼', isError: false }, calcArea: { value: '120.00', isError: false } }
    ]
  }
])

const handleSaveData = () => { ElMessage.success('当前修改已保存至草稿') }
const handleAuditPass = () => { if (currentFile.value) { currentFile.value.status = 4 }; ElMessage.success('审核通过！数据已正式入库') }
</script>

<style scoped>
/* 1. 布局优化 */
.macaron-container { padding: 20px; min-height: 80vh; background-color: #f5f7fa; }
.action-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 30px 25px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
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
</style>