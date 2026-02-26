import type { Annotation, AnnotationTool } from '../../types/annotation'

function nowIso(): string {
  return new Date().toISOString()
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
}

export function createHighlightAnnotation(params: {
  documentId: string
  pageIndex: number
  rects: Array<{ x: number; y: number; width: number; height: number }>
  color?: string
  nodeRefId?: string
}): Annotation {
  return {
    id: nextId('anno-highlight'),
    type: 'highlight',
    documentId: params.documentId,
    pageIndex: params.pageIndex,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    color: params.color || 'rgba(251,191,36,0.36)',
    rects: params.rects,
    nodeRefId: params.nodeRefId,
  }
}

export function createPenAnnotation(params: {
  documentId: string
  pageIndex: number
  points: Array<{ x: number; y: number }>
  color?: string
  strokeWidth?: number
}): Annotation {
  return {
    id: nextId('anno-pen'),
    type: 'pen',
    documentId: params.documentId,
    pageIndex: params.pageIndex,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    color: params.color || '#2563eb',
    strokeWidth: params.strokeWidth || 2,
    points: params.points,
  }
}

export function createCommentAnnotation(params: {
  documentId: string
  pageIndex: number
  text: string
  position: { x: number; y: number }
  nodeRefId?: string
}): Annotation {
  return {
    id: nextId('anno-comment'),
    type: 'comment',
    documentId: params.documentId,
    pageIndex: params.pageIndex,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    text: params.text,
    position: params.position,
    nodeRefId: params.nodeRefId,
  }
}

export function applyPointerTool(params: {
  tool: AnnotationTool
  documentId: string
  pageIndex: number
  points: Array<{ x: number; y: number }>
  commentText?: string
}): Annotation | null {
  const { tool, documentId, pageIndex, points, commentText } = params

  if (tool === 'pen' && points.length > 1) {
    return createPenAnnotation({ documentId, pageIndex, points })
  }

  if (tool === 'highlight' && points.length > 1) {
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    return createHighlightAnnotation({
      documentId,
      pageIndex,
      rects: [
        {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(10, Math.max(...xs) - Math.min(...xs)),
          height: Math.max(10, Math.max(...ys) - Math.min(...ys)),
        },
      ],
    })
  }

  if (tool === 'comment' && points.length > 0) {
    return createCommentAnnotation({
      documentId,
      pageIndex,
      text: (commentText || 'Comment').trim().slice(0, 300),
      position: points[0],
    })
  }

  return null
}

