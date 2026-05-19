<template>
  <transition name="el-zoom-in-top">
    <div v-if="unknownUsages.length > 0" class="policy-card no-print">
      <div class="policy-head">
        <div class="head-left">
          <el-icon color="#e65f4d" size="18"><WarningFilled /></el-icon>
          <span class="title">检测到 {{ distinctUsageClassCount }} 类未知用途，请指定归属分类</span>
        </div>
        <el-button type="primary" size="small" :loading="isSavingPolicy" @click="$emit('save')">
          确认规则并保存
        </el-button>
      </div>

      <div class="policy-list">
        <div v-for="rule in unknownUsages" :key="rule.id" class="policy-row">
          <div class="policy-row__head">
            <div class="policy-row__titleline">
              <span class="usage-name">{{ rule.usageName }}</span>
              <el-tag size="small" type="danger" effect="plain" class="status-tag">待处理</el-tag>
            </div>
            <el-button
              v-if="rule.fileRecordId && projectId"
              type="primary"
              link
              size="small"
              class="audit-btn"
              @click="$emit('open-source-audit', String(rule.fileRecordId))"
            >
              打开来源审核
            </el-button>
          </div>

          <div class="policy-row__meta">
            <span class="meta-item">出现 <strong>{{ rule.occurrenceCount }}</strong> 次</span>
            <span class="meta-dot" aria-hidden="true">·</span>
            <span v-if="rule.recentFileName" class="meta-file" :title="rule.recentFileName">{{ rule.recentFileName }}</span>
            <span v-else-if="rule.fileRecordId" class="meta-file meta-file--muted">文件记录 #{{ rule.fileRecordId }}</span>
            <span v-else class="meta-file meta-file--muted">暂无来源文件</span>
          </div>

          <div class="policy-row__assign">
            <span class="assign-label">归入</span>
            <el-select
              v-model="rule.selectedTarget"
              size="small"
              class="assign-select"
              placeholder="请选择归属分类"
            >
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
import { computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const props = defineProps({
  unknownUsages: { type: Array, default: () => [] },
  isSavingPolicy: { type: Boolean, default: false },
  /** 当前项目 ID，用于「打开来源审核」跳转归档页 */
  projectId: { type: [String, Number], default: '' }
})

/** 按用途名字去重后的「类」数（多文件可能多行同名） */
const distinctUsageClassCount = computed(() => {
  const list = props.unknownUsages || []
  const names = new Set(
    list
      .map((r) => (r && r.usageName != null ? String(r.usageName).trim() : ''))
      .filter(Boolean)
  )
  return names.size
})

defineEmits(['save', 'open-source-audit'])
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
  min-width: 0;
}

.title {
  color: #7f1d1d;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.35;
}

.policy-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;
}

.policy-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(244, 114, 94, 0.35);
  background: linear-gradient(135deg, #ffffff 0%, #fffaf8 55%, #fff5f2 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
}

.policy-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 0;
}

.policy-row__titleline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
}

.usage-name {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.status-tag {
  flex-shrink: 0;
  border-radius: 999px;
}

.audit-btn {
  flex-shrink: 0;
  padding: 0 2px;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 600;
}

.policy-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
  font-size: 12px;
  line-height: 1.35;
  color: #57534e;
  padding: 2px 0 1px;
  border-top: 1px dashed rgba(251, 146, 60, 0.35);
}

.meta-item strong {
  color: #9a3412;
  font-weight: 800;
}

.meta-dot {
  color: #d6d3d1;
  user-select: none;
}

.meta-file {
  flex: 1 1 160px;
  min-width: 0;
  color: #44403c;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-file--muted {
  color: #78716c;
  font-weight: 500;
}

.policy-row__assign {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
}

.assign-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: #57534e;
  width: 2em;
}

.assign-select {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 1200px) {
  .policy-row__assign {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .assign-label {
    width: auto;
  }
}
</style>
