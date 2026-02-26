export type AnnotationTool = 'highlight' | 'pen' | 'comment'

export interface AnnotationBase {
  id: string
  documentId: string
  pageIndex: number
  createdAt: string
  updatedAt: string
  authorId?: string
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight'
  color: string
  rects: Array<{ x: number; y: number; width: number; height: number }>
  nodeRefId?: string
}

export interface PenAnnotation extends AnnotationBase {
  type: 'pen'
  color: string
  strokeWidth: number
  points: Array<{ x: number; y: number }>
}

export interface CommentAnnotation extends AnnotationBase {
  type: 'comment'
  text: string
  position: { x: number; y: number }
  nodeRefId?: string
}

export type Annotation = HighlightAnnotation | PenAnnotation | CommentAnnotation

