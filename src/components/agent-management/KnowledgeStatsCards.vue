<template>
  <div class="stats-grid">
    <article class="stat-card">
      <p class="label">业务知识条目</p>
      <p class="value">{{ businessCount }}</p>
      <p class="desc">术语、定义、同义词</p>
    </article>
    <article class="stat-card">
      <p class="label">智能体知识条目</p>
      <p class="value">{{ agentCount }}</p>
      <p class="desc">FAQ / QA / 文档</p>
    </article>
    <article class="stat-card muted">
      <p class="label">后续对齐预留</p>
      <p class="value">TODO</p>
      <p class="desc">多阶段工作流、审计、配置中心</p>
    </article>
  </div>
</template>

<script setup>
defineProps({
  businessCount: { type: Number, default: 0 },
  agentCount: { type: Number, default: 0 }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  border-radius: 14px;
  padding: 16px 18px;
  background: linear-gradient(160deg, #f8fbff 0%, #e7f0ff 100%);
  border: 1px solid #d8e5ff;
  box-shadow: 0 8px 24px rgba(16, 52, 98, 0.08);
}

.stat-card.muted {
  background: linear-gradient(160deg, #fcfbf7 0%, #f7f1e3 100%);
  border-color: #f0e2b7;
}

.label {
  margin: 0;
  color: #4f5f77;
  font-size: 13px;
  letter-spacing: 0.4px;
}

.value {
  margin: 8px 0;
  font-size: 30px;
  line-height: 1;
  color: #17375f;
  font-weight: 700;
}

.desc {
  margin: 0;
  color: #6f7f96;
  font-size: 12px;
}
</style>
