import axios from 'axios'
import useAuthStore from '../stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    throw error
  }
)

// Auth API calls
export const authAPI = {
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),

  register: (username, password, email) =>
    apiClient.post('/auth/register', { username, password, email }),

  validateToken: () =>
    apiClient.post('/auth/validate'),

  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken })
}

// OCR API calls
export const ocrAPI = {
  processImage: (imageData, processingType, imageUrl = null) =>
    apiClient.post('/ocr/process', {
      image_data: imageData,
      processing_type: processingType,
      image_url: imageUrl
    }),

  processImageFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('processing_type', 'upload')

    return axios.post(`${API_BASE_URL}/ocr/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${useAuthStore.getState().token}`
      }
    }).then(res => res.data)
  }
}

// Text Processing API calls
export const textAPI = {
  checkGrammar: (text, language = 'en') =>
    apiClient.post('/text/grammar-check', {
      text,
      language
    }),

  paraphrase: (text, style = 'normal') =>
    apiClient.post('/text/paraphrase', {
      text,
      style
    }),

  translate: (text, sourceLanguage = 'auto', targetLanguage) =>
    apiClient.post('/text/translate', {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage
    })
}

// Batch Processing API calls
export const batchAPI = {
  process: (items, processingType) =>
    apiClient.post('/batch/process', {
      items,
      processing_type: processingType
    })
}

// History API calls
export const historyAPI = {
  getHistory: (limit = 20, offset = 0, type = null, search = null) => {
    const params = new URLSearchParams({
      limit,
      offset
    })
    if (type) params.append('type', type)
    if (search) params.append('search', search)

    return apiClient.get(`/history?${params}`)
  },

  deleteHistoryItem: (id) =>
    apiClient.delete(`/history/${id}`),

  exportResult: (historyId, format) =>
    apiClient.post('/export', {
      history_id: historyId,
      format
    })
}

// Health check
export const healthAPI = {
  check: () =>
    apiClient.get('/health')
}

export default apiClient
