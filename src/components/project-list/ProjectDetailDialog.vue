<template>
      <el-dialog 
        v-model="visible" 
        title="楼栋实测明细 (只读)" 
        width="auto"  
        min-width="1000px"  
        class="no-print"
        style="max-width: 90vw;"  
      >

              <!-- 新增：面积总和展示区域（优先用汇总接口的sum，简单高效） -->
        <div class="sum-info-section" style="margin-bottom: 16px; padding: 12px; background: #f5f7fa; border-radius: 6px;">
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div>
              <span style="font-weight: bold; color: #606266;">建筑面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.buildingAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">套内面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.innerAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">阳台面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.balconyAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">公摊面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.sharedAreaSum }}</span> ㎡
            </div>
          </div>
        </div>


        <!-- <div class="detail-table-container" style="width: 100%;">
       
        <el-table 
          :data="roomInfoData" 
          border 
          size="small"
          v-loading="detailLoading"
          element-loading-text="加载户室数据中..."
          max-height="500"
        > -->
        <div class="resizable-table-container" >
          <!-- 表格容器：可拉伸的核心容器 -->
          <div class="detail-table-container" ref="tableContainer" style="width: 100%; height: 500px;">
              <el-table 
                :data="roomInfoData" 
                border 
                size="small"
                v-loading="detailLoading"
                element-loading-text="加载户室数据中..."
                :style="{ height: '100%' }"
                max-height="none"
              >

                <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
                <el-table-column prop="roomLevel" label="楼层" width="80" align="center" />
                <el-table-column prop="roomNumber" label="房号" width="100" align="center" />
                <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center" />
                <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center" />
                <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center" />
                <el-table-column prop="sharedArea" label="公摊面积(㎡)" width="120" align="center" />
                <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
                  <template #default="{ row }">
                    <span :class="row.isCalculate === 1 ? 'red-text' : ''">
                      {{ row.isCalculate === 1 ? '是' : '否' }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="usageCategory" label="用途类别" width="120" align="center" />
                <el-table-column prop="roomUsage" label="用途" min-width="100" show-overflow-tooltip align="center"  />
                <el-table-column prop="floorAreaType" label="面积类型" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                      {{ row.floorAreaType }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
          </div>
          
          <!-- 底部拉伸手柄 -->
          <div class="resize-handle resize-handle-bottom" @mousedown="(e) => startResize(e)"></div>
        </div>
        
      </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  roomSumInfo: {
    type: Object,
    required: true
  },
  roomInfoData: {
    type: Array,
    default: () => []
  },
  detailLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tableContainer = ref(null)
const isResizing = ref(false)

const startResize = (e) => {
  const container = tableContainer.value
  if (!container) return

  isResizing.value = true
  e.preventDefault()

  const startY = e.clientY
  const startHeight = container.offsetHeight

  const handleMouseMove = (moveEvent) => {
    if (!isResizing.value) return
    const newHeight = Math.max(300, startHeight + (moveEvent.clientY - startY))
    container.style.height = "px"
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onBeforeUnmount(() => {
  isResizing.value = false
})
</script>

<style scoped>
.detail-table-container {
  width: 100%;
  height: 500px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.1s ease;
}

:deep(.detail-table-container .el-table__body-wrapper) {
  max-height: none !important;
}

:deep(.detail-table-container::-webkit-scrollbar) {
  width: 6px;
}

:deep(.detail-table-container::-webkit-scrollbar-thumb) {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.red-text {
  color: #f56c6c !important;
  font-weight: bold !important;
}

.resizable-table-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 600px;
  min-height: 300px;
}

.resize-handle {
  position: absolute;
  background-color: #e5e9dd;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  opacity: 1;
}

.resize-handle-bottom {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize;
}

:deep(.el-dialog__body) {
  padding: 20px !important;
  overflow: visible !important;
}
</style>
