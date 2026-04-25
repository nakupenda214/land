import axios from 'axios'

const API_PREFIX = import.meta.env.DEV ? '/api/api' : '/api'

function unwrapResponse(response, fallbackMessage) {
  const payload = response?.data
  const code = Number(payload?.code)
  if (Number.isNaN(code) || code === 200) {
    return payload?.data
  }
  throw new Error(payload?.msg || fallbackMessage || '请求失败')
}

export function listBusinessKnowledge(agentId, keyword) {
  return axios
    .get(`${API_PREFIX}/business-knowledge`, { params: { agentId, keyword } })
    .then((res) => unwrapResponse(res, '查询业务知识失败'))
}

export function createBusinessKnowledge(data) {
  return axios.post(`${API_PREFIX}/business-knowledge`, data).then((res) => unwrapResponse(res, '创建业务知识失败'))
}

export function updateBusinessKnowledge(id, data) {
  return axios.put(`${API_PREFIX}/business-knowledge/${id}`, data).then((res) => unwrapResponse(res, '更新业务知识失败'))
}

export function deleteBusinessKnowledge(id) {
  return axios.delete(`${API_PREFIX}/business-knowledge/${id}`).then((res) => unwrapResponse(res, '删除业务知识失败'))
}

export function recallBusinessKnowledge(id, isRecall) {
  return axios
    .post(`${API_PREFIX}/business-knowledge/recall/${id}`, null, { params: { isRecall } })
    .then((res) => unwrapResponse(res, '更新业务知识召回状态失败'))
}

export function retryBusinessKnowledgeEmbedding(id) {
  return axios
    .post(`${API_PREFIX}/business-knowledge/retry-embedding/${id}`)
    .then((res) => unwrapResponse(res, '重试业务知识向量化失败'))
}

export function refreshBusinessKnowledgeVector(agentId) {
  return axios
    .post(`${API_PREFIX}/business-knowledge/refresh-vector-store`, null, { params: { agentId } })
    .then((res) => unwrapResponse(res, '刷新业务知识向量库失败'))
}

export function queryAgentKnowledge(payload) {
  return axios.post(`${API_PREFIX}/agent-knowledge/query/page`, payload).then((res) => {
    const data = res?.data
    const code = Number(data?.code)
    if (!Number.isNaN(code) && code !== 200) {
      throw new Error(data?.msg || '查询智能体知识失败')
    }
    return {
      records: data?.data || [],
      total: Number(data?.total || 0),
      pageNum: Number(data?.pageNum || payload?.pageNum || 1),
      pageSize: Number(data?.pageSize || payload?.pageSize || 10)
    }
  })
}

