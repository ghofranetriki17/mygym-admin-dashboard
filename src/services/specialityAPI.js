import api from './api'

export const specialityAPI = {
  list: async () => {
    const res = await api.get('/specialities')
    // supports {success:true,data:[...]} or plain arrays
    return res?.data?.data ?? res?.data ?? []
  },
}
