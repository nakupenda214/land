<template>
  <div class="archive-container ">
    
    <ProjectFilterBar
      v-model="filterProject"
      :project-options="projectOptions"
      :current-project-id="currentProjectInfo.id"
      @search="handleGlobalSearch"
    />

    <div class="content-tabs-wrapper no-print">
      <el-tabs v-model="activeTab" type="border-card" class="archive-tabs no-print">
        
        <el-tab-pane name="summary">
          <template #label><span class="custom-tab-label"><el-icon><DataAnalysis /></el-icon> 房产实测汇总表</span></template>
          
          <div class="tab-content">
                        <SummaryTabActions @print="handlePrint" @export="handleExportExcel" />

            <!-- 未知用途规则配置卡片 -->
                          <UnknownUsagePolicyCard
              :unknown-usages="unknownUsages"
              :is-saving-policy="isSavingPolicy"
              @save="savePolicy"
            />

            

                        <SummaryTableCard
              :current-project-info="currentProjectInfo"
              :survey-stats="surveyStats"
              :refresh-btn-loading="refreshBtnLoading"
              :is-refresh-cd="isRefreshCd"
              :cd-remaining="cdRemaining"
              :display-table-data="displayTableData"
              :is-target="isTarget"
              @refresh-survey="handleRefreshSurveyData"
              @view-detail="viewDetail"
            />


           <SummaryComparisonCard :table-total-data="tableTotalData" />
          </div>


        
        </el-tab-pane>

       
        <el-tab-pane name="contractLandEdit" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Location /></el-icon> 合同及地块信息
            </span>
          </template>
          <ContractLandTab
            :contract-land-list="contractLandList"
            :selected-contract="selectedContract"
            :current-land-parcel-list="currentLandParcelList"
            @add-contract="addContract"
            @contract-row-click="handleContractRowClick"
            @edit-contract="editContract"
            @delete-contract="deleteContract"
            @add-land-parcel="addLandParcel"
            @edit-land-parcel="editLandParcel"
            @delete-land-parcel="deleteLandParcel"
          />
        </el-tab-pane>
       

        <el-tab-pane name="reports" class="no-print">
          <template #label><span class="custom-tab-label"><el-icon><Collection /></el-icon> 项目实测报告查询</span></template>
          <ReportListTable
            :report-list="reportList"
            @preview="handlePreview"
            @download="handleDownload"
          />
        </el-tab-pane>

        <!-- 第四个tab：项目信息更新（文档信息栏） -->
        <el-tab-pane name="projectEdit" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Document /></el-icon> 项目信息更新
            </span>
          </template>
          <ProjectEditForm
            :form="projectUpdateForm"
            :rules="projectEditRules"
            :loading="projectEditLoading"
            :set-form-ref="setProjectEditRef"
            @submit="submitProjectUpdate"
            @reset="resetProjectForm"
          />
        </el-tab-pane>

        <el-tab-pane name="archives" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><FolderOpened /></el-icon> 归档文件查询
            </span>
          </template>
          <ArchiveFolderTab
            :project-id="currentProjectInfo.id"
            :project-name="currentProjectInfo.name"
            :active="activeTab === 'archives'"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
    <PrintSummaryBlock
      :is-printing="isPrinting"
      :current-project-info="currentProjectInfo"
      :current-print-date="currentPrintDate"
      :display-table-data="displayTableData"
      :table-total-data="tableTotalData"
    />




            <ProjectDetailDialog
        v-model="detailDialogVisible"
        :room-sum-info="roomSumInfo"
        :room-info-data="roomInfoData"
        :detail-loading="detailLoading"
      />

      <ContractEditDialog
        v-model="contractDialogVisible"
        :form="contractForm"
        :rules="contractFormRules"
        :loading="contractFormLoading"
        :set-form-ref="setContractFormRef"
        @submit="submitContractForm"
      />

      <LandParcelEditDialog
        v-model="landParcelDialogVisible"
        :form="landParcelForm"
        :rules="landParcelFormRules"
        :loading="landParcelFormLoading"
        :set-form-ref="setLandParcelFormRef"
        @submit="submitLandParcelForm"
      />

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch , onUnmounted} from 'vue'
import { useRoute } from 'vue-router'
import { DataAnalysis, Document, Collection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { downloadGridFsFile } from '@/services/file.service'

import { usePrint } from '@/hooks/usePrint.ts'
import { useProjectSelector } from '@/composables/project-list/useProjectSelector'
import ProjectFilterBar from '@/components/project-list/ProjectFilterBar.vue'
import SummaryTabActions from '@/components/project-list/SummaryTabActions.vue'
import UnknownUsagePolicyCard from '@/components/project-list/UnknownUsagePolicyCard.vue'
import SummaryTableCard from '@/components/project-list/SummaryTableCard.vue'
import SummaryComparisonCard from '@/components/project-list/SummaryComparisonCard.vue'
import PrintSummaryBlock from '@/components/project-list/PrintSummaryBlock.vue'
import ProjectDetailDialog from '@/components/project-list/ProjectDetailDialog.vue'
import ContractEditDialog from '@/components/project-list/ContractEditDialog.vue'
import LandParcelEditDialog from '@/components/project-list/LandParcelEditDialog.vue'
import ProjectEditForm from '@/components/project-list/ProjectEditForm.vue'
import ReportListTable from '@/components/project-list/ReportListTable.vue'
import ContractLandTab from '@/components/project-list/ContractLandTab.vue'
import ArchiveFolderTab from '@/components/project-list/ArchiveFolderTab.vue'
import { useContractLandManagement } from '@/composables/project-list/useContractLandManagement'
import { useProjectEditManagement } from '@/composables/project-list/useProjectEditManagement'
import { useSurveySummary } from '@/composables/project-list/useSurveySummary'
import { useSurveyRefresh } from '@/composables/project-list/useSurveyRefresh'
import { useUnknownUsagePolicy } from '@/composables/project-list/useUnknownUsagePolicy'
import { useProjectFileCollections } from '@/composables/project-list/useProjectFileCollections'
import { useProjectExport } from '@/composables/project-list/useProjectExport'
import { useProjectDetailDialog } from '@/composables/project-list/useProjectDetailDialog'

import { FolderOpened, Location } from '@element-plus/icons-vue'



// const handlePrint = () => window.print()
const { isPrinting, triggerPrint } = usePrint()
const handlePrint = () => {
  triggerPrint() // 调用 Teleport 打印逻辑
}


const route = useRoute()

// 组件卸载时清理事件，避免内存泄漏
onUnmounted(() => {
  clearRefreshTimer();
})

// 页面状态
const activeTab = ref('summary')


// 列表数据
const reportList = ref([])
const contractList = ref([])
const {
  tableTotalData,
  rawTableData,
  unknownUsages,
  isSavingPolicy,
  displayTableData,
  surveyStats,
  fetchSurveyReports,
  resetSummaryMetrics
} = useSurveySummary({ reportList })




// --- 核心 API 逻辑 ---

// 1. 获取项目列表
const currentPrintDate = computed(() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const {
  createFetchProjectData
} = useProjectFileCollections({ reportList, contractList })

const fetchProjectData = createFetchProjectData({
  getProjectOptions: () => projectOptions.value,
  getCurrentProjectInfo: () => currentProjectInfo
})
const {
  filterProject,
  projectOptions,
  currentProjectInfo,
  fetchProjects: fetchProjectList,
  fetchProjectDetail
} = useProjectSelector({ fetchProjectData, fetchSurveyReports })
const {
  roomSumInfo,
  detailDialogVisible,
  roomInfoData,
  detailLoading,
  viewDetail
} = useProjectDetailDialog({
  currentProjectInfo,
  rawTableData
})
const {
  savePolicy
} = useUnknownUsagePolicy({
  unknownUsages,
  isSavingPolicy,
  currentProjectInfo,
  fetchSurveyReports
})






const {
  refreshBtnLoading,
  isRefreshCd,
  cdRemaining,
  handleRefreshSurveyData,
  resetRefreshCdStatus,
  restoreRefreshCdStatus,
  clearRefreshTimer
} = useSurveyRefresh({
  currentProjectInfo,
  fetchSurveyReports
})
const {
  handleExportExcel
} = useProjectExport({
  displayTableData,
  tableTotalData,
  currentProjectInfo
})
// ===== 合同表单相关（补充注释）=====
const {
  contractLandList,
  selectedContract,
  currentLandParcelList,
  contractDialogVisible,
  contractForm,
  contractFormRules,
  contractFormLoading,
  setContractFormRef,
  submitContractForm,
  landParcelDialogVisible,
  landParcelForm,
  landParcelFormRules,
  landParcelFormLoading,
  setLandParcelFormRef,
  submitLandParcelForm,
  fetchContractListByProjectId,
  handleContractRowClick,
  addContract,
  editContract,
  deleteContract,
  addLandParcel,
  editLandParcel,
  deleteLandParcel
} = useContractLandManagement({
  filterProject,
  currentProjectInfo
})
const {
  projectEditLoading,
  projectUpdateForm,
  projectEditRules,
  setProjectEditRef,
  submitProjectUpdate,
  resetProjectForm
} = useProjectEditManagement({
  activeTab,
  filterProject,
  fetchProjectList,
  fetchProjectDetail
})

const handleGlobalSearch = async () => {
  const projectId = String(filterProject.value || '')
  if (!projectId) {
    ElMessage.warning('请先选择项目')
    return
  }

  await fetchProjectDetail(projectId)
  await fetchContractListByProjectId(projectId)
  restoreRefreshCdStatus(projectId)
}

const isTarget = (row, key) => {
  if (!row || !key) return false
  const fields = [
    'calcCommercial',
    'calcResidential',
    'calcPropMgmt',
    'calcOther',
    'nonCalcCommunity',
    'nonCalcOther'
  ]
  const values = fields.map((field) => Number(row[field] || 0))
  const maxValue = Math.max(...values, 0)
  return maxValue > 0 && Number(row[key] || 0) === maxValue
}

const handlePreview = (row) => {
  if (!row?.fileId) {
    ElMessage.warning('缺少文件ID，无法预览')
    return
  }
  window.open(`/api/file/download/gridfs/${row.fileId}`, '_blank')
}

const handleDownload = async (row) => {
  if (!row?.fileId) {
    ElMessage.warning('缺少文件ID，无法下载')
    return
  }

  try {
    const res = await downloadGridFsFile(row.fileId, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${row.name || '报告文件'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败，请稍后重试')
  }
}

// 持久化项目选择状态
watch(filterProject, (newVal, oldVal) => {
  if (newVal) {
    localStorage.setItem('projectFilterStatus', newVal);
   
    // 切换项目时，清除旧项目的冷却缓存
    if (oldVal) {
      const oldCdKey = `refresh_cd_${oldVal}`;
      localStorage.removeItem(oldCdKey);
    }
  } else {
    // 1. 清空本地缓存
    localStorage.removeItem('projectFilterStatus');
    // 2. 清空所有项目相关数据
    reportList.value = [];
    resetSummaryMetrics();
 
    // 3. 重置项目基本信息（关键：清空ID让刷新按钮禁用）
    Object.assign(currentProjectInfo, {
      id: '',
      name: '请选择项目',
      code: '-',
      status: '-'
    });
    // 4. 重置冷却状态（项目都清了，冷却没用了）
    resetRefreshCdStatus();
  }
})

// 页面初始化：恢复项目选择并加载数据
onMounted(async () => {
  // A. 先拉取项目列表（填充下拉框）
  await fetchProjectList()

  // B. 决定选中哪个项目
  const queryProjectId = route.query.projectId;
  const savedProjectId = localStorage.getItem('projectFilterStatus');
  let targetProjectId = '';

  if (queryProjectId) {
    targetProjectId = String(queryProjectId);
    filterProject.value = targetProjectId;
    handleGlobalSearch(); // 立即查询
  } else if (savedProjectId) {
    const exists = projectOptions.value.some(p => p.id === savedProjectId);
    if (exists) {
      targetProjectId = savedProjectId;
      filterProject.value = targetProjectId;
      handleGlobalSearch(); // 立即查询
    } else {
      localStorage.removeItem('projectFilterStatus');
    }
  }

  // C. 恢复当前项目的冷却状态（从本地缓存读取）
  if (targetProjectId) {
    restoreRefreshCdStatus(targetProjectId);
  }
})





</script>

<style scoped>
/* 样式调整：适配表格而非描述列表 */
.info-config-card { margin-bottom: 24px; border: 1px solid #ebeef5; padding: 16px; }
.card-title { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 15px; }

/* 文本颜色 */
.text-red { color: #F56C6C; }
.text-green { color: #67C23A; }

/* 其他样式保持不变 */
.archive-container { padding: 24px; background-color: #f5f7fa; min-height: 90vh; display: flex; flex-direction: column; }
.global-filter-card { background: #fff; border: 1px solid #ebeef5; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.filter-row { display: flex; align-items: center; gap: 16px; margin-bottom: 0; }
.filter-item .label { font-size: 14px; color: #606266; margin-right: 0; }
.project-meta { font-size: 14px; color: #666; border-top: 1px dashed #eee; padding-top: 15px; display: flex; align-items: center; gap: 15px; }
.content-tabs-wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); flex: 1; }
.tab-content { padding: 20px; }
.tab-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; }
.action-btns { display: flex; gap: 15px; }
.special-policy-card { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.policy-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.policy-title { font-size: 14px; font-weight: bold; color: #E6A23C; }
.policy-items { display: flex; flex-direction: column; gap: 12px; margin-left: 30px; }
.policy-item { display: flex; align-items: center; justify-content: space-between; background: white; padding: 12px 18px; border-radius: 6px; border: 1px solid #eee; max-width: 900px; }
.policy-info { display: flex; align-items: center; gap: 20px; }
.policy-name { font-weight: bold; color: #333; width: 220px; }
.policy-stats { color: #666; font-size: 14px; width: 180px; }
.policy-control { display: flex; align-items: center; gap: 12px; }
.control-label { font-size: 13px; color: #999; }
.policy-footer { margin-top: 18px; margin-left: 30px; }
.highlight-val { color: #409EFF; font-weight: bold; }
.footer-analysis { background-color: #fcfcfc; padding: 25px; border-top: 1px solid #ebeef5; margin-top: 20px; }
.analysis-row { margin-bottom: 12px; font-size: 14px; }
.comp-line { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px; font-size: 14px; color: #606266; }
/* 汇总表容器：固定高度 + 滚动 */
.summary-table-container {
  max-height: 600px; /* 可根据需要调整高度，比如500px/700px */
  overflow-y: auto;
  overflow-x: hidden; /* 横向禁止滚动（表格已有fixed列） */
}

/* 汇总表容器：固定高度 + 滚动条（修复版） */
.summary-table-container {
  max-height: 600px; /* 可调整高度 */
  overflow-y: auto;
  overflow-x: auto; /* 恢复横向滚动，避免列被截断 */
  min-height: 300px;
}

/* 移除对表格body-wrapper的高度限制（核心：让表格渲染所有数据） */
:deep(.summary-table-container .el-table__body-wrapper) {
  max-height: none !important; 
}

/* 滚动条美化 */
:deep(.summary-table-container::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}
:deep(.summary-table-container::-webkit-scrollbar-thumb) {
  background-color: #dcdfe6;
  border-radius: 3px;
}
/* 项目更新表单样式适配 */
.project-edit-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.form-btn-group {
  margin-top: 20px;
  padding-left: 40%; /* 对齐表单标签宽度 */
  
}
/* 补充：表单栅格布局样式，让表单更整齐 */
.form-row {
  margin-bottom: 16px; /* 每行表单项间距 */
}
/* 统一表单输入框/选择器的高度，保持视觉一致 */
:deep(.project-edit-form .el-input),
:deep(.project-edit-form .el-input-number),
:deep(.project-edit-form .el-select),
:deep(.project-edit-form .el-date-picker) {
  height: 40px; /* 统一高度 */
}
:deep(.project-edit-form .el-input__inner),
:deep(.project-edit-form .el-select__wrapper),
:deep(.project-edit-form .el-date-picker__input-wrapper input) {
  height: 40px; /* 统一输入框内部高度 */
  line-height: 40px; /* 垂直居中 */
}
:deep(.project-edit-form .el-textarea__inner) {
  min-height: 100px; /* 备注输入框最小高度 */
}



</style>











