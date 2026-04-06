<template>
  <div class="archive-tab">
    <div class="tab-content">
      <div class="archive-toolbar">
        <div class="toolbar-left">
          <el-tag type="info" effect="plain">项目：{{ projectNameText }}</el-tag>
          <span class="folder-count">归档夹数量：{{ archiveList.length }}</span>
          <div class="toolbar-actions">
            <el-button class="toolbar-btn primary" size="small" type="primary" :icon="FolderAdd" @click="openCreateDialog" :disabled="!projectId">
              新建文件夹
            </el-button>
            <el-button class="toolbar-btn upload-btn" size="small" type="primary" :icon="FolderAdd"  :disabled="!projectId || !selectedArchiveId" @click="openUploadDialog">
              文件上传
            </el-button>
          </div>
        </div>
        <div class="toolbar-right">
          <span class="socket-status" :class="`is-${socketStatus}`">
            {{ socketStatusText }}
          </span>
        </div>
      </div>

      <div ref="splitContainerRef" class="explorer-split">
        <section class="tree-panel" :style="{ flexBasis: `${treePanelWidth}px` }" v-loading="archiveLoading">
          <el-empty v-if="!projectId" description="请先选择项目后查看归档目录" />
          <el-tree
            v-else-if="treeData.length"
            class="archive-tree"
            :data="treeData"
            node-key="id"
            :props="treeProps"
            :expand-on-click-node="false"
            default-expand-all
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node-row" :class="{ selected: data.archiveId && data.archiveId === selectedArchiveId }">
                <el-icon class="folder-icon">
                  <FolderOpened v-if="data.nodeType === 'project'" />
                  <Folder v-else />
                </el-icon>
                <span class="node-name">{{ data.name }}</span>
                <span class="node-actions">
                  <el-popconfirm
                    v-if="data.nodeType === 'archive'"
                    title="确认删除该归档夹？"
                    @confirm="handleDeleteArchive(data)"
                  >
                    <template #reference>
                      <el-button size="small" type="danger" text :icon="Delete" @click.stop title="删除归档夹" />
                    </template>
                  </el-popconfirm>
                </span>
              </div>
            </template>
          </el-tree>
          <el-empty v-else description="暂无归档夹" />
        </section>

        <div
          class="splitter-handle"
          title="拖动调整目录与文件列表宽度"
          @mousedown="handleSplitterMouseDown"
        />

        <section class="table-panel">

          <div class="query-row">
            <div class="batch-actions">
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="selectedRows.length === 0"
                :loading="batchDeleteLoading"
                @click="handleBatchDelete"
              >
                批量删除
              </el-button>
              <el-button
                size="small"
                type="primary"
                plain
                :disabled="!canBatchParse"
                :loading="batchParseLoading"
                @click="handleBatchParse"
              >
                批量解析
              </el-button>
            </div>
            <div class="query-fields">
              <el-input
                v-model.trim="queryForm.keyword"
                placeholder="请输入文件名关键词"
                clearable
                class="query-item keyword"
                @keyup.enter="handleSearch"
              />
              <el-select v-model="queryForm.fileType" placeholder="文件类型" clearable class="query-item">
                <el-option v-for="item in fileTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-select v-model="queryForm.fileState" placeholder="文件状态" clearable class="query-item">
                <el-option v-for="item in fileStateOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="query-actions">
              <el-button size="small" type="primary" @click="handleSearch">查询</el-button>
              <el-button size="small" @click="handleReset">重置</el-button>
              <el-button size="small" :icon="Refresh" @click="refreshFiles">刷新</el-button>
            </div>
          </div>

          <div class="table-wrap" v-loading="fileLoading">
            <el-empty v-if="!selectedArchiveId" description="选择归档夹后展示文件" />
            <template v-else>
              <el-table
                :data="archiveFiles"
                stripe
                border
                :height="tableBodyHeight"
                row-key="id"
                @selection-change="handleSelectionChange"
              >
                <el-table-column type="selection" width="48" align="center" />
                <el-table-column v-if="showThumbnailColumn" label="缩略图" width="95" align="center">
                  <template #default="{ row }">
                    <el-image
                      v-if="getThumbnailUrl(row)"
                      class="thumb"
                      :src="getThumbnailUrl(row)"
                      fit="cover"
                      :preview-src-list="getThumbnailPreviewList(row)"
                      :preview-teleported="true"
                    >
                      <template #error>
                        <div class="thumb-placeholder">
                          <el-icon><Picture /></el-icon>
                        </div>
                      </template>
                    </el-image>
                    <div v-else class="thumb-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="originalName" label="文件名/编号" min-width="280" show-overflow-tooltip />
                <el-table-column label="上传时间" width="180" align="center">
                  <template #default="{ row }">{{ formatDateTime(row.uploadTime) }}</template>
                </el-table-column>
                <el-table-column label="文件类型" width="110" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" effect="plain">{{ row.fileType || '-' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="130" align="center">
                  <template #default="{ row }">
                    <el-tag :type="getStateTagType(row.fileState)" size="small" effect="light">
                      {{ getStateLabel(row.fileState) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="selectedArchive?.kind === 'SURVEY_REPORT'" label="校验状态" width="130" align="center">
                  <template #default="{ row }">
                    <el-tooltip
                      v-if="getVerifyStatus(row).type === 'danger' && row.verificationErrorReason"
                      :content="row.verificationErrorReason"
                      placement="top"
                      effect="light"
                    >
                      <el-tag :type="getVerifyStatus(row).type" size="small" effect="light">
                        {{ getVerifyStatus(row).label }}
                      </el-tag>
                    </el-tooltip>
                    <el-tag v-else :type="getVerifyStatus(row).type" size="small" effect="light">
                      {{ getVerifyStatus(row).label }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="大小" width="100" align="center">
                  <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="220" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button
                      v-if="showParseButton(row)"
                      class="op-btn parse-btn"
                      size="small"
                      type="primary"
                      @click="handleParse(row)"
                    >
                      {{ parseButtonText(row) }}
                    </el-button>
                    <el-button
                      v-if="showCancelParseButton(row)"
                      class="op-btn"
                      link
                      type="warning"
                      @click="handleCancelParse(row)"
                    >
                      取消解析
                    </el-button>
                    <el-button
                      v-if="showAuditButton(row)"
                      class="op-btn audit-btn"
                      size="small"
                      type="primary"
                      plain
                      @click="handleAudit(row)"
                    >
                      {{ row.fileState === 'AUDIT_PASS' ? '查看' : '审核' }}
                    </el-button>
                    <el-popconfirm title="确定删除该文件吗？" @confirm="handleDeleteFile(row)">
                      <template #reference>
                        <el-button class="op-btn delete-btn" size="small" type="danger" plain>删除</el-button>
                      </template>
                    </el-popconfirm>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pager-row">
                <span class="file-count">共 {{ fileTotal }} 个文件，已选 {{ selectedRows.length }} 个</span>
                <el-pagination
                  background
                  layout="total, sizes, prev, pager, next"
                  :total="fileTotal"
                  :page-size="queryForm.pageSize"
                  :current-page="queryForm.pageNum"
                  :page-sizes="[10, 20, 50, 100]"
                  @size-change="handlePageSizeChange"
                  @current-change="handlePageChange"
                />
              </div>
            </template>
          </div>
        </section>
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" title="新建文件夹" width="420px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px" @submit.prevent>
        <el-form-item label="名称" prop="name">
          <el-input
            v-model.trim="createForm.name"
            maxlength="30"
            show-word-limit
            placeholder="例如：现场图片"
            clearable
            @keydown.enter.prevent
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button native-type="button" @click="createDialogVisible = false">取消</el-button>
        <el-button native-type="button" type="primary" :loading="createLoading" @click="submitCreateArchive">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialogVisible" title="文件上传" width="640px" @closed="resetUploadForm">
      <el-form label-position="top">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="文件归类">
              <el-select v-model="uploadForm.fileContextType" class="upload-select">
                <el-option label="合同文件" value="CONTRACT" />
                <el-option label="实测报告" value="SURVEY_REPORT" />
                <el-option label="项目方实测汇总表" value="PROJECT_PARTY_SURVEY_SUMMARY" />
                <el-option label="规划复核文件" value="PLANNING_REVIEW" />
                <el-option label="其他文件" value="OTHER" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="uploadForm.fileContextType === 'SURVEY_REPORT'" :span="12">
            <el-form-item v-if="uploadForm.fileContextType === 'SURVEY_REPORT'" label="期数（实测报告必填）">
              <el-input-number v-model="uploadForm.phase" :min="1" :max="99" controls-position="right" class="upload-phase" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="目标归档夹">
          <el-select v-model="uploadForm.archiveId" class="upload-select" placeholder="请选择要上传到的归档夹">
            <el-option
              v-for="item in archiveList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <div class="upload-tip">
            当前接口规则：仅当文件归类为“其他文件”时，后端使用 archiveId 进行归档落位。
          </div>
        </el-form-item>
        <el-upload
          drag
          action="#"
          :auto-upload="false"
          multiple
          :file-list="uploadFiles"
          :on-change="handleUploadFileChange"
          :on-remove="handleUploadFileRemove"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖拽到此处，或点击选择文件</div>
        </el-upload>
        <el-progress
          v-if="uploadLoading"
          :percentage="uploadProgress"
          :stroke-width="10"
          :show-text="true"
          class="upload-progress"
        />
        <div v-if="uploadLoading" class="upload-progress-bytes">
          已上传 {{ formatFileSize(uploadUploadedBytes) }} / {{ formatFileSize(uploadTotalBytes) }}
        </div>
        <div v-if="uploadLoading" class="upload-progress-tip">
          进度条仅表示文件传输到服务器的进度，不代表解析完成。
        </div>
      </el-form>
      <template #footer>
        <div class="upload-footer">
          <span>已选择 {{ uploadFiles.length }} 个文件</span>
          <div>
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="uploadLoading" :disabled="uploadFiles.length === 0" @click="handleBatchUpload">
              确认上传
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <CalibrationWorkspaceDialog
      v-model="showCalibration"
      :current-file="currentFile"
      :is-editing="isEditing"
      :editing-row-id="editingRowId"
      :start-row-edit="enterEditMode"
      :handle-usage-category-change="handleEditUsageCategoryChange"
      :exit-edit-mode="exitEditMode"
      :handle-save-data="handleSaveData"
      :handle-refresh-survey-report="handleRefreshSurveyReport"
      :handle-create-room="handleCreateRoom"
      :handle-delete-room="handleDeleteRoom"
      :room-create-loading="roomCreateLoading"
      :room-delete-loading="roomDeleteLoading"
      :report-refresh-loading="reportRefreshLoading"
      :handle-audit-pass="handleAuditPass"
      :calibration-loading="calibrationLoading"
      :current-view-type="currentViewType"
      :is-preprocess-available="isPreprocessAvailable"
      :switch-view="switchView"
      :pdf-loading="pdfLoading"
      :calibration-pdf-url="calibrationPdfUrl"
      :pdf-loaded="pdfLoaded"
      :pdf-load-error="pdfLoadError"
      :recognition-md-loading="recognitionMdLoading"
      :recognition-html="recognitionHtml"
      :audit-summary-data="auditSummaryData"
      :audit-summary-display="auditSummaryDisplay"
      :room-info-data="roomInfoData"
      :room-info-loading="roomInfoLoading"
      @back="handleCalibrationBack"
      @closed="handleCalibrationClosed"
    />

    <PlanningReviewAuditDialog
      v-model="planningReviewAuditVisible"
      :project-id="projectId"
      :form-data="planningReviewAuditForm"
    />

    <ProjectPartySummaryAuditDialog
      v-model="partySummaryAuditVisible"
      :project-id="projectId"
      :file-record-id="partySummaryAuditFileRecordId"
      :initial-file="partySummaryAuditInitialFile"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Folder, FolderAdd, FolderOpened, Picture, Refresh, UploadFilled } from '@element-plus/icons-vue'
import CalibrationWorkspaceDialog from '@/components/file-upload/CalibrationWorkspaceDialog.vue'
import PlanningReviewAuditDialog from '@/components/project-list/PlanningReviewAuditDialog.vue'
import ProjectPartySummaryAuditDialog from '@/components/project-list/ProjectPartySummaryAuditDialog.vue'
import { useCalibrationState } from '@/composables/file-upload/useCalibrationState'
import { useCalibrationViewer } from '@/composables/file-upload/useCalibrationViewer'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow'
import { useCalibrationActions } from '@/composables/file-upload/useCalibrationActions'
import { useFileUploadConstants, useAuditSummaryDisplay } from '@/composables/file-upload/useFileUploadConstants'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import { useProjectStomp } from '@/composables/project-list/useProjectStomp'
import { queryPlanningReviewForms } from '@/services/project.service'
import {
  batchUploadFiles,
  cancelParseByFileId,
  createProjectArchive,
  deleteFileById,
  deleteProjectArchive,
  getProjectArchives,
  parseFileById,
  queryFiles
} from '@/services/file.service'
import {
  fetchUnreadStationNotifications,
  markStationNotificationsRead
} from '@/services/station-notification.service'

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: ''
  },
  projectName: {
    type: String,
    default: ''
  },
  initialArchiveId: {
    type: [String, Number],
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  },
  pendingAuditFileId: {
    type: [String, Number],
    default: ''
  }
})
const emit = defineEmits(['audit-consumed'])

