<template>
  <aside class="session-pane panel-card">
    <div class="session-tools">
      <el-input
        v-model="keywordModel"
        clearable
        placeholder="检索会话"
        @keyup.enter="emit('query-sessions')"
      />
      <el-button :loading="loadingSessions" @click="emit('query-sessions')">查询</el-button>
    </div>
    <el-scrollbar class="session-list">
      <div
        v-for="item in sessions"
        :key="item.threadId"
        class="session-item"
        :class="{ active: selectedThreadId === item.threadId }"
        @click="emit('select-session', item)"
      >
        <el-tooltip :content="item.title || '未命名会话'" placement="top" :show-after="300">
          <div class="session-title">{{ item.title || '未命名会话' }}</div>
        </el-tooltip>
        <div class="session-meta">用户：{{ item.userId || '—' }}</div>
        <div class="session-preview">{{ item.memorySummary || '暂无摘要' }}</div>
      </div>
      <el-empty v-if="!loadingSessions && !sessions.length" description="暂无会话数据" />
    </el-scrollbar>
  </aside>
</template>

<script setup>
const keywordModel = defineModel('keyword', { type: String, default: '' })

defineProps({
  sessions: { type: Array, default: () => [] },
  loadingSessions: { type: Boolean, default: false },
  selectedThreadId: { type: String, default: '' },
})

const emit = defineEmits(['query-sessions', 'select-session'])
</script>

<style scoped>
.panel-card {
  border: 1px solid #dce7f8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #f9fbff 100%);
  padding: 12px;
}

.session-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.session-list {
  height: 560px;
  padding-right: 4px;
}

.session-item {
  border: 1px solid #e6edf8;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}

.session-item.active {
  border-color: #4f8cff;
  background: #f3f8ff;
  box-shadow: inset 0 0 0 1px #b9d3ff;
}

.session-title {
  font-weight: 600;
  color: #294a74;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.session-meta {
  font-size: 12px;
  color: #5f6f89;
  margin-bottom: 2px;
}

.session-preview {
  margin-top: 6px;
  font-size: 12px;
  color: #3c4e68;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
