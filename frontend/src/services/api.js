const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

function authHeaders() {
  const token = localStorage.getItem('livepoll_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? authHeaders() : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),

  createPoll: (payload) => request('/polls', { method: 'POST', body: payload, auth: true }),
  listMyPolls: () => request('/polls', { auth: true }),
  getPoll: (id) => request(`/polls/${id}`),
  getResults: (id) => request(`/polls/${id}/results`),
  vote: (id, payload) => request(`/polls/${id}/vote`, { method: 'POST', body: payload }),
  closePoll: (id) => request(`/polls/${id}/close`, { method: 'POST', auth: true }),
  updatePoll: (id, payload) => request(`/polls/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deletePoll: (id) => request(`/polls/${id}`, { method: 'DELETE', auth: true }),
}

export { BASE_URL }
