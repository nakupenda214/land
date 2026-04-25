<template>
  <section class="rag-panel">
    <div class="rag-grid">
      <div class="rag-form-card rag-reveal" style="animation-delay: 0.05s">
        <h3 class="card-title">检索参数</h3>
        <el-form label-position="top" class="rag-form" @submit.prevent="runQuery">
          <el-form-item label="Agent ID">
            <el-input v-model="form.agentId" clearable placeholder="default" />
          </el-form-item>
          <el-form-item label="向量类型 vectorType" required>
            <el-select v-model="form.vectorType" placeholder="选择类型" class="rag-select">
              <el-option label="业务术语 businessTerm" value="businessTerm" />
              <el-option label="智能体知识 agentKnowledge" value="agentKnowledge" />
              <el-option label="Schema 集合片段 schemaCollection" value="schemaCollection" />
            </el-select>
          </el-form-item>
          <el-form-item label="检索模式 mode">
            <el-select v-model="form.mode" placeholder="选择模式" class="rag-select">
              <el-option label="仅向量 vector" value="vector" />
              <el-option label="混合 hybrid（向量 + BM25 + RRF）" value="hybrid" />
              <el-option label="同屏对比 compare（vector vs hybrid）" value="compare" />
            </el-select>
          </el-form-item>
          <el-form-item label="查询语句 query" required>
            <el-input
              v-model="form.query"
              type="textarea"
              :rows="5"
              resize="vertical"
              placeholder="输入与对话中一致的自然语言问句…"
              class="rag-query-input"
            />
          </el-form-item>
          <div class="rag-inline">
            <el-form-item label="topK">
              <el-input-number v-model="form.topK" :min="1" :max="50" controls-position="right" class="rag-num" />
            </el-form-item>
            <el-form-item label="相似度阈值">
              <el-input-number
                v-model="form.similarityThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                :precision="2"
                controls-position="right"
                class="rag-num"
              />
            </el-form-item>
          </div>
          <p class="defaults-hint">
            缺省与「检索策略」一致：Schema 集合用 Schema 粗召；业务术语 / 智能体知识用证据召回·数据查询场景。混合模式下的 RRF
            <code>k</code> 与是否走 BM25 亦同该页。
            <el-button link type="primary" size="small" :loading="retrievalDefaultsLoading" @click="loadRetrievalDefaults">
              同步缺省
            </el-button>
          </p>
          <div class="rag-switches">
            <div class="switch-row">
              <span class="switch-label">仅元数据过滤（跳过 Mongo 召回 id 白名单）</span>
              <el-switch v-model="form.skipRecallIdRestriction" />
            </div>
            <div class="switch-row">
              <span class="switch-label">零阈值探测（主检索 0 条且过滤非空时，阈值 0 再搜）</span>
              <el-switch v-model="form.probeZeroThreshold" />
            </div>
          </div>
          <el-button type="primary" class="rag-submit" :loading="loading" native-type="submit" @click="runQuery">
            执行检索
          </el-button>
        </el-form>
      </div>

      <div class="rag-result-card rag-reveal" style="animation-delay: 0.12s">
        <div class="result-head">
          <h3 class="card-title">检索结果</h3>
          <div class="result-head-actions">
            <el-button size="small" :loading="healthLoading" @click="loadHealth">健康度对账</el-button>
            <span v-if="health" class="health-mini">{{ health.durationMs }} ms</span>
            <span v-if="result && !isCompareMode" class="duration-pill">{{ result.durationMs }} ms</span>
          </div>
        </div>

        <div v-if="!result && !compareResult && !loading" class="result-empty">
          <p>提交左侧表单后，此处展示与节点一致的主检索命中及扩展路径；完整字段见下方「原始 JSON」。</p>
        </div>

        <div v-loading="loading" class="result-body">
          <template v-if="isCompareMode && compareResult">
            <div class="compare-grid">
              <div class="compare-card">
                <div class="compare-head">
                  <h4>vector</h4>
                  <span class="duration-pill">{{ compareResult.vector.durationMs }} ms</span>
                </div>
                <div class="stat-strip">
                  <div class="stat">
                    <span class="stat-label">主检索命中数</span>
                    <strong>{{ compareResult.vector.strictHitCount }}</strong>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Mongo 召回 id 数</span>
                    <strong>{{ compareResult.vector.recalledMongoIdCount ?? '—' }}</strong>
                  </div>
                  <div class="stat accent">
                    <span class="stat-label">topK / 阈值</span>
                    <strong>{{ compareResult.vector.topKUsed }} / {{ compareResult.vector.similarityThresholdUsed }}</strong>
                  </div>
                </div>
                <RagQueryHitTable :rows="compareResult.vector.strictHits" />
              </div>
              <div class="compare-card">
                <div class="compare-head">
                  <h4>hybrid</h4>
                  <span class="duration-pill">{{ compareResult.hybrid.durationMs }} ms</span>
                </div>
                <div class="stat-strip">
                  <div class="stat">
                    <span class="stat-label">主检索命中数</span>
                    <strong>{{ compareResult.hybrid.strictHitCount }}</strong>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Mongo 召回 id 数</span>
                    <strong>{{ compareResult.hybrid.recalledMongoIdCount ?? '—' }}</strong>
                  </div>
                  <div class="stat accent">
                    <span class="stat-label">vector / keyword / rrfK</span>
                    <strong>{{ compareResult.hybrid.strictVectorHitCount }} / {{ compareResult.hybrid.strictKeywordHitCount }} / {{ compareResult.hybrid.strictRrfKUsed || '-' }}</strong>
                  </div>
                </div>
                <RagQueryHitTable :rows="compareResult.hybrid.strictHits" />
              </div>
            </div>
            <details class="raw-json">
              <summary>对比原始 JSON</summary>
              <pre>{{ compareJsonPreview }}</pre>
            </details>
          </template>
          <template v-else-if="result">
            <div class="stat-strip" :class="{ 'stat-strip--warn': result.strictDynamicFilterNull }">
              <div class="stat">
                <span class="stat-label">主检索命中数</span>
                <strong>{{ result.strictHitCount }}</strong>
              </div>
              <div class="stat">
                <span class="stat-label">Mongo 召回 id 数</span>
                <strong>{{ result.recalledMongoIdCount ?? '—' }}</strong>
              </div>
              <div class="stat accent">
                <span class="stat-label">topK / 阈值</span>
                <strong>{{ result.topKUsed }} / {{ result.similarityThresholdUsed }}</strong>
              </div>
              <div v-if="result.modeUsed === 'hybrid'" class="stat">
                <span class="stat-label">vector / keyword / rrfK</span>
                <strong>{{ result.strictVectorHitCount }} / {{ result.strictKeywordHitCount }} / {{ result.strictRrfKUsed || '-' }}</strong>
              </div>
            </div>

            <p v-if="result.strictFilterNullReason" class="reason-banner">
              原因码：<code>{{ result.strictFilterNullReason }}</code>
            </p>

            <el-collapse v-model="collapseNames" class="rag-collapse">
              <el-collapse-item title="主检索命中 strictHits（节点同款过滤条件）" name="strict">
                <RagQueryHitTable :rows="result.strictHits" />
              </el-collapse-item>
              <el-collapse-item
                v-if="result.modeUsed === 'hybrid'"
                :title="`向量路 strictVectorHits（${result.strictVectorHitCount}）`"
                name="vectorRoute"
              >
                <RagQueryHitTable :rows="result.strictVectorHits" />
              </el-collapse-item>
              <el-collapse-item
                v-if="result.modeUsed === 'hybrid'"
                :title="`关键词路 strictKeywordHits（${result.strictKeywordHitCount}，route=${result.strictKeywordRoute || 'none'}）`"
                name="keywordRoute"
              >
                <RagQueryHitTable :rows="result.strictKeywordHits" />
              </el-collapse-item>
              <el-collapse-item
                v-if="result.metadataOnlySearchPerformed"
                :title="`元数据旁路 metadataOnlyHits（${result.metadataOnlyHitCount}）`"
                name="meta"
              >
                <RagQueryHitTable :rows="result.metadataOnlyHits" />
              </el-collapse-item>
              <el-collapse-item
                v-if="result.zeroThresholdProbePerformed"
                :title="`零阈值探测 zeroThresholdHits（${result.zeroThresholdHitCount}）`"
                name="zero"
              >
                <RagQueryHitTable :rows="result.zeroThresholdHits" />
              </el-collapse-item>
            </el-collapse>

            <details class="raw-json">
              <summary>原始 JSON</summary>
              <pre>{{ jsonPreview }}</pre>
            </details>
          </template>
        </div>
      </div>

      <div v-if="health" class="health-panel rag-reveal">
        <el-row :gutter="12">
          <el-col :xs="24" :md="8">
            <div class="health-card">
              <h4>业务术语 businessTerm</h4>
              <ul class="health-list">
                <li>Mongo 应召回：{{ health.businessTerm.mongoRecalledCount }}</li>
                <li>嵌入 COMPLETED：{{ health.businessTerm.mongoEmbeddingCompletedCount }}</li>
                <li>嵌入 FAILED：{{ health.businessTerm.mongoEmbeddingFailedCount }}</li>
                <li>嵌入未就绪：{{ health.businessTerm.mongoEmbeddingIncompleteCount }}</li>
                <li>Milvus 主键去重数：{{ health.businessTerm.milvusDistinctKnowledgeIdCount }}</li>
                <li>本次拉取文档数：{{ health.businessTerm.milvusFetchReturnedDocs }}</li>
                <li v-if="health.businessTerm.milvusFetchLikelyTruncated" class="warn-li">Milvus 拉取可能已达上限</li>
                <li v-if="health.businessTerm.mongoCompletedMissingInMilvusSample?.length">
                  COMPLETED 未在 Milvus 子集中见 id 样例：{{
                    health.businessTerm.mongoCompletedMissingInMilvusSample.join('、')
                  }}
                </li>
                <li v-if="health.businessTerm.milvusOrphanKnowledgeIdSample?.length">
                  Milvus 游离主键样例：{{ health.businessTerm.milvusOrphanKnowledgeIdSample.join('、') }}
                </li>
              </ul>
            </div>
          </el-col>
          <el-col :xs="24" :md="8">
            <div class="health-card">
              <h4>智能体知识 agentKnowledge</h4>
              <ul class="health-list">
                <li>Mongo 应召回：{{ health.agentKnowledge.mongoRecalledCount }}</li>
                <li>嵌入 COMPLETED：{{ health.agentKnowledge.mongoEmbeddingCompletedCount }}</li>
                <li>嵌入 FAILED：{{ health.agentKnowledge.mongoEmbeddingFailedCount }}</li>
                <li>嵌入未就绪：{{ health.agentKnowledge.mongoEmbeddingIncompleteCount }}</li>
                <li>Milvus 主键去重数：{{ health.agentKnowledge.milvusDistinctKnowledgeIdCount }}</li>
                <li>本次拉取文档数：{{ health.agentKnowledge.milvusFetchReturnedDocs }}</li>
                <li v-if="health.agentKnowledge.milvusFetchLikelyTruncated" class="warn-li">Milvus 拉取可能已达上限</li>
                <li v-if="health.agentKnowledge.mongoCompletedMissingInMilvusSample?.length">
                  COMPLETED 未在 Milvus 子集中见 id 样例：{{
                    health.agentKnowledge.mongoCompletedMissingInMilvusSample.join('、')
                  }}
                </li>
                <li v-if="health.agentKnowledge.milvusOrphanKnowledgeIdSample?.length">
                  Milvus 游离主键样例：{{ health.agentKnowledge.milvusOrphanKnowledgeIdSample.join('、') }}
                </li>
              </ul>
            </div>
          </el-col>
          <el-col :xs="24" :md="8">
            <div class="health-card">
              <h4>Schema 向量 schemaCollection</h4>
              <ul class="health-list">
                <li>已索引文档数：{{ health.schemaCollection.indexedVectorDocCount }}</li>
                <li>索引指纹与当前 YAML：{{ health.schemaCollection.schemaHashMatch ? '一致' : '不一致' }}</li>
                <li class="mono-li">indexed：{{ health.schemaCollection.indexedSchemaHash || '—' }}</li>
                <li class="mono-li">current：{{ health.schemaCollection.currentSchemaHash || '—' }}</li>
              </ul>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getAgentVectorHealth,
  getRetrievalSettings,
  postAgentRagQuery
} from '@/services/agent-management.service'
import RagQueryHitTable from '@/components/agent-management/RagQueryHitTable.vue'

