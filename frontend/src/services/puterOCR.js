const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/'

let puterReadyPromise = null

function extractTextFromUnknownPayload(payload) {
  if (!payload) return ''

  if (typeof payload === 'string') return payload.trim()

  if (typeof payload?.text === 'string') return payload.text.trim()

  if (typeof payload?.content === 'string') return payload.content.trim()

  if (typeof payload?.message?.content === 'string') {
    return payload.message.content.trim()
  }

  if (Array.isArray(payload?.message?.content)) {
    const joined = payload.message.content
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item?.text === 'string') return item.text
        if (typeof item?.content === 'string') return item.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
    if (joined) return joined
  }

  if (Array.isArray(payload?.content)) {
    const joined = payload.content
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item?.text === 'string') return item.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
    if (joined) return joined
  }

  return ''
}

function normalizeDataUrlToFile(dataUrl, fileName = 'ocr-image.png') {
  if (!dataUrl?.startsWith('data:')) return null
  const [meta, base64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:(.*?);base64/)
  const mimeType = mimeMatch?.[1] || 'image/png'

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], fileName, { type: mimeType })
}

export function ensurePuterLoaded() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Puter requires browser environment'))
  }

  if (window.puter) return Promise.resolve(window.puter)

  if (!puterReadyPromise) {
    puterReadyPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`)
      if (existing) {
        existing.addEventListener('load', () => resolve(window.puter))
        existing.addEventListener('error', () => reject(new Error('Failed to load Puter.js')))
        return
      }

      const script = document.createElement('script')
      script.src = PUTER_SCRIPT_URL
      script.async = true
      script.onload = () => {
        if (window.puter) {
          resolve(window.puter)
        } else {
          reject(new Error('Puter.js loaded but window.puter is unavailable'))
        }
      }
      script.onerror = () => reject(new Error('Failed to load Puter.js'))
      document.head.appendChild(script)
    })
  }

  return puterReadyPromise
}

async function runPuterMistralOCR(input) {
  const puter = await ensurePuterLoaded()

  const prompt = 'Extract all visible text from this image. Return only the extracted text with preserved line breaks. Do not add explanations.'

  const attempts = [
    () => puter?.ai?.chat?.(prompt, input, { model: 'mistral-ocr-latest' }),
    () => puter?.ai?.chat?.(prompt, input, { model: 'mistral-ocr' }),
    () => puter?.ai?.chat?.(prompt, { image: input, model: 'mistral-ocr-latest' }),
    () => puter?.ai?.ocr?.(input),
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      const response = await attempt()
      const extractedText = extractTextFromUnknownPayload(response)
      if (extractedText) {
        return extractedText
      }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Puter OCR did not return extracted text')
}

export async function extractTextWithPuterOCR(imageDataOrUrl, type = 'base64') {
  const input = type === 'url'
    ? imageDataOrUrl
    : normalizeDataUrlToFile(imageDataOrUrl)

  if (!input) {
    throw new Error('Invalid image data for Puter OCR')
  }

  const extractedText = await runPuterMistralOCR(input)
  return extractedText
}

