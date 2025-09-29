// src/services/branchAPI.js
import axios from 'axios'

const http = axios.create({
  baseURL: 'http://172.20.10.2:8000/api',
})

// optional: attach token if you use Sanctum/Personal Access Tokens later
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const branchAPI = {
  list: async () => (await http.get('/branches')).data.data,
  create: async (payload) => (await http.post('/branches', payload)).data.data,
  update: async (id, payload) => (await http.put(`/branches/${id}`, payload)).data.data,
  delete: async (id) => (await http.delete(`/branches/${id}`)).data,
}
