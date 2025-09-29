// reuse axios client so baseURL = http://192.168.50.117:8000/api and token header match
import api from './api';

const unwrap = (res) => (res?.data?.data ?? res?.data ?? []); 
// handles {success:true,data:[...] } or plain arrays

export const coachAPI = {
  async list() {
    const res = await api.get('/coaches');
    return unwrap(res);
  },
  async show(id) {
    const res = await api.get(`/coaches/${id}`);
    return unwrap(res);
  },
  async create(payload) {
    const res = await api.post('/coaches', payload);
    return unwrap(res);
  },
  async update(id, payload) {
    const res = await api.put(`/coaches/${id}`, payload);
    return unwrap(res);
  },
  async delete(id) {
    const res = await api.delete(`/coaches/${id}`);
    return unwrap(res);
  },
};