const props = defineProps({
  agentId: { type: String, default: 'default' }
})

const loading = ref(false)
const result = ref(null)
const compareResult = ref(null)
const health = ref(null)
const healthLoading = ref(false)
const collapseNames = ref(['strict'])

const form = reactive({
  agentId: props.agentId,
  vectorType: 'businessTerm',
  mode: 'vector',
  query: '',
  topK: 8,
  similarityThreshold: 0.4,
  skipRecallIdRestriction: false,
  probeZeroThreshold: false
})

const retrievalSnapshot = ref(null)
const retrievalDefaultsLoading = ref(false)

async function loadRetrievalDefaults() {
  retrievalDefaultsLoading.value = true
  try {
    retrievalSnapshot.value = await getRetrievalSettings()
    applyVectorTypeDefaults()
  } catch {
    /* 保留表单当前值 */
  } finally {
    retrievalDefaultsLoading.value = false
  }
}

function applyVectorTypeDefaults() {
  const s = retrievalSnapshot.value
  if (!s) return
  if (form.vectorType === 'schemaCollection') {
    form.topK = Number(s.schemaRecall?.topK ?? 5)
    form.similarityThreshold = Number(s.schemaRecall?.similarityThreshold ?? 0.25)
  } else {
    const dq = s.evidenceRecall?.dataQuery
    form.topK = Number(dq?.topK ?? 8)
    form.similarityThreshold = Number(dq?.similarityThreshold ?? 0.4)
  }
}

const isCompareMode = computed(() => form.mode === 'compare')

watch(
  () => props.agentId,
  (v) => {
    if (v) form.agentId = v
  }
)

watch(
  () => form.vectorType,
  () => {
    if (retrievalSnapshot.value) applyVectorTypeDefaults()
  }
)

onMounted(() => {
  loadRetrievalDefaults()
})

const jsonPreview = computed(() => {
  if (!result.value) return ''
  try {
    return JSON.stringify(result.value, null, 2)
  } catch {
    return ''
  }
})

const compareJsonPreview = computed(() => {
  if (!compareResult.value) return ''
  try {
    return JSON.stringify(compareResult.value, null, 2)
  } catch {
    return ''
  }
})

async function loadHealth() {
  healthLoading.value = true
  try {
    const aid = form.agentId?.trim() || props.agentId
    health.value = await getAgentVectorHealth(aid)
    ElMessage.success('健康度已更新')
  } catch (e) {
    ElMessage.error(e?.message || '健康度查询失败')
  } finally {
    healthLoading.value = false
  }
}

async function runQuery() {
  if (!form.query?.trim()) {
    ElMessage.warning('请填写 query')
    return
  }
  loading.value = true
  try {
    const basePayload = {
      agentId: form.agentId?.trim() || undefined,
      vectorType: form.vectorType,
      query: form.query.trim(),
      topK: form.topK,
      similarityThreshold: form.similarityThreshold,
      skipRecallIdRestriction: form.skipRecallIdRestriction,
      probeZeroThreshold: form.probeZeroThreshold
    }
    if (form.mode === 'compare') {
      const [vectorRes, hybridRes] = await Promise.all([
        postAgentRagQuery({ ...basePayload, mode: 'vector' }),
        postAgentRagQuery({ ...basePayload, mode: 'hybrid' })
      ])
      compareResult.value = { vector: vectorRes, hybrid: hybridRes }
      result.value = null
      ElMessage.success('对比检索完成')
    } else {
      result.value = await postAgentRagQuery({ ...basePayload, mode: form.mode })
      compareResult.value = null
      ElMessage.success('检索完成')
    }
  } catch (e) {
    ElMessage.error(e?.message || 'RAG 检索失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=JetBrains+Mono:wght@400;600&display=swap');

.rag-panel {
  --rag-ink: #0c1520;
  --rag-slate: #152a3d;
  --rag-paper: #f6f1e8;
  --rag-card: #fffcf5;
  --rag-amber: #d97706;
  --rag-amber-soft: rgba(217, 119, 6, 0.14);
  --rag-teal: #0f766e;
  --rag-border: rgba(12, 21, 32, 0.12);
  font-family: 'Literata', 'Georgia', serif;
  border-radius: 20px;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: visible;
  border: 1px solid var(--rag-border);
  background:
    radial-gradient(900px 420px at 0% -20%, rgba(15, 118, 110, 0.2), transparent 55%),
    radial-gradient(600px 300px at 100% 0%, rgba(217, 119, 6, 0.15), transparent 50%),
    linear-gradient(165deg, #fdfbf7 0%, #eef4f2 100%);
  box-shadow: 0 18px 40px rgba(12, 21, 32, 0.1);
}

.rag-grid {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  align-items: start;
}

.health-panel {
  grid-column: 1 / -1;
  min-width: 0;
  margin-top: 4px;
  padding: 14px 16px 16px;
  border-radius: 16px;
  border: 1px solid rgba(12, 21, 32, 0.08);
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.health-card {
  border: 1px solid rgba(12, 21, 32, 0.06);
  border-radius: 12px;
  padding: 10px 12px 12px;
  background: #fff;
  height: 100%;
}

.health-card h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--rag-slate);
}

.health-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #475569;
  line-height: 1.55;
}

.health-list .warn-li {
  color: #b45309;
  font-weight: 600;
}

.health-list .mono-li {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  word-break: break-all;
}

.result-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.health-mini {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 960px) {
  .rag-grid {
    grid-template-columns: 1fr;
  }
}

.rag-form-card,
.rag-result-card {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--rag-card);
  border: 1px solid rgba(12, 21, 32, 0.08);
  border-radius: 16px;
  padding: 18px 18px 20px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.card-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 600;
  color: var(--rag-slate);
}

