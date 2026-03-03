<template>
  <el-dialog
    :model-value="modelValue"
    title="批量文件上传"
    width="600px"
    style="border-radius: 12px;"
    @update:model-value="(val) => $emit('update:modelValue', val)"
    @closed="$emit('closed')"
  >
    <el-form label-position="top">
      <el-row :gutter="20">
        <el-col :span="14">
          <el-form-item label="请确认本次上传的文件类型：">
            <el-radio-group
              :model-value="tempUploadType"
              fill="#A0C4FF"
              @update:model-value="(val) => $emit('update:tempUploadType', val)"
            >
              <el-radio-button value="CONTRACT">合同文件</el-radio-button>
              <el-radio-button value="SURVEY_REPORT">实测报告</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label="所属期数：" v-if="tempUploadType === 'SURVEY_REPORT'">
            <el-input-number
              :model-value="uploadPhase"
              :min="1"
              :max="99"
              style="width: 100%"
              @update:model-value="(val) => $emit('update:uploadPhase', val)"
            />
          </el-form-item>
          <el-form-item label="所属期数：" v-else>
            <el-input disabled placeholder="无需填写" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="(file, fileList) => $emit('file-change', file, fileList)"
        :on-remove="(file, fileList) => $emit('file-remove', file, fileList)"
        multiple
        :file-list="tempFiles"
      >
        <div class="upload-content">
          <el-icon class="el-icon--upload" style="font-size: 48px; margin-bottom: 10px; color: #A0C4FF;"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖拽到此处，或 <em style="color: #409EFF; font-style: normal;">点击选择</em></div>
        </div>
      </el-upload>
    </el-form>
    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <span style="color: #606266; font-size: 13px;">已选择 <strong>{{ tempFiles.length }}</strong> 个文件</span>
        <div>
          <el-button @click="$emit('update:modelValue', false)" round>取消</el-button>
          <el-button color="#A0C4FF" style="color:white" round class="upload-confirm-btn" @click="$emit('confirm')" :disabled="tempFiles.length === 0">
            确认上传
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { UploadFilled } from '@element-plus/icons-vue'

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  tempUploadType: {
    type: String,
    default: 'SURVEY_REPORT'
  },
  uploadPhase: {
    type: Number,
    default: 1
  },
  tempFiles: {
    type: Array,
    default: () => []
  }
})

defineEmits([
  'update:modelValue',
  'update:tempUploadType',
  'update:uploadPhase',
  'file-change',
  'file-remove',
  'confirm',
  'closed'
])
</script>

