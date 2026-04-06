<template>
  <div class="archive-container ">
    
    <ProjectFilterBar
      v-model="filterProject"
      :project-options="projectOptions"
      :current-project-id="currentProjectInfo.id"
      @search="handleGlobalSearch"
      @create-project="showCreateProjectDialog = true"
    />

    <div class="content-tabs-wrapper no-print">
      <el-tabs v-model="activeTab" type="border-card" class="archive-tabs no-print">

        <el-tab-pane name="archives" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><FolderOpened /></el-icon> 归档文件查询
            </span>
          </template>
          <ArchiveFolderTab
            ref="archiveTabRef"
            :project-id="currentProjectInfo.id"
            :project-name="currentProjectInfo.name"
            :initial-archive-id="initialArchiveId"
            :pending-audit-file-id="pendingAuditFileId"
            :active="activeTab === 'archives'"
            @audit-consumed="pendingAuditFileId = ''"
          />
        </el-tab-pane>

        <el-tab-pane name="summary">
          <template #label><span class="custom-tab-label"><el-icon><DataAnalysis /></el-icon> 房产实测汇总表</span></template>
          
          <div class="tab-content">
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
              :parsed-refresh-loading="parsedRefreshLoading"
              :is-refresh-cd="isRefreshCd"
              :cd-remaining="cdRemaining"
              :display-table-data="displayTableData"
              @refresh-survey="handleRefreshSurveyData"
              @refresh-parsed="handleRefreshParsedOnly"
              @view-detail="viewDetail"
              @print="handlePrint"
              @export="handleExportExcel"
            />

            <SummaryComparisonCard :table-total-data="tableTotalData" :debug-sums="measuredDebugSums" />
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
            @refresh-contracts="handleRefreshContracts"
            @add-contract="addContract"
            @contract-row-click="handleContractRowClick"
            @edit-contract="editContract"
            @delete-contract="deleteContract"
            @add-land-parcel="addLandParcel"
            @edit-land-parcel="editLandParcel"
            @delete-land-parcel="deleteLandParcel"
          />
        </el-tab-pane>

        <el-tab-pane name="planningReview" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Document /></el-icon> 规划复核表
            </span>
          </template>
          <PlanningReviewTab
            :project-id="currentProjectInfo.id"
            :active="activeTab === 'planningReview'"
          />
        </el-tab-pane>

        <el-tab-pane name="projectPartySummary" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Document /></el-icon> 项目方汇总表
            </span>
          </template>
          <ProjectPartySummaryTab
            :project-id="currentProjectInfo.id"
            :active="activeTab === 'projectPartySummary'"
          />
        </el-tab-pane>

        <el-tab-pane name="operationAudit" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Tickets /></el-icon> 审计日志
            </span>
          </template>
          <OperationAuditTab
            :project-id="currentProjectInfo.id"
            :active="activeTab === 'operationAudit'"
          />
        </el-tab-pane>

        <!-- 项目信息更新放在最后 -->
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
        :report-audit-info="reportAuditInfo"
        :room-info-data="roomInfoData"
        :detail-loading="detailLoading"
        :current-detail-row="currentDetailRow"
        :can-jump-audit="canJumpAuditFromDetail"
        :report-basic-info-form="reportBasicInfoForm"
        :report-basic-info-saving="reportBasicInfoSaving"
        @jump-audit="handleJumpAuditFromDetail"
        @save-basic-info="saveReportBasicInfo"
        @update:propertyCertificateNumber="(v) => (reportBasicInfoForm.propertyCertificateNumber = v)"
        @update:propertyAreaConfirmationNoticeNumber="(v) => (reportBasicInfoForm.propertyAreaConfirmationNoticeNumber = v)"
      />

      <ContractEditDialog
        v-model="contractDialogVisible"
        :form="contractForm"
        :rules="contractFormRules"
        :loading="contractFormLoading"
        :set-form-ref="setContractFormRef"
        @submit="submitContractForm"
      />

      <ContractWorkspaceDialog
        v-model="contractWorkspaceVisible"
        :form="contractForm"
        :rules="contractFormRules"
        :loading="contractFormLoading"
        :set-form-ref="setContractFormRef"
        :pdf-url="contractWorkspacePdfUrl"
        :pdf-loading="contractWorkspacePdfLoading"
        :file-name="contractWorkspaceFileName"
        :file-options="contractFileOptions"
        :file-options-loading="contractFileOptionsLoading"
        :selected-file-id="selectedPreviewFileId"
        @submit="submitContractForm"
        @update:selected-file-id="handleSelectPreviewFile"
      />

      <LandParcelEditDialog
        v-model="landParcelDialogVisible"
        :form="landParcelForm"
        :rules="landParcelFormRules"
        :loading="landParcelFormLoading"
        :set-form-ref="setLandParcelFormRef"
        :pdf-url="contractWorkspacePdfUrl"
        :pdf-loading="contractWorkspacePdfLoading"
        :file-options="contractFileOptions"
        :file-options-loading="contractFileOptionsLoading"
        :selected-file-id="selectedPreviewFileId"
        @submit="submitLandParcelForm"
        @update:selected-file-id="handleSelectPreviewFile"
      />

      <el-dialog v-model="showCreateProjectDialog" title="新建项目" width="500px">
        <el-form label-position="top">
          <el-form-item label="项目名称" required>
            <el-input v-model.trim="newProjectForm.projectName" placeholder="请输入项目名称" maxlength="30" />
          </el-form-item>
          <el-form-item label="项目时间" required>
            <el-date-picker
              v-model="newProjectForm.projectTime"
              type="month"
              value-format="YYYY年MM月"
              format="YYYY年M月"
              placeholder="请选择项目时间"
              style="width: 100%;"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateProjectDialog = false">取消</el-button>
          <el-button type="primary" :loading="createProjectLoading" @click="handleCreateProjectFromTab">
            立即创建
          </el-button>
        </template>
      </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch , onUnmounted, nextTick} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, Document, Tickets } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createProject } from '@/services/project.service'

