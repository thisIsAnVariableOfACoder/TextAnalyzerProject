import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useTextStore from '../stores/textStore'
import useHistoryStore from '../stores/historyStore'
import { textAPI, ocrAPI, historyAPI } from '../services/api'
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

function EditorPage() {
  const navigate = useNavigate()
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
    selectedLanguage,
    setSelectedLanguage,
    processingType,
    setProcessingType,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    clearResults
  } = useTextStore()

  const { addToHistory } = useHistoryStore()

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('es')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Handle image selection
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

  // Process OCR
  const handleOCRProcess = async (imageData) => {
    try {
      setIsProcessing(true)
      setProcessingType('ocr')

      const response = await ocrAPI.processImage(
        imageData.data.split(',')[1], // Extract base64 data
        'upload'
      )

      setOCRResults(response)
      setText(response.extracted_text)
      setProcessingType('ocr')

      // Add to history
      addToHistory({
        id: Date.now().toString(),
        type: 'ocr',
        input_text: response.extracted_text.substring(0, 100),
        output_text: response.extracted_text,
        confidence_score: response.confidence_score,
        created_at: new Date().toISOString()
      })

      toast.success('OCR completed successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'OCR failed')
      toast.error('OCR processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOCRProcessURL = async (url) => {
    try {
      setIsProcessing(true)
      setProcessingType('ocr')

      const response = await ocrAPI.processImage(null, 'url', url)

      setOCRResults(response)
      setText(response.extracted_text)
      setProcessingType('ocr')

      toast.success('OCR completed successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'OCR failed')
      toast.error('OCR processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Check grammar
  const handleGrammarCheck = async () => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('grammar')
      setError(null)

      const response = await textAPI.checkGrammar(currentText, 'en')

      setGrammarResults(response)

      addToHistory({
        id: Date.now().toString(),
        type: 'grammar',
        input_text: currentText.substring(0, 100),
        output_text: response.corrected_text || currentText,
        created_at: new Date().toISOString()
      })

      toast.success(`Found ${response.issues_found} grammar issues`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Grammar check failed')
      toast.error('Grammar checking failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Paraphrase text
  const handleParaphrase = async (style = 'normal') => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('paraphrase')
      setError(null)

      const response = await textAPI.paraphrase(currentText, style)

      setParaphraseResults(response)

      addToHistory({
        id: Date.now().toString(),
        type: 'paraphrase',
        input_text: currentText.substring(0, 100),
        output_text: response.paraphrased_text,
        created_at: new Date().toISOString()
      })

      toast.success('Text paraphrased successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Paraphrasing failed')
      toast.error('Paraphrasing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Translate text
  const handleTranslate = async () => {
    if (!currentText.trim()) {
      toast.error('Please enter text first')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingType('translate')
      setError(null)

      const response = await textAPI.translate(
        currentText,
        'auto',
        targetLanguage
      )

      setTranslationResults(response)

      addToHistory({
        id: Date.now().toString(),
        type: 'translate',
        input_text: currentText.substring(0, 100),
        output_text: response.translated_text,
        input_language: 'auto',
        output_language: targetLanguage,
        created_at: new Date().toISOString()
      })

      toast.success('Translation completed!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Translation failed')
      toast.error('Translation failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Export results
  const handleExport = async (format) => {
    // For now, just show toast
    // In production, integrate with /api/export endpoint
    toast.success(`Exporting as ${format.toUpperCase()}...`)
    setTimeout(() => {
      toast.success('File downloaded successfully!')
    }, 1000)
  }

  const getCurrentResults = () => {
    if (processingType === 'grammar') return grammarResults
    if (processingType === 'paraphrase') return paraphraseResults
    if (processingType === 'translate') return translationResults
    if (processingType === 'ocr') return ocrResults
    return null
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <h1>Text Analyzer & Editor</h1>
        <p>Upload images, extract text, and process with AI-powered tools</p>
      </div>

      <div className="editor-layout">
        {/* Left Column: Upload & Preview */}
        <div className="editor-column left-column">
          <OCRUploader
            onImageSelect={handleImageSelect}
            processing={isProcessing}
          />

          {imagePreviewSrc && (
            <ImagePreview
              imageSrc={imagePreviewSrc}
              fileName={selectedImage?.fileName ||  'preview.jpg'}
              onClose={() => {
                setImagePreviewSrc(null)
                setSelectedImage(null)
              }}
            />
          )}
        </div>

        {/* Middle Column: Text Editor */}
        <div className="editor-column middle-column">
          {error && (
            <div className="error-alert">
              <p>{error}</p>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <TextEditor
            text={currentText}
            onChange={setText}
            placeholder="Paste text, upload an image, or use OCR..."
          />
        </div>

        {/* Right Column: Tools & Results */}
        <div className="editor-column right-column">
          {processingType === 'translate' && (
            <div className="language-panel">
              <LanguageSelector
                value={targetLanguage}
                onChange={setTargetLanguage}
                includeAuto={true}
              />
            </div>
          )}

          <ToolPanel
            onGrammarCheck={handleGrammarCheck}
            onParaphrase={handleParaphrase}
            onTranslate={handleTranslate}
            onExport={() => setShowExportModal(true)}
            hasText={currentText.trim().length > 0}
            disabled={isProcessing}
            selectedLanguage={targetLanguage}
          />

          {isProcessing && (
            <LoadingSpinner size="md" text="Processing..." />
          )}

          {!isProcessing && getCurrentResults() && (
            <ResultsPanel
              results={getCurrentResults()}
              processingType={processingType}
            />
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        hasResults={getCurrentResults() !== null}
      />

      {/* Help Section */}
      <div className="editor-help">
        <h3>How to Use</h3>
        <div className="help-grid">
          <div className="help-item">
            <strong>📤 Upload or Capture</strong>
            <p>Upload an image, take a photo, paste from clipboard, or provide a URL</p>
          </div>
          <div className="help-item">
            <strong>✍️ Edit Text</strong>
            <p>View extracted text or type your own text for analysis</p>
          </div>
          <div className="help-item">
            <strong>✨ Process</strong>
            <p>Apply grammar checking, paraphrasing, or translation tools</p>
          </div>
          <div className="help-item">
            <strong>📥 Download</strong>
            <p>Export your results as PDF, Word document, or plain text</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorPage
