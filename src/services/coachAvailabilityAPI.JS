import api from './api';

const unwrap = (res) => (res?.data?.data ?? res?.data ?? []); 

export const coachAvailabilityAPI = {
  async list() {
    const res = await api.get('/coach-availabilities');
    return unwrap(res);
  },
  
  async getByCoach(coachId) {
    const res = await api.get(`/coach-availabilities/coach/${coachId}`);
    return unwrap(res);
  },
  
  async show(id) {
    const res = await api.get(`/coach-availabilities/${id}`);
    return unwrap(res);
  },
  
  async create(payload) {
    const res = await api.post('/coach-availabilities', payload);
    return unwrap(res);
  },
  
  async update(id, payload) {
    const res = await api.put(`/coach-availabilities/${id}`, payload);
    return unwrap(res);
  },
  
  async delete(id) {
    const res = await api.delete(`/coach-availabilities/${id}`);
    return unwrap(res);
  },
};