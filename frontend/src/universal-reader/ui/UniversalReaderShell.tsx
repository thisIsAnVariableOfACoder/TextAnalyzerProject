import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReaderToolbar from './toolbar/ReaderToolbar'
import SearchPanel from './sidebar/SearchPanel'
import CanvasViewer from './viewer/CanvasViewer'
import { useUniversalReaderStore } from '../stores/universalReaderStore'
import { searchLayoutBlocks, searchAst } from '../core/search/searchEngine'

export default function UniversalReaderShell() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const {
    ast,
    layout,
    annotations,
    loading,
    parseProgress,
    parseMessage,
    parseWarnings,
    activeTool,
    zoom,
    searchQuery,
    searchResults,
    openFile,
    setViewport,
    setZoom,
    setTool,
    addAnnotation,
    removeLastAnnotation,
    clearAnnotations,
    setSearchQuery,
    setSearchResults,
  } = useUniversalReaderStore()

  const hits = useMemo(() => {
    if (!searchQuery.trim()) return []
    if (layout) return searchLayoutBlocks(layout.blocks, searchQuery)
    if (ast) return searchAst(ast, searchQuery)
    return []
  }, [layout, ast, searchQuery])

  useEffect(() => {
    setSearchResults(hits.map((hit) => hit.id))
  }, [hits, setSearchResults])

  const handleOpenClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="ur-shell-page">
      <section className="ur-hero">
        <div>
          <h1>Universal Document Reader & Editor</h1>
          <p>Unified AST + Worker parser + Canvas virtualization architecture for production-grade scaling.</p>
        </div>
        <div className="ur-hero-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleOpenClick}>
            Open Document
          </button>
        </div>
      </section>

      <input
        ref={inputRef}
        type="file"
        className="doc-reader-hidden-input"
        accept=".pdf,.docx,.doc,.rtf,.odt,.txt,.md,.json,.xml,.yaml,.yml,.csv,.log,.ini,.html,.htm"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            openFile(file)
          }
          event.target.value = ''
        }}
      />

      <ReaderToolbar
        zoom={zoom}
        activeTool={activeTool}
        loading={loading}
        parseProgress={parseProgress}
        parseMessage={parseMessage}
        onZoomIn={() => setZoom(zoom + 0.1)}
        onZoomOut={() => setZoom(zoom - 0.1)}
        onSetTool={setTool}
        onUndo={removeLastAnnotation}
        onClear={clearAnnotations}
      />

      <section className="ur-layout">
        <SearchPanel
          query={searchQuery}
          hits={hits}
          warnings={parseWarnings}
          onChangeQuery={setSearchQuery}
          onOpenFile={handleOpenClick}
        />

        <div className="ur-main">
          <CanvasViewer
            ast={ast}
            layout={layout}
            zoom={zoom}
            activeTool={activeTool}
            annotations={annotations}
            onViewportChange={setViewport}
            onAddAnnotation={addAnnotation}
          />

          {searchResults.length > 0 && (
            <div className="ur-search-footer">Indexed results: {searchResults.length}</div>
          )}
        </div>
      </section>
    </div>
  )
}