const fileTypeOptions = [
  { label: 'PDF', value: 'PDF' },
  { label: 'XLS', value: 'XLS' },
  { label: 'XLSX', value: 'XLSX' },
  { label: 'DOC', value: 'DOC' },
  { label: 'DOCX', value: 'DOCX' },
  { label: 'PNG', value: 'PNG' },
  { label: 'JPEG', value: 'JPEG' },
  { label: 'GIF', value: 'GIF' },
  { label: 'UNKNOWN', value: 'UNKNOWN' }
]

const fileStateOptions = [
  { label: '上传中', value: 'UPLOADING' },
  { label: '待解析', value: 'WAITING_PARSE' },
  { label: '待处理', value: 'PENDING' },
  { label: '解析中', value: 'PARSING' },
  { label: '解析失败', value: 'PARSE_FAIL' },
  { label: '解析完成', value: 'PARSE_COMPLETE' },
  { label: '不可解析', value: 'UNPARSEABLE' },
  { label: '审核中', value: 'AUDITING' },
  { label: '审核通过', value: 'AUDIT_PASS' },
  { label: '审核失败', value: 'AUDIT_FAIL' }
]

const archiveLoading = ref(false)
const fileLoading = ref(false)
const batchDeleteLoading = ref(false)
const batchParseLoading = ref(false)
const uploadLoading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const planningReviewAuditVisible = ref(false)
const planningReviewAuditForm = ref(null)
const partySummaryAuditVisible = ref(false)
const partySummaryAuditFileRecordId = ref('')
const partySummaryAuditInitialFile = ref(null)
const createFormRef = ref(null)