export function createAgentKnowledge(formData) {
  return axios
    .post(`${API_PREFIX}/agent-knowledge/create`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((res) => unwrapResponse(res, '创建智能体知识失败'))
}

export function updateAgentKnowledge(id, data) {
  return axios.put(`${API_PREFIX}/agent-knowledge/${id}`, data).then((res) => unwrapResponse(res, '更新智能体知识失败'))
}

export function deleteAgentKnowledge(id) {
  return axios.delete(`${API_PREFIX}/agent-knowledge/${id}`).then((res) => unwrapResponse(res, '删除智能体知识失败'))
}

export function recallAgentKnowledge(id, isRecall) {
  return axios
    .put(`${API_PREFIX}/agent-knowledge/recall/${id}`, null, { params: { isRecall } })
    .then((res) => unwrapResponse(res, '更新智能体知识召回状态失败'))
}

export function retryAgentKnowledgeEmbedding(id) {
  return axios
    .post(`${API_PREFIX}/agent-knowledge/retry-embedding/${id}`)
    .then((res) => unwrapResponse(res, '重试智能体知识向量化失败'))
}

export function listFewShot(keyword, enabled) {
  return axios
    .get(`${API_PREFIX}/few-shot`, { params: { keyword, enabled } })
    .then((res) => unwrapResponse(res, '查询 few-shot 失败'))
}

export function createFewShot(data) {
  return axios.post(`${API_PREFIX}/few-shot`, data).then((res) => unwrapResponse(res, '创建 few-shot 失败'))
}

export function updateFewShot(id, data) {
  return axios.put(`${API_PREFIX}/few-shot/${id}`, data).then((res) => unwrapResponse(res, '更新 few-shot 失败'))
}

export function deleteFewShot(id) {
  return axios.delete(`${API_PREFIX}/few-shot/${id}`).then((res) => unwrapResponse(res, '删除 few-shot 失败'))
}

export function updateFewShotEnabled(id, enabled) {
  return axios
    .put(`${API_PREFIX}/few-shot/enabled/${id}`, null, { params: { enabled } })
    .then((res) => unwrapResponse(res, '更新 few-shot 启用状态失败'))
}

export function refreshFewShotVectorStore() {
  return axios
    .post(`${API_PREFIX}/few-shot/refresh-vector-store`)
    .then((res) => unwrapResponse(res, '刷新 few-shot 向量失败'))
}

export function listLlmProfiles() {
  return axios.get(`${API_PREFIX}/llm-config/profiles`).then((res) => unwrapResponse(res, '查询 LLM 配置失败'))
}

export function listLlmNodes() {
  return axios.get(`${API_PREFIX}/llm-config/nodes`).then((res) => unwrapResponse(res, '查询节点列表失败'))
}

export function createLlmProfile(payload) {
  return axios.post(`${API_PREFIX}/llm-config/profiles`, payload).then((res) => unwrapResponse(res, '创建 LLM 配置失败'))
}

export function updateLlmProfile(id, payload) {
  return axios.put(`${API_PREFIX}/llm-config/profiles/${id}`, payload).then((res) => unwrapResponse(res, '更新 LLM 配置失败'))
}

export function deleteLlmProfile(id) {
  return axios.delete(`${API_PREFIX}/llm-config/profiles/${id}`).then((res) => unwrapResponse(res, '删除 LLM 配置失败'))
}

export function testLlmProfileConnectivity(payload) {
  return axios
    .post(`${API_PREFIX}/llm-config/profiles/test-connect`, payload)
    .then((res) => unwrapResponse(res, 'LLM 连通测试失败'))
}

export function listLlmNodeRoutes() {
  return axios.get(`${API_PREFIX}/llm-config/node-routes`).then((res) => unwrapResponse(res, '查询节点路由失败'))
}

export function upsertLlmNodeRoute(nodeId, payload) {
  return axios
    .put(`${API_PREFIX}/llm-config/node-routes/${encodeURIComponent(nodeId)}`, payload)
    .then((res) => unwrapResponse(res, '保存节点路由失败'))
}

export function deleteLlmNodeRoute(nodeId) {
  return axios
    .delete(`${API_PREFIX}/llm-config/node-routes/${encodeURIComponent(nodeId)}`)
    .then((res) => unwrapResponse(res, '删除节点路由失败'))
}

export function getLlmEffectiveConfig(nodeId) {
  return axios
    .get(`${API_PREFIX}/llm-config/effective/${encodeURIComponent(nodeId)}`)
    .then((res) => unwrapResponse(res, '查询生效配置失败'))
}

export function getRetrievalSettings() {
  return axios.get(`${API_PREFIX}/agent/retrieval-settings`).then((res) => unwrapResponse(res, '查询检索配置失败'))
}

export function updateRetrievalSettings(payload) {
  return axios.put(`${API_PREFIX}/agent/retrieval-settings`, payload).then((res) => unwrapResponse(res, '保存检索配置失败'))
}

export function getSchemaVectorStatus(agentId) {
  return axios
    .get(`${API_PREFIX}/schema-vector/status`, { params: { agentId } })
    .then((res) => unwrapResponse(res, '查询 Schema 向量状态失败'))
}

export function refreshSchemaVector(agentId) {
  return axios
    .post(`${API_PREFIX}/schema-vector/refresh`, null, { params: { agentId } })
    .then((res) => unwrapResponse(res, '刷新 Schema 向量失败'))
}

export function clearSchemaVector(agentId) {
  return axios
    .post(`${API_PREFIX}/schema-vector/clear`, null, { params: { agentId } })
    .then((res) => unwrapResponse(res, '清空 Schema 向量失败'))
}

export function getSchemaYaml() {
  return axios.get(`${API_PREFIX}/schema-vector/yaml`).then((res) => unwrapResponse(res, '查询 Schema YAML 失败'))
}

export function updateSchemaYaml(payload, agentId) {
  return axios
    .put(`${API_PREFIX}/schema-vector/yaml`, payload, { params: { agentId } })
    .then((res) => unwrapResponse(res, '更新 Schema YAML 失败'))
}

export function listSchemaCollections() {
  return axios
    .get(`${API_PREFIX}/schema-vector/yaml/collections`)
    .then((res) => unwrapResponse(res, '查询 Schema 集合明细失败'))
}

/** Mix 选表派生视图预览（与全量 YAML 互补，不含完整字段定义） */
export function previewSchemaMixView(collections = []) {
  const params = { collections: (collections || []).join(',') }
  return axios
    .get(`${API_PREFIX}/schema-vector/views/preview`, { params })
    .then((res) => unwrapResponse(res, '查询 Mix 选表视图预览失败'))
}

function unwrapAgentApi(res, fallbackMessage) {
  const payload = res?.data
  if (payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage || '请求失败')
  }
  return payload?.data
}