import { usePrint } from '@/hooks/usePrint.ts'
import { useProjectSelector } from '@/composables/project-list/useProjectSelector'
import ProjectFilterBar from '@/components/project-list/ProjectFilterBar.vue'
import UnknownUsagePolicyCard from '@/components/project-list/UnknownUsagePolicyCard.vue'
import SummaryTableCard from '@/components/project-list/SummaryTableCard.vue'
import SummaryComparisonCard from '@/components/project-list/SummaryComparisonCard.vue'
import PrintSummaryBlock from '@/components/project-list/PrintSummaryBlock.vue'
import ProjectDetailDialog from '@/components/project-list/ProjectDetailDialog.vue'
import ContractEditDialog from '@/components/project-list/ContractEditDialog.vue'
import ContractWorkspaceDialog from '@/components/project-list/ContractWorkspaceDialog.vue'
import LandParcelEditDialog from '@/components/project-list/LandParcelEditDialog.vue'
import ProjectEditForm from '@/components/project-list/ProjectEditForm.vue'
import ContractLandTab from '@/components/project-list/ContractLandTab.vue'
import ArchiveFolderTab from '@/components/project-list/ArchiveFolderTab.vue'
import OperationAuditTab from '@/components/project-list/OperationAuditTab.vue'
import PlanningReviewTab from '@/components/project-list/PlanningReviewTab.vue'
import ProjectPartySummaryTab from '@/components/project-list/ProjectPartySummaryTab.vue'
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
const router = useRouter()
const initialArchiveId = ref(
  String(route.query.fromAuditReturn || '') === '1' ? String(route.query.archiveId || '') : ''
)
const initialReturnTab = ref(
  String(route.query.fromAuditReturn || '') === '1' ? String(route.query.tab || 'archives') : ''
)
const pendingAuditFileId = ref('')
const archiveTabRef = ref(null)

// 组件卸载时清理事件，避免内存泄漏
onUnmounted(() => {
  clearRefreshTimer();
})

// 页面状态
const activeTab = ref('summary')
const showCreateProjectDialog = ref(false)
const createProjectLoading = ref(false)
const newProjectForm = ref({
  projectName: '',
  projectTime: ''
})


// 列表数据
const reportList = ref([])
const contractList = ref([])
const {
  tableTotalData,
  rawTableData,
  unknownUsages,
  isSavingPolicy,
  displayTableData,
  measuredDebugSums,
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
  currentDetailRow,
  reportAuditInfo,
  reportBasicInfoForm,
  reportBasicInfoSaving,
  viewDetail,
  saveReportBasicInfo
} = useProjectDetailDialog({
  currentProjectInfo,
  rawTableData,
  fetchSurveyReports
})

const resolveAuditFileRecordId = (row) => {
  const raw = row?.fileRecordId || row?.fileId || row?.file_record_id || row?.sourceFileRecordId || row?.source_file_record_id
  return raw ? String(raw) : ''
}

const canJumpAuditFromDetail = computed(() => !!resolveAuditFileRecordId(currentDetailRow.value))

const handleJumpAuditFromDetail = async (row) => {
  const fileRecordId = resolveAuditFileRecordId(row)
  if (!fileRecordId) {
    ElMessage.warning('当前记录缺少 fileRecordId，无法直达审核')
    return
  }
  await nextTick()
  if (!archiveTabRef.value?.openAuditByFileRecordId) {
    ElMessage.warning('审核组件尚未就绪，请稍后再试')
    return
  }
  await archiveTabRef.value.openAuditByFileRecordId(fileRecordId, { force: true })
}
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
const parsedRefreshLoading = ref(false)
const handleRefreshParsedOnly = async () => {
  if (!currentProjectInfo.id) {
    ElMessage.warning('请先选择项目后再刷新')
    return
  }
  parsedRefreshLoading.value = true
  try {
    await fetchSurveyReports(currentProjectInfo.id)
    ElMessage.success('已刷新已解析实测报告数据')
  } catch (error) {
    console.error('刷新已解析列表失败:', error)
    ElMessage.error('刷新失败，请稍后重试')
  } finally {
    parsedRefreshLoading.value = false
  }
}
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
  contractWorkspaceVisible,
  contractWorkspacePdfUrl,
  contractWorkspacePdfLoading,
  contractWorkspaceFileName,
  contractFileOptions,
  contractFileOptionsLoading,
  selectedPreviewFileId,
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
  deleteLandParcel,
  handleSelectPreviewFile
} = useContractLandManagement({
  filterProject,
  currentProjectInfo
})

