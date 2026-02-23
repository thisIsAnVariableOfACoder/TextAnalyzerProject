import { create } from 'zustand'

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

  addToHistory: (item) => {
    set(state => ({
      history: [item, ...state.history],
      totalCount: state.totalCount + 1
    }))
  },

  removeFromHistory: (id) => {
    set(state => ({
      history: state.history.filter(item => item.id !== id),
      totalCount: state.totalCount - 1
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

  clearHistory: () => set({
    history: [],
    totalCount: 0,
    currentPage: 0,
    filterType: null,
    searchText: ''
  }),

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
