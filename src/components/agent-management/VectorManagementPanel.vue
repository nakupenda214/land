<template>
  <section class="vector-panel">
    <KnowledgeStatsCards
      :business-count="businessCount"
      :agent-count="agentCount"
      :few-shot-count="fewShotCount"
      :schema-configured-count="schemaConfiguredCount"
      :schema-indexed-count="schemaIndexedCount"
      :show-schema-status="true"
    />

    <el-tabs v-model="activeSubTab" class="vector-tabs">
      <el-tab-pane name="business" label="业务知识管理">
        <BusinessKnowledgePanel ref="businessPanelRef" :agent-id="agentId" @updated="syncCounts" />
      </el-tab-pane>
      <el-tab-pane name="agent" label="智能体知识管理">
        <AgentKnowledgePanel ref="agentPanelRef" :agent-id="agentId" @updated="syncCounts" />
      </el-tab-pane>
      <el-tab-pane name="fewShot" label="Few Shot 管理">
        <FewShotPanel ref="fewShotPanelRef" @updated="syncCounts" />
      </el-tab-pane>
      <el-tab-pane name="schema" label="Schema 管理">
        <SchemaVectorPanel :agent-id="agentId" @status-updated="onSchemaStatusUpdated" />
      </el-tab-pane>
      <el-tab-pane name="ragTest" label="检索测试">
        <RagQueryPanel :agent-id="agentId" />
      </el-tab-pane>
      <el-tab-pane name="retrieval" label="检索策略" lazy>
        <RetrievalSettingsPanel />
      </el-tab-pane>
      <el-tab-pane name="selfoptBenchmark" label="基准用例管理" lazy>
        <SelfOptimizeBenchmarkPanel />
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import KnowledgeStatsCards from '@/components/agent-management/KnowledgeStatsCards.vue'
import BusinessKnowledgePanel from '@/components/agent-management/BusinessKnowledgePanel.vue'
import AgentKnowledgePanel from '@/components/agent-management/AgentKnowledgePanel.vue'
import FewShotPanel from '@/components/agent-management/FewShotPanel.vue'
import SchemaVectorPanel from '@/components/agent-management/SchemaVectorPanel.vue'
import RagQueryPanel from '@/components/agent-management/RagQueryPanel.vue'
import RetrievalSettingsPanel from '@/components/agent-management/RetrievalSettingsPanel.vue'
import SelfOptimizeBenchmarkPanel from '@/components/agent-management/SelfOptimizeBenchmarkPanel.vue'
import { getSchemaVectorStatus } from '@/services/agent-management.service.js'

const props = defineProps({
  agentId: { type: String, default: 'default' }
})

const activeSubTab = ref('business')
const businessPanelRef = ref(null)
const agentPanelRef = ref(null)
const fewShotPanelRef = ref(null)
const businessCount = ref(0)
const agentCount = ref(0)
const fewShotCount = ref(0)
const schemaConfiguredCount = ref(0)
const schemaIndexedCount = ref(0)

async function syncCounts() {
  await nextTick()
  businessCount.value = businessPanelRef.value?.getCount?.() || 0
  agentCount.value = agentPanelRef.value?.getCount?.() || 0
  fewShotCount.value = fewShotPanelRef.value?.getCount?.() || 0
}

onMounted(syncCounts)

async function loadSchemaStatusCard() {
  try {
    const data = await getSchemaVectorStatus(props.agentId)
    schemaConfiguredCount.value = Number(data?.configuredCollectionCount || 0)
    schemaIndexedCount.value = Number(data?.indexedVectorDocCount || 0)
  } catch {
    schemaConfiguredCount.value = 0
    schemaIndexedCount.value = 0
  }
}

function onSchemaStatusUpdated(payload) {
  schemaConfiguredCount.value = Number(payload?.configuredCollectionCount || 0)
  schemaIndexedCount.value = Number(payload?.indexedVectorDocCount || 0)
}

onMounted(loadSchemaStatusCard)
</script>

<style scoped>
.vector-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vector-tabs {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border-radius: 14px;
  border: 1px solid #dce7f8;
  padding: 10px;
}

.vector-tabs :deep(.el-tabs__nav-wrap::after) {
  background: transparent;
}

.vector-tabs :deep(.el-tabs__item) {
  border-radius: 9px;
  font-weight: 600;
}

.vector-tabs :deep(.el-tabs__item.is-active) {
  background: #eef4ff;
}
</style>
