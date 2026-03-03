<template>
  <el-dialog
    v-model="visible"
    title="地块信息编辑"
    width="800px"
    :close-on-click-modal="false"
  >
    <el-form :ref="setFormRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="地块编号" prop="parcelCode">
        <el-input v-model="form.parcelCode" placeholder="请输入地块编号" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="地块名称" prop="parcelName">
        <el-input v-model="form.parcelName" placeholder="请输入地块名称" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="规划用途" prop="plannedUse">
        <el-select v-model="form.plannedUse" placeholder="请选择规划用途" clearable style="width: 100%;">
          <el-option label="住宅" value="住宅" />
          <el-option label="商业" value="商业" />
          <el-option label="办公" value="办公" />
          <el-option label="商住混合" value="商住混合" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-form-item>
      <el-form-item label="地块总面积(㎡)" prop="totalArea">
        <el-input-number v-model="form.totalArea" placeholder="请输入总面积" :precision="2" :min="0" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="住宅面积(㎡)" prop="residentialArea">
        <el-input-number v-model="form.residentialArea" placeholder="请输入住宅面积" :precision="2" :min="0" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="商业面积(㎡)" prop="commercialArea">
        <el-input-number v-model="form.commercialArea" placeholder="请输入商业面积" :precision="2" :min="0" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="容积率" prop="floorAreaRatio">
        <el-input-number v-model="form.floorAreaRatio" placeholder="请输入容积率" :precision="2" :min="0" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="商住比" prop="commercialResidentialRatio">
        <el-input-number v-model="form.commercialResidentialRatio" placeholder="请输入商住比" :precision="2" :min="0" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" rows="3" placeholder="请输入备注信息" style="width: 100%;" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="emit('submit')" :loading="loading">确认保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
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

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
