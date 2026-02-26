import type { DocumentAst, DocumentFormat } from '../../types/ast'

export interface ParserProgressEvent {
  phase: 'parsing' | 'normalizing'
  progress: number
  loadedBytes: number
  totalBytes: number
  message?: string
}

export interface ParseContext {
  format: DocumentFormat
  onProgress?: (event: ParserProgressEvent) => void
}

export interface ParsedDocumentResult {
  ast: DocumentAst
  warnings: string[]
}

