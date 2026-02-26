import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useTextStore from '../stores/textStore'
import useHistoryStore from '../stores/historyStore'
import { historyAPI } from '../services/api'
import {
  performOCR,
  checkGrammar,
  paraphraseText,
  translateText,
  preloadProvider
} from '../services/localAI'
import toast from 'react-hot-toast'

import OCRUploader from '../components/OCRUploader'
import ImagePreview from '../components/ImagePreview'
import TextEditor from '../components/TextEditor'
import ToolPanel from '../components/ToolPanel'
import ResultsPanel from '../components/ResultsPanel'
import LanguageSelector from '../components/LanguageSelector'
import ExportModal from '../components/ExportModal'
import LoadingSpinner from '../components/LoadingSpinner'

import './EditorPage.css'

const HISTORY_PREVIEW_MAX_LENGTH = 4000
const AUTO_GRAMMAR_DEBOUNCE_MS = 900

function EditorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const {
    currentText,
    setText,
    ocrResults,
    setOCRResults,
    grammarResults,
    setGrammarResults,
    paraphraseResults,
    setParaphraseResults,
    translationResults,
    setTranslationResults,
    processingType,
    setProcessingType,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    clearResults
  } = useTextStore()

  const { fetchHistory } = useHistoryStore()

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('vi')
  const [currentHistoryId, setCurrentHistoryId] = useState(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [selectedParaphraseOption, setSelectedParaphraseOption] = useState(0)
  const [grammarFocusRange, setGrammarFocusRange] = useState(null)
  const autoGrammarTimerRef = useRef(null)
  const lastAutoGrammarTextRef = useRef('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Keep preload hook for provider compatibility (no-op in local provider)
  useEffect(() => {
    preloadProvider()
  }, [])

  // Handle mode from URL params
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'ocr') {
      setActiveTab('ocr')
    }
  }, [searchParams])

  // Load processing item from history when provided in URL
  useEffect(() => {
    const historyId = searchParams.get('history')
    if (!historyId || !isAuthenticated) return

    historyAPI.getHistoryItem(historyId)
      .then((item) => {
        const inputText = item?.input_text || ''
        const outputText = item?.output_text || ''
        const normalizedType = (item?.type || '').toLowerCase()

        const buildPreview = (value) => {
          const text = value || ''
          if (text.length <= HISTORY_PREVIEW_MAX_LENGTH) return text
          return `${text.slice(0, HISTORY_PREVIEW_MAX_LENGTH)}...`
        }

        const resetAndApply = () => {
          clearResults()
          setError(null)
          setCurrentHistoryId(item?._id || historyId)
          setProcessingType(normalizedType || 'ocr')
          setActiveTab('editor')
        }

        if (normalizedType === 'grammar') {
          resetAndApply()
          setText(inputText || outputText)
          setGrammarResults({
            original_text: inputText,
            corrected_text: outputText,
            suggestions: [],
            issues_found: item?.metadata?.issues_found ?? 0,
            processing_time_ms: item?.processing_time_ms || 0,
            history_id: item?._id || historyId,
            source: 'history'
          })
          toast.success('Loaded grammar result from history')
          return
        }

        if (normalizedType === 'paraphrase') {
          resetAndApply()
          setText(inputText || outputText)
          setParaphraseResults({
            original_text: inputText,
            paraphrased_text: outputText,
            alternatives: [],
            processing_time_ms: item?.processing_time_ms || 0,
            history_id: item?._id || historyId,
            source: 'history'
          })
          toast.success('Loaded paraphrase result from history')
          return
        }

        if (normalizedType === 'translate') {
          resetAndApply()
          setText(inputText || outputText)
          setTranslationResults({
            original_text: inputText,
            translated_text: outputText,
            source_language: item?.input_language || 'auto',
            target_language: item?.output_language || targetLanguage,
            detected_language: item?.metadata?.detected_language || item?.input_language || 'auto',
            processing_time_ms: item?.processing_time_ms || 0,
            history_id: item?._id || historyId,
            source: 'history'
          })
          toast.success('Loaded translation result from history')
          return
        }

        // Default OCR fallback
        resetAndApply()
        setText(outputText || inputText)
        setOCRResults({
          extracted_text: buildPreview(outputText || inputText),
          confidence_score: item?.confidence_score || 0,
          processing_time_ms: item?.processing_time_ms || 0,
          image_dimensions: null,
          processing_type: 'history',
          history_id: item?._id || historyId,
          source: 'history'
        })
        toast.success('Loaded OCR result from history')
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'Failed to load history item'
        setError(msg)
        toast.error(msg)
      })
  }, [
    searchParams,
    isAuthenticated,
    clearResults,
    setError,
    setCurrentHistoryId,
    setProcessingType,
    setActiveTab,
    setText,
    setOCRResults,
    setGrammarResults,
    setParaphraseResults,
    setTranslationResults,
    targetLanguage
  ])

  // ============================================================
  // OCR — Using backend OCR provider (no popup auth flow)
  // ============================================================
  const handleImageSelect = async (imageData) => {
    setError(null)
    clearResults()

    if (imageData.type === 'upload') {
      setImagePreviewSrc(imageData.data)
      setSelectedImage(imageData)
      await handleOCRProcess(imageData)
    } else if (imageData.type === 'url') {
      setImagePreviewSrc(imageData.url)
      setSelectedImage(imageData)
      await handleOCRProcessURL(imageData.url)
    }
  }

  const handleOCRProcess = async (imageData) => {
    try {
      setIsProcessing(true)
      setProcessingType('ocr')

      // Use local OCR provider (no popup auth flow)
      const response = await performOCR(imageData.data, 'base64')

      setOCRResults(response)
      setText(response.extracted_text)
      setProcessingType('ocr')

      if (response.history_id) {
        setCurrentHistoryId(response.history_id)
      }
      fetchHistory().catch(() => {})

      toast.success('OCR completed! Text extracted successfully.')
      setActiveTab('editor')
    } catch (err) {
      const errMsg = err.message || 'OCR failed'
      setError(errMsg)
      toast.error('OCR failed: ' + errMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOCRProcessURL = async (url) => {
    try {
      setIsProcessing(true)
      setProcessingType('ocr')

      const response = await performOCR(url, 'url')

      setOCRResults(response)
      setText(response.extracted_text)
      setProcessingType('ocr')

      if (response.history_id) {
        setCurrentHistoryId(response.history_id)
      }
      fetchHistory().catch(() => {})

      toast.success('OCR completed! Text extracted successfully.')
      setActiveTab('editor')
    } catch (err) {
      const errMsg = err.message || 'OCR failed'
      setError(errMsg)
      toast.error('OCR failed: ' + errMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // Grammar Check — Using backend local-safe processing
  // ============================================================
  const handleGrammarCheck = async () => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('grammar')
      setError(null)

      // Use backend text route (no external auth popup)
      const response = await checkGrammar(currentText, 'auto', true)
      setGrammarResults(response)

      if (response.history_id) {
        setCurrentHistoryId(response.history_id)
      }
      fetchHistory().catch(() => {})

      const count = response.issues_found
      if (count === 0) {
        toast.success('No grammar issues found! ✓')
      } else {
        toast.success(`Found ${count} grammar issue${count > 1 ? 's' : ''}`)
      }
    } catch (err) {
      setError(err.message || 'Grammar check failed')
      toast.error('Grammar check failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const runAutoGrammarCheck = async (textForCheck) => {
    const safeText = (textForCheck || '').trim()
    if (!safeText || safeText.length < 8 || isProcessing) return

    try {
      const response = await checkGrammar(safeText, 'auto', false)
      setGrammarResults(response)
      setProcessingType('grammar')
      setError(null)
      lastAutoGrammarTextRef.current = safeText
    } catch {
      // silent fail for background grammar checks
    }
  }

  // ============================================================
  // Paraphrase — Using backend local-safe processing
  // ============================================================
  const handleParaphrase = async (style = 'normal') => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('paraphrase')
      setError(null)

      // Use backend text route (no external auth popup)
      const response = await paraphraseText(currentText, style)
      setParaphraseResults(response)
      setSelectedParaphraseOption(0)

      if (response.history_id) {
        setCurrentHistoryId(response.history_id)
      }
      fetchHistory().catch(() => {})

      toast.success('Text paraphrased successfully!')
    } catch (err) {
      setError(err.message || 'Paraphrasing failed')
      toast.error('Paraphrasing failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // Translation — Using backend local-safe processing
  // ============================================================
  const handleTranslate = async () => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('translate')
      setError(null)

      // Use backend text route (no external auth popup)
      const response = await translateText(currentText, 'auto', targetLanguage)
      setTranslationResults(response)

      if (response.history_id) {
        setCurrentHistoryId(response.history_id)
      }
      fetchHistory().catch(() => {})

      toast.success('Translation completed!')
    } catch (err) {
      setError(err.message || 'Translation failed')
      toast.error('Translation failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // Export Results
  // ============================================================
  const handleExport = async (format) => {
    try {
      setIsProcessing(true)

      if (!currentHistoryId) {
        toast.error('No results to export. Process text or upload image first.')
        setIsProcessing(false)
        return
      }

      const response = await historyAPI.exportResult(currentHistoryId, format)

      const blob = new Blob([response.data], {
        type: format === 'pdf'
          ? 'application/pdf'
          : format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain'
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `textanalyzer_${Date.now()}.${format === 'docx' ? 'docx' : format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Exported as ${format.toUpperCase()}!`)
      setShowExportModal(false)
    } catch (err) {
      // If backend export fails, do client-side text export
      if (format === 'txt') {
        const results = getCurrentResults()
        const textContent = results?.extracted_text || results?.corrected_text ||
          results?.paraphrased_text || results?.translated_text || currentText

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `textanalyzer_${Date.now()}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        toast.success('Exported as TXT!')
        setShowExportModal(false)
      } else {
        setError(err.response?.data?.detail || 'Export failed')
        toast.error('Export failed. Try TXT format.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const getCurrentResults = () => {
    if (processingType === 'grammar') return grammarResults
    if (processingType === 'paraphrase') return paraphraseResults
    if (processingType === 'translate') return translationResults
    if (processingType === 'ocr') return ocrResults
    return null
  }

  const buildCorrectedTextFromSuggestions = (baseText, suggestions) => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return baseText
    }

    let next = baseText
    const sorted = [...suggestions]
      .filter((s) => Number.isFinite(s?.offset) && Number.isFinite(s?.length))
      .sort((a, b) => b.offset - a.offset)

    for (const suggestion of sorted) {
      const replacement = suggestion?.replacements?.[0]
      if (typeof replacement !== 'string') continue

      const offset = Math.max(0, Number(suggestion.offset))
      const length = Math.max(0, Number(suggestion.length))
      const right = Math.min(next.length, offset + length)

      if (offset > next.length) continue
      next = `${next.slice(0, offset)}${replacement}${next.slice(right)}`
    }

    return next
  }

  const handleApplyGrammarSuggestion = (suggestion, replacement, suggestionIndex) => {
    if (!suggestion || typeof replacement !== 'string') return

    const offset = Number(suggestion.offset)
    const length = Number(suggestion.length)

    if (!Number.isFinite(offset) || !Number.isFinite(length)) {
      toast.error('Cannot apply this suggestion automatically')
      return
    }

    const safeOffset = Math.max(0, offset)
    const safeLength = Math.max(0, length)
    const right = Math.min(currentText.length, safeOffset + safeLength)

    if (safeOffset > currentText.length) {
      toast.error('Suggestion position is out of date. Please run grammar check again.')
      return
    }

    const nextText = `${currentText.slice(0, safeOffset)}${replacement}${currentText.slice(right)}`
    const delta = replacement.length - safeLength

    setText(nextText)

    setGrammarResults((prev) => {
      if (!prev) return prev

      const oldSuggestions = Array.isArray(prev.suggestions) ? prev.suggestions : []
      const remaining = oldSuggestions
        .filter((_, idx) => idx !== suggestionIndex)
        .map((item) => {
          const itemOffset = Number(item?.offset)
          if (!Number.isFinite(itemOffset)) return item
          if (itemOffset > safeOffset) {
            return {
              ...item,
              offset: Math.max(0, itemOffset + delta)
            }
          }
          return item
        })

      const correctedText = buildCorrectedTextFromSuggestions(nextText, remaining)

      return {
        ...prev,
        original_text: nextText,
        corrected_text: correctedText,
        suggestions: remaining,
        issues_found: remaining.length
      }
    })

    toast.success('Suggestion applied to original text')
  }

  const handleIgnoreGrammarSuggestion = (suggestionIndex) => {
    setGrammarResults((prev) => {
      if (!prev) return prev

      const oldSuggestions = Array.isArray(prev.suggestions) ? prev.suggestions : []
      const remaining = oldSuggestions.filter((_, idx) => idx !== suggestionIndex)
      const correctedText = buildCorrectedTextFromSuggestions(currentText, remaining)

      return {
        ...prev,
        corrected_text: correctedText,
        suggestions: remaining,
        issues_found: remaining.length
      }
    })

    toast.success('Issue ignored')
  }

  const handleFocusGrammarIssue = (suggestion) => {
    const rawOffset = Number(suggestion?.offset)
    const rawLength = Number(suggestion?.length)
    const originalFragment = (suggestion?.original || '').trim()

    let start = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : -1
    let length = Number.isFinite(rawLength) ? Math.max(0, rawLength) : 0

    if (start < 0 && originalFragment) {
      const found = currentText.indexOf(originalFragment)
      if (found >= 0) {
        start = found
      }
    }

    if (start < 0) return

    if (length <= 0 && originalFragment) {
      const slice = currentText.slice(start, start + originalFragment.length)
      if (slice.toLowerCase() === originalFragment.toLowerCase()) {
        length = originalFragment.length
      }
    }

    if (length <= 0) {
      // Fallback to highlight the current word under offset so the user can still see focus.
      const text = currentText || ''
      let left = Math.min(start, text.length)
      let right = left

      while (left > 0 && /\S/.test(text[left - 1])) left -= 1
      while (right < text.length && /\S/.test(text[right])) right += 1

      if (right > left) {
        start = left
        length = right - left
      }
    }

    const end = Math.min(currentText.length, Math.max(start, start + length))

    setActiveTab('editor')
    setGrammarFocusRange({ start, end, key: `${start}-${end}-${Date.now()}` })
  }

  const handleClearAll = () => {
    clearResults()
    setText('')
    setImagePreviewSrc(null)
    setSelectedImage(null)
    setCurrentHistoryId(null)
    setSelectedParaphraseOption(0)
    setGrammarFocusRange(null)
  }

  const handleSelectParaphraseOption = (text, idx = 0) => {
    if (!text) return
    setSelectedParaphraseOption(idx)
    setText(text)
    toast.success('Paraphrase option applied to editor')
  }

  useEffect(() => {
    if (autoGrammarTimerRef.current) {
      clearTimeout(autoGrammarTimerRef.current)
      autoGrammarTimerRef.current = null
    }

    const safeText = (currentText || '').trim()
    if (!safeText || safeText.length < 8 || isProcessing) {
      return
    }

    // Avoid immediate duplicate auto checks on unchanged text
    if (safeText === lastAutoGrammarTextRef.current) {
      return
    }

    autoGrammarTimerRef.current = setTimeout(() => {
      runAutoGrammarCheck(safeText)
    }, AUTO_GRAMMAR_DEBOUNCE_MS)

    return () => {
      if (autoGrammarTimerRef.current) {
        clearTimeout(autoGrammarTimerRef.current)
        autoGrammarTimerRef.current = null
      }
    }
  }, [currentText, isProcessing])

  return (
    <div className="editor-page">
      {/* Page Header */}
      <div className="editor-page-header">
        <div className="editor-page-title">
          <h1>Text Editor</h1>
          <p>Upload images for OCR, then process with AI-powered tools — all FREE</p>
        </div>
        <div className="editor-page-actions">
          {(currentText || imagePreviewSrc) && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Clear All
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowExportModal(true)}
            disabled={!getCurrentResults() && !currentText}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="editor-tabs">
        <button
          className={`editor-tab ${activeTab === 'ocr' ? 'editor-tab-active' : ''}`}
          onClick={() => setActiveTab('ocr')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          OCR Upload
          {imagePreviewSrc && <span className="tab-dot"></span>}
        </button>
        <button
          className={`editor-tab ${activeTab === 'editor' ? 'editor-tab-active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Text Editor
          {currentText && <span className="tab-dot"></span>}
        </button>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-layout">
        {/* Left: OCR or Text Editor */}
        <div className="editor-main">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error editor-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
              <button className="alert-close" onClick={() => setError(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* OCR Tab */}
          {activeTab === 'ocr' && (
            <div className="editor-ocr-panel animate-fadeIn">
              <OCRUploader
                onImageSelect={handleImageSelect}
                processing={isProcessing}
              />

              {imagePreviewSrc && (
                <ImagePreview
                  imageSrc={imagePreviewSrc}
                  fileName={selectedImage?.fileName || 'preview.jpg'}
                  onClose={() => {
                    setImagePreviewSrc(null)
                    setSelectedImage(null)
                  }}
                />
              )}
            </div>
          )}

          {/* Editor Tab */}
          {activeTab === 'editor' && (
            <div className="editor-text-panel animate-fadeIn">
              <TextEditor
                text={currentText}
                onChange={setText}
                locateRange={grammarFocusRange}
                placeholder="Paste text here, or switch to OCR tab to extract text from an image..."
              />
            </div>
          )}
        </div>

        {/* Right: Tools + Results */}
        <div className="editor-sidebar">
          {/* Tool Panel */}
          <ToolPanel
            onGrammarCheck={handleGrammarCheck}
            onParaphrase={handleParaphrase}
            onTranslate={handleTranslate}
            onExport={() => setShowExportModal(true)}
            hasText={currentText.trim().length > 0}
            disabled={isProcessing}
            targetLanguage={targetLanguage}
            onLanguageChange={setTargetLanguage}
          />

          {/* Loading State */}
          {isProcessing && (
            <div className="sidebar-loading">
              <LoadingSpinner size="md" text={`Processing with AI...`} />
            </div>
          )}

          {/* Results Panel */}
          {!isProcessing && getCurrentResults() && (
            <ResultsPanel
              results={getCurrentResults()}
              processingType={processingType}
              onApplyGrammarSuggestion={handleApplyGrammarSuggestion}
              onIgnoreGrammarSuggestion={handleIgnoreGrammarSuggestion}
              onFocusGrammarIssue={handleFocusGrammarIssue}
              selectedParaphraseOption={selectedParaphraseOption}
              onSelectParaphraseOption={handleSelectParaphraseOption}
              onUseText={(text) => {
                setText(text)
                toast.success('Text applied to editor!')
              }}
            />
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        hasResults={getCurrentResults() !== null || currentText.length > 0}
      />
    </div>
  )
}

export default EditorPage
