import type { DocumentAst } from '../../types/ast'
import type { LayoutDocument, ViewportState } from '../../types/layout'
import type { AnnotationTool } from '../../types/annotation'

export interface DocumentSessionState {
  documentAst: DocumentAst | null
  layout: LayoutDocument | null
  zoom: number
  activeTool: AnnotationTool
  viewport: ViewportState
  parseProgress: number
  parsePhase: string
  parseWarnings: string[]
}

export const defaultViewport: ViewportState = {
  scrollTop: 0,
  viewportHeight: 800,
  viewportWidth: 1200,
  overscan: 600,
}

