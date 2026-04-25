<template>
  <section class="retrieval-settings">
    <header class="rs-hero rs-reveal">
      <div class="rs-hero-bg" aria-hidden="true" />
      <div class="rs-hero-inner">
        <div class="rs-hero-text">
          <p class="rs-eyebrow">知识管理</p>
          <h2 class="rs-title">检索参数</h2>
          <p v-if="meta.updatedAt" class="rs-updated">上次保存 {{ formatTime(meta.updatedAt) }}</p>
        </div>
        <div class="rs-hero-actions">
          <el-button size="small" class="rs-btn-secondary" :loading="loading" @click="load">重新加载</el-button>
          <el-button type="primary" size="small" class="rs-btn-primary" :loading="saving" @click="onSave">保存</el-button>
        </div>
      </div>
    </header>

    <div v-loading="loading" class="rs-body">
      <!-- TopK / 阈值：Schema + 两意图 -->
      <article class="rs-card rs-card--triple rs-reveal" style="animation-delay: 0.04s">
        <div class="rs-card-head-inline">
          <h3 class="rs-card-title">TopK · 相似度阈值</h3>
          <p class="rs-card-sub">Schema 集合向量 / 证据召回 DATA_QUERY / 证据召回 KNOWLEDGE_QA</p>
        </div>
        <div class="rs-triple-grid">
          <div class="rs-triple-col">
            <div class="rs-col-label">
              <span class="rs-tag rs-tag--schema">schemaCollection</span>
            </div>
            <el-form label-position="top" class="rs-form rs-form-tight" @submit.prevent>
              <el-form-item label="TopK">
                <el-input-number
                  v-model="form.schemaRecall.topK"
                  :min="1"
                  :max="50"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
              <el-form-item label="相似度阈值">
                <el-input-number
                  v-model="form.schemaRecall.similarityThreshold"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
            </el-form>
          </div>
          <div class="rs-triple-col">
            <div class="rs-col-label">
              <span class="rs-tag rs-tag--dq">DATA_QUERY</span>
            </div>
            <el-form label-position="top" class="rs-form rs-form-tight">
              <el-form-item label="TopK">
                <el-input-number
                  v-model="form.evidenceRecall.dataQuery.topK"
                  :min="1"
                  :max="50"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
              <el-form-item label="相似度阈值">
                <el-input-number
                  v-model="form.evidenceRecall.dataQuery.similarityThreshold"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
            </el-form>
          </div>
          <div class="rs-triple-col">
            <div class="rs-col-label">
              <span class="rs-tag rs-tag--kq">KNOWLEDGE_QA</span>
            </div>
            <el-form label-position="top" class="rs-form rs-form-tight">
              <el-form-item label="TopK">
                <el-input-number
                  v-model="form.evidenceRecall.knowledgeQa.topK"
                  :min="1"
                  :max="50"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
              <el-form-item label="相似度阈值">
                <el-input-number
                  v-model="form.evidenceRecall.knowledgeQa.similarityThreshold"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </article>

      <div class="rs-row2">
        <article class="rs-card rs-card--fusion rs-reveal" style="animation-delay: 0.08s">
          <div class="rs-card-head-inline">
            <h3 class="rs-card-title">keywordStrategy · RRF</h3>
            <p class="rs-card-sub">证据召回 lane / fusion（两意图共用）</p>
          </div>
          <el-form label-position="top" class="rs-form rs-form-tight">
            <div class="rs-fusion-row">
              <el-form-item label="keywordStrategy" class="rs-fi-grow">
                <el-select v-model="form.evidenceRecall.lane.keywordStrategy" class="rs-select-full">
                  <el-option label="milvus_bm25" value="milvus_bm25" />
                  <el-option label="none" value="none" />
                </el-select>
              </el-form-item>
              <el-form-item label="RRF k" class="rs-fi-rrf">
                <el-input-number
                  v-model="form.evidenceRecall.fusion.rrfK"
                  :min="1"
                  :max="200"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
            </div>
          </el-form>
        </article>

        <article class="rs-card rs-card--dense rs-reveal" style="animation-delay: 0.1s">
          <div class="rs-card-head-inline">
            <h3 class="rs-card-title">expanded_queries</h3>
            <p class="rs-card-sub">Dense 路是否合并扩展问句及条数上限</p>
          </div>
          <el-form label-position="top" class="rs-form rs-form-tight">
            <div class="rs-dense-row">
              <el-form-item label="useExpandedQueries" class="rs-fi-switch">
                <el-switch v-model="form.evidenceRecall.denseQuery.useExpandedQueries" />
              </el-form-item>
              <el-form-item label="maxExpandedQueries" class="rs-fi-grow">
                <el-input-number
                  v-model="form.evidenceRecall.denseQuery.maxExpandedQueries"
                  :min="0"
                  :max="10"
                  controls-position="right"
                  class="rs-num"
                />
              </el-form-item>
            </div>
          </el-form>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getRetrievalSettings, updateRetrievalSettings } from '@/services/agent-management.service.js'

function emptyForm() {
  return {
    evidenceRecall: {
      lane: { keywordStrategy: 'milvus_bm25' },
      fusion: { rrfK: 60 },
      dataQuery: { topK: 8, similarityThreshold: 0.4 },
      knowledgeQa: { topK: 8, similarityThreshold: 0.4 },
      denseQuery: { useExpandedQueries: true, maxExpandedQueries: 3 }
    },
    schemaRecall: {
      topK: 5,
      similarityThreshold: 0.25
    }
  }
}

const form = reactive(emptyForm())
const meta = reactive({
  updatedAt: null
})
const loading = ref(false)
const saving = ref(false)

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString()
  } catch {
    return String(iso)
  }
}

function assignFromServer(data) {
  if (data?.evidenceRecall) {
    const e = data.evidenceRecall
    if (e.lane) Object.assign(form.evidenceRecall.lane, e.lane)
    if (e.fusion) Object.assign(form.evidenceRecall.fusion, e.fusion)
    if (e.dataQuery) Object.assign(form.evidenceRecall.dataQuery, e.dataQuery)
    if (e.knowledgeQa) Object.assign(form.evidenceRecall.knowledgeQa, e.knowledgeQa)
    if (e.denseQuery) Object.assign(form.evidenceRecall.denseQuery, e.denseQuery)
  }
  if (data?.schemaRecall) {
    Object.assign(form.schemaRecall, data.schemaRecall)
  }
  meta.updatedAt = data?.updatedAt ?? null
}

async function load() {
  loading.value = true
  try {
    const data = await getRetrievalSettings()
    assignFromServer(data)
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function onSave() {
  saving.value = true
  try {
    const payload = {
      evidenceRecall: JSON.parse(JSON.stringify(form.evidenceRecall)),
      schemaRecall: JSON.parse(JSON.stringify(form.schemaRecall))
    }
    const data = await updateRetrievalSettings(payload)
    assignFromServer(data)
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600&display=swap');

.retrieval-settings {
  --rs-ink: #0f172a;
  --rs-line: #c7d7ee;
  --rs-muted: #64748b;
  --rs-fill: #f8fafc;
  font-family: 'Manrope', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.rs-hero {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--rs-line);
  background: linear-gradient(105deg, #eef4ff 0%, #fff 55%, #f1f5f9 100%);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.rs-hero-bg {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background: radial-gradient(400px 120px at 90% 0%, rgba(99, 102, 241, 0.12), transparent 60%);
  pointer-events: none;
}

.rs-hero-inner {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 10px 14px;
}

.rs-eyebrow {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--rs-muted);
  text-transform: uppercase;
}

.rs-title {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--rs-ink);
  letter-spacing: -0.02em;
}

.rs-updated {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--rs-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.rs-hero-actions {
  display: flex;
  gap: 8px;
}

.rs-btn-primary,
.rs-btn-secondary {
  border-radius: 8px !important;
  font-weight: 600;
}

.rs-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
}

.rs-card {
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--rs-line);
  background: #fff;
  padding: 10px 12px 8px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.rs-card--triple::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #2563eb, #7c3aed, #0d9488);
}

.rs-card-head-inline {
  padding: 0 0 8px 8px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 8px;
}

.rs-card-title {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--rs-ink);
}

.rs-card-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--rs-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  line-height: 1.35;
}

.rs-triple-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding-left: 6px;
}

.rs-triple-col {
  padding: 6px 12px 4px;
  border-right: 1px solid #e2e8f0;
}

.rs-triple-col:last-child {
  border-right: none;
}

.rs-col-label {
  margin-bottom: 6px;
}

.rs-tag {
  display: inline-block;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}

.rs-tag--schema {
  background: #e0e7ff;
  color: #3730a3;
}

.rs-tag--dq {
  background: #dbeafe;
  color: #1e40af;
}

.rs-tag--kq {
  background: #ede9fe;
  color: #5b21b6;
}

.rs-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rs-card--fusion::before,
.rs-card--dense::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
}

.rs-card--fusion::before {
  background: linear-gradient(180deg, #0d9488, #0369a1);
}

.rs-card--dense::before {
  background: linear-gradient(180deg, #ea580c, #c2410c);
}

.rs-fusion-row,
.rs-dense-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  padding-left: 8px;
}

.rs-fi-grow {
  flex: 1 1 200px;
  min-width: 0;
}

.rs-fi-rrf {
  flex: 0 0 140px;
}

.rs-fi-switch {
  flex: 0 0 auto;
}

.rs-select-full {
  width: 100%;
}

.rs-form-tight :deep(.el-form-item) {
  margin-bottom: 8px;
}

.rs-form-tight :deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding-bottom: 2px;
}

.rs-num {
  width: 100%;
}

.rs-reveal {
  animation: rs-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes rs-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .rs-triple-grid {
    grid-template-columns: 1fr;
  }

  .rs-triple-col {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
  }

  .rs-triple-col:last-child {
    border-bottom: none;
  }

  .rs-row2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .rs-fusion-row,
  .rs-dense-row {
    flex-direction: column;
    align-items: stretch;
  }

  .rs-fi-rrf {
    flex-basis: auto;
  }
}
</style>
