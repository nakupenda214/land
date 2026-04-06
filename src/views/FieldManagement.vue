<template>
  <div class="field-mgmt-container">
    <div class="page-header">
      <div class="header-left">
        <h2><el-icon><CollectionTag /></el-icon> 土地类型管理</h2>
      </div>
      <div class="header-right">
        <el-button class="biz-btn" type="primary" plain :icon="Refresh" @click="handleRefresh">同步刷新</el-button>
        <el-button class="biz-btn" type="primary" :icon="Plus" @click="openAddDialog">新增映射</el-button>
      </div>
    </div>

    <el-card class="section-card" shadow="never">
      <div class="simple-section-head">
        <span class="label">已知用途</span>
        <span class="count">：{{ standardFields.length }} 条</span>
      </div>
      <el-table
        :data="standardFields"
        border
        stripe
        table-layout="fixed"
        :max-height="tableMaxHeight"
        v-loading="loading"
      >
        <el-table-column type="index" label="序号" width="100" align="center" />
        <el-table-column prop="usagePattern" label="用途匹配模式" min-width="220" show-overflow-tooltip />
        <el-table-column prop="usageCategory" label="用途类别" width="300" align="center" show-overflow-tooltip />
        <el-table-column label="面积类型" width="300" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.floorAreaType === 'BUILDABLE' ? '计容' : '不计容' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="正则" width="140" align="center">
          <template #default="{ row }">{{ Number(row.isRegex) === 1 ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="140" align="center" />
        <el-table-column label="状态" width="140" align="center">
          <template #default="{ row }">{{ Number(row.status) === 1 ? '启用' : '禁用' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-button class="table-mini-btn table-mini-edit" size="small" :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该映射？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button class="table-mini-btn table-mini-delete" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <div class="simple-section-head">
        <span class="label">未知用途</span>
        <span class="count">：{{ specialFields.length }} 条</span>
      </div>
      <el-table
        :data="specialFields"
        border
        stripe
        table-layout="fixed"
        :max-height="tableMaxHeight"
        v-loading="loading"
      >
        <el-table-column type="index" label="序号" width="100" align="center" />
        <el-table-column prop="usageName" label="未知用途名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="occurrenceCount" label="出现次数" width="300" align="center" />
        <el-table-column label="归属类别" min-width="220">
          <template #default="{ row }">
            <el-select
              v-model="row.targetCategory"
              size="small"
              placeholder="请选择归属类别"
              style="width: 100%"
            >
              <el-option-group label="计容面积">
                <el-option label="商业" value="calcCommercial" />
                <el-option label="住宅" value="calcResidential" />
                <el-option label="物管" value="calcPropMgmt" />
                <el-option label="其他计容" value="calcOther" />
              </el-option-group>
              <el-option-group label="不计容面积">
                <el-option label="社区用房" value="nonCalcCommunity" />
                <el-option label="其他公用" value="nonCalcOther" />
              </el-option-group>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="300" align="center">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-button class="table-mini-btn table-mini-save" size="small" :icon="Check" @click="saveSpecialConfig(row)">保存</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="addDialogVisible" title="新增用途映射" width="560px" @close="resetAddForm">
      <el-form ref="addFormRef" :model="addForm" :rules="formRules" label-width="110px">
        <el-form-item label="用途匹配模式" prop="usagePattern">
          <el-input v-model="addForm.usagePattern" placeholder="如：住宅、商业办公" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select v-model="addForm.usageCategory" style="width: 100%" placeholder="请选择用途类别">
            <el-option-group label="计容面积">
              <el-option
                v-for="item in usageCategoryBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option
                v-for="item in usageCategoryNonBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="正则匹配" prop="isRegex">
          <el-radio-group v-model="addForm.isRegex">
            <el-radio label="0">否</el-radio>
            <el-radio label="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="addForm.priority" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="addForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="addForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddForm">确认新增</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑用途映射" width="560px" @close="resetEditForm">
      <el-form ref="editFormRef" :model="editForm" :rules="formRules" label-width="110px">
        <el-form-item label="用途匹配模式" prop="usagePattern">
          <el-input v-model="editForm.usagePattern" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select v-model="editForm.usageCategory" style="width: 100%" placeholder="请选择用途类别">
            <el-option-group label="计容面积">
              <el-option
                v-for="item in usageCategoryBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option
                v-for="item in usageCategoryNonBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="正则匹配" prop="isRegex">
          <el-radio-group v-model="editForm.isRegex">
            <el-radio label="0">否</el-radio>
            <el-radio label="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="editForm.priority" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="editForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm">确认更新</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Check, CollectionTag, Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const standardFields = ref([])
const specialFields = ref([])

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const addFormRef = ref(null)
const editFormRef = ref(null)

const tableMaxHeight = computed(() => Math.max(220, Math.floor((window.innerHeight - 320) / 2)))

