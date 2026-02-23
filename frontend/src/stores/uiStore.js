import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUIStore = create(
  persist(
    (set) => ({
      // State
      sidebarOpen: true,
      theme: 'light',
      activeTab: 'editor',
      showPreview: true,
      notificationQueue: [],

      // Actions
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setTheme: (theme) => set({ theme }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setShowPreview: (show) => set({ showPreview: show }),

      addNotification: (notification) => {
        set(state => ({
          notificationQueue: [...state.notificationQueue, {
            id: Date.now(),
            ...notification
          }]
        }))
      },

      removeNotification: (id) => {
        set(state => ({
          notificationQueue: state.notificationQueue.filter(n => n.id !== id)
        }))
      },

      clearNotifications: () => set({ notificationQueue: [] })
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        showPreview: state.showPreview
      })
    }
  )
)

export default useUIStore
