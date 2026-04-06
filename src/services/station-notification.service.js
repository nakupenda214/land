import axios from 'axios'

const userIdKeys = ['userId', 'user_id', 'currentUserId', 'loginUserId']

export const resolveCurrentUserId = () => {
  for (const key of userIdKeys) {
    const sessionVal = sessionStorage.getItem(key)
    if (sessionVal != null && String(sessionVal).trim() !== '') return String(sessionVal).trim()
    const localVal = localStorage.getItem(key)
    if (localVal != null && String(localVal).trim() !== '') return String(localVal).trim()
  }
  return '1'
}

const withUserHeader = (config = {}) => {
  const headers = { ...(config.headers || {}), 'X-User-Id': resolveCurrentUserId() }
  return { ...config, headers }
}

export const fetchUnreadStationNotifications = (projectIds = []) => {
  const normalized = Array.isArray(projectIds)
    ? projectIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  return axios.get('/api/station-notification/unread', withUserHeader({
    params: {
      projectIds: normalized.join(',')
    }
  }))
}

export const markStationNotificationsRead = (messageIds = []) => {
  const normalized = Array.isArray(messageIds)
    ? messageIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  return axios.post('/api/station-notification/read', { messageIds: normalized }, withUserHeader())
}