const handleRefreshContracts = async () => {
  if (!currentProjectInfo.id) {
    ElMessage.warning('请先查询项目后再刷新合同')
    return
  }
  await fetchContractListByProjectId(currentProjectInfo.id)
}
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
  currentProjectInfo,
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

const handleCreateProjectFromTab = async () => {
  const projectName = (newProjectForm.value.projectName || '').trim()
  const projectTime = (newProjectForm.value.projectTime || '').trim()
  if (!projectName) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!projectTime) {
    ElMessage.warning('请选择项目时间')
    return
  }

  createProjectLoading.value = true
  try {
    const res = await createProject(projectName, projectTime)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '项目创建成功')
      showCreateProjectDialog.value = false
      newProjectForm.value = { projectName: '', projectTime: '' }

      await fetchProjectList()
      const target = projectOptions.value.find((item) => item.name === projectName)
      if (target?.id) {
        filterProject.value = target.id
        await handleGlobalSearch()
      }
    } else {
      ElMessage.warning(res.data?.msg || '项目创建失败')
    }
  } catch (error) {
    console.error('项目创建失败:', error)
    ElMessage.error(error?.response?.data?.msg || '项目创建失败')
  } finally {
    createProjectLoading.value = false
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

watch(
  () => route.query.tab,
  async () => {
    const fromAuditReturn = String(route.query.fromAuditReturn || '') === '1'
    if (!fromAuditReturn) return

    const tabName = String(route.query.tab || '')
    if (['summary', 'contractLandEdit', 'projectEdit', 'archives', 'planningReview', 'projectPartySummary', 'operationAudit'].includes(tabName)) {
      activeTab.value = tabName
      initialReturnTab.value = tabName
    }
    if (route.query.archiveId) {
      initialArchiveId.value = String(route.query.archiveId)
    }

    const cleanQuery = { ...route.query }
    delete cleanQuery.fromAuditReturn
    delete cleanQuery.tab
    await router.replace({ query: cleanQuery })
  },
  { immediate: true }
)

watch(
  () => route.query.projectId,
  async (projectId) => {
    const pid = String(projectId || '')
    if (!pid) return
    if (filterProject.value !== pid) {
      filterProject.value = pid
    }
    await handleGlobalSearch()
  }
)

watch(activeTab, async (tab, prevTab) => {
  if (!currentProjectInfo.id) return

  if (tab === 'contractLandEdit') {
    await fetchContractListByProjectId(currentProjectInfo.id)
    return
  }

  if (tab === 'summary' && prevTab !== 'summary') {
    await fetchSurveyReports(currentProjectInfo.id)
  }
})

// 页面初始化：恢复项目选择并加载数据
onMounted(async () => {
  // A. 先拉取项目列表（填充下拉框）
  await fetchProjectList()
  if (initialReturnTab.value && ['summary', 'contractLandEdit', 'projectEdit', 'archives', 'planningReview', 'projectPartySummary', 'operationAudit'].includes(initialReturnTab.value)) {
    activeTab.value = initialReturnTab.value
    initialReturnTab.value = ''
  } else {
    activeTab.value = 'summary'
  }

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
.archive-container {
  padding: 12px;
  background-color: var(--biz-page-bg);
  min-height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
}

.content-tabs-wrapper {
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
  flex: 1;
}

.tab-content {
  padding: 20px;
}

:deep(.archive-tabs.el-tabs--border-card) {
  border: 1px solid var(--biz-border);
  border-radius: 6px;
  box-shadow: none;
}

:deep(.archive-tabs.el-tabs--border-card > .el-tabs__header) {
  background: var(--biz-header-bg);
  border-bottom: 1px solid var(--biz-border);
}

:deep(.archive-tabs .el-tabs__item) {
  height: 42px;
  color: #4a5568;
  font-weight: 600;
}

:deep(.archive-tabs .el-tabs__item.is-active) {
  color: var(--biz-primary);
  background: #ffffff;
}

:deep(.archive-tabs .el-tabs__content) {
  background: #fff;
}

:deep(.archive-tabs .el-button) {
  border-radius: 6px;
  font-weight: 600;
}

:deep(.archive-tabs .el-button--primary) {
  background: var(--biz-btn-soft-bg);
  border-color: #c8ddf1;
  color: var(--biz-btn-soft-text);
}
</style>
