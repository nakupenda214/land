<template>
  <div class="pdf-toolbar" style="height: 48px; background: #fff; border-bottom: 1px solid #ccc; display: flex; align-items: center; justify-content: center; gap: 10px;">
    <el-button :type="currentViewType === 'original' ? 'primary' : 'default'" plain @click="$emit('switch-view', 'original')">
      原始文件
    </el-button>

    <el-tooltip content="暂无预处理文件" placement="top" :disabled="isPreprocessAvailable">
      <el-button
        :type="currentViewType === 'preprocess' ? 'primary' : 'default'"
        plain
        :disabled="!isPreprocessAvailable"
        @click="$emit('switch-view', 'preprocess')"
      >
        预处理文件
      </el-button>
    </el-tooltip>

    <el-tooltip content="MD文件" placement="top">
      <el-button :type="currentViewType === 'recognition' ? 'primary' : 'default'" plain @click="$emit('switch-view', 'recognition')">
        识别文件(MD)
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup>
defineProps({
  currentViewType: {
    type: String,
    default: 'original'
  },
  isPreprocessAvailable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['switch-view'])
</script>