const archiveList = ref([])
const archiveFiles = ref([])
const selectedRows = ref([])
const fileTotal = ref(0)
const selectedArchiveId = ref(null)
const selectedArchiveName = ref('')
const fileQuerySeq = ref(0)
const archiveQueryCache = new Map()
const ARCHIVE_CACHE_TTL = 12000
let currentFileQueryController = null

const createForm = ref({
  name: ''
})

const uploadForm = reactive({
  fileContextType: 'OTHER',
  phase: 1,
  archiveId: null
})
const uploadFiles = ref([])
const uploadProgress = ref(0)
const uploadUploadedBytes = ref(0)
const uploadTotalBytes = ref(0)

const queryForm = reactive({
  keyword: '',
  fileType: '',
  fileState: '',
  pageNum: 1,
  pageSize: 20
})
const tableBodyHeight = 670
const currentProject = computed(() => String(props.projectId || ''))
const splitContainerRef = ref(null)
const treePanelWidth = ref(380)
const minTreePanelWidth = 280
const minTablePanelWidth = 620
let isDraggingSplitter = false

const { usageCategoryMap, usageCategoryReverseMap } = useFileUploadConstants()
const { roomInfoLoading, roomInfoData, roomSumInfo, showCalibration, calibrationLoading, currentFile, auditSummaryData } = useCalibrationState()
const { auditSummaryDisplay } = useAuditSummaryDisplay(auditSummaryData)
const isEditing = ref(false)
const editingRowId = ref('')
const batchUpdateLoading = ref(false)

const {
  currentViewType,
  preprocessGridfsId,
  isPreprocessAvailable,
  recognitionMdContent,
  recognitionMdLoading,
  calibrationPdfUrl,
  pdfLoading,
  realSurveyReportId,
  switchView,
  resetCalibrationState,
  openCalibration,
  pdfLoaded,
  pdfLoadError
} = useCalibrationViewer({
  currentProject,
  showCalibration,
  currentFile,
  calibrationLoading,
  roomInfoLoading,
  roomInfoData,
  roomSumInfo,
  auditSummaryData,
  usageCategoryMap
})

const { recognitionHtml } = useRecognitionMarkdown({ recognitionMdContent })
  const {
  enterEditMode,
  handleEditUsageCategoryChange,
  exitEditMode,
  handleSaveData,
  handleRefreshSurveyReport,
  handleCreateRoom,
  handleDeleteRoom,
  roomCreateLoading,
  roomDeleteLoading,
  reportRefreshLoading
} = useRoomEditWorkflow({
  currentProject,
  realSurveyReportId,
  currentFile,
  roomInfoData,
  roomInfoLoading,
  isEditing,
  editingRowId,
  batchUpdateLoading,
  usageCategoryMap,
  usageCategoryReverseMap,
  auditSummaryData
})
const { handleAuditPass } = useCalibrationActions({
  showCalibration,
  resetCalibrationState,
  refreshData: fetchArchiveFiles,
  currentFile,
  realSurveyReportId
})

const stateLabelMap = {
  UPLOADING: '上传中',
  WAITING_PARSE: '待解析',
  PENDING: '待处理',
  PARSING: '解析中',
  PARSE_FAIL: '解析失败',
  PARSE_COMPLETE: '解析完成',
  UNPARSEABLE: '不可解析',
  AUDITING: '审核中',
  AUDIT_PASS: '审核通过',
  AUDIT_FAIL: '审核失败'
}

const parseSceneToState = {
  PARSE_PENDING: 'PENDING',
  PARSE_START: 'PARSING',
  PARSE_SUCCESS: 'PARSE_COMPLETE',
  PARSE_FAILED: 'PARSE_FAIL',
  PARSE_FAIL: 'PARSE_FAIL'
}

const projectNameText = computed(() => props.projectName || '未选择项目')
const selectedArchive = computed(() => archiveList.value.find((item) => item.id === selectedArchiveId.value))
const showThumbnailColumn = computed(
  () => String(selectedArchive.value?.kind || '').toUpperCase() !== 'PROJECT_PARTY_SURVEY_SUMMARY'
)
const canBatchParse = computed(() =>
  selectedRows.value.some((row) => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.fileState))
)

const createRules = {
  name: [
    { required: true, message: '请输入归档夹名称', trigger: 'blur' },
    { min: 2, max: 30, message: '名称长度需在 2 到 30 个字符', trigger: 'blur' }
  ]
}

const treeProps = {
  label: 'name',
  children: 'children'
}

const treeData = computed(() => {
  if (!props.projectId || archiveList.value.length === 0) return []
  return [
    {
      id: `project-${props.projectId}`,
      name: projectNameText.value,
      nodeType: 'project',
      children: archiveList.value.map((item) => ({
        id: `archive-${item.id}`,
        archiveId: item.id,
        name: item.name,
        nodeType: 'archive'
      }))
    }
  ]
})

const formatFileSize = (bytes) => {
  const value = Number(bytes || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text
}

const getStateLabel = (state) => stateLabelMap[state] || state || '-'

const getStateTagType = (state) => {
  if (state === 'PARSE_COMPLETE' || state === 'AUDIT_PASS') return 'success'
  if (state === 'PARSE_FAIL' || state === 'AUDIT_FAIL' || state === 'UNPARSEABLE') return 'danger'
  if (state === 'PARSING' || state === 'AUDITING') return 'warning'
  return 'info'
}

const getVerifyStatus = (row) => {
  const value = row?.isVerified
  if (value === 1 || value === '1' || value === true) {
    return { label: '已通过', type: 'success' }
  }
  if (value === 0 || value === '0' || value === false) {
    return { label: '未通过', type: 'danger' }
  }
  return { label: '未校验', type: 'info' }
}

const getFileRecordId = (row) => row?.id || row?.rawId || row?.fileRecordId || null

const shouldSkipThumbnail = (row) => {
  const contextType = String(row?.fileContextType || '').toUpperCase()
  if (contextType === 'PROJECT_PARTY_SURVEY_SUMMARY') return true
  const fileType = String(row?.fileType || '').toUpperCase()
  return fileType === 'XLS' || fileType === 'XLSX'
}

const getThumbnailUrl = (row) => {
  if (shouldSkipThumbnail(row)) return ''
  if (row?.thumbGridfsId) return `/api/file/download/gridfs/${row.thumbGridfsId}`
  return ''
}

const getThumbnailPreviewList = (row) => {
  const src = getThumbnailUrl(row)
  return src ? [src] : []
}

let realtimeRefreshTimer = null
let realtimePendingRefresh = false
let readAckTimer = null
const pendingReadMessageIds = new Set()
const handledMessageIdOrder = []
const handledMessageIds = new Set()
const MAX_HANDLED_MESSAGE_IDS = 2000

const normalizeNotificationList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.records)) return payload.records
  if (Array.isArray(payload?.list)) return payload.list
  if (Array.isArray(payload?.rows)) return payload.rows
  return []
}

