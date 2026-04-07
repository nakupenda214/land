<template>
  <div class="global-filter-card no-print">
    <div class="filter-glow" aria-hidden="true" />
    <div class="filter-inner">
      <div class="filter-brand">
        <div class="brand-icon-wrap">
          <el-icon class="brand-icon"><FolderOpened /></el-icon>
        </div>
        <div class="brand-copy">
          <div class="brand-title-row">
            <span class="brand-title">项目工作区</span>
            <span v-if="projectCount > 0" class="count-pill">{{ projectCount }} 个项目</span>
          </div>
          <p class="brand-desc">搜索或选择项目，加载该项目的档案、合同与实测汇总数据</p>
        </div>
      </div>

      <div class="filter-toolbar">
        <div class="selector-block">
          <label class="field-label" for="project-workspace-select">
            <el-icon class="field-label-icon"><Search /></el-icon>
            快速定位项目
          </label>
          <div class="selector-field">
            <el-select
              id="project-workspace-select"
              :model-value="modelValue"
              placeholder="输入名称、编号或关键词筛选…"
              class="project-select"
              size="large"
              filterable
              clearable
              no-match-text="未找到匹配项目，请调整关键词"
              teleported
              popper-class="project-filter-select-dropdown"
              @update:model-value="(val) => $emit('update:modelValue', val)"
            >
              <el-option
                v-for="p in projectOptions"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              >
                <div class="opt-cell">
                  <div class="opt-main">
                    <span class="opt-name">{{ p.name }}</span>
                    <span class="opt-code">{{ p.code }}</span>
                  </div>
                  <div v-if="p.projectTime || p.updateTime" class="opt-meta">
                    <span v-if="p.projectTime" class="opt-chip">{{ p.projectTime }}</span>
                    <span v-if="p.updateTime" class="opt-updated">更新 {{ formatShortTime(p.updateTime) }}</span>
                  </div>
                </div>
              </el-option>
            </el-select>
          </div>
          <div class="selection-hint" :class="{ empty: !selectedProjectName }">
            <el-icon class="hint-icon"><InfoFilled /></el-icon>
            <span v-if="selectedProjectName">当前已选：{{ selectedProjectName }}</span>
            <span v-else>未选择项目，请先在上方输入关键词并选择项目</span>
          </div>
        </div>

        <div class="action-block">
          <el-tooltip content="根据当前选中项目加载档案、合同与实测等业务数据" placement="top">
            <el-button
              class="query-btn primary-cta"
              type="primary"
              :disabled="!modelValue"
              @click="$emit('search')"
            >
              <el-icon class="btn-ico"><Promotion /></el-icon>
              查询档案
            </el-button>
          </el-tooltip>
          <el-tooltip content="创建新的征收/开发项目档案" placement="top">
            <el-button class="create-btn ghost-cta" @click="$emit('create-project')">
              <el-icon class="btn-ico"><Plus /></el-icon>
              新建项目
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FolderOpened, Search, Plus, Promotion, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  projectOptions: {
    type: Array,
    default: () => []
  },
  currentProjectId: {
    type: [String, Number],
    default: ''
  }
})

defineEmits(['update:modelValue', 'search', 'create-project'])

const projectCount = computed(() => props.projectOptions?.length ?? 0)
const selectedProjectName = computed(() => {
  const target = props.projectOptions?.find((item) => String(item.id) === String(props.modelValue || ''))
  return target?.name || ''
})

function formatShortTime(val) {
  if (val == null) return ''
  if (typeof val === 'string') {
    return /^\d{4}-\d{2}-\d{2}/.test(val) ? val.slice(0, 16).replace('T', ' ') : val
  }
  if (Array.isArray(val) && val.length >= 3) {
    const [y, m, d, h = 0, mi = 0] = val
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
  }
  return ''
}
</script>

