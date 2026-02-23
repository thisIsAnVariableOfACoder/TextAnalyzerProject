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
  setText: (text) => set({ currentText: text }),

  setOriginalText: (text) => set({ originalText: text }),

  setOCRResults: (results) => set({ ocrResults: results }),

  setGrammarResults: (results) => set({ grammarResults: results }),

  setParaphraseResults: (results) => set({ paraphraseResults: results }),

  setTranslationResults: (results) => set({ translationResults: results }),

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
