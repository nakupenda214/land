<template>
  <div class="tab-content">
    <el-form
      :ref="setFormRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="project-edit-form"
    >
      <el-form-item prop="id" hidden>
        <span v-text="form.id" style="display: none;"></span>
      </el-form-item>

      <el-row :gutter="20" class="form-row">
        <el-col :span="12">
          <el-form-item label="项目名称" prop="projectName">
            <el-input v-model="form.projectName" placeholder="请输入项目名称（如：XX住宅小区项目）" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="项目编号" prop="projectCode">
            <el-input v-model="form.projectCode" placeholder="请输入项目编号（如：PRJ2025001）" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="form-row">
        <el-col :span="24">
          <el-form-item label="项目位置" prop="location">
            <el-input v-model="form.location" placeholder="请输入行政区+详细地址" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="form-row">
        <el-col :span="12">
          <el-form-item label="占地面积（㎡）" prop="landArea">
            <el-input-number v-model="form.landArea" placeholder="请输入占地面积" style="width: 100%;" :precision="2" :min="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规划用途" prop="plannedUse">
            <el-select v-model="form.plannedUse" placeholder="请选择规划用途" style="width: 100%;" clearable>
              <el-option label="住宅" value="住宅" />
              <el-option label="商业" value="商业" />
              <el-option label="办公" value="办公" />
              <el-option label="商住混合" value="商住混合" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="form-row">
        <el-col :span="12">
          <el-form-item label="项目时间" prop="projectTime">
            <el-date-picker
              v-model="form.projectTime"
              type="month"
              placeholder="请选择项目时间"
              format="YYYY年MM月"
              value-format="YYYY年MM月"
              style="width: 100%;"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :span="12"></el-col>
      </el-row>

      <el-row :gutter="20" class="form-row">
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" rows="3" placeholder="请输入备注信息" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="" class="form-btn-group">
        <el-button type="primary" icon="Check" @click="emit('submit')" :loading="loading">提交更新</el-button>
        <el-button icon="Refresh" @click="emit('reset')" style="margin-left: 10px;">重置表单</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
defineProps({
  form: {
    type: Object,
    required: true
  },
  rules: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  setFormRef: {
    type: Function,
    default: () => {}
  }
})

const emit = defineEmits(['submit', 'reset'])
</script>
