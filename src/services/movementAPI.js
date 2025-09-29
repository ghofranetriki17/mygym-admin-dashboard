import api from './api' // your axios instance

export const movementAPI = {
  list: async (params = {}) => {
    try {
      console.log('🔄 Calling GET /movements with params:', params)
      const { data } = await api.get('/movements', { params })
      console.log('✅ GET /movements response:', data)
      
      // supports both simple array and pagination from Laravel
      const result = Array.isArray(data) ? data : (data.data || [])
      console.log('📦 Processed movements list:', result.length, 'items')
      return result
    } catch (error) {
      console.error('❌ Movement API - list error:', error)
      throw error
    }
  },

  get: async (id) => {
    try {
      console.log('🔄 Calling GET /movements/' + id)
      const { data } = await api.get(`/movements/${id}`)
      console.log('✅ GET /movements/' + id + ' response:', data)
      
      // controller returns {success:true,data:{...}} or plain object
      const result = data?.data ?? data
      console.log('📦 Processed movement:', result)
      return result
    } catch (error) {
      console.error('❌ Movement API - get error:', error)
      throw error
    }
  },

  create: async (payload) => {
    try {
      console.log('🔄 Creating movement with payload:', {
        name: payload.name,
        description: payload.description,
        video_url: payload.video_url,
        hasFile: !!payload.mediaFile
      })
      
      const fd = new FormData()
      fd.append('name', payload.name)
      if (payload.description) fd.append('description', payload.description)
      if (payload.mediaFile) fd.append('media', payload.mediaFile)
      if (payload.video_url) fd.append('video_url', payload.video_url)
      
      const { data } = await api.post('/movements', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      console.log('✅ CREATE movement response:', data)
      const result = data?.data ?? data
      console.log('📦 Created movement:', result)
      return result
    } catch (error) {
      console.error('❌ Movement API - create error:', error)
      console.error('❌ Error response:', error.response?.data)
      throw error
    }
  },

  update: async (id, payload) => {
    try {
      console.log('🔄 Updating movement', id, 'with payload:', {
        name: payload.name,
        description: payload.description,
        video_url: payload.video_url,
        hasFile: !!payload.mediaFile,
        remove_media: payload.remove_media
      })
      
      const fd = new FormData()
      if (payload.name !== undefined) fd.append('name', payload.name)
      if (payload.description !== undefined) fd.append('description', payload.description)
      if (payload.remove_media) fd.append('remove_media', '1')
      if (payload.mediaFile) fd.append('media', payload.mediaFile)
      if (payload.video_url !== undefined) fd.append('video_url', payload.video_url)
      
      // Add _method for Laravel to handle PATCH correctly with FormData
      fd.append('_method', 'PATCH')
      
      const { data } = await api.post(`/movements/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      console.log('✅ UPDATE movement response:', data)
      const result = data?.data ?? data
      console.log('📦 Updated movement:', result)
      return result
    } catch (error) {
      console.error('❌ Movement API - update error:', error)
      console.error('❌ Error response:', error.response?.data)
      throw error
    }
  },

  // ENHANCED DEBUG VERSION FOR DELETE
  remove: async (id) => {
    try {
      console.log('🗑️ ATTEMPTING TO DELETE movement with ID:', id)
      console.log('🔗 Full URL:', `${api.defaults.baseURL}/movements/${id}`)
      
      // Check if we have auth token
      const token = localStorage.getItem('auth_token')
      console.log('🔐 Auth token present:', !!token)
      
      const { data } = await api.delete(`/movements/${id}`)
      
      console.log('✅ DELETE response received:', data)
      console.log('📊 Response status was successful (2xx)')
      
      // Log the exact response structure
      console.log('🔍 Response analysis:', {
        hasSuccess: 'success' in data,
        successValue: data.success,
        hasMessage: 'message' in data,
        messageValue: data.message,
        hasError: 'error' in data,
        errorValue: data.error,
        fullResponse: data
      })
      
      // Check if deletion was actually successful
      if (data && data.success === false) {
        console.error('❌ Server reported deletion failed:', data.message || data.error)
        throw new Error(data.message || data.error || 'Deletion failed')
      }
      
      console.log('🎉 Movement deletion appears successful')
      return data
      
    } catch (error) {
      console.error('❌ DELETE REQUEST FAILED')
      console.error('❌ Error object:', error)
      
      if (error.response) {
        // Server responded with error status
        console.error('❌ Server Response Details:')
        console.error('   Status:', error.response.status)
        console.error('   Headers:', error.response.headers)
        console.error('   Data:', error.response.data)
        
        const { status, data } = error.response
        
        if (status === 422) {
          console.warn('⚠️ Validation error - movement may have related exercises')
        } else if (status === 404) {
          console.warn('⚠️ Movement not found - may already be deleted')
        } else if (status === 401) {
          console.error('🔐 Unauthorized - check your auth token')
        } else if (status === 500) {
          console.error('💥 Server error during deletion')
        }
      } else if (error.request) {
        console.error('❌ Network error - no response received')
        console.error('❌ Request:', error.request)
      } else {
        console.error('❌ Request setup error:', error.message)
      }
      
      throw error
    }
  },
}