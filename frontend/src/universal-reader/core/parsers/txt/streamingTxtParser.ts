import {
  createEmptyDocumentAst,
  createMetadata,
  createParagraph,
  createSection,
} from '../../ast/nodeFactory'
import { sanitizeTextForAst } from '../utils/sanitize'
import type { ParseContext, ParsedDocumentResult } from '../types'

const DEFAULT_CHUNK_SIZE = 1024 * 256

export async function parseTxtStream(file: File, context: ParseContext): Promise<ParsedDocumentResult> {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const warnings: string[] = []
  const blocks: ReturnType<typeof createParagraph>[] = []

  let loadedBytes = 0
  let carry = ''
  let words = 0
  let characters = 0

  const stream = file.stream()
  const reader = stream.getReader()

  while (true) {
    const result = await reader.read()
    if (result.done) break
    loadedBytes += result.value.byteLength

    const decoded = decoder.decode(result.value, { stream: true })
    const safe = sanitizeTextForAst(decoded)
    const text = carry + safe
    const lines = text.split('\n')
    carry = lines.pop() ?? ''

    for (const line of lines) {
      const normalized = line.trimEnd()
      if (!normalized.trim()) continue
      blocks.push(createParagraph(normalized))
      words += normalized.split(/\s+/).filter(Boolean).length
      characters += normalized.length
    }

    context.onProgress?.({
      phase: 'parsing',
      progress: Math.min(95, Math.floor((loadedBytes / Math.max(file.size, 1)) * 95)),
      loadedBytes,
      totalBytes: file.size,
      message: 'Streaming text chunks',
    })

    await yieldToUiIfAvailable()
  }

  const flush = decoder.decode()
  const lastLine = sanitizeTextForAst(carry + flush).trim()
  if (lastLine) {
    blocks.push(createParagraph(lastLine))
    words += lastLine.split(/\s+/).filter(Boolean).length
    characters += lastLine.length
  }

  if (file.size > 200 * 1024 * 1024) {
    warnings.push('File size exceeds 200MB target, performance may degrade depending on browser memory limits.')
  }

  if (!blocks.length) {
    blocks.push(createParagraph(''))
  }

  const ast = createEmptyDocumentAst({
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || 'text/plain',
    format: context.format,
    parserWarnings: warnings,
  })

  ast.sections = [createSection('Body', blocks)]
  ast.metadata.wordCount = words
  ast.metadata.characterCount = characters
  ast.globalMetadata.push(
    createMetadata('parser', 'streaming-txt-v1'),
    createMetadata('chunk-size', String(DEFAULT_CHUNK_SIZE)),
  )

  context.onProgress?.({
    phase: 'normalizing',
    progress: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    message: 'Text AST completed',
  })

  return { ast, warnings }
}

function yieldToUiIfAvailable(): Promise<void> {
  return new Promise((resolve) => {
    const callback = () => resolve()
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(callback, { timeout: 16 })
      return
    }
    setTimeout(callback, 0)
  })
}

