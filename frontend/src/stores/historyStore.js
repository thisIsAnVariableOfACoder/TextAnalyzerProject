import { create } from 'zustand'
import { historyAPI } from '../services/api'

const useHistoryStore = create((set, get) => ({
  // State
  history: [],
  totalCount: 0,
  currentPage: 0,
  pageSize: 20,
  filterType: null,
  searchText: '',
  loading: false,
  error: null,

  // Actions
  setHistory: (history) => set({ history }),

  fetchHistory: async (limit = 100, offset = 0, type = null, search = null) => {
    set({ loading: true, error: null })
    try {
      const response = await historyAPI.getHistory(limit, offset, type, search)
      const normalized = (response.items || []).map(item => ({
        ...item,
        id: item.id || item._id
      }))
      set({
        history: normalized,
        totalCount: response.total || normalized.length,
        loading: false,
        error: null
      })
      return response
    } catch (error) {
      set({ loading: false, error: error.message || 'Failed to load history' })
      throw error
    }
  },

  addToHistory: (item) => {
    set(state => ({
      history: [item, ...state.history],
      totalCount: state.totalCount + 1
    }))
  },

  removeFromHistory: async (id) => {
    try {
      await historyAPI.deleteHistoryItem(id)
    } catch (error) {
      set({ error: error.message || 'Failed to delete history item' })
      throw error
    }

    set(state => ({
      history: state.history.filter(item => item.id !== id),
      totalCount: Math.max(0, state.totalCount - 1)
    }))
  },

  setTotalCount: (count) => set({ totalCount: count }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setPageSize: (size) => set({ pageSize: size }),

  setFilterType: (type) => set({ filterType: type, currentPage: 0 }),

  setSearchText: (text) => set({ searchText: text, currentPage: 0 }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  clearHistory: async () => {
    try {
      await historyAPI.clearHistory()
    } catch (error) {
      set({ error: error.message || 'Failed to clear history' })
      throw error
    }

    set({
      history: [],
      totalCount: 0,
      currentPage: 0,
      filterType: null,
      searchText: ''
    })
  },

  getFilteredHistory: () => {
    const state = get()
    let filtered = state.history

    if (state.filterType) {
      filtered = filtered.filter(item => item.type === state.filterType)
    }

    if (state.searchText) {
      const search = state.searchText.toLowerCase()
      filtered = filtered.filter(item =>
        item.input_text?.toLowerCase().includes(search) ||
        item.output_text?.toLowerCase().includes(search)
      )
    }

    return filtered
  },

  getPaginatedHistory: () => {
    const filtered = get().getFilteredHistory()
    const { currentPage, pageSize } = get()
    const start = currentPage * pageSize
    const end = start + pageSize
    return {
      items: filtered.slice(start, end),
      total: filtered.length,
      hasMore: end < filtered.length
    }
  }
}))

export default useHistoryStore
