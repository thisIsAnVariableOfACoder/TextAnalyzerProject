import { useEffect, useMemo, useRef, useState } from 'react'
import { computeVirtualSlice } from '../../rendering/virtualization/viewport'
import { renderDocumentToCanvas } from '../../rendering/canvas-renderer/canvasRenderer'
import { applyPointerTool } from '../../annotation/annotation-engine/annotationEngine'
import type { AnnotationTool } from '../../types/annotation'
import type { LayoutDocument } from '../../types/layout'
import type { DocumentAst } from '../../types/ast'

interface CanvasViewerProps {
  ast: DocumentAst | null
  layout: LayoutDocument | null
  zoom: number
  activeTool: AnnotationTool
  annotations: any[]
  onViewportChange: (value: { scrollTop: number; viewportHeight: number; viewportWidth: number }) => void
  onAddAnnotation: (annotation: any) => void
}

export default function CanvasViewer(props: CanvasViewerProps) {
  const { ast, layout, zoom, activeTool, annotations, onViewportChange, onAddAnnotation } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([])
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => {
      onViewportChange({
        scrollTop: container.scrollTop,
        viewportHeight: container.clientHeight,
        viewportWidth: container.clientWidth,
      })
    }

    update()
    container.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [onViewportChange])

  const visibleBlocks = useMemo(() => {
    if (!layout || !containerRef.current) return []
    const slice = computeVirtualSlice(layout, {
      scrollTop: containerRef.current.scrollTop,
      viewportHeight: containerRef.current.clientHeight,
      viewportWidth: containerRef.current.clientWidth,
      overscan: 600,
    })
    return layout.blocks.slice(slice.startIndex, slice.endIndex)
  }, [layout])

  useEffect(() => {
    if (!layout || !canvasRef.current || !containerRef.current) return

    renderDocumentToCanvas({
      canvas: canvasRef.current,
      visibleBlocks,
      annotations,
      totalHeight: layout.totalHeight,
      width: containerRef.current.clientWidth,
      options: { zoom, backgroundColor: '#ffffff' },
    })
  }, [layout, visibleBlocks, annotations, zoom])

  const toPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ast || !layout) return
    const p = toPoint(event)
    if (!p) return
    setDrawing(true)
    setPoints([p])
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const p = toPoint(event)
    if (!p) return
    setPoints((prev) => [...prev, p])
  }

  const onPointerUp = () => {
    if (!drawing || !ast) return
    setDrawing(false)

    const annotation = applyPointerTool({
      tool: activeTool,
      documentId: ast.id,
      pageIndex: 0,
      points,
      commentText: activeTool === 'comment' ? 'Review note' : undefined,
    })

    if (annotation) {
      onAddAnnotation(annotation)
    }
    setPoints([])
  }

  return (
    <div className="ur-viewer" ref={containerRef}>
      {!ast && (
        <div className="ur-empty">
          <h2>No file loaded</h2>
          <p>Open PDF, DOCX, TXT, Markdown and more to start reading and annotating.</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="ur-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  )
}

