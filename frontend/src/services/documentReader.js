const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'log', 'rtf']

function getExtension(fileName = '') {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function arrayBufferToText(buffer) {
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    if (utf8 && utf8.replace(/\s+/g, '').length > 0) return utf8
  } catch {
    // no-op
  }

  try {
    return new TextDecoder('windows-1252', { fatal: false }).decode(buffer)
  } catch {
    return ''
  }
}

async function parsePdf(file) {
  const buffer = await file.arrayBuffer()

  return {
    mode: 'pdf',
    text: '',
    pdfBuffer: buffer,
    pageCount: null,
    sourceType: 'pdf-provider-pdfjs',
    provider: {
      id: 'pdfjs',
      label: 'PDF.js Native Renderer',
      fallback: 'browser-embed'
    }
  }
}

async function parseDocx(file) {
  const buffer = await file.arrayBuffer()
  let extractedText = ''

  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    extractedText = (result?.value || '').trim()
  } catch {
    extractedText = ''
  }

  if (!extractedText) {
    extractedText = arrayBufferToText(buffer).replace(/[\u0000-\u001F]/g, ' ').trim()
  }

  return {
    mode: 'docx',
    text: extractedText,
    docxBuffer: buffer,
    sourceType: 'docx-provider-docx-preview',
    provider: {
      id: 'docx-preview',
      label: 'DOCX Preview Native Renderer',
      fallback: 'office-web-viewer'
    }
  }
}

async function parsePlainText(file) {
  let text = ''
  try {
    text = await file.text()
  } catch {
    const buffer = await file.arrayBuffer()
    text = arrayBufferToText(buffer)
  }

  return {
    mode: 'text',
    text: (text || '').trim(),
    sourceType: 'plain-text',
    provider: {
      id: 'text-native',
      label: 'Native Text Renderer',
      fallback: 'none'
    }
  }
}

async function parseLegacyDoc(file) {
  return {
    mode: 'embedded',
    text: '',
    sourceType: 'doc-provider-office-web-viewer',
    provider: {
      id: 'office-web-viewer',
      label: 'Word/Office Online (public URL required)',
      fallback: 'browser-download'
    },
    providerNote: 'DOC legacy files need Microsoft Word/Office provider with public URL. Local browser fallback may not render full layout.'
  }
}

function buildMeta(text, file, pageCount = null, provider = null) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || getExtension(file.name),
    pageCount,
    words,
    characters: (text || '').length,
    provider: provider?.label || 'Unknown provider',
    lastOpenedAt: new Date().toISOString()
  }
}

export async function readDocumentFile(file) {
  const extension = getExtension(file?.name)
  const objectUrl = URL.createObjectURL(file)

  let parsed

  if (extension === 'pdf') {
    parsed = await parsePdf(file)
  } else if (extension === 'docx') {
    parsed = await parseDocx(file)
  } else if (extension === 'doc') {
    parsed = await parseLegacyDoc(file)
  } else if (TEXT_EXTENSIONS.includes(extension)) {
    parsed = await parsePlainText(file)
  } else {
    throw new Error('Unsupported file format. Please use PDF, DOCX, DOC, TXT, MD, CSV, LOG, or RTF.')
  }

  return {
    ...parsed,
    extension,
    objectUrl,
    meta: buildMeta(parsed.text || '', file, parsed.pageCount || null, parsed.provider)
  }
}

export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