const extractMessageId = (payload) => String(payload?.messageId || payload?.id || '').trim()

const registerHandledMessageId = (messageId) => {
  if (!messageId) return true
  if (handledMessageIds.has(messageId)) return false
  handledMessageIds.add(messageId)
  handledMessageIdOrder.push(messageId)
  if (handledMessageIdOrder.length > MAX_HANDLED_MESSAGE_IDS) {
    const stale = handledMessageIdOrder.shift()
    if (stale) handledMessageIds.delete(stale)
  }
  return true
}

const scheduleReadAck = () => {
  if (readAckTimer) return
  readAckTimer = setTimeout(async () => {
    readAckTimer = null
    const ids = [...pendingReadMessageIds]
    if (!ids.length) return
    try {
      await markStationNotificationsRead(ids)
      ids.forEach((id) => pendingReadMessageIds.delete(id))
    } catch (error) {
      console.error('确认站内通知已读失败:', error)
    }
  }, 600)
}

const handleIncomingNotification = (payload, topicHint = '') => {
  if (!payload || typeof payload !== 'object') return
  const messageId = extractMessageId(payload)
  if (!registerHandledMessageId(messageId)) return
  if (messageId) {
    pendingReadMessageIds.add(messageId)
    scheduleReadAck()
  }

  const scene = String(payload?.scene || '')
  const hint = String(topicHint || '').toUpperCase()
  const isBatchByScene = scene.includes('BATCH')
  const isBatchByHint = hint === 'BATCH'
  if (isBatchByScene || isBatchByHint) {
    handleRealtimeBatchUploadUpdate(payload)
    return
  }
  handleRealtimeFileUpdate(payload)
}

const fetchUnreadNotifications = async (projectId) => {
  const pid = String(projectId || props.projectId || '').trim()
  if (!pid) return
  try {
    const res = await fetchUnreadStationNotifications([pid])
    if (res?.data?.code !== 200) return
    const records = normalizeNotificationList(res?.data?.data)
    records.forEach((item) => {
      const body = item?.payload ?? item?.content ?? item?.data ?? item?.extra ?? item
      let parsed = body
      if (typeof body === 'string') {
        try {
          parsed = JSON.parse(body)
        } catch {
          parsed = {}
        }
      }
      const topicKey = String(item?.topicKey || item?.topic || item?.channel || '')
      const merged = {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        messageId: item?.messageId ?? item?.id ?? parsed?.messageId
      }
      if (String(merged?.projectId || '') && String(merged.projectId) !== pid) return
      handleIncomingNotification(merged, topicKey.includes('batch-upload') ? 'BATCH' : 'FILE')
    })
  } catch (error) {
    console.error('补拉站内未读通知失败:', error)
  }
}

const flushReadAckNow = async () => {
  if (readAckTimer) {
    clearTimeout(readAckTimer)
    readAckTimer = null
  }
  const ids = [...pendingReadMessageIds]
  if (!ids.length) return
  try {
    await markStationNotificationsRead(ids)
    ids.forEach((id) => pendingReadMessageIds.delete(id))
  } catch (error) {
    console.error('离开前确认站内通知已读失败:', error)
  }
}

const scheduleRealtimeRefresh = () => {
  realtimePendingRefresh = true
  archiveQueryCache.clear()
  if (!props.active) return
  if (realtimeRefreshTimer) return
  realtimeRefreshTimer = setTimeout(async () => {
    realtimeRefreshTimer = null
    if (!realtimePendingRefresh || !props.active) return
    realtimePendingRefresh = false
    await fetchArchiveFiles({ force: true })
  }, 1200)
}

const applyRealtimeRowState = (payload) => {
  const targetFileId = String(payload?.fileId || '')
  const nextState = parseSceneToState[payload?.scene] || ''
  if (!targetFileId || !nextState) return false
  let hit = false
  archiveFiles.value = archiveFiles.value.map((row) => {
    const rowFileId = String(getFileRecordId(row) || row?.fileId || '')
    if (rowFileId !== targetFileId) return row
    hit = true
    return {
      ...row,
      fileState: nextState,
      isVerified: payload?.isVerified ?? row.isVerified,
      verificationErrorReason: payload?.verificationErrorReason ?? row.verificationErrorReason
    }
  })
  return hit
}

const handleRealtimeFileUpdate = (payload) => {
  const scene = String(payload?.scene || '')
  if (!scene) return

  const isParseTerminalScene = scene === 'PARSE_SUCCESS' || scene === 'PARSE_FAILED' || scene === 'PARSE_FAIL'
  const isParseProgressScene = scene === 'PARSE_START' || scene === 'PARSE_PENDING'

  const rowUpdated = applyRealtimeRowState(payload)

  if (isParseProgressScene) {
    if (!rowUpdated) scheduleRealtimeRefresh()
    return
  }

  // 解析结束时必须整表刷新，确保校验状态与原因同步到最新
  if (isParseTerminalScene) {
    scheduleRealtimeRefresh()
    return
  }

  if (!rowUpdated) {
    scheduleRealtimeRefresh()
  }
}

const handleRealtimeBatchUploadUpdate = (payload) => {
  const scene = String(payload?.scene || '')
  if (!scene) return
  if (scene === 'BATCH_UPLOAD_COMPLETE') {
    // 批量上传任务完成后刷新，避免切换归档后出现状态滞后
    scheduleRealtimeRefresh()
  }
}

const showParseButton = (row) => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.fileState)
const showCancelParseButton = (row) => ['PENDING', 'PARSING'].includes(row.fileState)
const showAuditButton = (row) => {
  const contextType = String(row?.fileContextType || selectedArchive.value?.kind || '')
  if (contextType === 'CONTRACT') return false
  return ['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL', 'AUDIT_PASS'].includes(row.fileState)
}

const parseButtonText = (row) => {
  if (row.fileState === 'PARSE_FAIL') return '重试解析'
  if (row.fileState === 'PARSE_COMPLETE') return '重新解析'
  return '开始解析'
}

const resetFileQuery = () => {
  queryForm.keyword = ''
  queryForm.fileType = ''
  queryForm.fileState = ''
  queryForm.pageNum = 1
  queryForm.pageSize = 20
}

const clearFiles = () => {
  selectedArchiveId.value = null
  selectedArchiveName.value = ''
  archiveFiles.value = []
  selectedRows.value = []
  fileTotal.value = 0
  resetFileQuery()
}

const normalizeQueryResult = (payload) => {
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  const records = Array.isArray(payload?.records)
    ? payload.records
    : Array.isArray(payload?.list)
      ? payload.list
      : Array.isArray(payload?.rows)
        ? payload.rows
        : []
  return { records, total: Number(payload?.total ?? records.length) }
}

