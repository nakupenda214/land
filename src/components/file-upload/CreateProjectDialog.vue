<template>
  <el-dialog
    :model-value="modelValue"
    title="新建测绘归档项目"
    width="500px"
    style="border-radius: 12px;"
    @update:model-value="(val) => $emit('update:modelValue', val)"
  >
    <el-form :model="newProjectForm" label-position="top">
      <el-form-item label="项目名称">
        <el-input v-model="newProjectForm.projectName" placeholder="请输入工程名称" />
      </el-form-item>
      <el-form-item label="项目时间" prop="projectTime">
        <el-date-picker
          v-model="newProjectForm.projectTime"
          type="month"
          format="YYYY年MM月"
          value-format="YYYY年MM月"
          placeholder="请选择业务时间"
          style="width: 100%;"
          :locale="locale"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)" round>取消</el-button>
      <el-button type="primary" round @click="$emit('submit')">立即创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  newProjectForm: {
    type: Object,
    required: true
  },
  locale: {
    type: Object,
    default: null
  }
})

defineEmits(['update:modelValue', 'submit'])
</script>

