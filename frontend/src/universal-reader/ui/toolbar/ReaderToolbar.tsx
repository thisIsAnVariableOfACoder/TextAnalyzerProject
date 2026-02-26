import type { AnnotationTool } from '../../types/annotation'

interface ReaderToolbarProps {
  zoom: number
  activeTool: AnnotationTool
  loading: boolean
  parseProgress: number
  parseMessage: string
  onZoomIn: () => void
  onZoomOut: () => void
  onSetTool: (tool: AnnotationTool) => void
  onUndo: () => void
  onClear: () => void
}

export default function ReaderToolbar(props: ReaderToolbarProps) {
  const {
    zoom,
    activeTool,
    loading,
    parseProgress,
    parseMessage,
    onZoomIn,
    onZoomOut,
    onSetTool,
    onUndo,
    onClear,
  } = props

  return (
    <div className="ur-toolbar">
      <div className="ur-toolbar-group">
        <button className="btn btn-sm btn-secondary" onClick={onZoomOut}>
          -
        </button>
        <span className="ur-toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-sm btn-secondary" onClick={onZoomIn}>
          +
        </button>
      </div>

      <div className="ur-toolbar-group">
        <button className={`btn btn-sm ${activeTool === 'highlight' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onSetTool('highlight')}>
          Highlight
        </button>
        <button className={`btn btn-sm ${activeTool === 'pen' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onSetTool('pen')}>
          Pen
        </button>
        <button className={`btn btn-sm ${activeTool === 'comment' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onSetTool('comment')}>
          Comment
        </button>
      </div>

      <div className="ur-toolbar-group">
        <button className="btn btn-sm btn-secondary" onClick={onUndo}>
          Undo
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="ur-toolbar-progress">
        {loading ? (
          <>
            <span>{parseMessage || 'Parsing...'}</span>
            <progress max={100} value={parseProgress} />
          </>
        ) : (
          <span>Ready</span>
        )}
      </div>
    </div>
  )
}