async function fetchArchiveFiles(options = {}) {
  const force = Boolean(options?.force)
  if (!props.projectId || !selectedArchiveId.value) {
    archiveFiles.value = []
    selectedRows.value = []
    fileTotal.value = 0
    return
  }

  const queryKey = JSON.stringify({
    projectId: Number(props.projectId),
    archiveId: Number(selectedArchiveId.value),
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    keyword: queryForm.keyword || '',
    fileType: queryForm.fileType || '',
    fileState: queryForm.fileState || ''
  })

  if (!force && archiveQueryCache.has(queryKey)) {
    const cached = archiveQueryCache.get(queryKey)
    const isFresh = Date.now() - Number(cached?.cachedAt || 0) <= ARCHIVE_CACHE_TTL
    if (isFresh) {
      archiveFiles.value = cached.records
      selectedRows.value = []
      fileTotal.value = cached.total
      return
    }
  }

  if (currentFileQueryController) {
    currentFileQueryController.abort()
    currentFileQueryController = null
  }
  const queryController = new AbortController()
  currentFileQueryController = queryController

  fileLoading.value = true
  const currentSeq = ++fileQuerySeq.value
  try {
    const payload = {
      pageNum: queryForm.pageNum,
      pageSize: queryForm.pageSize,
      sortField: 'uploadTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      archiveId: Number(selectedArchiveId.value)
    }
    if (queryForm.keyword) payload.originalName = queryForm.keyword
    if (queryForm.fileType) payload.fileType = queryForm.fileType
    if (queryForm.fileState) payload.fileState = queryForm.fileState

    const res = await queryFiles(payload, { signal: queryController.signal })
    if (currentSeq !== fileQuerySeq.value) return
    const parsed = normalizeQueryResult(res.data?.data)
    archiveFiles.value = parsed.records
    selectedRows.value = []
    fileTotal.value = parsed.total
    archiveQueryCache.set(queryKey, {
      records: parsed.records,
      total: parsed.total,
      cachedAt: Date.now()
    })
  } catch (error) {
    if (currentSeq !== fileQuerySeq.value) return
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
    console.error('查询归档文件失败:', error)
    archiveFiles.value = []
    selectedRows.value = []
    fileTotal.value = 0
    ElMessage.error('查询归档文件失败，请稍后重试')
  } finally {
    if (currentFileQueryController === queryController) {
      currentFileQueryController = null
    }
    if (currentSeq === fileQuerySeq.value) {
      fileLoading.value = false
    }
  }
}

const fetchArchives = async () => {
  if (!props.projectId) {
    archiveList.value = []
    clearFiles()
    return
  }

  archiveLoading.value = true
  try {
    const res = await getProjectArchives(props.projectId)
    if (res.data?.code === 200 && Array.isArray(res.data.data)) {
      const oldSelected = selectedArchiveId.value
      archiveList.value = res.data.data

      if (!archiveList.value.length) {
        clearFiles()
        return
      }

      const initialArchiveIdNum = Number(props.initialArchiveId || 0)
      const targetArchive =
        archiveList.value.find((item) => item.id === oldSelected) ||
        archiveList.value.find((item) => item.id === initialArchiveIdNum) ||
        archiveList.value[0]
      selectedArchiveId.value = targetArchive.id
      selectedArchiveName.value = targetArchive.name
      queryForm.pageNum = 1
      syncUploadContextByArchive()
      fetchArchiveFiles()
      return
    }

    archiveList.value = []
    clearFiles()
    ElMessage.warning(res.data?.msg || '归档夹列表返回异常')
  } catch (error) {
    console.error('获取归档夹列表失败:', error)
    archiveList.value = []
    clearFiles()
    ElMessage.error('获取归档夹列表失败，请稍后重试')
  } finally {
    archiveLoading.value = false
  }
}

const syncUploadContextByArchive = () => {
  const kind = selectedArchive.value?.kind
  uploadForm.archiveId = selectedArchiveId.value ? Number(selectedArchiveId.value) : null
  if (!kind) {
    uploadForm.fileContextType = 'OTHER'
    return
  }
  // 支持按归档类型自动带出上传归类
  if (
    kind === 'CONTRACT' ||
    kind === 'SURVEY_REPORT' ||
    kind === 'PROJECT_PARTY_SURVEY_SUMMARY' ||
    kind === 'PLANNING_REVIEW' ||
    kind === 'OTHER'
  ) {
    uploadForm.fileContextType = kind
    return
  }
  // DATA_FILE 以及自定义归档统一走 OTHER，并配合 archiveId 定位归档夹
  uploadForm.fileContextType = 'OTHER'
}

const openCreateDialog = () => {
  createForm.value = { name: '' }
  createDialogVisible.value = true
}

const submitCreateArchive = async () => {
  if (!createFormRef.value || !props.projectId) return

  try {
    await createFormRef.value.validate()
  } catch {
    return
  }

  createLoading.value = true
  try {
    const payload = {
      projectId: Number(props.projectId),
      name: createForm.value.name
    }
    const res = await createProjectArchive(payload)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '归档夹创建成功')
      createDialogVisible.value = false
      fetchArchives()
    } else {
      ElMessage.warning(res.data?.msg || '归档夹创建失败')
    }
  } catch (error) {
    console.error('创建归档夹失败:', error)
    ElMessage.error('创建归档夹失败，请稍后重试')
  } finally {
    createLoading.value = false
  }
}

const handleDeleteArchive = async (nodeData) => {
  if (!props.projectId || !nodeData?.archiveId) return

  try {
    const res = await deleteProjectArchive(Number(props.projectId), Number(nodeData.archiveId))
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '归档夹删除成功')
      if (selectedArchiveId.value === nodeData.archiveId) {
        selectedArchiveId.value = null
        selectedArchiveName.value = ''
      }
      fetchArchives()
    } else {
      ElMessage.warning(res.data?.msg || '归档夹删除失败')
    }
  } catch (error) {
    console.error('删除归档夹失败:', error)
    ElMessage.error(error?.response?.data?.msg || '删除归档夹失败')
  }
}

const handleNodeClick = (data) => {
  if (!data?.archiveId) return
  selectedArchiveId.value = data.archiveId
  selectedArchiveName.value = data.name
  selectedRows.value = []
  queryForm.pageNum = 1
  syncUploadContextByArchive()
  fetchArchiveFiles()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handleSearch = () => {
  if (!selectedArchiveId.value) return
  queryForm.pageNum = 1
  fetchArchiveFiles()
}

const handleReset = () => {
  if (!selectedArchiveId.value) return
  resetFileQuery()
  fetchArchiveFiles()
}

const refreshFiles = () => {
  if (!selectedArchiveId.value) return
  fetchArchiveFiles({ force: true })
}

const clampTreePanelWidth = (targetWidth) => {
  const containerWidth = Number(splitContainerRef.value?.clientWidth || 0)
  if (!containerWidth) return Math.max(minTreePanelWidth, Number(targetWidth || treePanelWidth.value))
  const maxTreeWidth = Math.max(minTreePanelWidth, containerWidth - minTablePanelWidth)
  return Math.min(maxTreeWidth, Math.max(minTreePanelWidth, Number(targetWidth || treePanelWidth.value)))
}

const handleSplitterMouseMove = (event) => {
  if (!isDraggingSplitter) return
  const containerRect = splitContainerRef.value?.getBoundingClientRect?.()
  if (!containerRect) return
  const nextWidth = event.clientX - containerRect.left
  treePanelWidth.value = clampTreePanelWidth(nextWidth)
}

const stopSplitterDrag = () => {
  if (!isDraggingSplitter) return
  isDraggingSplitter = false
  window.removeEventListener('mousemove', handleSplitterMouseMove)
  window.removeEventListener('mouseup', stopSplitterDrag)
  document.body.classList.remove('resizing-splitter')
}

const handleSplitterMouseDown = () => {
  isDraggingSplitter = true
  document.body.classList.add('resizing-splitter')
  window.addEventListener('mousemove', handleSplitterMouseMove)
  window.addEventListener('mouseup', stopSplitterDrag)
}

const handleWindowResize = () => {
  treePanelWidth.value = clampTreePanelWidth(treePanelWidth.value)
}

const handlePageChange = (page) => {
  queryForm.pageNum = page
  fetchArchiveFiles()
}

const handlePageSizeChange = (size) => {
  queryForm.pageSize = size
  queryForm.pageNum = 1
  fetchArchiveFiles()
}

const handleParse = async (row) => {
  const fileId = getFileRecordId(row)
  if (!fileId) {
    ElMessage.warning('缺少文件记录ID，无法解析')
    return
  }

  try {
    const res = await parseFileById(fileId)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '解析任务已提交')
      fetchArchiveFiles({ force: true })
    } else {
      ElMessage.warning(res.data?.msg || '解析请求被拒绝')
    }
  } catch (error) {
    console.error('启动解析失败:', error)
    ElMessage.error(error?.response?.data?.msg || '启动解析失败')
  }
}