/** 最近 agent_trace 根文档列表（不含 events 数组） */
export function listAgentTraces(limit = 50) {
  return axios
    .get(`${API_PREFIX}/agent-traces`, { params: { limit } })
    .then((res) => unwrapAgentApi(res, '查询 Trace 列表失败'))
}

/** 单条 trace 全量（含 events） */
export function getAgentTrace(traceId) {
  return axios
    .get(`${API_PREFIX}/agent-traces/${encodeURIComponent(traceId)}`)
    .then((res) => unwrapAgentApi(res, '加载 Trace 详情失败'))
}

/** 按 queryResultId 读取 mongo_execute 全量查询结果 */
export function getAgentMongoQueryResult(queryResultId) {
  return axios
    .get(`${API_PREFIX}/agent-traces/mongo-results/${encodeURIComponent(queryResultId)}`)
    .then((res) => unwrapAgentApi(res, '加载查询结果失败'))
}

/** 与后端 LandAgentConfiguration 一致的图骨架（节点 + 静态边） */
export function getAgentGraphSkeleton() {
  return axios
    .get(`${API_PREFIX}/agent-traces/meta/graph-skeleton`)
    .then((res) => unwrapAgentApi(res, '加载图骨架失败'))
}

/** 最近 N 条 trace 的 RAG 聚合趋势 */
export function getAgentRagSummary(limit = 30) {
  return axios
    .get(`${API_PREFIX}/agent-traces/rag/summary`, { params: { limit } })
    .then((res) => unwrapAgentApi(res, '加载 RAG 聚合失败'))
}

/** 观测快照：Mongo 时间窗聚合（traceRoot + chainSummary） */
export function getAgentObservabilitySnapshot(hours = 72) {
  return axios
    .get(`${API_PREFIX}/agent-traces/observability/snapshot`, { params: { hours } })
    .then((res) => unwrapAgentApi(res, '加载观测快照失败'))
}

/** LLM 观测快照：token、时延、回退原因 */
export function getAgentLlmSummary(hours = 72, model, node) {
  const params = { hours }
  if (model) params.model = model
  if (node) params.node = node
  return axios
    .get(`${API_PREFIX}/agent-traces/observability/llm-summary`, { params })
    .then((res) => unwrapAgentApi(res, '加载 LLM 观测快照失败'))
}

/** 人工标注 upsert（按 traceId） */
export function upsertTraceAnnotation(body) {
  return axios
    .post(`${API_PREFIX}/agent-traces/annotations`, body)
    .then((res) => unwrapAgentApi(res, '保存标注失败'))
}

