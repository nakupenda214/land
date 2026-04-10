import axios from 'axios'

const ok = (res) => Number(res?.data?.code) === 200

const normalizePage = (res) => {
  const payload = res?.data || {}
  const data = Array.isArray(payload.data) ? payload.data : []
  const total = Number(payload.dataCount ?? data.length)
  return { list: data, total, raw: payload }
}

export const listNotificationChannels = () => axios.get('/api/notification-subscriber/channels')
export const listNotificationScenes = () => axios.get('/api/notification-subscriber/scenes')

export const querySubscribers = (payload) => axios.post('/api/notification-subscriber/query', payload)
export const createSubscriber = (payload) => axios.post('/api/notification-subscriber', payload)
export const updateSubscriber = (id, payload) => axios.put(`/api/notification-subscriber/${id}`, payload)
export const deleteSubscriber = (id) => axios.delete(`/api/notification-subscriber/${id}`)

export const queryTemplates = (payload) => axios.post('/api/notification-template/query', payload)
export const createTemplate = (payload) => axios.post('/api/notification-template', payload)
export const updateTemplate = (id, payload) => axios.put(`/api/notification-template/${id}`, payload)
export const deleteTemplate = (id) => axios.delete(`/api/notification-template/${id}`)

export const queryNotificationLogs = (payload) => axios.post('/api/notification-log/query', payload)
export const deleteNotificationLog = (id) => axios.delete(`/api/notification-log/${id}`)

export const notificationResponse = {
  ok,
  normalizePage
}