const handleCancelParse = async (row) => {
  const fileId = getFileRecordId(row)
  if (!fileId) {
    ElMessage.warning('缺少文件记录ID，无法取消解析')
    return
  }

  try {
    const res = await cancelParseByFileId(fileId, 'user_cancel')
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '已取消解析')
      fetchArchiveFiles({ force: true })
    } else {
      ElMessage.warning(res.data?.msg || '取消解析失败')
    }
  } catch (error) {
    console.error('取消解析失败:', error)
    ElMessage.error(error?.response?.data?.msg || '取消解析失败')
  }
}

const openPlanningReviewAudit = async (row) => {
  const fileRecordId = getFileRecordId(row)
  if (!fileRecordId) {
    ElMessage.warning('缺少文件记录ID，无法打开规划复核审核')
    return
  }
  if (!props.projectId) {
    ElMessage.warning('缺少项目ID，无法打开规划复核审核')
    return
  }
  try {
    const res = await queryPlanningReviewForms({
      pageNum: 1,
      pageSize: 1,
      sortField: 'updateTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      fileRecordId: Number(fileRecordId)
    })
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '查询规划复核表失败')
      return
    }
    const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
    const form = records[0]
    if (!form) {
      ElMessage.warning('当前文件暂无规划复核表数据，请稍后重试')
      return
    }
    planningReviewAuditForm.value = form
    planningReviewAuditVisible.value = true
  } catch (error) {
    console.error('打开规划复核审核失败:', error)
    ElMessage.error('打开规划复核审核失败，请稍后重试')
  }
}

const openProjectPartySummaryAudit = (row) => {
  const fileRecordId = getFileRecordId(row)
  if (!fileRecordId) {
    ElMessage.warning('缺少文件记录ID，无法打开项目方实测汇总表审核')
    return
  }
  partySummaryAuditFileRecordId.value = String(fileRecordId)
  partySummaryAuditInitialFile.value = { ...row, id: fileRecordId }
  partySummaryAuditVisible.value = true
}

const handleAudit = async (row) => {
  const fileId = getFileRecordId(row)
  if (!fileId) {
    ElMessage.warning('缺少文件记录ID，无法审核')
    return
  }
  const contextType = String(row?.fileContextType || selectedArchive.value?.kind || '').toUpperCase()
  if (contextType === 'PLANNING_REVIEW') {
    await openPlanningReviewAudit(row)
    return
  }
  if (contextType === 'PROJECT_PARTY_SURVEY_SUMMARY') {
    openProjectPartySummaryAudit(row)
    return
  }
  const currentRow = {
    ...row,
    rawId: fileId,
    name: row?.originalName || row?.name || '-',
    fileId: row?.fileId || row?.gridfsId || row?.sourceGridfsId || '',
    preprocessGridfsId: row?.preprocessGridfsId || '',
    status: row?.fileState || row?.status || ''
  }
  if (!currentRow.fileId) {
    ElMessage.warning('该文件缺少可预览的源文件ID，无法进入审核')
    return
  }
  openCalibration(currentRow)
}

const findFileAcrossArchives = async (targetFileRecordId) => {
  const targetId = String(targetFileRecordId || '')
  if (!targetId || !props.projectId || !archiveList.value.length) return null

  try {
    const directRes = await queryFiles({
      pageNum: 1,
      pageSize: 1,
      sortField: 'uploadTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      fileId: targetId
    })
    const directParsed = normalizeQueryResult(directRes.data?.data)
    const directRow = directParsed.records?.[0]
    if (directRow) {
      const archiveId = Number(directRow.archiveId || 0)
      const archive = archiveList.value.find((item) => Number(item.id) === archiveId)
      return {
        archiveId: archive?.id || archiveId || null,
        archiveName: archive?.name || '',
        row: directRow
      }
    }
  } catch (error) {
    console.error('按 fileId 直查文件失败，回退遍历归档夹:', error)
  }

  for (const archive of archiveList.value) {
    try {
      const payload = {
        pageNum: 1,
        pageSize: 200,
        sortField: 'uploadTime',
        sortDirection: 'desc',
        projectId: Number(props.projectId),
        archiveId: Number(archive.id)
      }
      const res = await queryFiles(payload)
      const parsed = normalizeQueryResult(res.data?.data)
      const found = parsed.records.find((item) => String(getFileRecordId(item)) === targetId)
      if (found) {
        return {
          archiveId: archive.id,
          archiveName: archive.name,
          row: found
        }
      }
    } catch (error) {
      console.error('遍历归档夹定位文件失败:', error)
    }
  }

  return null
}

const openAuditByFileRecordId = async (targetFileRecordId, options = {}) => {
  const targetId = String(targetFileRecordId || '')
  const force = Boolean(options?.force)
  if (!targetId || !props.projectId) return
  if (!props.active && !force) return

  if (!archiveList.value.length) {
    await fetchArchives()
  }

  const localFound = archiveFiles.value.find((item) => String(getFileRecordId(item)) === targetId)
  if (localFound) {
    await handleAudit(localFound)
    emit('audit-consumed')
    return
  }

  const located = await findFileAcrossArchives(targetId)
  if (!located?.row) {
    ElMessage.warning('未在当前项目归档中找到对应文件，无法直接打开审核')
    emit('audit-consumed')
    return
  }

  if (located.archiveId && Number(selectedArchiveId.value) !== Number(located.archiveId)) {
    selectedArchiveId.value = located.archiveId
    selectedArchiveName.value = located.archiveName
    queryForm.pageNum = 1
    syncUploadContextByArchive()
    await fetchArchiveFiles({ force: true })
  }

  await handleAudit(located.row)
  emit('audit-consumed')
}

const handleCalibrationBack = () => {
  showCalibration.value = false
}

const handleCalibrationClosed = async () => {
  isEditing.value = false
  editingRowId.value = ''
  resetCalibrationState()
  await fetchArchiveFiles()
}

