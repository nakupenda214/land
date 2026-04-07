<template>
  <div class="project-edit-panel">
    <div class="project-edit-shell">
      <header class="panel-header">
        <div class="panel-header-text">
          <h3>项目信息更新</h3>
          <p>维护当前项目基础信息</p>
        </div>
      </header>

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
/* 外层仅占位，内容区收窄居中，避免字段在宽屏上被拉得过扁 */
.project-edit-panel {
  padding: 4px 0 8px;
}

.project-edit-shell {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.panel-header {
  margin-bottom: 16px;
  padding: 0 2px 14px;
  border-bottom: 1px solid #e8eef5;
}

.panel-header-text h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #1a2332;
}

.panel-header-text p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.hidden-item {
  display: none;
}

.form-block {
  margin-bottom: 14px;
  padding: 14px 16px 6px;
  border-radius: 10px;
  background: #fafbfd;
  border: 1px solid #e9eef4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.block-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #475569;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #3b82f6;
  line-height: 1.2;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
  align-items: start;
}

.single-row {
  grid-template-columns: 1fr;
}

/* 备注占满一行，避免与数字框并排导致输入区过窄 */
.remark-item {
  grid-column: 1 / -1;
}

.form-actions {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e8eef5;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.save-btn.el-button),
:deep(.reset-btn.el-button) {
  min-width: 104px;
  height: 36px;
  border-radius: 8px;
  font-weight: 600;
}

:deep(.project-edit-form .el-form-item) {
  margin-bottom: 12px;
}

:deep(.project-edit-form .el-form-item__label) {
  line-height: 1.35;
  margin-bottom: 6px;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

:deep(.project-edit-form .el-input__wrapper),
:deep(.project-edit-form .el-textarea__inner) {
  border-radius: 8px;
}

:deep(.project-edit-form .el-select) {
  width: 100%;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .remark-item {
    grid-column: auto;
  }

  .form-actions {
    justify-content: stretch;
  }

  :deep(.save-btn.el-button),
  :deep(.reset-btn.el-button) {
    flex: 1;
    min-width: 0;
  }
}
</style>
