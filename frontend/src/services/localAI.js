import { ocrAPI, textAPI } from './api'

/**
 * Local/Backend AI provider
 * - OCR: backend OCR route (no Puter popup / no external auth window)
 * - Grammar/Paraphrase/Translate: backend local-safe routes
 */

export const performOCR = async (imageDataOrUrl, type = 'base64') => {
  const startTime = Date.now()

  const response = type === 'url'
    ? await ocrAPI.processImage('', 'url', imageDataOrUrl)
    : await ocrAPI.processImage(
        imageDataOrUrl.startsWith('data:')
          ? imageDataOrUrl.split(',')[1]
          : imageDataOrUrl,
        'upload'
      )

  return {
    extracted_text: response.extracted_text || '',
    confidence_score: typeof response.confidence_score === 'number' ? response.confidence_score : 0,
    processing_time_ms: Date.now() - startTime,
    image_dimensions: response.image_dimensions || null,
    processing_type: response.processing_type || type,
    history_id: response.history_id || null,
    source: response.source || 'backend_ocr'
  }
}

export const checkGrammar = async (text, language = 'en', saveHistory = true) => {
  const startTime = Date.now()
  const safeText = (text || '').trim()

  const detectLanguage = (input) => {
    const viPattern = /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợúùủũụứừửữựíìỉĩịýỳỷỹỵ]/i
    return viPattern.test(input) ? 'vi' : 'en'
  }

  if (!safeText) {
    return {
      original_text: '',
      corrected_text: '',
      suggestions: [],
      issues_found: 0,
      processing_time_ms: Date.now() - startTime,
      source: 'backend_local'
    }
  }

  const resolvedLanguage = language === 'auto' ? detectLanguage(safeText) : language
  const response = await textAPI.checkGrammar(safeText, resolvedLanguage, saveHistory)

  return {
    ...response,
    processing_time_ms: response.processing_time_ms || (Date.now() - startTime),
    source: response.source || 'backend_local'
  }
}

export const paraphraseText = async (text, style = 'normal') => {
  const startTime = Date.now()
  const safeText = (text || '').trim()

  if (!safeText) {
    return {
      original_text: '',
      paraphrased_text: '',
      alternatives: [],
      style,
      processing_time_ms: Date.now() - startTime,
      source: 'backend_local'
    }
  }

  const response = await textAPI.paraphrase(safeText, style)

  return {
    ...response,
    processing_time_ms: response.processing_time_ms || (Date.now() - startTime),
    source: response.source || 'backend_local'
  }
}

export const translateText = async (text, sourceLang = 'auto', targetLang = 'vi') => {
  const startTime = Date.now()
  const response = await textAPI.translate(text, sourceLang, targetLang)

  return {
    ...response,
    processing_time_ms: response.processing_time_ms || (Date.now() - startTime),
    source: response.source || 'backend_local'
  }
}

// Kept for compatibility with existing EditorPage lifecycle hook
export const preloadProvider = () => {
  // no-op: OCR now runs via backend provider only
  return Promise.resolve()
}

export default {
  performOCR,
  checkGrammar,
  paraphraseText,
  translateText,
  preloadProvider
}

