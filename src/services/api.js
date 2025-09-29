import axios from 'axios'

export const API_BASE_URL = 'http://172.20.10.2:8000/api' // ← ton IP

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Token helpers
const TOKEN_KEY = 'auth_token'

export const tokenService = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// attach token automatically
api.interceptors.request.use((config) => {
  const t = tokenService.get()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

// Auth endpoints
export const authAPI = {
  async login(payload) {
    // POST /login => { user, token }
    return api.post('/login', payload)
  },
  async register(payload) {
    // POST /register => { user, token }
    return api.post('/register', payload)
  },
  async me() {
    return api.get('/user')
  },
  async logout() {
    return api.post('/logout')
  },
}

/* -------- Categories API -------- */
export const categoriesAPI = {
  list: async () => {
    const { data } = await api.get('/categories')
    return data
  },
}
/* -------- Users API -------- */
// Endpoints REST attendus côté Laravel:
// GET    /users
// POST   /users
// PUT    /users/{id}
// DELETE /users/{id}
//
// Optionnel: le GET /users peut accepter ?q=, ?role=, ?page=, ?per_page=.
// On envoie quand même ces params; si le backend ne les gère pas,
// on fera le filtrage côté client dans la page (fallback).
export const usersAPI = {
  list: async (params = {}) => {
    const { data } = await api.get('/users', { params });
    return Array.isArray(data?.data) ? data.data : data;
  },
  get: async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data?.data ?? data;
  },
  create: async (payload) => {
    // payload: { name, email, role, password, password_confirmation? }
    const { data } = await api.post('/users', payload);
    return data?.data ?? data;
  },
  update: async (id, payload) => {
    // payload: { name?, email?, role?, password? }
    const { data } = await api.put(`/users/${id}`, payload);
    return data?.data ?? data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};
// --- Admin Bookings API ---
export const adminBookingsAPI = {
  // params: { branch_id?, session_id?, coach_id?, course_id?, is_for_women?, is_for_kids?, is_free?, date_from?, date_to?, q? }
  list: async (params = {}) => {
    const { data } = await api.get('/admin/bookings', { params });
    // data = { success, filters, data: [...] }
    return data?.data ?? [];
  },
};

/* -------- Machines API -------- */
export const machinesAPI = {
  list: async () => {
    const { data } = await api.get('/machines')
    return data
  },
  get: async (id) => {
    const { data } = await api.get(`/machines/${id}`)
    return data
  },
  create: async (machine) => {
    const { data } = await api.post('/machines', machine)
    return data
  },
  update: async (id, machine) => {
    const { data } = await api.put(`/machines/${id}`, machine)
    return data
  },
  delete: async (id) => {
    const { data } = await api.delete(`/machines/${id}`)
    return data
  },
}

/* -------- Charges API -------- */
export const chargesAPI = {
  // Récupère toutes les charges. Optionnellement avec params (ex: { machine_id })
  list: async (params = {}) => {
    const { data } = await api.get('/charges', { params })
    return data
  },
  // Raccourci pour une machine
  listByMachine: async (machineId) => {
    const { data } = await api.get('/charges', { params: { machine_id: machineId } })
    return data
  },
  // Crée une charge (attendue par backend: { name?, weight?, machine_id })
  create: async (payload) => {
    const { data } = await api.post('/charges', payload)
    return data
  },
  // Supprime une charge par ID
  delete: async (id) => {
    const { data } = await api.delete(`/charges/${id}`)
    return data
  },
}
// Add these methods to your API service
export const machineChargeAPI = {
  attach: (machineId, chargeId) => 
    api.post(`/machines/${machineId}/charges/${chargeId}`),

  detach: (machineId, chargeId) => 
    api.delete(`/machines/${machineId}/charges/${chargeId}`),

  sync: (machineId, chargeIds) => 
    api.put(`/machines/${machineId}/charges`, { charge_ids: chargeIds })
}



export const workoutsAPI = {
  list: () => api.get('/workouts').then(r => r.data),
  create: (data) => api.post('/workouts', data).then(r => r.data),
}

export const branchesAPI = {
  list: () => api.get('/branches').then(r => r.data),
  create: (data) => api.post('/branches', data).then(r => r.data),
}

export const sessionsAPI = {
  list: () => api.get('/group-sessions').then(r => r.data),
  upcoming: () => api.get('/group-sessions/upcoming').then(r => r.data),
  available: () => api.get('/group-sessions/available').then(r => r.data),
}

export default api
