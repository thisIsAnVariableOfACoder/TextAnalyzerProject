import type { DocumentAst } from './ast'
import type { ParserProgressEvent } from '../core/parsers/types'

export interface ParseWorkerRequest {
  type: 'parse'
  requestId: string
  file: File
}

export interface ParseWorkerProgress {
  type: 'progress'
  requestId: string
  progress: ParserProgressEvent
}

export interface ParseWorkerSuccess {
  type: 'success'
  requestId: string
  ast: DocumentAst
  warnings: string[]
}

export interface ParseWorkerFailure {
  type: 'error'
  requestId: string
  error: string
}

export type ParseWorkerMessage = ParseWorkerProgress | ParseWorkerSuccess | ParseWorkerFailure

