<template>
  <el-dialog v-model="visible" title="自优化任务详情" width="min(1200px, 96vw)">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="任务详情" name="task">
        <el-input :model-value="taskText" type="textarea" :autosize="{ minRows: 14, maxRows: 26 }" readonly />
      </el-tab-pane>
      <el-tab-pane label="快照详情" name="snapshot">
        <el-input :model-value="snapshotText" type="textarea" :autosize="{ minRows: 14, maxRows: 26 }" readonly />
      </el-tab-pane>
      <el-tab-pane label="事件流" name="events">
        <el-input :model-value="eventsText" type="textarea" :autosize="{ minRows: 14, maxRows: 26 }" readonly />
      </el-tab-pane>
      <el-tab-pane label="执行拓扑" name="topology">
        <AgentTraceTopology
          v-if="layoutNodes.length"
          layout-scope="self_opt"
          :layout-nodes="layoutNodes"
          :skeleton-edges="skeletonEdges"
          :trace-id="traceId"
          :observed-graph-edges="observedGraphEdges"
          :observed-edge-keys="observedEdgeKeySet"
          :selected-node-id="''"
          :node-metrics="topologyNodeMetrics"
        />
        <el-empty v-else description="暂无拓扑数据" />
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AgentTraceTopology from './AgentTraceTopology.vue'
import {
  buildNodeMetricsFromEvents,
  edgeKey,
  extractGraphEdgesFromTrace,
  layoutGraphLr,
  resolveCanonicalEndId
} from './agent-trace-topology-layout.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  snapshot: { type: Object, default: null },
  events: { type: Array, default: () => [] },
  skeleton: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])
const activeTab = ref('task')

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const taskText = computed(() => JSON.stringify(props.task || {}, null, 2))
const snapshotText = computed(() => JSON.stringify(props.snapshot || {}, null, 2))
const eventsText = computed(() => JSON.stringify(props.events || [], null, 2))
const traceId = computed(() => String(props.task?.selfOptTraceId || ''))

const skeletonNodes = computed(() => (Array.isArray(props.skeleton?.nodes) ? props.skeleton.nodes : []))
const skeletonEdges = computed(() => (Array.isArray(props.skeleton?.edges) ? props.skeleton.edges : []))
const layoutNodes = computed(() => {
  if (!skeletonNodes.value.length) return []
  return layoutGraphLr(skeletonNodes.value, skeletonEdges.value)
})

const canonicalEndId = computed(() => resolveCanonicalEndId(skeletonNodes.value))
const observedGraphEdges = computed(() => extractGraphEdgesFromTrace(props.events || [], canonicalEndId.value))
const observedEdgeKeySet = computed(() => {
  const set = new Set()
  for (const ge of observedGraphEdges.value) {
    set.add(edgeKey(ge.from, ge.to))
  }
  return set
})
const topologyNodeMetrics = computed(() => buildNodeMetricsFromEvents(props.events || []))

watch(
  () => props.modelValue,
  (v) => {
    if (v) activeTab.value = 'task'
  }
)
</script>

