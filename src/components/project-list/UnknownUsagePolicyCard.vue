<template>
  <transition name="el-zoom-in-top">
    <div v-if="unknownUsages.length > 0" class="special-policy-card no-print">
      <div class="policy-header">
        <el-icon color="#E6A23C" size="18"><WarningFilled /></el-icon>
        <span class="policy-title">系统检测到 {{ unknownUsages.length }} 类未知用途区域，请指定其归属类别：</span>
      </div>
      <div class="policy-items">
        <div v-for="rule in unknownUsages" :key="rule.id" class="policy-item">
          <div class="policy-info">
            <div class="policy-name">{{ rule.usageName }}</div>
            <div class="policy-stats">出现次数: <strong>{{ rule.occurrenceCount }}</strong> | 状态: <span style="color:#F56C6C">待处理</span></div>
          </div>
          <div class="policy-control">
            <span class="control-label">归入:</span>
            <el-select v-model="rule.selectedTarget" size="small" style="width: 220px" placeholder="请选择归属分类">
              <el-option-group label="计容建筑面积">
                <el-option label="商业(办公)" value="calcCommercial" />
                <el-option label="住宅" value="calcResidential" />
                <el-option label="物管用房" value="calcPropMgmt" />
                <el-option label="其他计容" value="calcOther" />
              </el-option-group>
              <el-option-group label="不计容建筑面积">
                <el-option label="社区用房" value="nonCalcCommunity" />
                <el-option label="其他公用" value="nonCalcOther" />
              </el-option-group>
            </el-select>
          </div>
        </div>
      </div>
      <div class="policy-footer">
        <el-button type="primary" size="small" icon="Check" @click="$emit('save')" :loading="isSavingPolicy">确认规则并保存</el-button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { WarningFilled } from '@element-plus/icons-vue'

defineProps({
  unknownUsages: {
    type: Array,
    default: () => []
  },
  isSavingPolicy: {
    type: Boolean,
    default: false
  }
})

defineEmits(['save'])
</script>

