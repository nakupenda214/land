<template>
  <div class="project-edit-panel">
    <div class="panel-header">
      <div>
        <h3>项目信息更新</h3>
        <p>维护当前项目基础信息</p>
      </div>
    </div>

    <el-form
      :ref="setFormRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="project-edit-form"
    >
      <el-form-item prop="id" class="hidden-item">
        <span>{{ form.id }}</span>
      </el-form-item>

      <div class="form-block">
        <div class="block-title">基础信息</div>
        <div class="form-grid">
          <el-form-item label="项目名称" prop="projectName">
            <el-input v-model.trim="form.projectName" placeholder="请输入项目名称（如：XX住宅小区项目）" clearable />
          </el-form-item>

          <el-form-item label="项目编号" prop="projectCode">
            <el-input v-model.trim="form.projectCode" placeholder="请输入项目编号（如：PRJ2025001）" clearable />
          </el-form-item>

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

          <el-form-item label="规划用途" prop="plannedUse">
            <el-select v-model="form.plannedUse" placeholder="请选择规划用途" clearable>
              <el-option label="住宅" value="住宅" />
              <el-option label="商业" value="商业" />
              <el-option label="办公" value="办公" />
              <el-option label="商住混合" value="商住混合" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
        </div>
      </div>

      <div class="form-block">
        <div class="block-title">空间信息</div>
        <div class="form-grid single-row">
          <el-form-item label="项目位置" prop="location">
            <el-input v-model.trim="form.location" placeholder="请输入行政区及详细地址" clearable />
          </el-form-item>
        </div>
      </div>

      <div class="form-block">
        <div class="block-title">补充信息</div>
        <div class="form-grid">
          <el-form-item label="占地面积（㎡）" prop="landArea">
            <el-input-number
              v-model="form.landArea"
              placeholder="请输入占地面积"
              :precision="2"
              :min="0"
              style="width: 100%;"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="备注" prop="remark" class="remark-item">
            <el-input
              v-model.trim="form.remark"
              type="textarea"
              :rows="4"
              placeholder="请输入备注信息"
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
        </div>
      </div>

      <div class="form-actions">
        <el-button class="save-btn" type="primary" :loading="loading" @click="emit('submit')">保存修改</el-button>
        <el-button class="reset-btn" @click="emit('reset')">重置</el-button>
      </div>
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

<style scoped>
.project-edit-panel {
  border: 1px solid #e8edf6;
  border-radius: 10px;
  padding: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.panel-header {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  background: #ffffff;
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  color: #1f2d3d;
}

.panel-header p {
  margin: 2px 0 0;
  color: #708096;
  font-size: 12px;
}

.hidden-item {
  display: none;
}

.form-block {
  margin-bottom: 8px;
  border: 1px solid #e9eef7;
  border-radius: 8px;
  padding: 10px;
  background: #ffffff;
}

.block-title {
  font-size: 12px;
  font-weight: 700;
  color: #41566f;
  margin-bottom: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.single-row {
  grid-template-columns: 1fr;
}

.form-actions {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #e5ecf7;
  display: flex;
  gap: 10px;
}

:deep(.save-btn.el-button),
:deep(.reset-btn.el-button) {
  min-width: 108px;
  height: 34px;
  border-radius: 8px;
  font-weight: 600;
}

:deep(.project-edit-form .el-form-item) {
  margin-bottom: 10px;
}

:deep(.project-edit-form .el-form-item__label) {
  line-height: 18px;
  margin-bottom: 4px;
}

@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
