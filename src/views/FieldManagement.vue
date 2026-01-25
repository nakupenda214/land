<template>
  <div class="field-mgmt-container">
    <div class="page-header">
      <div class="header-left">
        <h2><el-icon><CollectionTag /></el-icon> 用地属性字段管理</h2>
        <p>配置用地性质的标准映射规则及未知用途的归属策略</p>
      </div>
      <div class="header-right">
        <el-button type="primary" plain icon="Refresh" @click="handleRefresh">同步后端最新定义</el-button>
        <el-button type="primary" icon="Plus" @click="openAddDialog">新增自定义映射</el-button>
      </div>
    </div>

    <!-- 模块1：启用的用途配置（隐藏内部ID，新增编辑按钮） -->
    <el-card class="section-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="title-group">
            <el-icon color="#409EFF"><Discount /></el-icon>
            <span class="title">启用的用途配置 (系统标准规则)</span>
          </div>
          <span class="desc">系统核心配置。测绘报告中的用途名称将按此规则自动映射，优先级由数值决定（数值越小优先级越高）。</span>
        </div>
      </template>

      

      <el-table 
        :data="standardFields" 
        style="width: 100%" 
        max-height="500"
        :header-cell-style="{background:'#F5F7FA', color:'#606266', fontWeight:'600', padding: '10px 12px'}"
        :cell-style="{padding: '10px 12px', lineHeight: '22px'}"
        v-loading="loading"
        :index="index => index + 1"
      >
        <!-- 替换内部ID为“配置序号”（表格索引），隐藏后端自增ID -->
        <el-table-column label="配置序号" type="index" width="100" align="center" />
        <el-table-column prop="usagePattern" label="用途名称/匹配模式" width="300" />
        <el-table-column prop="usageCategory" label="用途分类" width="200">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" size="small">{{ row.usageCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="面积类型" width="200">
          <template #default="{ row }">
            <el-tag v-if="row.floorAreaType === 'BUILDABLE'" type="success" effect="dark" size="small">计容建筑面积</el-tag>
            <el-tag v-else type="info" effect="dark" size="small">不计容建筑面积</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="正则匹配" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isRegex === 1" type="warning" size="small">是</el-tag>
            <el-tag v-else type="default" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="匹配优先级" width="120" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">启用</el-tag>
            <el-tag v-else type="danger" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link icon="Edit" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定要删除该用途配置吗?" @confirm="handleDelete(row)" confirm-button-type="danger">
              <template #reference>
                <el-button type="danger" link icon="Delete" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      
    </el-card>

    <!-- 模块2：待处理未知用途记录（无改动，保留原有逻辑） -->
    <el-card class="section-card special-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="title-group">
            <el-icon color="#E6A23C"><WarningFilled /></el-icon>
            <span class="title">待处理未知用途记录</span>
            <el-tag type="warning" effect="plain" round size="small">人工干预项</el-tag>
          </div>
          <span class="desc">此类用途无系统默认规则，需指定归属类别后生效（计入“汇总表”对应列）。</span>
        </div>
      </template>
      

      <el-table 
        :data="specialFields" 
        style="width: 100%" 
        max-height="500"
        stripe
        :header-cell-style="{background:'#FEF0F0', color:'#606266', fontWeight:'600', padding: '10px 12px'}"
        :cell-style="{padding: '10px 12px', lineHeight: '22px'}" 
        v-loading="loading"
        :index="index => index + 1"
      >
        <el-table-column label="记录序号" type="index" width="100" align="center" />
        <el-table-column prop="usageName" label="未知用途名称" width="200" />
        <el-table-column prop="occurrenceCount" label="出现次数" width="180" align="center">
          <template #default="{ row }">
            <el-badge :value="row.occurrenceCount" type="danger" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="归属类别设定" min-width="200">
          <template #default="{ row }">
            <el-select 
              v-model="row.targetCategory" 
              placeholder="请选择归属列" 
              style="width: 100%;"
              @change="(val) => handleSettingChange(row, val)"
              size="small"
            >
              <el-option-group label="计容建筑面积">
                <el-option label="计容 - 商业(办公)" value="calcCommercial" />
                <el-option label="计容 - 住宅" value="calcResidential" />
                <el-option label="计容 - 物管用房" value="calcPropMgmt" />
                <el-option label="计容 - 其他" value="calcOther" />
              </el-option-group>
              <el-option-group label="不计容建筑面积">
                <el-option label="不计容 - 社区用房" value="nonCalcCommunity" />
                <el-option label="不计容 - 其他公用" value="nonCalcOther" />
              </el-option-group>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="最后更新时间" width="200" align="center">
          <template #default="{ row }">
            {{ formatTime(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              icon="Check" 
              @click="saveSpecialConfig(row)"
              round 
              style="padding: 4px 12px; background: #409EFF; color: white;"
            >
              保存并处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
     
    </el-card>

    <!-- 新增用途配置弹窗 -->
    <el-dialog 
      v-model="addDialogVisible" 
      title="新增自定义用途配置" 
      width="600px"
      @close="resetAddForm"
    >
      <el-form 
        ref="addFormRef" 
        :model="addForm" 
        :rules="formRules" 
        label-width="120px"
        style="margin-top: 10px;"
      >
        <el-form-item label="用途名称/匹配模式" prop="usagePattern">
          <el-input v-model="addForm.usagePattern" placeholder="例如：住宅、商业办公" />
        </el-form-item>
        <el-form-item label="用途分类" prop="usageCategory">
          <el-input v-model="addForm.usageCategory" placeholder="例如：RESIDENTIAL、COMMERCIAL" />
        </el-form-item>
        <el-form-item label="面积类型" prop="floorAreaType">
          <el-select v-model="addForm.floorAreaType" placeholder="请选择面积类型">
            <el-option label="计容建筑面积" value="BUILDABLE" />
            <el-option label="不计容建筑面积" value="NON_BUILDABLE" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否正则匹配" prop="isRegex">
          <el-radio-group v-model="addForm.isRegex">
            <el-radio label="0">否</el-radio>
            <el-radio label="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="匹配优先级" prop="priority">
          <el-input-number v-model="addForm.priority" min="1" max="999" placeholder="数值越小优先级越高" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="addForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注说明" prop="remark">
          <el-input v-model="addForm.remark" type="textarea" rows="3" placeholder="选填：配置说明" />
        </el-form-item>
        <el-form-item label="集合名称" prop="collectionName">
          <el-input v-model="addForm.collectionName" placeholder="选填：集合名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddForm">确认新增</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用途配置弹窗 -->
    <el-dialog 
      v-model="editDialogVisible" 
      title="编辑用途配置" 
      width="600px"
      @close="resetEditForm"
    >
      <el-form 
        ref="editFormRef" 
        :model="editForm" 
        :rules="formRules" 
        label-width="120px"
        style="margin-top: 10px;"
      >
        <!-- 隐藏ID，仅后端使用 -->
        <el-form-item label="用途名称/匹配模式" prop="usagePattern">
          <el-input v-model="editForm.usagePattern" placeholder="例如：住宅、商业办公" />
        </el-form-item>
        <el-form-item label="用途分类" prop="usageCategory">
          <el-input v-model="editForm.usageCategory" placeholder="例如：RESIDENTIAL、COMMERCIAL" />
        </el-form-item>
        <el-form-item label="面积类型" prop="floorAreaType">
          <el-select v-model="editForm.floorAreaType" placeholder="请选择面积类型">
            <el-option label="计容建筑面积" value="BUILDABLE" />
            <el-option label="不计容建筑面积" value="NON_BUILDABLE" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否正则匹配" prop="isRegex">
          <el-radio-group v-model="editForm.isRegex">
            <el-radio label="0">否</el-radio>
            <el-radio label="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="匹配优先级" prop="priority">
          <el-input-number v-model="editForm.priority" min="1" max="999" placeholder="数值越小优先级越高" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="editForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注说明" prop="remark">
          <el-input v-model="editForm.remark" type="textarea" rows="3" placeholder="选填：配置说明" />
        </el-form-item>
        <el-form-item label="集合名称" prop="collectionName">
          <el-input v-model="editForm.collectionName" placeholder="选填：集合名称" />
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
import { ref, onMounted, reactive } from 'vue'
import { CollectionTag, Discount, WarningFilled, Refresh, Delete, Check, Plus, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import axios from 'axios'

// --- 状态管理 ---
const loading = ref(false) // 全局加载状态
const standardFields = ref([]) // 启用的用途配置
const specialFields = ref([]) // 待处理未知用途记录

// 新增/编辑弹窗状态
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
// 表单引用
const addFormRef = ref(null)
const editFormRef = ref(null)

// --- 核心映射表：前端下拉值 → 后端所需参数 ---
const categoryMap = {
  calcCommercial: { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  calcResidential: { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  calcPropMgmt: { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  calcOther: { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  nonCalcCommunity: { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  nonCalcOther: { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
}

// --- 表单规则 & 初始值 ---
const formRules = reactive({
  usagePattern: [{ required: true, message: '请输入用途名称/匹配模式', trigger: 'blur' }],
  usageCategory: [{ required: true, message: '请输入用途分类', trigger: 'blur' }],
  floorAreaType: [{ required: true, message: '请选择面积类型', trigger: 'change' }],
  isRegex: [{ required: true, message: '请选择是否正则匹配', trigger: 'change' }],
  priority: [{ required: true, message: '请输入匹配优先级', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
})

// 新增表单初始值（不含ID，后端自增）
const addForm = reactive({
  usagePattern: '',
  usageCategory: '',
  floorAreaType: '',
  isRegex: '0',
  priority: 100,
  status: '1',
  remark: '',
  collectionName: ''
})

// 编辑表单初始值（仅用于回显，提交时不传ID）
const editForm = reactive({
  id: '', // 仅用于接口path传参，不展示给用户
  usagePattern: '',
  usageCategory: '',
  floorAreaType: '',
  isRegex: '0',
  priority: 100,
  status: '1',
  remark: '',
  collectionName: ''
})

// --- 工具函数：时间格式化 ---
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// --- 接口请求函数 ---
// 1. 获取所有启用的用途配置
const fetchUsageConfigList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/list', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      standardFields.value = res.data.data.map(item => ({
        ...item,
        // 确保数值类型正确（后端返回可能是字符串）
        isRegex: Number(item.isRegex),
        priority: Number(item.priority),
        status: Number(item.status)
      }))
    }
  } catch (error) {
    console.error('获取用途配置失败：', error)
    ElMessage.error('获取用途配置失败，请重试')
  } finally {
    loading.value = false
  }
}

// 2. 获取待处理的未知用途记录
const fetchUnknownUsageList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/unknown/pending', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      specialFields.value = res.data.data.map(item => ({
        id: item.id,
        usageName: item.usageName,
        occurrenceCount: item.occurrenceCount,
        updateTime: item.updateTime,
        targetCategory: item.suggestedCategory || '',
        projectId: item.projectId,
        fileRecordId: item.fileRecordId,
        handleRemark: item.handleRemark
      }))
    }
  } catch (error) {
    console.error('获取未知用途记录失败：', error)
    ElMessage.error('获取未知用途记录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 3. 新增用途配置（POST /usage-config，不含ID）
const addUsageConfig = async (formData) => {
  const submitLoading = ElLoading.service({
    lock: true,
    text: '正在新增配置，请稍候...',
    background: 'rgba(0, 0, 0, 0.1)'
  })
  try {
    // 提交时过滤掉ID（后端自增）
    const submitData = { ...formData }
    delete submitData.id
    
    const res = await axios.post('/api/usage-config', submitData)
    if (res.data.code === 200) {
      ElMessage.success('用途配置新增成功！')
      return true
    } else {
      ElMessage.error(`新增失败：${res.data.msg || '接口返回异常'}`)
      return false
    }
  } catch (error) {
    console.error('新增用途配置失败：', error)
    ElMessage.error('新增用途配置失败，请重试')
    return false
  } finally {
    submitLoading.close()
  }
}

// 4. 更新用途配置（PUT /usage-config/{id}，path传ID，body不传ID）
const updateUsageConfig = async (id, formData) => {
  const submitLoading = ElLoading.service({
    lock: true,
    text: '正在更新配置，请稍候...',
    background: 'rgba(0, 0, 0, 0.1)'
  })
  try {
    // 提交时过滤掉ID（用户不能修改，仅path传参）
    const submitData = { ...formData }
    delete submitData.id
    
    const res = await axios.put(`/api/usage-config/${id}`, submitData)
    if (res.data.code === 200) {
      ElMessage.success('用途配置更新成功！')
      return true
    } else {
      ElMessage.error(`更新失败：${res.data.msg || '接口返回异常'}`)
      return false
    }
  } catch (error) {
    console.error('更新用途配置失败：', error)
    ElMessage.error('更新用途配置失败，请重试')
    return false
  } finally {
    submitLoading.close()
  }
}

// 5. 刷新项目实测报告数据
const refreshProjectSurveyReports = async (projectId) => {
  if (!projectId) {
    ElMessage.warning('缺少项目ID，无法刷新实测报告数据')
    return false
  }
  try {
    const res = await axios.post(`/api/project/${projectId}/refresh-survey-reports`)
    if (res.data.code === 200) {
      console.log(`项目${projectId}的实测报告已刷新`)
      return true
    } else {
      ElMessage.warning(`刷新实测报告失败：${res.data.msg || '接口返回异常'}`)
      return false
    }
  } catch (error) {
    console.error('刷新实测报告失败：', error)
    ElMessage.warning('刷新实测报告失败（不影响用途配置处理）')
    return false
  }
}

// 6. 基于未知用途创建新用途配置
const createUsageConfigFromUnknown = async (row) => {
  if (!row.projectId) {
    ElMessage.error('缺少关联项目ID，无法处理！')
    return
  }

  const submitLoading = ElLoading.service({
    lock: true,
    text: '正在处理并刷新数据，请稍候...',
    background: 'rgba(0, 0, 0, 0.1)'
  })

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
    if (res.data.code === 200) {
      ElMessage.success(`成功将【${row.usageName}】转为标准用途配置！`)
      await refreshProjectSurveyReports(row.projectId)
      // 刷新列表
      standardFields.value = []
      specialFields.value = []
      await fetchUsageConfigList()
      await fetchUnknownUsageList()
    } else {
      ElMessage.error(`处理失败：${res.data.msg || '接口返回异常'}`)
    }
  } catch (error) {
    console.error('创建用途配置失败：', error)
    ElMessage.error('处理未知用途失败，请重试')
  } finally {
    submitLoading.close()
  }
}

// --- 弹窗逻辑 ---
// 打开新增弹窗
const openAddDialog = () => {
  addDialogVisible.value = true
  // 重置表单
  resetAddForm()
}

// 重置新增表单
const resetAddForm = () => {
  if (addFormRef.value) {
    addFormRef.value.resetFields()
  }
  Object.assign(addForm, {
    usagePattern: '',
    usageCategory: '',
    floorAreaType: '',
    isRegex: '0',
    priority: 100,
    status: '1',
    remark: '',
    collectionName: ''
  })
}

// 提交新增表单
const submitAddForm = async () => {
  if (!addFormRef.value) return
  try {
    // 表单校验
    await addFormRef.value.validate()
    // 调用新增接口
    const success = await addUsageConfig(addForm)
    if (success) {
      addDialogVisible.value = false
      // 刷新列表
      await fetchUsageConfigList()
    }
  } catch (error) {
    console.error('表单校验失败：', error)
    ElMessage.error('请完善必填项后再提交！')
  }
}

// 打开编辑弹窗（回显数据）
const openEditDialog = (row) => {
  editDialogVisible.value = true
  // 回显数据（保留ID用于接口传参，不展示）
  Object.assign(editForm, {
    id: row.id,
    usagePattern: row.usagePattern,
    usageCategory: row.usageCategory,
    floorAreaType: row.floorAreaType,
    isRegex: String(row.isRegex),
    priority: row.priority,
    status: String(row.status),
    remark: row.remark || '',
    collectionName: row.collectionName || ''
  })
}

// 重置编辑表单
const resetEditForm = () => {
  if (editFormRef.value) {
    editFormRef.value.resetFields()
  }
  Object.assign(editForm, {
    id: '',
    usagePattern: '',
    usageCategory: '',
    floorAreaType: '',
    isRegex: '0',
    priority: 100,
    status: '1',
    remark: '',
    collectionName: ''
  })
}

// 提交编辑表单
const submitEditForm = async () => {
  if (!editFormRef.value || !editForm.id) return
  try {
    // 表单校验
    await editFormRef.value.validate()
    // 调用更新接口（path传ID，body不传ID）
    const success = await updateUsageConfig(editForm.id, editForm)
    if (success) {
      editDialogVisible.value = false
      // 刷新列表
      await fetchUsageConfigList()
    }
  } catch (error) {
    console.error('表单校验失败：', error)
    ElMessage.error('请完善必填项后再提交！')
  }
}

// --- 交互逻辑 ---
// 同步后端最新定义（刷新列表）
const handleRefresh = async () => {
  loading.value = true
  try {
    await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
    ElMessage.success('已同步最新字段定义')
  } catch (error) {
    ElMessage.error('同步失败，请重试')
  } finally {
    loading.value = false
  }
}

// 删除用途配置（完善接口+刷新）
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该用途配置吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    // 调用删除接口
    const res = await axios.delete(`/api/usage-config/${row.id}`)
    if (res.data.code === 200) {
      ElMessage.success(`已删除用途配置：${row.usagePattern}`)
      // 刷新列表
      await fetchUsageConfigList()
    } else {
      ElMessage.error(`删除失败：${res.data.msg || '接口返回异常'}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用途配置失败：', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 归属类别变更监听
const handleSettingChange = (row, val) => { 
  console.log(`${row.usageName} 归属变更为: ${val}`)
}

// 保存未知用途处理结果
const saveSpecialConfig = async (row) => {
  if (!row.targetCategory) {
    ElMessage.warning('请先选择归属类别！')
    return
  }
  if (!categoryMap[row.targetCategory]) {
    ElMessage.error('选择的归属类别无效，请重新选择！')
    return
  }
  if (!row.projectId) {
    ElMessage.error('该未知用途未关联项目，无法处理！')
    return
  }
  await createUsageConfigFromUnknown(row)
}

// --- 页面初始化 ---
onMounted(async () => {
  await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
  console.log('页面初始化完成，数据已拉取')
})
</script>

<style scoped>
/* 调整整体间距：减少外层留白，让内容更紧凑 */
.field-mgmt-container { 
  padding: 15px 20px; /* 原20px 30px → 缩小 */
  background-color: #f5f7fa; 
  min-height: 90vh; 
}

/* 页面头部间距调整 */
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  margin-bottom: 20px; /* 原25px → 缩小 */
}
.header-left h2 { 
  margin: 0 0 6px 0; /* 原8px → 缩小 */
  font-size: 22px; /* 原24px → 缩小 */
  color: #303133; 
  display: flex; 
  align-items: center; 
  gap: 8px; /* 原10px → 缩小 */
}
.header-left p { margin: 0; color: #909399; font-size: 14px; }

/* 卡片间距调整 */
.section-card { 
  margin-bottom: 20px; /* 原30px → 缩小 */
  border-radius: 8px; 
  border: 1px solid #ebeef5; 
}
/* 卡片头部间距调整 */
.card-header { 
  display: flex; 
  flex-direction: column; 
  gap: 6px; /* 原8px → 缩小 */
  padding: 12px 16px; /* 补充卡片头部内边距，避免内容贴边 */
}
.title-group { 
  display: flex; 
  align-items: center; 
  gap: 6px; /* 原8px → 缩小 */
}
.title-group .title { 
  font-size: 15px; /* 原16px → 缩小 */
  font-weight: bold; 
  color: #303133; 
}
.desc { 
  font-size: 13px; 
  color: #909399; 
  margin-left: 24px; /* 原26px → 缩小 */
}

/* 特殊卡片样式微调 */
.special-card :deep(.el-card__header) { 
  border-bottom: 1px solid #faecd8; 
  background-color: #fdf6ec; 
}

/* 修复表格列内容溢出（重复省略号）：确保单元格不强制换行 */
:deep(.el-table__cell) {
  white-space: nowrap; /* 禁止单元格内容换行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 只显示一个省略号 */
}
/* 表格滚动容器：限制高度+滚动 */

</style>