/** 最近人工标注 */
export function listTraceAnnotationsRecent(limit = 50, route) {
  return axios
    .get(`${API_PREFIX}/agent-traces/annotations/recent`, { params: { limit, route } })
    .then((res) => unwrapAgentApi(res, '加载标注列表失败'))
}

/** 按 traceId 取标注（可能为 null） */
export function getTraceAnnotationByTraceId(traceId) {
  return axios
    .get(`${API_PREFIX}/agent-traces/annotations/trace/${encodeURIComponent(traceId)}`)
    .then((res) => unwrapAgentApi(res, '加载标注失败'))
}

/** bad case 分页列表（含后端自动落库的 FAILED 等） */
export function listAgentBadCases(pageNum = 1, pageSize = 20) {
  return axios
    .get(`${API_PREFIX}/agent-traces/bad-cases`, { params: { pageNum, pageSize } })
    .then((res) => {
      const data = unwrapAgentApi(res, '查询 bad case 失败') || {}
      return {
        records: Array.isArray(data.records) ? data.records : [],
        total: Number(data.total || 0),
        pageNum: Number(data.pageNum || pageNum || 1),
        pageSize: Number(data.pageSize || pageSize || 20)
      }
    })
}

/** 记忆配置读取 */
export function getAgentMemoryConfig() {
  return axios
    .get(`${API_PREFIX}/agent-traces/memory/config`)
    .then((res) => unwrapAgentApi(res, '加载记忆配置失败'))
}

/** 记忆配置更新（运行时） */
export function updateAgentMemoryConfig(body) {
  return axios
    .put(`${API_PREFIX}/agent-traces/memory/config`, body)
    .then((res) => unwrapAgentApi(res, '更新记忆配置失败'))
}

/** 会话记忆列表 */
export function listAgentMemorySessions(limit = 100, keyword = '') {
  return axios
    .get(`${API_PREFIX}/agent-traces/memory/sessions`, { params: { limit, keyword } })
    .then((res) => unwrapAgentApi(res, '加载会话记忆列表失败'))
}

/** 会话记忆明细（消息级，分页） */
export function listAgentMemoryMessages(threadId, pageNum = 1, pageSize = 20, keyword = '', role = '') {
  return axios
    .get(`${API_PREFIX}/agent-traces/memory/sessions/${encodeURIComponent(threadId)}/messages`, {
      params: { pageNum, pageSize, keyword, role }
    })
    .then((res) => unwrapAgentApi(res, '加载会话记忆明细失败'))
}

/** 立即刷新某会话摘要 */
export function refreshAgentMemorySummary(threadId) {
  return axios
    .post(`${API_PREFIX}/agent-traces/memory/sessions/${encodeURIComponent(threadId)}/refresh-summary`)
    .then((res) => unwrapAgentApi(res, '刷新会话摘要失败'))
}

/** 清空某会话摘要 */
export function clearAgentMemorySummary(threadId) {
  return axios
    .post(`${API_PREFIX}/agent-traces/memory/sessions/${encodeURIComponent(threadId)}/clear-summary`)
    .then((res) => unwrapAgentApi(res, '清空会话摘要失败'))
}

/**
 * Agent RAG 向量检索（与后端 {@code POST /api/agent/rag/query} 对齐）
 * @param {object} body RagQueryDTO：agentId、vectorType、mode、query、topK、similarityThreshold、skipRecallIdRestriction、probeZeroThreshold
 */
export function postAgentRagQuery(body) {
  return axios.post(`${API_PREFIX}/agent/rag/query`, body).then((res) => unwrapAgentApi(res, 'RAG 检索失败'))
}

/** 向量库健康度：Mongo 与 Milvus 子集对账 */
export function getAgentVectorHealth(agentId) {
  return axios
    .get(`${API_PREFIX}/agent/rag/health`, { params: { agentId } })
    .then((res) => unwrapAgentApi(res, '查询向量健康度失败'))
}
