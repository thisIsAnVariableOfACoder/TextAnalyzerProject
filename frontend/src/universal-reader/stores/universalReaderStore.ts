import { create } from 'zustand'
import type { DocumentAst, DocumentFormat } from '../types/ast'
import type { Annotation, AnnotationTool } from '../types/annotation'
import type { LayoutDocument, ViewportState } from '../types/layout'
import type { ParseWorkerMessage, ParseWorkerRequest, ParseWorkerSuccess } from '../types/worker'
import { loadAnnotations, saveAnnotations } from '../annotation/storage/annotationStorage'
import { buildLayoutIncremental } from '../rendering/layout-engine/incrementalLayout'
import { parseWithRegistry } from '../core/parsers/registry/parserRegistry'

const defaultViewport: ViewportState = {
  scrollTop: 0,
  viewportHeight: 800,
  viewportWidth: 1200,
  overscan: 600,
}

let parserWorker: Worker | null = null

function getWorker() {
  if (parserWorker) return parserWorker
  parserWorker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' })
  return parserWorker
}

interface ReaderState {
  ast: DocumentAst | null
  layout: LayoutDocument | null
  format: DocumentFormat | null
  annotations: Annotation[]
  loading: boolean
  parseProgress: number
  parseMessage: string
  parseWarnings: string[]
  activeTool: AnnotationTool
  zoom: number
  viewport: ViewportState
  searchQuery: string
  searchResults: string[]
  openFile: (file: File) => Promise<void>
  setViewport: (viewport: Partial<ViewportState>) => void
  setZoom: (zoom: number) => void
  setTool: (tool: AnnotationTool) => void
  addAnnotation: (annotation: Annotation) => void
  removeLastAnnotation: () => void
  clearAnnotations: () => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: string[]) => void
}

export const useUniversalReaderStore = create<ReaderState>((set, get) => ({
  ast: null,
  layout: null,
  format: null,
  annotations: [],
  loading: false,
  parseProgress: 0,
  parseMessage: '',
  parseWarnings: [],
  activeTool: 'highlight',
  zoom: 1,
  viewport: defaultViewport,
  searchQuery: '',
  searchResults: [],

  async openFile(file) {
    set({ loading: true, parseProgress: 0, parseMessage: 'Preparing parser...', parseWarnings: [] })

    const requestId = `parse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const worker = getWorker()

    try {
      const response = await new Promise<ParseWorkerSuccess>((resolve, reject) => {
        const onMessage = (event: MessageEvent<ParseWorkerMessage>) => {
          const payload = event.data
          if (!payload || payload.requestId !== requestId) return

          if (payload.type === 'progress') {
            set({ parseProgress: payload.progress.progress, parseMessage: payload.progress.message || payload.progress.phase })
            return
          }

          worker.removeEventListener('message', onMessage)

          if (payload.type === 'error') {
            reject(new Error(payload.error))
            return
          }

          if (payload.type === 'success') {
            resolve(payload)
            return
          }

          reject(new Error('Unexpected worker response'))
        }

        worker.addEventListener('message', onMessage)
        const req: ParseWorkerRequest = { type: 'parse', requestId, file }
        worker.postMessage(req)
      })

      let ast = response.ast
      const layout = await buildLayoutIncremental(ast, get().viewport.viewportWidth)
      const existing = loadAnnotations(ast.id)

      set({
        ast,
        layout,
        format: ast.metadata.format,
        annotations: existing,
        loading: false,
        parseProgress: 100,
        parseMessage: 'Done',
        parseWarnings: response.warnings,
      })
      return
    } catch {
      // fallback direct parser path if worker fails
    }

    try {
      const result = await parseWithRegistry(file, {
        onProgress: (progress) => {
          set({ parseProgress: progress.progress, parseMessage: progress.message || progress.phase })
        },
      })
      const layout = await buildLayoutIncremental(result.ast, get().viewport.viewportWidth)
      const existing = loadAnnotations(result.ast.id)
      set({
        ast: result.ast,
        layout,
        format: result.ast.metadata.format,
        annotations: existing,
        loading: false,
        parseProgress: 100,
        parseMessage: 'Done',
        parseWarnings: result.warnings,
      })
    } catch (error) {
      set({
        loading: false,
        parseMessage: 'Failed to parse document',
        parseWarnings: [error instanceof Error ? error.message : 'Unknown parser error'],
      })
    }
  },

  setViewport(viewport) {
    const next = { ...get().viewport, ...viewport }
    set({ viewport: next })

    const ast = get().ast
    if (!ast) return
    buildLayoutIncremental(ast, next.viewportWidth).then((layout) => {
      set({ layout })
    })
  },

  setZoom(zoom) {
    set({ zoom: Math.max(0.5, Math.min(3, zoom)) })
  },

  setTool(tool) {
    set({ activeTool: tool })
  },

  addAnnotation(annotation) {
    const ast = get().ast
    if (!ast) return
    const list = [...get().annotations, annotation]
    saveAnnotations(ast.id, list)
    set({ annotations: list })
  },

  removeLastAnnotation() {
    const ast = get().ast
    if (!ast) return
    const list = get().annotations.slice(0, -1)
    saveAnnotations(ast.id, list)
    set({ annotations: list })
  },

  clearAnnotations() {
    const ast = get().ast
    if (!ast) return
    saveAnnotations(ast.id, [])
    set({ annotations: [] })
  },

  setSearchQuery(query) {
    set({ searchQuery: query })
  },

  setSearchResults(results) {
    set({ searchResults: results })
  },
}))

