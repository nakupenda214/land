<template>
  <el-dialog
    v-model="visible"
    title="合同信息编辑"
    width="700px"
    :close-on-click-modal="false"
  >
    <el-form :ref="setFormRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="合同编号" prop="contractNumber">
        <el-input v-model="form.contractNumber" placeholder="请输入合同编号" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="合同类型" prop="contractType">
        <el-input v-model="form.contractType" placeholder="请输入合同类型" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="出让方" prop="transferor">
        <el-input v-model="form.transferor" placeholder="请输入出让方（土地管理部门）" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="受让方" prop="transferee">
        <el-input v-model="form.transferee" placeholder="请输入受让方（开发商）" style="width: 100%;" />
      </el-form-item>
      <el-form-item label="合同总面积(㎡)" prop="totalArea">
        <el-input-number v-model="form.totalArea" placeholder="请输入总面积" :precision="2" :min="0" style="width: 100%;" />
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