.rag-form :deep(.el-form-item__label) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #3d5568;
  letter-spacing: 0.02em;
}

.rag-inline {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.defaults-hint {
  margin: 4px 0 12px;
  font-size: 11px;
  color: #5c6570;
  line-height: 1.5;
}

.defaults-hint code {
  font-size: 10px;
  padding: 0 3px;
  border-radius: 4px;
  background: rgba(12, 21, 32, 0.06);
}

.rag-num {
  width: 100%;
}

.rag-select {
  width: 100%;
}

.rag-query-input :deep(textarea) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.45;
  background: var(--rag-paper);
}

.rag-switches {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--rag-amber-soft);
  border: 1px dashed rgba(217, 119, 6, 0.35);
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.switch-label {
  font-size: 13px;
  color: #4a3b2a;
  line-height: 1.35;
}

.rag-submit {
  width: 100%;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 12px;
  height: 44px;
  background: linear-gradient(90deg, #0f766e 0%, #0d9488 48%, #0f766e 100%) !important;
  border: none !important;
}

.rag-reveal {
  animation: ragReveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes ragReveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.duration-pill {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--rag-teal);
  font-weight: 600;
}

.result-empty {
  padding: 28px 12px;
  text-align: center;
  color: #5c6b78;
  font-size: 14px;
  line-height: 1.6;
}

.result-body {
  min-height: 120px;
  min-width: 0;
  max-width: 100%;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.compare-card {
  min-width: 0;
  border: 1px solid rgba(12, 21, 32, 0.08);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
}

.compare-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.compare-head h4 {
  margin: 0;
  font-size: 13px;
  color: var(--rag-slate);
}

.stat-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
  padding: 2px;
  border-radius: 14px;
}

.stat-strip--warn {
  background: #fff8f0;
  outline: 1px solid rgba(217, 119, 6, 0.4);
}

.stat {
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(12, 21, 32, 0.06);
}

.stat.accent {
  border-color: rgba(15, 118, 110, 0.35);
  background: #f0fdf9;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat strong {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 15px;
  color: var(--rag-ink);
}

.reason-banner {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  font-size: 13px;
  color: #9a3412;
}

.reason-banner code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.rag-collapse {
  min-width: 0;
  max-width: 100%;
  border: none;
  --el-collapse-header-bg-color: transparent;
}

.rag-collapse :deep(.el-table),
.rag-collapse :deep(.el-table__body-wrapper) {
  max-width: 100%;
}

.rag-collapse :deep(.el-collapse-item__header) {
  font-family: 'Literata', serif;
  font-weight: 600;
  color: var(--rag-slate);
  border-radius: 10px;
  padding-left: 4px;
}

.rag-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.raw-json {
  margin-top: 16px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(12, 21, 32, 0.08);
  padding: 8px 12px;
  background: #0f172a;
  color: #e2e8f0;
}

.raw-json summary {
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: #94a3b8;
  list-style-position: outside;
}

.raw-json pre {
  display: block;
  margin: 10px 0 4px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  max-height: 240px;
  overflow-x: auto;
  overflow-y: auto;
  white-space: pre;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: #cbd5e1;
  box-sizing: border-box;
}

@media (max-width: 1200px) {
  .compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
