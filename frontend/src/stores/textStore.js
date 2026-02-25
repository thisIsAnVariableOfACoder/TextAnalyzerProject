import { create } from 'zustand'

const useTextStore = create((set, get) => ({
  // State
  currentText: '',
  originalText: '',
  ocrResults: null,
  grammarResults: null,
  paraphraseResults: null,
  translationResults: null,
  selectedLanguage: 'en',
  processingType: null,
  isProcessing: false,
  error: null,

  // Actions
  setText: (text) => set((state) => ({
    currentText: typeof text === 'function' ? text(state.currentText) : text
  })),

  setOriginalText: (text) => set((state) => ({
    originalText: typeof text === 'function' ? text(state.originalText) : text
  })),

  setOCRResults: (results) => set((state) => ({
    ocrResults: typeof results === 'function' ? results(state.ocrResults) : results
  })),

  setGrammarResults: (results) => set((state) => ({
    grammarResults: typeof results === 'function' ? results(state.grammarResults) : results
  })),

  setParaphraseResults: (results) => set((state) => ({
    paraphraseResults: typeof results === 'function' ? results(state.paraphraseResults) : results
  })),

  setTranslationResults: (results) => set((state) => ({
    translationResults: typeof results === 'function' ? results(state.translationResults) : results
  })),

  setSelectedLanguage: (language) => set({ selectedLanguage: language }),

  setProcessingType: (type) => set({ processingType: type }),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  clearResults: () => set({
    ocrResults: null,
    grammarResults: null,
    paraphraseResults: null,
    translationResults: null,
    error: null
  }),

  resetAll: () => set({
    currentText: '',
    originalText: '',
    ocrResults: null,
    grammarResults: null,
    paraphraseResults: null,
    translationResults: null,
    selectedLanguage: 'en',
    processingType: null,
    isProcessing: false,
    error: null
  })
}))

export default useTextStore
