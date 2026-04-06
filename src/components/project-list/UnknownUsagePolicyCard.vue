<template>
  <transition name="el-zoom-in-top">
    <div v-if="unknownUsages.length > 0" class="policy-card no-print">
      <div class="policy-head">
        <div class="head-left">
          <el-icon color="#e65f4d" size="18"><WarningFilled /></el-icon>
          <span class="title">检测到 {{ unknownUsages.length }} 类未知用途，请指定归属分类</span>
        </div>
        <el-button type="primary" size="small" :loading="isSavingPolicy" @click="$emit('save')">
          确认规则并保存
        </el-button>
      </div>

      <div class="policy-list">
        <div v-for="rule in unknownUsages" :key="rule.id" class="policy-row">
          <div class="row-meta">
            <div class="name">{{ rule.usageName }}</div>
            <div class="desc">
              出现次数：<strong>{{ rule.occurrenceCount }}</strong>
              <el-tag size="small" type="danger" effect="dark">待处理</el-tag>
            </div>
          </div>
          <div class="row-action">
            <span class="label">归入</span>
            <el-select v-model="rule.selectedTarget" size="small" class="selector" placeholder="请选择归属分类">
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
    </div>
  </transition>
</template>

<script setup>
import { WarningFilled } from '@element-plus/icons-vue'

defineProps({
  unknownUsages: { type: Array, default: () => [] },
  isSavingPolicy: { type: Boolean, default: false }
})

defineEmits(['save'])
</script>

<style scoped>
.policy-card {
  margin-bottom: 12px;
  border: 1px solid #f2c4be;
  background: linear-gradient(180deg, #fff5f4 0%, #fffaf9 100%);
  border-radius: 10px;
  padding: 12px;
}

.policy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.title {
  color: #7f1d1d;
  font-weight: 600;
  font-size: 14px;
}

.policy-list {
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.policy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #f3d8d4;
  border-radius: 8px;
  padding: 10px 12px;
}

.row-meta {
  min-width: 0;
}

.name {
  color: #1f2937;
  font-weight: 600;
  margin-bottom: 4px;
}

.desc {
  color: #6b7280;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.row-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.label {
  color: #606266;
  font-size: 13px;
}

.selector {
  width: 220px;
}

@media (max-width: 1200px) {
  .policy-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .row-action {
    width: 100%;
  }

  .selector {
    width: 100%;
  }
}
</style>
