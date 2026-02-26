import type { LayoutBlock } from '../../types/layout'
import type { Annotation } from '../../types/annotation'

interface RenderOptions {
  zoom: number
  backgroundColor?: string
}

function drawBlock(ctx: CanvasRenderingContext2D, block: LayoutBlock, zoom: number): void {
  const x = block.x * zoom
  const y = block.y * zoom

  if (block.kind === 'code') {
    ctx.save()
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(x - 8, y - 6, block.width * zoom + 16, block.height * zoom + 12)
    ctx.restore()
  }

  ctx.save()
  ctx.fillStyle = block.color || '#0f172a'
  ctx.font = `${block.fontWeight || 400} ${Math.max(10, block.fontSize * zoom)}px Inter, system-ui, sans-serif`
  ctx.textBaseline = 'top'

  for (const line of block.lines) {
    ctx.fillText(line.text, x, y + line.yOffset * zoom)
  }

  ctx.restore()
}

function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: Annotation, zoom: number): void {
  if (annotation.type === 'highlight') {
    ctx.save()
    ctx.fillStyle = annotation.color || 'rgba(251,191,36,0.36)'
    for (const rect of annotation.rects) {
      ctx.fillRect(rect.x * zoom, rect.y * zoom, rect.width * zoom, rect.height * zoom)
    }
    ctx.restore()
    return
  }

  if (annotation.type === 'pen') {
    if (annotation.points.length < 2) return
    ctx.save()
    ctx.strokeStyle = annotation.color || '#2563eb'
    ctx.lineWidth = Math.max(1, annotation.strokeWidth * zoom)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(annotation.points[0].x * zoom, annotation.points[0].y * zoom)
    for (let i = 1; i < annotation.points.length; i += 1) {
      ctx.lineTo(annotation.points[i].x * zoom, annotation.points[i].y * zoom)
    }
    ctx.stroke()
    ctx.restore()
    return
  }

  if (annotation.type === 'comment') {
    ctx.save()
    const x = annotation.position.x * zoom
    const y = annotation.position.y * zoom
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.font = `${Math.max(10, 11 * zoom)}px Inter, system-ui, sans-serif`
    ctx.fillText(annotation.text.slice(0, 32), x + 10, y - 8)
    ctx.restore()
  }
}

export function renderDocumentToCanvas(params: {
  canvas: HTMLCanvasElement
  visibleBlocks: LayoutBlock[]
  annotations: Annotation[]
  totalHeight: number
  width: number
  options: RenderOptions
}): void {
  const { canvas, visibleBlocks, annotations, totalHeight, width, options } = params
  const zoom = options.zoom
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
  const cssWidth = Math.floor(width)
  const cssHeight = Math.max(1, Math.floor(totalHeight * zoom))

  canvas.width = Math.floor(cssWidth * pixelRatio)
  canvas.height = Math.floor(cssHeight * pixelRatio)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)

  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(0, 0, cssWidth, cssHeight)
  }

  for (const block of visibleBlocks) {
    drawBlock(ctx, block, zoom)
  }

  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation, zoom)
  }
}

