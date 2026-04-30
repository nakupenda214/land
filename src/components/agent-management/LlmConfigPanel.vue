<template>
  <section class="panel llm-config-panel">
    <div class="block">
      <div class="block-head">
        <h3>LLM 配置管理</h3>
        <el-button type="primary" @click="openCreate">新增配置</el-button>
      </div>
      <el-table :data="profiles" border stripe v-loading="loadingProfiles">
        <el-table-column prop="profileName" label="配置名" min-width="180">
          <template #default="{ row }">
            <span>{{ row.profileName }}</span>
            <el-tag v-if="row.systemDefault" type="warning" size="small" class="tag-builtin">内置缺省</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="model" label="模型" min-width="220" show-overflow-tooltip />
        <el-table-column prop="temperature" label="温度" width="90" />
        <el-table-column prop="maxTokens" label="maxTokens" width="110" />
        <el-table-column label="超时(秒)" width="110">
          <template #default="{ row }">
            {{ formatTimeoutSeconds(row.timeoutMs) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.systemDefault" @click="removeProfile(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="block">
      <div class="block-head">
        <h3>节点路由绑定</h3>
      </div>
      <el-table :data="nodeRoutesView" border stripe v-loading="loadingRoutes">
        <el-table-column prop="nodeId" label="节点" min-width="180" />
        <el-table-column prop="profileName" label="当前配置" min-width="160" />
        <el-table-column label="回退原因" min-width="210">
          <template #default="{ row }">
            <el-tag v-if="row.sourceReason && row.sourceReason !== 'route_hit'" type="warning" size="small">
              {{ sourceReasonLabel[row.sourceReason] || row.sourceReason }}
            </el-tag>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定配置" min-width="280">
          <template #default="{ row }">
            <el-select
              v-model="row._bindProfileId"
              filterable
              style="width: 100%"
              :loading="!!routeSaving[row.nodeId]"
              @change="(val) => onRouteBindChange(row, val)"
            >
              <el-option v-for="p in profiles" :key="p.id" :label="p.profileName" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 LLM 配置' : '新增 LLM 配置'" width="760px">
      <el-form label-position="top">
        <section class="cfg-card">
          <header class="cfg-card-head">
            <h4>基础配置</h4>
            <span class="cfg-card-sub">保存后用于节点路由调用</span>
          </header>
          <div class="grid-2">
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  配置名
                  <el-tooltip content="在列表与路由选择中显示的名称，用于区分多套参数。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model.trim="form.profileName" />
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  provider
                  <el-tooltip content="仅支持 doubao 与 openai 两类 provider。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="form.provider">
                <el-option label="doubao" value="doubao" />
                <el-option label="openai" value="openai" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item>
            <template #label>
              <span class="label-with-hint">
                模型
                <el-tooltip content="调用厂商 API 时使用的模型 ID，需与网关或文档一致。" placement="top">
                  <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-input v-model.trim="form.model" />
          </el-form-item>
          <div class="grid-3">
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  温度
                  <el-tooltip content="越高越发散，越低越稳定。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" />
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  maxTokens
                  <el-tooltip content="单次回复最大 token 数。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number v-model="form.maxTokens" :min="1" :max="32768" />
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  timeout（秒）
                  <el-tooltip content="请求最大超时（秒）。保存时会自动转换为毫秒传给后端。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number v-model="timeoutSeconds" :min="1" :max="180" :step="1" />
            </el-form-item>
          </div>
          <div class="grid-3">
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  默认 reasoning_effort
                  <el-tooltip content="保存后作为该配置的默认推理强度，不填表示按模型默认。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="form.reasoningEffort" clearable>
                <el-option label="minimal" value="minimal" />
                <el-option label="low" value="low" />
                <el-option label="medium" value="medium" />
                <el-option label="high" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  默认 thinking.type
                  <el-tooltip content="保存后作为该配置的默认 thinking.type，不填表示按模型默认。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="form.thinkingType" clearable>
                <el-option label="enabled" value="enabled" />
                <el-option label="disabled" value="disabled" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  默认 response_format
                  <el-tooltip content="保存后默认输出格式：text/json_object/json_schema。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="form.responseFormatType">
                <el-option label="text" value="text" />
                <el-option label="json_object" value="json_object" />
                <el-option label="json_schema" value="json_schema" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item v-if="form.responseFormatType === 'json_schema'">
            <template #label>
              <span class="label-with-hint">
                默认 JSON Schema
                <el-tooltip content="可选。保存后作为默认 schema；为空表示运行时不强制 schema。" placement="top">
                  <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-input
              v-model="form.responseJsonSchemaText"
              type="textarea"
              :rows="6"
              placeholder='例如：{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"],"additionalProperties":false}'
            />
          </el-form-item>
          <div class="grid-2">
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  启用
                  <el-tooltip content="停用后不会被路由选用。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-switch v-model="form.enabled" />
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  备注
                  <el-tooltip content="仅管理端备注，不参与模型调用。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model.trim="form.remark" />
            </el-form-item>
          </div>
        </section>

        <section class="cfg-card">
          <header class="cfg-card-head">
            <h4>连通测试</h4>
            <span class="cfg-card-sub">验证当前配置是否可调用</span>
          </header>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="test-guide"
            description="测试场景用于模拟调用能力：基础对话（text）、JSON对象输出（json_object）、JSON结构校验（json_schema）。response_format 会随场景自动选择。"
          />
          <div class="grid-3">
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  测试场景
                  <el-tooltip content="基础对话=普通文本；JSON对象=要求返回合法JSON；JSON结构=按Schema约束输出。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="testOptions.testMode">
                <el-option label="基础对话（text）" value="basic" />
                <el-option label="JSON对象输出" value="json_object" />
                <el-option label="JSON结构校验" value="json_schema" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  reasoning_effort
                  <el-tooltip content="可选，不填则不下发该参数。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="testOptions.reasoningEffort" clearable>
                <el-option label="minimal" value="minimal" />
                <el-option label="low" value="low" />
                <el-option label="medium" value="medium" />
                <el-option label="high" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="label-with-hint">
                  thinking.type
                  <el-tooltip content="可选，不填则不下发该参数。" placement="top">
                    <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="testOptions.thinkingType" clearable>
                <el-option label="enabled" value="enabled" />
                <el-option label="disabled" value="disabled" />
              </el-select>
            </el-form-item>
          </div>
          <div class="auto-format-hint">自动映射 response_format：<b>{{ resolvedResponseFormatType }}</b></div>
        </section>

        <el-form-item v-if="effectiveSchemaMode">
          <template #label>
            <span class="label-with-hint">
              JSON Schema
              <el-tooltip content="json_schema 模式可传自定义 schema；为空则后端使用默认 schema。" placement="top">
                <el-icon class="hint-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="testOptions.responseJsonSchemaText"
            type="textarea"
            :rows="8"
            placeholder='例如：{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"],"additionalProperties":false}'
          />
        </el-form-item>
        <el-alert
          v-if="testResult"
          :type="testResult.ok ? 'success' : 'error'"
          :title="testResult.ok ? `连通成功（${testResult.latencyMs || 0}ms）` : '连通失败'"
          :description="testResult.ok ? testSuccessText(testResult) : testErrorText(testResult)"
          :closable="false"
          show-icon
        />
        <div v-if="testResult" class="test-result-meta">
          <el-tag size="small">mode: {{ testResult.testMode || '-' }}</el-tag>
          <el-tag size="small">format: {{ testResult.responseFormatType || '-' }}</el-tag>
          <el-tag size="small">errorCode: {{ testResult.errorCode || '-' }}</el-tag>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="testingConnectivity" @click="testConnectivity">测试连通</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import {
  listLlmNodes,
  listLlmProfiles,
  createLlmProfile,
  updateLlmProfile,
  deleteLlmProfile,
  testLlmProfileConnectivity,
  listLlmNodeRoutes,
  upsertLlmNodeRoute,
  deleteLlmNodeRoute,
  getLlmEffectiveConfig
} from '@/services/agent-management.service'

const loadingProfiles = ref(false)
const loadingRoutes = ref(false)
/** 各节点路由下拉正在提交（支持多行并行） */
const routeSaving = reactive({})
const savingProfile = ref(false)
const testingConnectivity = ref(false)
const profiles = ref([])
const routes = ref([])
const nodeIds = ref([])
const effectiveMap = ref({})
const testResult = ref(null)
const dialogVisible = ref(false)
const editingId = ref('')

const form = reactive({
  profileName: '',
  model: '',
  provider: 'doubao',
  temperature: 0.2,
  maxTokens: 4096,
  timeoutMs: 60000,
  reasoningEffort: '',
  thinkingType: '',
  responseFormatType: 'text',
  responseJsonSchemaText: '',
  enabled: true,
  remark: ''
})
const timeoutSeconds = computed({
  get() {
    const ms = Number(form.timeoutMs || 0)
    if (!Number.isFinite(ms) || ms <= 0) return 60
    return Math.round(ms / 1000)
  },
  set(v) {
    const sec = Number(v)
    if (!Number.isFinite(sec)) return
    const ms = Math.round(sec * 1000)
    form.timeoutMs = Math.min(180000, Math.max(1000, ms))
  }
})
const testOptions = reactive({
  testMode: 'basic',
  reasoningEffort: '',
  thinkingType: '',
  responseJsonSchemaText: ''
})

const effectiveSchemaMode = computed(
  () => testOptions.testMode === 'json_schema'
)
const resolvedResponseFormatType = computed(() => {
  if (testOptions.testMode === 'json_object') return 'json_object'
  if (testOptions.testMode === 'json_schema') return 'json_schema'
  return 'text'
})

const nodeRoutesView = computed(() => {
  const map = new Map((routes.value || []).map((r) => [r.nodeId, r]))
  return (nodeIds.value || []).map((nodeId) => {
    const r = map.get(nodeId)
    const effective = effectiveMap.value[nodeId] || {}
    return {
      nodeId,
      profileId: r?.profileId || '',
      profileName: effective.profileName || '—',
      enabled: r?.enabled !== false,
      sourceReason: effective.sourceReason || '',
      _bindProfileId: r?.profileId || ''
    }
  })
})

const sourceReasonLabel = {
  route_hit: '已命中节点路由',
  node_blank: '节点为空，已回退默认',
  node_unsupported: '节点不受支持，已回退默认',
  route_not_found_or_disabled: '未配置路由或路由停用，已回退默认',
  profile_not_found: '绑定配置不存在，已回退默认',
  profile_disabled: '绑定配置已停用，已回退默认',
  profile_id_blank: '路由缺少配置ID，已回退默认'
}

function resetForm() {
  editingId.value = ''
  form.profileName = ''
  form.model = ''
  form.provider = 'doubao'
  form.temperature = 0.2
  form.maxTokens = 4096
  form.timeoutMs = 60000
  form.reasoningEffort = ''
  form.thinkingType = ''
  form.responseFormatType = 'text'
  form.responseJsonSchemaText = ''
  form.enabled = true
  form.remark = ''
  testOptions.testMode = 'basic'
  testOptions.reasoningEffort = ''
  testOptions.thinkingType = ''
  testOptions.responseJsonSchemaText = ''
  testResult.value = null
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.profileName = row.profileName || ''
  form.model = row.model || ''
  form.provider = row.provider || 'doubao'
  form.temperature = Number(row.temperature ?? 0.2)
  form.maxTokens = Number(row.maxTokens ?? 4096)
  form.timeoutMs = Number(row.timeoutMs ?? 60000)
  form.reasoningEffort = row.reasoningEffort || ''
  form.thinkingType = row.thinkingType || ''
  form.responseFormatType = row.responseFormatType || 'text'
  form.responseJsonSchemaText = row.responseJsonSchema ? JSON.stringify(row.responseJsonSchema, null, 2) : ''
  form.enabled = row.enabled !== false
  form.remark = row.remark || ''
  testResult.value = null
  dialogVisible.value = true
}

async function testConnectivity() {
  if (!form.model) {
    ElMessage.warning('请先填写模型名称')
    return
  }
  testingConnectivity.value = true
  testResult.value = null
  try {
    let responseJsonSchema
    const schemaText = testOptions.responseJsonSchemaText?.trim()
    if (effectiveSchemaMode.value && schemaText) {
      try {
        responseJsonSchema = JSON.parse(schemaText)
      } catch {
        ElMessage.error('JSON Schema 不是合法 JSON')
        return
      }
    }
    const data = await testLlmProfileConnectivity({
      model: form.model,
      provider: form.provider,
      timeoutMs: form.timeoutMs,
      testMode: testOptions.testMode,
      responseFormatType: resolvedResponseFormatType.value,
      reasoningEffort: testOptions.reasoningEffort || undefined,
      thinkingType: testOptions.thinkingType || undefined,
      responseJsonSchema
    })
    testResult.value = data || null
    if (data?.ok) {
      ElMessage.success(`连通成功，耗时 ${data.latencyMs || 0}ms`)
    } else {
      ElMessage.error(data?.error || data?.message || '连通失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '连通测试失败')
    testResult.value = { ok: false, error: e.message || '请求失败' }
  } finally {
    testingConnectivity.value = false
  }
}

function testSuccessText(data) {
  const preview = data?.responsePreview ? String(data.responsePreview) : '模型可调用'
  return `耗时 ${data?.latencyMs || 0}ms；${preview}`
}

function testErrorText(data) {
  const code = data?.errorCode ? `(${data.errorCode}) ` : ''
  return `${code}${data?.error || data?.message || '未知错误'}`
}

async function loadProfiles() {
  loadingProfiles.value = true
  try {
    profiles.value = await listLlmProfiles()
  } catch (e) {
    ElMessage.error(e.message || '加载 LLM 配置失败')
  } finally {
    loadingProfiles.value = false
  }
}

async function loadNodes() {
  try {
    nodeIds.value = await listLlmNodes()
  } catch (e) {
    ElMessage.error(e.message || '加载节点列表失败')
    nodeIds.value = []
  }
}

async function loadRoutes() {
  loadingRoutes.value = true
  try {
    routes.value = await listLlmNodeRoutes()
  } catch (e) {
    ElMessage.error(e.message || '加载节点路由失败')
  } finally {
    loadingRoutes.value = false
  }
}

async function loadEffective() {
  const ids = nodeIds.value || []
  const pairs = await Promise.all(
    ids.map(async (nodeId) => {
      try {
        const effective = await getLlmEffectiveConfig(nodeId)
        return [nodeId, effective]
      } catch (_e) {
        return [nodeId, { sourceReason: '' }]
      }
    })
  )
  effectiveMap.value = Object.fromEntries(pairs)
}

function formatTimeoutSeconds(ms) {
  const n = Number(ms || 0)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return Math.round(n / 1000)
}

async function saveProfile() {
  if (!form.profileName || !form.model) {
    ElMessage.warning('配置名和模型不能为空')
    return
  }
  savingProfile.value = true
  try {
    let responseJsonSchema
    const schemaText = form.responseJsonSchemaText?.trim()
    if (form.responseFormatType === 'json_schema' && schemaText) {
      try {
        responseJsonSchema = JSON.parse(schemaText)
      } catch {
        ElMessage.error('默认 JSON Schema 不是合法 JSON')
        return
      }
    }
    const payload = {
      profileName: form.profileName,
      model: form.model,
      provider: form.provider,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      timeoutMs: form.timeoutMs,
      reasoningEffort: form.reasoningEffort || undefined,
      thinkingType: form.thinkingType || undefined,
      responseFormatType: form.responseFormatType || 'text',
      responseJsonSchema,
      enabled: form.enabled,
      remark: form.remark
    }
    if (editingId.value) {
      await updateLlmProfile(editingId.value, payload)
      ElMessage.success('配置已更新')
    } else {
      await createLlmProfile(payload)
      ElMessage.success('配置已创建')
    }
    dialogVisible.value = false
    await loadProfiles()
    await loadRoutes()
    await loadEffective()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function removeProfile(row) {
  if (row.systemDefault) {
    ElMessage.warning('内置缺省配置不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除配置「${row.profileName}」？`, '删除确认', { type: 'warning' })
    await deleteLlmProfile(row.id)
    ElMessage.success('配置已删除')
    await loadProfiles()
    await loadRoutes()
    await loadEffective()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

async function onRouteBindChange(row, newVal) {
  const next = newVal === null || newVal === undefined || newVal === '' ? '' : String(newVal)
  const route = (routes.value || []).find((r) => r.nodeId === row.nodeId)
  const prev = route?.profileId ? String(route.profileId) : ''
  if (next === prev) {
    return
  }
  routeSaving[row.nodeId] = true
  try {
    if (!next) {
      await deleteLlmNodeRoute(row.nodeId)
      ElMessage.success('已恢复为缺省配置')
    } else {
      await upsertLlmNodeRoute(row.nodeId, { profileId: next, enabled: true })
      ElMessage.success('路由已更新')
    }
    await loadRoutes()
    await loadEffective()
  } catch (e) {
    ElMessage.error(e.message || '更新路由失败')
    await loadRoutes()
    await loadEffective()
  } finally {
    delete routeSaving[row.nodeId]
  }
}

onMounted(async () => {
  await loadNodes()
  await loadProfiles()
  await loadRoutes()
  await loadEffective()
})
</script>

<style scoped>
.panel {
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #d8e6df;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcfb 100%);
}
.block + .block {
  margin-top: 18px;
}
.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.cfg-card {
  border: 1px solid #e4ece8;
  border-radius: 14px;
  padding: 12px 14px 4px;
  margin-bottom: 12px;
  background: #fcfefe;
}
.cfg-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cfg-card-head h4 {
  margin: 0;
  font-size: 14px;
}
.cfg-card-sub {
  color: #8a9590;
  font-size: 12px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.test-guide {
  margin: 8px 0 12px;
}
.auto-format-hint {
  margin: 2px 0 10px;
  color: #5c6f68;
  font-size: 12px;
}
.test-result-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
@media (max-width: 980px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
.muted {
  color: #8c8c8c;
}
.tag-builtin {
  margin-left: 8px;
  vertical-align: middle;
}
.label-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.hint-icon {
  font-size: 14px;
  color: #909399;
  cursor: help;
  vertical-align: middle;
}
.hint-icon:hover {
  color: #409eff;
}
</style>

