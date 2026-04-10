<template>
  <div class="notification-page">
    <div class="page-head">
      <h2>通知订阅管理</h2>
      <el-button :loading="metaLoading" @click="loadMeta">同步渠道和场景</el-button>
    </div>

    <el-alert
      v-if="metaError"
      type="warning"
      :closable="false"
      show-icon
      :title="metaError"
      class="meta-alert"
    />

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="订阅者" name="subscriber">
        <SubscriberTab :channels="channels" :scenes="scenes" />
      </el-tab-pane>
      <el-tab-pane label="通知模板" name="template">
        <TemplateTab :channels="channels" :scenes="scenes" />
      </el-tab-pane>
      <el-tab-pane label="发送记录" name="log">
        <LogTab :channels="channels" :scenes="scenes" />
      </el-tab-pane>
      <el-tab-pane label="站内信收件箱" name="stationInbox">
        <StationInboxTab :scenes="scenes" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SubscriberTab from '@/components/notification-management/SubscriberTab.vue'
import TemplateTab from '@/components/notification-management/TemplateTab.vue'
import LogTab from '@/components/notification-management/LogTab.vue'
import StationInboxTab from '@/components/notification-management/StationInboxTab.vue'
import {
  listNotificationChannels,
  listNotificationScenes,
  notificationResponse
} from '@/services/notification-management.service'

const activeTab = ref('subscriber')
const channels = ref([])
const scenes = ref([])
const metaLoading = ref(false)
const metaError = ref('')

const loadMeta = async () => {
  metaLoading.value = true
  metaError.value = ''
  try {
    const [channelsRes, scenesRes] = await Promise.all([listNotificationChannels(), listNotificationScenes()])
    if (!notificationResponse.ok(channelsRes)) {
      throw new Error(channelsRes?.data?.msg || '渠道列表加载失败')
    }
    if (!notificationResponse.ok(scenesRes)) {
      throw new Error(scenesRes?.data?.msg || '场景列表加载失败')
    }
    channels.value = Array.isArray(channelsRes?.data?.data) ? channelsRes.data.data : []
    scenes.value = Array.isArray(scenesRes?.data?.data) ? scenesRes.data.data : []
  } catch (error) {
    console.error(error)
    metaError.value = error?.message || '通知渠道或场景加载失败，请检查后端接口'
    ElMessage.warning(metaError.value)
  } finally {
    metaLoading.value = false
  }
}

onMounted(loadMeta)
</script>

<style scoped>
.notification-page {
  padding: 12px;
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.page-head h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}
.meta-alert {
  margin-bottom: 12px;
}
</style>