const handleDeleteFile = async (row) => {
  const fileId = getFileRecordId(row)
  if (!fileId) {
    ElMessage.warning('缺少文件记录ID，无法删除')
    return
  }

  try {
    const res = await deleteFileById(fileId)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '文件删除成功')
      fetchArchiveFiles({ force: true })
    } else {
      ElMessage.warning(res.data?.msg || '文件删除失败')
    }
  } catch (error) {
    console.error('删除文件失败:', error)
    ElMessage.error(error?.response?.data?.msg || '删除文件失败')
  }
}

const handleBatchDelete = async () => {
  if (!selectedRows.value.length) return
  const ids = selectedRows.value.map((row) => getFileRecordId(row)).filter(Boolean)
  if (!ids.length) {
    ElMessage.warning('未找到可删除的文件记录ID')
    return
  }

  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 个文件吗？删除后不可恢复。`, '批量删除', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  batchDeleteLoading.value = true
  try {
    await Promise.all(ids.map((id) => deleteFileById(id)))
    ElMessage.success('批量删除完成')
    await fetchArchiveFiles({ force: true })
  } catch (error) {
    console.error('批量删除失败:', error)
    ElMessage.error(error?.response?.data?.msg || '批量删除失败')
  } finally {
    batchDeleteLoading.value = false
  }
}

const handleBatchParse = async () => {
  if (!canBatchParse.value) return
  const parseRows = selectedRows.value.filter((row) =>
    ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.fileState)
  )
  const ids = parseRows.map((row) => getFileRecordId(row)).filter(Boolean)
  if (!ids.length) {
    ElMessage.warning('未找到可解析的文件记录ID')
    return
  }

  try {
    await ElMessageBox.confirm(`确认解析选中的 ${ids.length} 个可解析文件吗？`, '批量解析', {
      type: 'info',
      confirmButtonText: '立即解析',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  batchParseLoading.value = true
  try {
    await Promise.all(ids.map((id) => parseFileById(id)))
    ElMessage.success('批量解析任务已提交')
    await fetchArchiveFiles({ force: true })
  } catch (error) {
    console.error('批量解析失败:', error)
    ElMessage.error(error?.response?.data?.msg || '批量解析失败')
  } finally {
    batchParseLoading.value = false
  }
}

const resetUploadForm = () => {
  uploadFiles.value = []
  uploadLoading.value = false
  uploadProgress.value = 0
  uploadUploadedBytes.value = 0
  uploadTotalBytes.value = 0
  uploadForm.phase = 1
  syncUploadContextByArchive()
}

const openUploadDialog = () => {
  if (!props.projectId || !selectedArchiveId.value) {
    ElMessage.warning('请先选择归档夹')
    return
  }
  resetUploadForm()
  uploadDialogVisible.value = true
}

const handleUploadFileChange = (_, list) => {
  uploadFiles.value = list
}

const handleUploadFileRemove = (_, list) => {
  uploadFiles.value = list
}

const handleBatchUpload = async () => {
  if (!props.projectId || !selectedArchiveId.value) {
    ElMessage.warning('请先选择归档夹')
    return
  }
  if (!uploadFiles.value.length) {
    ElMessage.warning('请先选择文件')
    return
  }
  if (uploadForm.fileContextType === 'OTHER' && !uploadForm.archiveId) {
    ElMessage.warning('请选择目标归档夹')
    return
  }

  uploadLoading.value = true
  uploadProgress.value = 0
  uploadUploadedBytes.value = 0
  uploadTotalBytes.value = 0
  try {
    const formData = new FormData()
    uploadFiles.value.forEach((item) => {
      if (item.raw) formData.append('files', item.raw)
    })

    const params = {
      projectId: Number(props.projectId),
      fileContextType: uploadForm.fileContextType
    }
    if (params.fileContextType === 'SURVEY_REPORT') {
      params.phase = uploadForm.phase
    }
    if (params.fileContextType === 'OTHER') {
      params.archiveId = Number(uploadForm.archiveId || selectedArchiveId.value)
    }

    const res = await batchUploadFiles(formData, {
      params,
      onUploadProgress: (event) => {
        if (!event.total) return
        uploadUploadedBytes.value = Number(event.loaded || 0)
        uploadTotalBytes.value = Number(event.total || 0)
        uploadProgress.value = Math.min(99, Math.round((event.loaded / event.total) * 100))
      }
    })
    if (res.data?.code === 200) {
      uploadProgress.value = 100
      uploadUploadedBytes.value = uploadTotalBytes.value
      ElMessage.success(res.data?.msg || '上传请求已成功提交，请点击“刷新”查看解析状态')
      uploadDialogVisible.value = false
      fetchArchiveFiles({ force: true })
    } else {
      ElMessage.warning(res.data?.msg || '文件上传失败')
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    const backendMsg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.message ||
      '文件上传失败'
    ElMessage.error(backendMsg)
  } finally {
    uploadLoading.value = false
  }
}

watch(
  () => [props.projectId, props.active],
  ([projectId, active]) => {
    if (projectId && active) {
      fetchArchives()
      return
    }
    if (!projectId) {
      archiveList.value = []
      clearFiles()
    }
  },
  { immediate: true }
)

watch(
  () => props.projectId,
  async () => {
    await flushReadAckNow()
    pendingReadMessageIds.clear()
    handledMessageIds.clear()
    handledMessageIdOrder.length = 0
    archiveQueryCache.clear()
    if (currentFileQueryController) {
      currentFileQueryController.abort()
      currentFileQueryController = null
    }
  }
)

watch(
  () => props.active,
  async (active) => {
    if (!active) return
    await fetchUnreadNotifications(props.projectId)
    if (selectedArchiveId.value) {
      await fetchArchiveFiles({ force: realtimePendingRefresh })
    }
    if (realtimePendingRefresh) {
      scheduleRealtimeRefresh()
    }
  }
)

watch(
  () => props.initialArchiveId,
  (archiveId) => {
    const targetId = Number(archiveId || 0)
    if (!targetId || !Array.isArray(archiveList.value) || archiveList.value.length === 0) return
    const target = archiveList.value.find((item) => Number(item.id) === targetId)
    if (!target || Number(selectedArchiveId.value) === targetId) return
    selectedArchiveId.value = target.id
    selectedArchiveName.value = target.name
    queryForm.pageNum = 1
    syncUploadContextByArchive()
    fetchArchiveFiles()
  }
)

watch(
  () => [props.pendingAuditFileId, props.active, props.projectId, archiveList.value.length],
  async ([pendingAuditFileId, active, projectId]) => {
    const targetId = String(pendingAuditFileId || '')
    if (!targetId || !active || !projectId) return
    await openAuditByFileRecordId(targetId)
  }
)

const {
  connectionState,
  reconnectCount,
  maxReconnectAttempts
} = useProjectStomp({
  projectIdRef: () => props.projectId,
  activeRef: () => Boolean(props.projectId),
  onFileUpdate: (payload) => handleIncomingNotification(payload, 'FILE'),
  onBatchUploadUpdate: (payload) => handleIncomingNotification(payload, 'BATCH'),
  onConnected: async (projectId) => {
    await fetchUnreadNotifications(projectId)
  }
})

const socketStatus = computed(() => connectionState.value)
const socketStatusText = computed(() => {
  if (connectionState.value === 'connected') return '实时连接: 已连接'
  if (connectionState.value === 'connecting') return '实时连接: 连接中'
  if (connectionState.value === 'reconnecting') {
    return `实时连接: 重连中 ${reconnectCount.value}/${maxReconnectAttempts}`
  }
  if (connectionState.value === 'stopped') return '实时连接: 重连已停止'
  if (connectionState.value === 'error') return '实时连接: 异常'
  if (connectionState.value === 'disconnected') return '实时连接: 已断开'
  return '实时连接: 空闲'
})

defineExpose({
  openAuditByFileRecordId
})

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  flushReadAckNow()
  stopSplitterDrag()
  window.removeEventListener('resize', handleWindowResize)
  if (currentFileQueryController) {
    currentFileQueryController.abort()
    currentFileQueryController = null
  }
  if (realtimeRefreshTimer) {
    clearTimeout(realtimeRefreshTimer)
    realtimeRefreshTimer = null
  }
  if (readAckTimer) {
    clearTimeout(readAckTimer)
    readAckTimer = null
  }
})
</script>

<style scoped>
.archive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #d4dae3;
  border-radius: 6px;
  background: #f5f7fa;
  font-size: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.folder-count {
  color: #7a8394;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: 4px;
}

.toolbar-right {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.socket-status {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #f8fbff;
  color: #6b7c93;
  white-space: nowrap;
}

.socket-status.is-connected {
  border-color: #b7efc5;
  background: #e9fbf0;
  color: #2f855a;
}

.socket-status.is-connecting,
.socket-status.is-reconnecting {
  border-color: #f9d8a8;
  background: #fff7e8;
  color: #b7791f;
}

.socket-status.is-error,
.socket-status.is-stopped {
  border-color: #f5c2c7;
  background: #fff1f2;
  color: #c53030;
}

:deep(.toolbar-btn.el-button) {
  border-radius: 6px;
  min-width: 126px;
  height: 34px;
  padding-left: 14px;
  padding-right: 14px;
  font-weight: 600;
  font-size: 14px;
}

:deep(.toolbar-btn.primary.el-button) {
  border-color: #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.toolbar-btn.upload-btn.el-button) {
  border-color: #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
}

.explorer-split {
  display: flex;
  align-items: stretch;
  gap: 0;
  height: calc(100vh - 250px);
  min-height: 620px;
  max-height: 820px;
  width: 100%;
  overflow: hidden;
}

.tree-panel,
.table-panel {
  border: 1px solid #d4dae3;
  border-radius: 6px;
  background: #fff;
  padding: 10px;
  height: 100%;
  min-height: 0;
}

.tree-panel {
  flex: 0 0 380px;
  overflow-y: auto;
  overflow-x: hidden;
}

.splitter-handle {
  flex: 0 0 12px;
  align-self: stretch;
  position: relative;
  cursor: col-resize;
}

.splitter-handle::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #d5deea;
  transition: background-color 0.2s ease;
}

.splitter-handle:hover::before {
  background: #8fa4bf;
}

.archive-tree {
  --el-tree-node-hover-bg-color: #e8f3ff;
  --el-tree-text-color: #303133;
  font-size: 14px;
}

:deep(.archive-tree .el-tree-node__content) {
  border-radius: 6px;
  margin: 1px 0;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 30px;
}

.tree-node-row.selected {
  background: #e8f3ff;
}

.folder-icon {
  color: #d0892c;
}

.node-name {
  color: #303133;
}

.node-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tree-node-row:hover .node-actions,
.tree-node-row.selected .node-actions {
  opacity: 1;
}

.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 8px 12px;
  border-bottom: 1px solid #f0f2f5;
}

.table-header .title {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.table-header .subtitle {
  font-size: 14px;
  color: #8590a3;
  background: #f2f6fc;
  border: 1px solid #e6edf7;
  border-radius: 10px;
  padding: 2px 10px;
}

.batch-row {
  display: none;
}

.query-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid #e1e6ee;
  border-radius: 6px;
  background: #f8fafc;
}

.query-fields {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
  margin-left: auto;
  min-width: 0;
}

.query-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

:deep(.batch-actions .el-button) {
  min-width: 98px;
  height: 34px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  border-color: #9aa8ba;
  color: #334155;
}

:deep(.batch-actions .el-button--danger) {
  border-color: #c79aa0;
  color: #7a2e35;
}

:deep(.batch-actions .el-button--primary) {
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.batch-actions .el-button--primary.is-plain) {
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.batch-actions .el-button--danger.is-plain) {
  background: #fff3f2;
  border-color: #f7c4bf;
  color: #b42318;
}

:deep(.query-actions .el-button) {
  min-width: 84px;
  height: 34px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}

:deep(.query-actions .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

.query-item {
  width: 160px !important;
  flex: 0 0 160px;
  --el-font-size-base: 14px;
}

.query-item.keyword {
  width: 260px !important;
  flex: 0 0 260px;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.table-wrap .el-table) {
  border-radius: 8px;
}

:deep(.table-wrap .el-table th.el-table__cell) {
  background: #f7f9fc;
  color: #5b6473;
  font-weight: 600;
  padding-top: 11px;
  padding-bottom: 11px;
}

:deep(.table-wrap .el-table td.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

:deep(.table-wrap .el-table .el-table__row:hover > td.el-table__cell) {
  background: #f9fbff !important;
}

.thumb {
  width: 70px;
  height: 46px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 46px;
  color: #9ca3af;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.pager-row {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}

.file-count {
  color: #7a8394;
  font-size: 14px;
}

:deep(.pager-row .el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.pager-row .el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.pager-row .el-pagination.is-background .btn-next),
:deep(.pager-row .el-pagination.is-background .btn-prev),
:deep(.pager-row .el-pagination.is-background .el-pager li) {
  background: #f3f4f6;
  color: #475569;
}

.op-btn {
  padding-left: 8px;
  padding-right: 8px;
  min-height: 28px;
  font-weight: 600;
}

:deep(.op-btn.parse-btn.el-button--primary) {
  border-color: #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.op-btn.audit-btn.el-button--primary.is-plain) {
  border-color: #c8ddf1;
  background: #ffffff;
  color: #1f4e79;
}

:deep(.op-btn.delete-btn.el-button--danger.is-plain) {
  border-color: #f7c4bf;
  background: #fff3f2;
  color: #b42318;
}

:global(body.resizing-splitter) {
  cursor: col-resize !important;
  user-select: none !important;
}

@media (max-width: 1366px) {
  .query-row {
    align-items: flex-start;
  }

  .query-fields {
    margin-left: 0;
  }

  .query-item.keyword {
    width: 220px !important;
    flex: 0 0 220px;
  }
}

.upload-select,
.upload-phase {
  width: 100%;
}

.upload-icon {
  font-size: 36px;
  color: #7aa7ff;
  margin-bottom: 6px;
}

.upload-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #8a94a6;
  line-height: 1.4;
}

.upload-progress {
  margin-top: 12px;
}

.upload-progress-bytes {
  margin-top: 6px;
  font-size: 12px;
  color: #4b5563;
}

.upload-progress-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #8a94a6;
}

.upload-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
