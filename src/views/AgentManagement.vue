<template>
  <div class="agent-management-page">
    <section class="hero">
      <div>
        <p class="eyebrow">LandAgent Console</p>
        <h1>智能体管理中心</h1>
      </div>
    </section>

    <KnowledgeStatsCards :business-count="businessCount" :agent-count="agentCount" />

    <el-tabs v-model="activeTab" class="manage-tabs">
      <el-tab-pane name="business" label="业务知识管理">
        <BusinessKnowledgePanel ref="businessPanelRef" :agent-id="agentId" @updated="syncCounts" />
      </el-tab-pane>
      <el-tab-pane name="agent" label="智能体知识管理">
        <AgentKnowledgePanel ref="agentPanelRef" :agent-id="agentId" @updated="syncCounts" />
      </el-tab-pane>
      <el-tab-pane name="schema" label="Schema 向量管理">
        <SchemaVectorPanel :agent-id="agentId" />
      </el-tab-pane>
      <el-tab-pane name="roadmap" label="后续能力预留">
        <section class="roadmap-card">
          <h3>下一阶段建议（可视化占位）</h3>
          <ul>
            <li>Schema Recall / Mix Selector 执行链路可观测性看板</li>
            <li>Prompt 版本治理、灰度切换与回滚面板</li>
            <li>向量索引重建任务中心与失败重试编排</li>
            <li>Agent 工作流节点耗时、失败率与审计明细</li>
          </ul>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import KnowledgeStatsCards from '@/components/agent-management/KnowledgeStatsCards.vue'
import BusinessKnowledgePanel from '@/components/agent-management/BusinessKnowledgePanel.vue'
import AgentKnowledgePanel from '@/components/agent-management/AgentKnowledgePanel.vue'
import SchemaVectorPanel from '@/components/agent-management/SchemaVectorPanel.vue'

const activeTab = ref('business')
const businessPanelRef = ref(null)
const agentPanelRef = ref(null)
const businessCount = ref(0)
const agentCount = ref(0)
const agentId = 'default'

async function syncCounts() {
  await nextTick()
  businessCount.value = businessPanelRef.value?.getCount?.() || 0
  agentCount.value = agentPanelRef.value?.getCount?.() || 0
}

onMounted(syncCounts)
</script>

<style scoped>
.agent-management-page {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-radius: 16px;
  padding: 20px;
  background:
    radial-gradient(1100px 380px at 0% 0%, rgba(70, 129, 217, 0.22), transparent 45%),
    radial-gradient(900px 300px at 100% 0%, rgba(243, 191, 82, 0.18), transparent 55%),
    linear-gradient(160deg, #f6faff 0%, #edf3ff 100%);
  border: 1px solid #d3dff2;
}

.eyebrow {
  margin: 0;
  color: #5978a5;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}

h1 {
  margin: 8px 0;
  font-size: 30px;
  color: #1a3456;
}

.manage-tabs {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border-radius: 18px;
  border: 1px solid #dce7f8;
  padding: 12px;
  box-shadow: 0 12px 28px rgba(21, 46, 89, 0.08);
}

.manage-tabs :deep(.el-tabs__nav-wrap::after) {
  background: transparent;
}

.manage-tabs :deep(.el-tabs__item) {
  height: 36px;
  line-height: 36px;
  border-radius: 10px;
  padding: 0 16px;
  color: #5c6f8d;
  font-weight: 600;
}

.manage-tabs :deep(.el-tabs__item.is-active) {
  color: #204977;
  background: #eef4ff;
}

.manage-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, #4c8dff 0%, #8a73ff 100%);
}

.roadmap-card {
  border-radius: 12px;
  border: 1px dashed #b8c9e5;
  background: #f8fbff;
  padding: 16px;
}

.roadmap-card h3 {
  margin: 0 0 10px;
  color: #253e60;
}

.roadmap-card ul {
  margin: 0;
  padding-left: 20px;
  color: #4f6280;
  line-height: 1.9;
}
</style>
