<template>
  <div class="agent-management-page">
    <el-tabs v-model="activeTab" class="manage-tabs">
      <el-tab-pane name="trace" label="链路观测">
        <AgentTracePanel />
      </el-tab-pane>
      <el-tab-pane name="observe" label="链路指标" lazy>
        <AgentObservationHub />
      </el-tab-pane>
      <el-tab-pane name="vector" label="知识管理">
        <VectorManagementPanel :agent-id="agentId" />
      </el-tab-pane>
      <el-tab-pane name="memory" label="记忆管理" lazy>
        <MemoryManagementPanel />
      </el-tab-pane>
      <el-tab-pane name="llmConfig" label="LLM 配置" lazy>
        <LlmConfigPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AgentTracePanel from '@/components/agent-management/AgentTracePanel.vue'
import AgentObservationHub from '@/components/agent-management/AgentObservationHub.vue'
import VectorManagementPanel from '@/components/agent-management/VectorManagementPanel.vue'
import MemoryManagementPanel from '@/components/agent-management/MemoryManagementPanel.vue'
import LlmConfigPanel from '@/components/agent-management/LlmConfigPanel.vue'

const activeTab = ref('trace')
const agentId = 'default'
</script>

<style scoped>
.agent-management-page {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.manage-tabs {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border-radius: 18px;
  border: 1px solid #dce7f8;
  padding: 12px;
  box-shadow: 0 12px 28px rgba(21, 46, 89, 0.08);
}

.manage-tabs > :deep(.el-tabs__header) {
  position: relative;
  z-index: 6;
}

.manage-tabs > :deep(.el-tabs__content) {
  position: relative;
  z-index: 1;
}

.manage-tabs > :deep(.el-tabs__header .el-tabs__nav-wrap::after) {
  background: transparent;
}

.manage-tabs > :deep(.el-tabs__header .el-tabs__item) {
  position: relative;
  height: 36px;
  line-height: 36px;
  border-radius: 10px;
  padding: 0 20px;
  margin-right: 4px;
  color: #5c6f8d;
  font-weight: 600;
}

.manage-tabs > :deep(.el-tabs__header .el-tabs__item.is-active) {
  color: #204977;
  background: transparent;
}

.manage-tabs > :deep(.el-tabs__header .el-tabs__active-bar) {
  z-index: 2;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, #4c8dff 0%, #8a73ff 100%);
}

</style>
