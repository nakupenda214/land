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

export function reloadAndRefreshSchemaVector(agentId) {
  return axios
    .post(`${API_PREFIX}/schema-vector/reload-and-refresh`, null, { params: { agentId } })
    .then((res) => unwrapResponse(res, '重载并刷新 Schema 向量失败'))
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