const categoryMap = {
  calcCommercial: { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  calcResidential: { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  calcPropMgmt: { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  calcOther: { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  nonCalcCommunity: { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  nonCalcOther: { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
}

const formRules = reactive({
  usagePattern: [{ required: true, message: '请输入用途匹配模式', trigger: 'blur' }],
  usageCategory: [{ required: true, message: '请选择用途类别', trigger: 'change' }],
  isRegex: [{ required: true, message: '请选择是否正则匹配', trigger: 'change' }],
  priority: [{ required: true, message: '请输入优先级', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
})

const usageCategoryOptions = [
  { label: '商业', value: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  { label: '住宅', value: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  { label: '物管', value: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  { label: '其他计容', value: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  { label: '社区用房', value: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  { label: '其他公用', value: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
]
const usageCategoryBuildableOptions = usageCategoryOptions.filter((item) => item.floorAreaType === 'BUILDABLE')
const usageCategoryNonBuildableOptions = usageCategoryOptions.filter((item) => item.floorAreaType === 'NON_BUILDABLE')

const resolveFloorAreaTypeByCategory = (usageCategory) => {
  return usageCategoryOptions.find((item) => item.value === usageCategory)?.floorAreaType || 'BUILDABLE'
}

const addForm = reactive({
  usagePattern: '',
  usageCategory: '',
  floorAreaType: 'BUILDABLE',
  isRegex: '0',
  priority: 100,
  status: '1',
  remark: '',
  collectionName: ''
})

const editForm = reactive({
  id: '',
  usagePattern: '',
  usageCategory: '',
  floorAreaType: 'BUILDABLE',
  isRegex: '0',
  priority: 100,
  status: '1',
  remark: '',
  collectionName: ''
})

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const text = String(timeStr).replace('T', ' ')
  return text.split('.')[0]
}

const fetchUsageConfigList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/list', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      standardFields.value = (res.data.data || []).map((item) => ({
        ...item,
        isRegex: Number(item.isRegex),
        priority: Number(item.priority),
        status: Number(item.status)
      }))
    }
  } catch (error) {
    console.error('获取用途配置失败:', error)
    ElMessage.error('获取用途配置失败，请重试')
  } finally {
    loading.value = false
  }
}

const fetchUnknownUsageList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/unknown/pending', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      specialFields.value = (res.data.data || []).map((item) => ({
        id: item.id,
        usageName: item.usageName,
        occurrenceCount: item.occurrenceCount,
        updateTime: item.updateTime,
        targetCategory: item.suggestedCategory || '',
        projectId: item.projectId,
        handleRemark: item.handleRemark || ''
      }))
    }
  } catch (error) {
    console.error('获取未知用途失败:', error)
    ElMessage.error('获取未知用途失败，请重试')
  } finally {
    loading.value = false
  }
}

const addUsageConfig = async (formData) => {
  const loadingInst = ElLoading.service({ lock: true, text: '正在新增配置...' })
  try {
    const submitData = { ...formData }
    delete submitData.id
    const res = await axios.post('/api/usage-config', submitData)
    if (res.data.code === 200) return true
    ElMessage.error(res.data.msg || '新增失败')
    return false
  } catch (error) {
    console.error('新增用途配置失败:', error)
    ElMessage.error('新增失败，请重试')
    return false
  } finally {
    loadingInst.close()
  }
}

const updateUsageConfig = async (id, formData) => {
  const loadingInst = ElLoading.service({ lock: true, text: '正在更新配置...' })
  try {
    const submitData = { ...formData }
    delete submitData.id
    const res = await axios.put(`/api/usage-config/${id}`, submitData)
    if (res.data.code === 200) return true
    ElMessage.error(res.data.msg || '更新失败')
    return false
  } catch (error) {
    console.error('更新用途配置失败:', error)
    ElMessage.error('更新失败，请重试')
    return false
  } finally {
    loadingInst.close()
  }
}

const refreshProjectSurveyReports = async (projectId) => {
  if (!projectId) return false
  try {
    const res = await axios.post(`/api/project/${projectId}/refresh-survey-reports`)
    return res.data?.code === 200
  } catch {
    return false
  }
}

const createUsageConfigFromUnknown = async (row) => {
  if (!row.projectId) {
    ElMessage.error('缺少项目ID，无法处理')
    return
  }
  const loadingInst = ElLoading.service({ lock: true, text: '正在处理未知用途...' })
  try {
    const { usageCategory, floorAreaType } = categoryMap[row.targetCategory]
    const params = {
      unknownUsageId: row.id,
      usageCategory,
      floorAreaType,
      isRegex: 1,
      priority: 1000
    }
    const res = await axios.post('/api/usage-config/create-from-unknown', {}, { params })
    if (res.data.code !== 200) {
      ElMessage.error(res.data.msg || '处理失败')
      return
    }
    await refreshProjectSurveyReports(row.projectId)
    ElMessage.success(`已将【${row.usageName}】纳入已知用途映射`)
    await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
  } catch (error) {
    console.error('处理未知用途失败:', error)
    ElMessage.error('处理失败，请重试')
  } finally {
    loadingInst.close()
  }
}

const openAddDialog = () => {
  addDialogVisible.value = true
  resetAddForm()
}

const resetAddForm = () => {
  addFormRef.value?.resetFields()
  Object.assign(addForm, {
    usagePattern: '',
    usageCategory: '',
    floorAreaType: 'BUILDABLE',
    isRegex: '0',
    priority: 100,
    status: '1',
    remark: '',
    collectionName: ''
  })
}

const submitAddForm = async () => {
  if (!addFormRef.value) return
  try {
    await addFormRef.value.validate()
    const payload = {
      ...addForm,
      floorAreaType: resolveFloorAreaTypeByCategory(addForm.usageCategory)
    }
    const ok = await addUsageConfig(payload)
    if (!ok) return
    addDialogVisible.value = false
    ElMessage.success('新增成功')
    await fetchUsageConfigList()
  } catch {
    ElMessage.warning('请完善必填项后提交')
  }
}

const openEditDialog = (row) => {
  editDialogVisible.value = true
  Object.assign(editForm, {
    id: row.id,
    usagePattern: row.usagePattern,
    usageCategory: row.usageCategory,
    floorAreaType: resolveFloorAreaTypeByCategory(row.usageCategory),
    isRegex: String(row.isRegex),
    priority: Number(row.priority),
    status: String(row.status),
    remark: row.remark || '',
    collectionName: row.collectionName || ''
  })
}

const resetEditForm = () => {
  editFormRef.value?.resetFields()
  Object.assign(editForm, {
    id: '',
    usagePattern: '',
    usageCategory: '',
    floorAreaType: 'BUILDABLE',
    isRegex: '0',
    priority: 100,
    status: '1',
    remark: '',
    collectionName: ''
  })
}

const submitEditForm = async () => {
  if (!editFormRef.value || !editForm.id) return
  try {
    await editFormRef.value.validate()
    const payload = {
      ...editForm,
      floorAreaType: resolveFloorAreaTypeByCategory(editForm.usageCategory)
    }
    const ok = await updateUsageConfig(editForm.id, payload)
    if (!ok) return
    editDialogVisible.value = false
    ElMessage.success('更新成功')
    await fetchUsageConfigList()
  } catch {
    ElMessage.warning('请完善必填项后提交')
  }
}

const handleRefresh = async () => {
  await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
  ElMessage.success('已同步最新配置')
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该映射？', '删除确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await axios.delete(`/api/usage-config/${row.id}`)
    if (res.data.code !== 200) {
      ElMessage.error(res.data.msg || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    await fetchUsageConfigList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用途配置失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

const saveSpecialConfig = async (row) => {
  if (!row.targetCategory) {
    ElMessage.warning('请先选择归属类别')
    return
  }
  if (!categoryMap[row.targetCategory]) {
    ElMessage.error('归属类别无效，请重新选择')
    return
  }
  await createUsageConfigFromUnknown(row)
}

onMounted(async () => {
  await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
})
</script>

<style scoped>
.field-mgmt-container {
  padding: 12px 16px;
  background: #f5f7fa;
  height: calc(100vh - 120px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left h2 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: inline-flex;
  gap: 8px;
}

.biz-btn {
  min-width: 104px;
  height: 34px;
  border-radius: 6px;
  font-weight: 600;
}

.section-card {
  margin-bottom: 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.simple-section-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.simple-section-head .count {
  color: #4b5563;
  font-weight: 600;
}

.table-mini-btn {
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
}

.table-mini-edit {
  color: #1f4e79;
  background: #e8f2fc;
  border-color: #c8ddf1;
}

.table-mini-edit:hover {
  background: #d7e7f8;
  border-color: #b8d3ec;
}

.table-mini-edit {
  margin-right: 28px;
}

.table-mini-delete {
  color: #b42318;
  background: #fff3f2;
  border-color: #f7c4bf;
}

.table-mini-delete:hover {
  background: #ffe9e7;
  border-color: #f1a9a1;
}

.table-mini-save {
  color: #1f4e79;
  background: #e8f2fc;
  border-color: #c8ddf1;
}

.table-mini-save:hover {
  background: #d7e7f8;
  border-color: #b8d3ec;
}

:deep(.el-card__body) {
  padding: 10px 12px;
  overflow: hidden;
}

:deep(.el-table .el-table__body-wrapper) {
  overflow-y: auto;
}

:deep(.el-table__cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

:deep(.el-button--primary.is-plain) {
  background: #f8fbff;
  border-color: #d7e6f5;
  color: #355a84;
}

:deep(.el-button--primary.is-plain:hover) {
  background: #edf4fb;
  border-color: #c8ddf1;
  color: #234567;
}
</style>