<style scoped>
.global-filter-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(248, 250, 252, 0.98) 42%,
    rgba(241, 245, 249, 0.95) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 12px 40px -18px rgba(15, 23, 42, 0.18),
    0 4px 14px -6px rgba(15, 23, 42, 0.08);
}

.filter-glow {
  position: absolute;
  inset: -40% -20% auto auto;
  width: 55%;
  height: 120%;
  background: radial-gradient(
    closest-side,
    rgba(59, 130, 246, 0.14),
    rgba(59, 130, 246, 0) 70%
  );
  pointer-events: none;
}

.filter-inner {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 20px 28px;
  padding: 18px 20px 18px 22px;
}

.filter-brand {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 200px;
  max-width: 320px;
}

.brand-icon-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 55%, #1e3a8a 100%);
  box-shadow:
    0 8px 20px -8px rgba(29, 78, 216, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.brand-icon {
  font-size: 24px;
  color: #fff;
}

.brand-copy {
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-bottom: 4px;
}

.brand-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--biz-text, #1f2d3d);
}

.count-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  color: #1e40af;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.brand-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--biz-subtext, #5f6b7a);
}

.filter-toolbar {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px 20px;
  min-width: 0;
}

.selector-block {
  flex: 1;
  min-width: 240px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.03em;
  text-transform: none;
}

.field-label-icon {
  font-size: 14px;
  color: #64748b;
}

.selector-field {
  width: 100%;
}

.selection-hint {
  margin-top: 8px;
  min-height: 26px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #1e3a8a;
  background: rgba(239, 246, 255, 0.85);
  border: 1px solid rgba(147, 197, 253, 0.45);
}

.selection-hint.empty {
  color: #64748b;
  background: rgba(248, 250, 252, 0.95);
  border-color: rgba(148, 163, 184, 0.4);
}

.hint-icon {
  font-size: 14px;
}

.project-select {
  width: 100%;
  max-width: 100%;
}

.action-block {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-bottom: 2px;
}

.btn-ico {
  margin-right: 4px;
  font-size: 16px;
}

:deep(.primary-cta.el-button--primary) {
  min-height: 40px;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 22px -10px rgba(29, 78, 216, 0.75);
}

:deep(.primary-cta.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

:deep(.primary-cta.el-button--primary:disabled) {
  opacity: 0.55;
  box-shadow: none;
}

:deep(.ghost-cta.el-button) {
  min-height: 40px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: var(--biz-btn-soft-text, #1f4e79);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.55);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

:deep(.ghost-cta.el-button:hover) {
  background: #fff;
  border-color: #94a3b8;
  color: #0f172a;
}

:deep(.project-select .el-select__wrapper) {
  border-radius: 10px;
  min-height: 40px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.95);
}

:deep(.project-select .el-select__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.45);
}

:deep(.project-select.is-focused .el-select__wrapper) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.opt-cell {
  padding: 4px 0;
  line-height: 1.35;
}

.opt-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.opt-name {
  font-weight: 600;
  color: #0f172a;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-code {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.opt-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 11px;
  color: #94a3b8;
}

.opt-chip {
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(241, 245, 249, 0.95);
  color: #64748b;
  font-weight: 500;
}

.opt-updated {
  font-weight: 500;
}

@media (max-width: 1024px) {
  .filter-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-brand {
    max-width: none;
  }

  .action-block {
    width: 100%;
  }

  :deep(.primary-cta),
  :deep(.ghost-cta) {
    flex: 1;
    justify-content: center;
  }
}
</style>

<style>
/* 下拉层挂在 body，需非 scoped */
.project-filter-select-dropdown.el-select-dropdown {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 16px 48px -12px rgba(15, 23, 42, 0.22);
}

.project-filter-select-dropdown .el-select-dropdown__item {
  height: auto;
  min-height: 48px;
  padding: 8px 14px;
  line-height: normal;
}

.project-filter-select-dropdown .el-select-dropdown__item.is-selected {
  font-weight: 600;
  background: rgba(239, 246, 255, 0.85);
}
</style>
