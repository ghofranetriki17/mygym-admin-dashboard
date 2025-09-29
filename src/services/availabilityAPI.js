// src/services/availabilityAPI.js
import axios from 'axios'

const http = axios.create({
  baseURL: 'http://192.168.1.12:8000/api',
})
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const availabilityAPI = {
  list: async (branchId) =>
    (await http.get(`/branches/${branchId}/availabilities`)).data.data,
  create: async (branchId, payload) =>
    (await http.post(`/branches/${branchId}/availabilities`, payload)).data.data,
  update: async (branchId, id, payload) =>
    (await http.put(`/branches/${branchId}/availabilities/${id}`, payload)).data.data,
  delete: async (branchId, id) =>
    (await http.delete(`/branches/${branchId}/availabilities/${id}`)).data,
}
