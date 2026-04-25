<template>
  <div class="stats-grid">
    <article class="stat-card">
      <p class="label">业务知识条目</p>
      <p class="value">{{ businessCount }}</p>
    </article>
    <article class="stat-card">
      <p class="label">智能体知识条目</p>
      <p class="value">{{ agentCount }}</p>
    </article>
    <article class="stat-card accent">
      <p class="label">Few Shot 样本</p>
      <p class="value">{{ fewShotCount }}</p>
    </article>
    <article class="stat-card schema" v-if="showSchemaStatus">
      <p class="label">Schema 向量状态</p>
      <p class="value compact">{{ schemaConfiguredCount }} / {{ schemaIndexedCount }}</p>
    </article>
  </div>
</template>

<script setup>
defineProps({
  businessCount: { type: Number, default: 0 },
  agentCount: { type: Number, default: 0 },
  fewShotCount: { type: Number, default: 0 },
  schemaConfiguredCount: { type: Number, default: 0 },
  schemaIndexedCount: { type: Number, default: 0 },
  showSchemaStatus: { type: Boolean, default: false }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  border-radius: 14px;
  padding: 16px 18px;
  background: linear-gradient(160deg, #f8fbff 0%, #e7f0ff 100%);
  border: 1px solid #d8e5ff;
  box-shadow: 0 8px 24px rgba(16, 52, 98, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 116px;
}

.stat-card.accent {
  background: linear-gradient(160deg, #f7fffc 0%, #e3f7f1 100%);
  border-color: #cdeee4;
}

.stat-card.schema {
  background: linear-gradient(160deg, #f8f7ff 0%, #eae9ff 100%);
  border-color: #d5d2ff;
}

.label {
  margin: 0;
  color: #4f5f77;
  font-size: 13px;
  letter-spacing: 0.4px;
}

.value {
  margin: 10px 0 0;
  font-size: 30px;
  line-height: 1;
  color: #17375f;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
