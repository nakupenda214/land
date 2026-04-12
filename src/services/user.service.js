import axios from 'axios'

/** @returns {Promise<{ code: number, msg?: string, data?: Array<{value:string,label:string}> }>} */
export const fetchUserTypes = () => axios.get('/api/auth/user-types').then((r) => r.data)

/** @param {{ username: string, password: string, realName: string, phone?: string, email?: string }} payload */
export const registerUser = (payload) => axios.post('/api/auth/register', payload).then((r) => r.data)

/**
 * @param {object} params
 * @returns {Promise<{ code: number, data?: unknown[], total?: number }>}
 */
export const listUsersPage = (params) =>
  axios.get('/api/user/list', { params }).then((r) => r.data)
