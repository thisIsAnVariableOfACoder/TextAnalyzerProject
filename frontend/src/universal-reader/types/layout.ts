export type LayoutBlockKind = 'heading' | 'paragraph' | 'code' | 'table' | 'image'

export interface LayoutLine {
  text: string
  yOffset: number
}

export interface LayoutBlock {
  id: string
  nodeId: string
  kind: LayoutBlockKind
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  lineHeight: number
  fontWeight?: number
  color?: string
  lines: LayoutLine[]
  searchableText: string
}

export interface LayoutDocument {
  blocks: LayoutBlock[]
  totalHeight: number
  pageCount: number
}

export interface ViewportState {
  scrollTop: number
  viewportHeight: number
  viewportWidth: number
  overscan: number
}

