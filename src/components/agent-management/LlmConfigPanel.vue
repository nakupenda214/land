<template>
  <section class="panel llm-config-panel">
    <div class="block">
      <div class="block-head">
        <h3>LLM 配置管理</h3>
        <el-button type="primary" @click="openCreate">新增配置</el-button>
      </div>
      <el-table :data="profiles" border stripe v-loading="loadingProfiles" class="profiles-table">
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
        <el-table-column
          label="操作"
          width="116"
          fixed="right"
          align="center"
          header-align="center"
          class-name="col-actions"
          label-class-name="col-actions"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.systemDefault" @click="removeProfile(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="profilePageNum"
        v-model:page-size="profilePageSize"
        class="table-pagination"
        :total="profileTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="loadProfiles"
        @size-change="onProfilePageSizeChange"
      />
    </div>

    <div class="block route-bind-block">
      <div class="block-head">
        <h3>节点路由绑定</h3>
        <div class="block-head-actions">
          <el-button size="small" type="primary" plain :loading="loadingRoutes" @click="refreshRoutesEffective">
            刷新生效参数
          </el-button>
        </div>
      </div>
      <el-alert type="info" :closable="false" show-icon class="route-hint-alert">
        <template #title>
          <span class="route-hint-title">说明</span>
        </template>
        治理参数写入 Mongo 路由，覆盖 <code>nodeGovernance</code>（流式重试、召回墙钟等）。表格中「LLM 超时」为当前生效 Profile 的请求超时，与治理超时不是同一概念。已绑定路由时点击<strong>编辑</strong>将打开「治理覆盖」；未绑定时打开「生效参数」。
      </el-alert>
      <div class="route-table-shell">
        <el-table
          :data="displayedNodeRoutesView"
          v-loading="loadingRoutes"
          border
          stripe
          class="route-table knowledge-table"
          table-layout="auto"
        >
        <el-table-column label="节点" min-width="160" fixed="left">
          <template #default="{ row }">
            <div class="node-cell">
              <span class="node-title">{{ row.nodeLabel }}</span>
              <span class="node-id">{{ row.nodeId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="绑定配置" min-width="200">
          <template #default="{ row }">
            <el-select
              v-model="row._bindProfileId"
              filterable
              placeholder="选择 LLM 配置"
              class="route-bind-select"
              :loading="!!routeSaving[row.nodeId]"
              @change="(val) => onRouteBindChange(row, val)"
            >
              <el-option v-for="p in profileOptions" :key="p.id" :label="p.profileName" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="路由启用" width="96" align="center">
          <template #default="{ row }">
            <el-tooltip content="需先绑定配置后才能启用/停用该节点路由" :disabled="row.hasRoute" placement="top">
              <el-switch
                :model-value="row.routeEnabled"
                :disabled="!row.hasRoute || !!routeSaving[row.nodeId]"
                @change="(v) => onRouteEnabledChange(row, v)"
              />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="治理覆盖" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="gov-pill-wrap">
              <span v-if="row.routeGovRetry != null" class="gov-pill">重试 {{ row.routeGovRetry }}</span>
              <span v-if="row.routeGovTimeoutSec != null" class="gov-pill gov-pill--time">超时 {{ row.routeGovTimeoutSec }}s</span>
              <span v-if="row.routeGovRetry == null && row.routeGovTimeoutSec == null" class="muted">YAML 默认</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="生效来源" width="108">
          <template #default="{ row }">
            <el-tag v-if="row.effectiveSource" size="small" :type="row.effectiveSource === 'route' ? 'success' : 'info'">
              {{ effectiveSourceLabel[row.effectiveSource] || row.effectiveSource }}
            </el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="effectiveProfileName" label="生效配置名" min-width="140" show-overflow-tooltip />
        <el-table-column label="provider" width="100">
          <template #default="{ row }">
            {{ row.effectiveProvider || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="模型" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.effectiveModel || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="LLM超时(秒)" width="108" align="right">
          <template #default="{ row }">
            {{ formatTimeoutSeconds(row.effectiveTimeoutMs) }}
          </template>
        </el-table-column>
        <el-table-column label="温度" width="72" align="right">
          <template #default="{ row }">
            {{ row.effectiveTemperature != null && row.effectiveTemperature !== '' ? row.effectiveTemperature : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="maxTok" width="88" align="right">
          <template #default="{ row }">
            {{ row.effectiveMaxTokens != null ? row.effectiveMaxTokens : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="回退原因" min-width="160">
          <template #default="{ row }">
            <el-tag v-if="row.sourceReason && row.sourceReason !== 'route_hit'" type="warning" size="small">
              {{ sourceReasonLabel[row.sourceReason] || row.sourceReason }}
            </el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="142"
          fixed="right"
          align="center"
          header-align="center"
          class-name="col-actions"
          label-class-name="col-actions"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="openRouteRowEdit(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              :disabled="!row.hasRoute || !!routeSaving[row.nodeId]"
              @click="clearRouteGovernance(row)"
            >
              恢复默认
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
      <el-pagination
        v-model:current-page="routePageNum"
        v-model:page-size="routePageSize"
        class="table-pagination route-table-pagination"
        :total="nodeRoutesView.length"
        :page-sizes="[8, 12, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>

    <el-drawer
      v-model="routeDetailVisible"
      :title="routeDetailDrawerTitle"
      size="460px"
      destroy-on-close
      class="route-detail-drawer"
    >
      <template v-if="routeDetailRow">
        <el-tabs v-model="routeDetailTab" class="route-detail-tabs">
          <el-tab-pane label="生效参数" name="effective">
            <el-descriptions :column="1" border size="small" class="route-detail-desc">
              <el-descriptions-item label="节点">{{ routeDetailRow.nodeLabel }} ({{ routeDetailRow.nodeId }})</el-descriptions-item>
              <el-descriptions-item label="生效来源">
                {{ effectiveSourceLabel[routeDetailRow.effectiveSource] || routeDetailRow.effectiveSource || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="解析原因码">{{ routeDetailRow.sourceReason || '—' }}</el-descriptions-item>
              <el-descriptions-item label="配置名">{{ routeDetailRow.effectiveProfileName || '—' }}</el-descriptions-item>
              <el-descriptions-item label="配置 ID">{{ routeDetailRow.effectiveProfileId || '—' }}</el-descriptions-item>
              <el-descriptions-item label="provider">{{ routeDetailRow.effectiveProvider || '—' }}</el-descriptions-item>
              <el-descriptions-item label="模型">{{ routeDetailRow.effectiveModel || '—' }}</el-descriptions-item>
              <el-descriptions-item label="LLM 超时">{{ formatTimeoutSeconds(routeDetailRow.effectiveTimeoutMs) }} 秒</el-descriptions-item>
              <el-descriptions-item label="温度">{{ routeDetailRow.effectiveTemperature ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="maxTokens">{{ routeDetailRow.effectiveMaxTokens ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="reasoning_effort">{{ routeDetailRow.effectiveReasoningEffort || '—' }}</el-descriptions-item>
              <el-descriptions-item label="thinking.type">{{ routeDetailRow.effectiveThinkingType || '—' }}</el-descriptions-item>
              <el-descriptions-item label="response_format">{{ routeDetailRow.effectiveResponseFormat || '—' }}</el-descriptions-item>
              <el-descriptions-item label="路由治理覆盖（只读）">{{ routeGovSummaryLine(routeDetailRow) }}</el-descriptions-item>
              <el-descriptions-item v-if="routeDetailJsonSchemaPreview" label="JSON Schema">
                <pre class="route-json-preview">{{ routeDetailJsonSchemaPreview }}</pre>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane label="治理覆盖" name="governance" :disabled="!routeDetailRow.hasRoute">
            <template v-if="routeDetailRow.hasRoute">
              <p class="drawer-gov-lead">
                覆盖 <code>application.yml</code> 中的 <code>nodeGovernance</code>（含 LLM 流式重试、Evidence/Schema 等墙钟预算）。请至少填写<strong>治理重试</strong>或<strong>治理超时</strong>之一，再点击「保存治理」。
              </p>
              <el-form label-position="top" size="small" class="drawer-gov-form">
                <el-form-item>
                  <template #label>
                    <span class="label-with-hint">
                      治理重试（1–20）
                      <el-tooltip content="含首轮在内的最大尝试次数。" placement="top">
                        <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                      </el-tooltip>
                    </span>
                  </template>
                  <el-input-number
                    v-model="drawerGovForm.retry"
                    :min="1"
                    :max="20"
                    :step="1"
                    controls-position="right"
                    class="drawer-gov-input"
                  />
                </el-form-item>
                <el-form-item>
                  <template #label>
                    <span class="label-with-hint">
                      治理超时（秒，1–3600）
                      <el-tooltip content="节点墙钟预算（秒），保存时换算为毫秒且不少于 1000ms。" placement="top">
                        <el-icon class="hint-icon"><QuestionFilled /></el-icon>
                      </el-tooltip>
                    </span>
                  </template>
                  <el-input-number
                    v-model="drawerGovForm.timeoutSec"
                    :min="1"
                    :max="3600"
                    :step="1"
                    controls-position="right"
                    class="drawer-gov-input"
                  />
                </el-form-item>
              </el-form>
              <div class="drawer-gov-actions">
                <el-button
                  type="primary"
                  :loading="!!(routeDetailRow && routeSaving[routeDetailRow.nodeId])"
                  @click="saveRouteGovernanceFromDrawer"
                >
                  保存治理
                </el-button>
                <el-button
                  :loading="!!(routeDetailRow && routeSaving[routeDetailRow.nodeId])"
                  @click="clearRouteGovernanceFromDrawer"
                >
                  恢复默认
                </el-button>
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
        <div class="route-detail-actions">
          <el-button v-if="routeDetailEditProfile" type="primary" plain @click="openEditFromRouteDetail">
            编辑 LLM 配置「{{ routeDetailEditProfile.profileName }}」
          </el-button>
          <span v-else class="muted">当前生效来自系统默认或 YAML，请到上方「LLM 配置管理」维护默认 Profile。</span>
        </div>
      </template>
    </el-drawer>

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
                  <el-tooltip
                    content="LLM 请求层超时（秒），doubao / openai 等 provider 均按生效配置统一应用；与 application 中 nodeGovernance 的 timeout（用于召回等非 LLM 节点墙钟预算）不是同一概念。"
                    placement="top"
                  >
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
          </header>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import {
  listLlmNodes,
  listLlmProfiles,
  listLlmProfileOptions,
  createLlmProfile,
  updateLlmProfile,
  deleteLlmProfile,
  testLlmProfileConnectivity,
  listLlmNodeRoutes,
  upsertLlmNodeRoute,
  deleteLlmNodeRoute,
  getLlmEffectiveConfigs
} from '@/services/agent-management.service'

/** 与后端 agent 节点 ID 对齐，用于表格展示 */
const NODE_ROUTE_LABELS = {
  intent_classify: '意图识别',
  common_chat: '通用对话',
  knowledge_qa_answer: '知识问答（答复）',
  evidence_recall: '证据召回',
  query_enhance: '查询增强',
  schema_recall: 'Schema 召回',
  mix_selector: '集合/混合选择',
  feasibility_assessment: '可行性评估',
  feasibility_answer: '可行性答复',
  planner: '计划生成',
  plan_executor: '计划执行',
  mql_generate: 'MQL 生成',
  semantic_mql: '语义一致性',
  mongo_execute: 'Mongo 执行',
  answer_wrap: '答案包装',
  python_generate: 'Python 生成',
  python_execute: 'Python 执行',
  python_analyze: 'Python 分析'
}

const effectiveSourceLabel = {
  route: '节点路由',
  default: '系统默认'
}

const loadingProfiles = ref(false)
const loadingRoutes = ref(false)
/** 各节点路由下拉正在提交（支持多行并行） */
const routeSaving = reactive({})
/** 节点路由治理编辑草稿：retry / timeoutSec，与 routes 同步 */
const routeGovDraft = reactive({})
const routeDetailVisible = ref(false)
const routeDetailRow = ref(null)
/** 抽屉 Tab：effective=生效参数，governance=治理编辑 */
const routeDetailTab = ref('effective')
/** 抽屉内治理表单（与表格解耦，避免在列表行上直接编辑） */
const drawerGovForm = reactive({
  retry: undefined,
  timeoutSec: undefined
})
const savingProfile = ref(false)
const testingConnectivity = ref(false)
const profilePageNum = ref(1)
const profilePageSize = ref(10)
const profileTotal = ref(0)
/** 下拉绑定用：全量配置（请求一次，体量和节点数相比通常更小） */
const profileOptions = ref([])
const profiles = ref([])
const routePageNum = ref(1)
const routePageSize = ref(12)
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
    const eff = effectiveMap.value[nodeId] || {}
    const hasRoute = !!(r && r.profileId)
    const routeEnabled = hasRoute ? r.enabled !== false : false
    return {
      nodeId,
      nodeLabel: NODE_ROUTE_LABELS[nodeId] || nodeId,
      hasRoute,
      routeEnabled,
      profileId: r?.profileId || '',
      _bindProfileId: r?.profileId || '',
      routeGovRetry: r?.governanceRetryMaxAttempts,
      routeGovTimeoutSec:
        r?.governanceTimeoutMs != null ? Math.round(Number(r.governanceTimeoutMs) / 1000) : undefined,
      sourceReason: eff.sourceReason || '',
      effectiveSource: eff.source || '',
      effectiveProfileId: eff.profileId || '',
      effectiveProfileName: eff.profileName || '—',
      effectiveProvider: eff.provider || '',
      effectiveModel: eff.model || '',
      effectiveTimeoutMs: eff.timeoutMs,
      effectiveTemperature: eff.temperature,
      effectiveMaxTokens: eff.maxTokens,
      effectiveReasoningEffort: eff.reasoningEffort || '',
      effectiveThinkingType: eff.thinkingType || '',
      effectiveResponseFormat: eff.responseFormatType || '',
      effectiveResponseJsonSchema: eff.responseJsonSchema
    }
  })
})

const displayedNodeRoutesView = computed(() => {
  const all = nodeRoutesView.value || []
  const start = (routePageNum.value - 1) * routePageSize.value
  return all.slice(start, start + routePageSize.value)
})

watch(
  () => nodeRoutesView.value.length,
  (len) => {
    const ps = routePageSize.value || 1
    const maxPage = Math.max(1, Math.ceil(len / ps) || 1)
    if (routePageNum.value > maxPage) {
      routePageNum.value = maxPage
    }
  }
)

const routeDetailJsonSchemaPreview = computed(() => {
  const s = routeDetailRow.value?.effectiveResponseJsonSchema
  if (!s || typeof s !== 'object') return ''
  try {
    return JSON.stringify(s, null, 2)
  } catch {
    return ''
  }
})

const routeDetailEditProfile = computed(() => {
  const id = routeDetailRow.value?.effectiveProfileId
  if (!id) return null
  return profileOptions.value.find((p) => p.id === id) || profiles.value.find((p) => p.id === id) || null
})

const routeDetailDrawerTitle = computed(() => {
  const r = routeDetailRow.value
  if (!r) return '节点路由'
  return `${r.nodeLabel} · ${r.nodeId}`
})

function routeGovSummaryLine(row) {
  if (!row) return '—'
  if (row.routeGovRetry == null && row.routeGovTimeoutSec == null) return '未覆盖（YAML 默认）'
  const parts = []
  if (row.routeGovRetry != null) parts.push(`重试 ${row.routeGovRetry}`)
  if (row.routeGovTimeoutSec != null) parts.push(`超时 ${row.routeGovTimeoutSec}s`)
  return parts.join('；')
}

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

function onProfilePageSizeChange() {
  profilePageNum.value = 1
  loadProfiles()
}

async function loadProfiles() {
  loadingProfiles.value = true
  try {
    const page = await listLlmProfiles({
      pageNum: profilePageNum.value,
      pageSize: profilePageSize.value
    })
    profiles.value = Array.isArray(page?.data) ? page.data : []
    profileTotal.value = Number(page?.total ?? 0)
    const lastPage = Math.max(1, Math.ceil(profileTotal.value / profilePageSize.value) || 1)
    if (profiles.value.length === 0 && profileTotal.value > 0 && profilePageNum.value > lastPage) {
      profilePageNum.value = lastPage
      await loadProfiles()
      return
    }
  } catch (e) {
    ElMessage.error(e.message || '加载 LLM 配置失败')
  } finally {
    loadingProfiles.value = false
  }
}

async function loadProfileOptions() {
  try {
    const raw = await listLlmProfileOptions()
    profileOptions.value = Array.isArray(raw) ? raw : []
  } catch (e) {
    ElMessage.error(e.message || '加载 LLM 配置选项失败')
    profileOptions.value = []
  }
}

async function loadNodes() {
  try {
    const raw = await listLlmNodes()
    nodeIds.value = Array.isArray(raw) ? raw : []
    // 必须在 loadRoutes 之前初始化：路由表在 loadProfiles 期间就会渲染，v-model 依赖 routeGovDraft[nodeId]
    syncRouteGovDraftFromRoutes()
  } catch (e) {
    ElMessage.error(e.message || '加载节点列表失败')
    nodeIds.value = []
  }
}

function syncRouteGovDraftFromRoutes() {
  const ids = nodeIds.value || []
  for (const nid of ids) {
    if (!routeGovDraft[nid]) {
      routeGovDraft[nid] = { retry: undefined, timeoutSec: undefined }
    }
    const r = (routes.value || []).find((x) => x.nodeId === nid)
    if (r?.governanceRetryMaxAttempts != null) {
      routeGovDraft[nid].retry = Number(r.governanceRetryMaxAttempts)
    } else {
      routeGovDraft[nid].retry = undefined
    }
    if (r?.governanceTimeoutMs != null) {
      routeGovDraft[nid].timeoutSec = Math.round(Number(r.governanceTimeoutMs) / 1000)
    } else {
      routeGovDraft[nid].timeoutSec = undefined
    }
  }
}

function applyGovernanceFields(base, d) {
  if (!d) return
  if (d.retry !== undefined && d.retry !== null && Number.isFinite(Number(d.retry))) {
    const n = Math.round(Number(d.retry))
    if (n >= 1 && n <= 20) {
      base.governanceRetryMaxAttempts = n
    }
  }
  if (d.timeoutSec !== undefined && d.timeoutSec !== null && Number.isFinite(Number(d.timeoutSec))) {
    const sec = Number(d.timeoutSec)
    if (sec >= 1) {
      base.governanceTimeoutMs = Math.min(3_600_000, Math.max(1_000, Math.round(sec * 1000)))
    }
  }
}

/**
 * @param govSnapshot 传入时用该对象上的 retry/timeoutSec 生成治理字段；不传则用 routeGovDraft（绑定路由时保留已保存覆盖）
 */
function buildRouteUpsertPayload(nodeId, { profileId, enabled }, govSnapshot = undefined) {
  const base = { profileId, enabled: enabled !== false }
  const d = govSnapshot !== undefined ? govSnapshot : routeGovDraft[nodeId]
  applyGovernanceFields(base, d)
  return base
}

function snapshotDrawerGov() {
  return {
    retry: drawerGovForm.retry,
    timeoutSec: drawerGovForm.timeoutSec
  }
}

function fillDrawerGovFormFromRow(row) {
  if (!row) return
  drawerGovForm.retry = row.routeGovRetry != null ? Number(row.routeGovRetry) : undefined
  drawerGovForm.timeoutSec = row.routeGovTimeoutSec != null ? Number(row.routeGovTimeoutSec) : undefined
}

function refreshRouteDetailRowAfterReload(nodeId) {
  if (!routeDetailVisible.value || !nodeId || routeDetailRow.value?.nodeId !== nodeId) return
  const next = nodeRoutesView.value.find((r) => r.nodeId === nodeId)
  if (next) {
    routeDetailRow.value = next
    fillDrawerGovFormFromRow(next)
  }
}

async function saveRouteGovernance(row, govSnapshot = undefined) {
  const route = (routes.value || []).find((r) => r.nodeId === row.nodeId)
  if (!route?.profileId) {
    ElMessage.warning('请先绑定 LLM 配置')
    return
  }
  const payload = buildRouteUpsertPayload(
    row.nodeId,
    {
      profileId: route.profileId,
      enabled: route.enabled !== false
    },
    govSnapshot
  )
  if (!payload.governanceRetryMaxAttempts && !payload.governanceTimeoutMs) {
    ElMessage.warning('请至少填写一项：治理重试（1–20）或治理超时（秒，1–3600）')
    return
  }
  routeSaving[row.nodeId] = true
  try {
    await upsertLlmNodeRoute(row.nodeId, payload)
    ElMessage.success('治理参数已保存')
    await loadRoutes()
    await loadEffective()
    refreshRouteDetailRowAfterReload(row.nodeId)
    syncRouteGovDraftFromRoutes()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
    await loadRoutes()
    await loadEffective()
    refreshRouteDetailRowAfterReload(row.nodeId)
  } finally {
    delete routeSaving[row.nodeId]
  }
}

async function saveRouteGovernanceFromDrawer() {
  const row = routeDetailRow.value
  if (!row?.nodeId || !row.hasRoute) {
    ElMessage.warning('请先绑定 LLM 配置')
    return
  }
  await saveRouteGovernance(row, snapshotDrawerGov())
}

async function clearRouteGovernanceFromDrawer() {
  const row = routeDetailRow.value
  if (!row?.nodeId || !row.hasRoute) return
  await clearRouteGovernance(row)
}

async function clearRouteGovernance(row) {
  const route = (routes.value || []).find((r) => r.nodeId === row.nodeId)
  if (!route?.profileId) {
    return
  }
  routeSaving[row.nodeId] = true
  try {
    await upsertLlmNodeRoute(row.nodeId, {
      profileId: route.profileId,
      enabled: route.enabled !== false,
      governanceRetryMaxAttempts: 0,
      governanceTimeoutMs: 0
    })
    ElMessage.success('已清除治理覆盖，恢复为 YAML/代码默认')
    await loadRoutes()
    await loadEffective()
    refreshRouteDetailRowAfterReload(row.nodeId)
    syncRouteGovDraftFromRoutes()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
    await loadRoutes()
    await loadEffective()
    refreshRouteDetailRowAfterReload(row.nodeId)
  } finally {
    delete routeSaving[row.nodeId]
  }
}

async function loadRoutes() {
  loadingRoutes.value = true
  try {
    const raw = await listLlmNodeRoutes()
    routes.value = Array.isArray(raw) ? raw : []
    syncRouteGovDraftFromRoutes()
  } catch (e) {
    ElMessage.error(e.message || '加载节点路由失败')
  } finally {
    loadingRoutes.value = false
  }
}

async function loadEffective() {
  const ids = nodeIds.value || []
  if (!ids.length) {
    effectiveMap.value = {}
    return
  }
  try {
    const list = await getLlmEffectiveConfigs(ids)
    const arr = Array.isArray(list) ? list : []
    const map = {}
    for (let i = 0; i < arr.length; i++) {
      const eff = arr[i] || {}
      const nid = eff.nodeId || ids[i]
      if (nid) {
        map[nid] = eff
      }
    }
    effectiveMap.value = map
  } catch (e) {
    ElMessage.error(e.message || '加载生效配置失败')
  }
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
    await loadProfileOptions()
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
    await loadProfileOptions()
    await loadProfiles()
    await loadRoutes()
    await loadEffective()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

function openRouteDetail(row, tab = 'effective') {
  routeDetailRow.value = row
  routeDetailTab.value = tab === 'governance' && !row.hasRoute ? 'effective' : tab
  fillDrawerGovFormFromRow(row)
  routeDetailVisible.value = true
}

/** 与业务知识等表格一致：单入口「编辑」；已绑定路由时优先打开治理 Tab */
function openRouteRowEdit(row) {
  openRouteDetail(row, row.hasRoute ? 'governance' : 'effective')
}

function openEditFromRouteDetail() {
  const p = routeDetailEditProfile.value
  if (!p) return
  routeDetailVisible.value = false
  openEdit(p)
}

async function refreshRoutesEffective() {
  try {
    await loadRoutes()
    await loadEffective()
    ElMessage.success('路由与生效参数已刷新')
  } catch (e) {
    ElMessage.error(e.message || '刷新失败')
  }
}

async function onRouteEnabledChange(row, enabled) {
  const route = (routes.value || []).find((r) => r.nodeId === row.nodeId)
  if (!route?.profileId) {
    ElMessage.warning('请先绑定 LLM 配置')
    return
  }
  routeSaving[row.nodeId] = true
  try {
    await upsertLlmNodeRoute(
      row.nodeId,
      buildRouteUpsertPayload(row.nodeId, { profileId: route.profileId, enabled: !!enabled })
    )
    ElMessage.success(enabled ? '路由已启用' : '路由已停用（将回退默认生效）')
    await loadRoutes()
    await loadEffective()
  } catch (e) {
    ElMessage.error(e.message || '更新路由状态失败')
    await loadRoutes()
    await loadEffective()
  } finally {
    delete routeSaving[row.nodeId]
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
      await upsertLlmNodeRoute(
        row.nodeId,
        buildRouteUpsertPayload(row.nodeId, { profileId: next, enabled: true })
      )
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
  await Promise.all([loadProfileOptions(), loadProfiles()])
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
.block-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.route-bind-block .block-head h3 {
  font-size: 16px;
  font-weight: 600;
  color: #243d32;
  letter-spacing: 0.02em;
}
.route-hint-alert {
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid #c9e2d4;
  background: linear-gradient(105deg, #f8fcfa 0%, #eef7f1 100%);
}
.route-hint-alert :deep(.el-alert__content) {
  font-size: 12px;
  line-height: 1.55;
  color: #4a5e56;
}
.route-hint-title {
  font-weight: 600;
  color: #2a4036;
}
.route-table-shell {
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 14px rgba(18, 48, 32, 0.06);
}
.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  row-gap: 8px;
}
.route-table-pagination {
  padding: 0 2px;
}
/* 与 BusinessKnowledgePanel / FewShotPanel 的 knowledge-table 对齐 */
.route-bind-block .route-table.knowledge-table {
  width: 100%;
}
.route-bind-block .route-table.knowledge-table :deep(.el-table__header-wrapper th) {
  background: #f2f7ff;
  color: #2a4770;
  font-weight: 700;
}
.route-bind-block .route-table.knowledge-table :deep(.el-table__row td) {
  padding-top: 12px;
  padding-bottom: 12px;
}
.route-bind-select {
  width: 100%;
}
.gov-pill-wrap {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.gov-pill {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #e4f3eb;
  color: #1a5c38;
  border: 1px solid #b8dcc8;
}
.gov-pill--time {
  background: #e8eefc;
  color: #2a4a8f;
  border-color: #c5d4f0;
}
.route-detail-tabs {
  margin-top: -6px;
}
.route-detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
.drawer-gov-lead {
  font-size: 13px;
  line-height: 1.55;
  color: #5c6f68;
  margin: 0 0 14px;
}
.drawer-gov-form {
  max-width: 100%;
}
.drawer-gov-input {
  width: 200px;
}
.drawer-gov-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e8efe9;
}
.node-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.25;
}
.node-title {
  font-weight: 600;
  color: #303533;
}
.node-id {
  font-size: 11px;
  color: #909399;
  font-family: ui-monospace, monospace;
}
.route-detail-desc {
  margin-bottom: 16px;
}
.route-json-preview {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}
.route-detail-actions {
  margin-top: 12px;
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

