<template>
  <el-table v-if="rows?.length" :data="rows" border stripe size="small" class="hit-table">
    <el-table-column prop="score" label="score" width="100" />
    <el-table-column prop="rrfScore" label="rrfScore" width="110" />
    <el-table-column label="route" width="130">
      <template #default="{ row }">
        <span>{{ (row.routeSources || []).join('+') || '-' }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="vectorRank" label="vRank" width="80" />
    <el-table-column prop="keywordRank" label="kRank" width="80" />
    <el-table-column prop="documentId" label="documentId" min-width="160" show-overflow-tooltip />
    <el-table-column prop="textPreview" label="textPreview" min-width="280" show-overflow-tooltip />
    <el-table-column label="metadata" min-width="120">
      <template #default="{ row }">
        <el-popover placement="left" :width="420" trigger="click">
          <template #reference>
            <el-button link type="primary">查看</el-button>
          </template>
          <pre class="meta-pre">{{ formatMeta(row.metadata) }}</pre>
        </el-popover>
      </template>
    </el-table-column>
  </el-table>
  <p v-else class="no-rows">无命中条目</p>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] }
})

function formatMeta(m) {
  try {
    return JSON.stringify(m ?? {}, null, 2)
  } catch {
    return String(m)
  }
}
</script>

<style scoped>
.hit-table :deep(.el-table__header-wrapper th) {
  background: #f1f5f9;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
}
.no-rows {
  margin: 0;
  padding: 12px;
  color: #94a3b8;
  font-size: 13px;
}
.meta-pre {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.45;
}
</style>
