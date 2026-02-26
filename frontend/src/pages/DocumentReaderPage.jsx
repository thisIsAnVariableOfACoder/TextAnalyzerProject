import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import useAuthStore from '../stores/authStore'
import { formatFileSize, readDocumentFile } from '../services/documentReader'
import './DocumentReaderPage.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const ACCEPTED_FILES = '.pdf,.docx,.doc,.txt,.md,.csv,.log,.rtf'

const TOOL = {
  SELECT: 'select',
  HAND: 'hand',
  HIGHLIGHT: 'highlight',
  DRAW: 'draw',
  ERASE: 'erase',
}

const PDF_BOOKMARK_STORAGE_PREFIX = 'textanalyzer:pdf-bookmarks:'

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeInlineHtml(raw) {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildBookmarkStorageKey(meta, isPdf) {
  if (!isPdf || !meta) return null
  const fileName = meta.fileName || 'unknown'
  const fileSize = meta.fileSize || 0
  return `${PDF_BOOKMARK_STORAGE_PREFIX}${fileName}:${fileSize}`
}

function isTypingTarget(target) {
  const el = target
  if (!el || typeof el !== 'object') return false
  const tag = String(el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

function normalizeOutlineTitle(input) {
  return (input || '').trim() || 'Untitled section'
}

async function resolveOutlineDestinationPage(pdfDocument, destination) {
  try {
    if (!destination) return null
    const destArray = typeof destination === 'string'
      ? await pdfDocument.getDestination(destination)
      : destination

    if (!Array.isArray(destArray) || destArray.length === 0) return null
    const reference = destArray[0]

    if (typeof reference === 'number') {
      return reference + 1
    }

    const pageIndex = await pdfDocument.getPageIndex(reference)
    return Number.isFinite(pageIndex) ? pageIndex + 1 : null
  } catch {
    return null
  }
}

async function flattenPdfOutline(pdfDocument, items, depth = 0, output = []) {
  for (const item of items || []) {
    const page = await resolveOutlineDestinationPage(pdfDocument, item?.dest)
    if (page) {
      output.push({
        id: `${depth}-${page}-${normalizeOutlineTitle(item?.title)}`,
        title: normalizeOutlineTitle(item?.title),
        page,
        depth,
      })
    }

    if (Array.isArray(item?.items) && item.items.length > 0) {
      await flattenPdfOutline(pdfDocument, item.items, depth + 1, output)
    }
  }

  return output
}

function DocumentReaderPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const fileInputRef = useRef(null)
  const pdfStageRef = useRef(null)
  const pdfCanvasRef = useRef(null)
  const annoCanvasRef = useRef(null)
  const docxStageRef = useRef(null)

  const [documentData, setDocumentData] = useState(null)
  const [openError, setOpenError] = useState('')
  const [query, setQuery] = useState('')
  const [fontSize, setFontSize] = useState(17)
  const [lineHeight, setLineHeight] = useState(1.8)

  const [pdfDoc, setPdfDoc] = useState(null)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState(0)
  const [pdfZoom, setPdfZoom] = useState(1.15)
  const [activeTool, setActiveTool] = useState(TOOL.SELECT)
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)
  const [showFullscreenBookmarks, setShowFullscreenBookmarks] = useState(false)
  const [pdfOutlineItems, setPdfOutlineItems] = useState([])
  const [userBookmarks, setUserBookmarks] = useState([])
  const [docxRenderError, setDocxRenderError] = useState('')

  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPath, setDrawPath] = useState([])
  const [annotationsByPage, setAnnotationsByPage] = useState({})

  const pdfBookmarkStorageKey = useMemo(
    () => buildBookmarkStorageKey(documentData?.meta, documentData?.mode === 'pdf'),
    [documentData?.meta, documentData?.mode]
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => {
      if (documentData?.objectUrl) {
        URL.revokeObjectURL(documentData.objectUrl)
      }
    }
  }, [documentData?.objectUrl])

  useEffect(() => {
    if (!documentData || documentData.mode !== 'pdf' || !documentData.pdfBuffer) {
      setPdfDoc(null)
      setPdfPage(1)
      setPdfTotalPages(0)
      setPdfOutlineItems([])
      return
    }

    let alive = true

    const loadPdf = async () => {
      try {
        const data = documentData.pdfBuffer instanceof Uint8Array
          ? documentData.pdfBuffer
          : new Uint8Array(documentData.pdfBuffer)
        const loaded = await pdfjsLib.getDocument({ data }).promise
        if (!alive) return

        const outline = await loaded.getOutline()
        const flattenedOutline = await flattenPdfOutline(loaded, outline || [])
        if (!alive) return

        setPdfDoc(loaded)
        setPdfTotalPages(loaded.numPages || 0)
        setPdfPage(1)
        setPdfOutlineItems(flattenedOutline)
        setOpenError('')
      } catch {
        setOpenError('Unable to render this PDF in canvas mode. Falling back to embedded viewer.')
        setPdfOutlineItems([])
        toast.error('Failed to open PDF file')
      }
    }

    loadPdf()

    return () => {
      alive = false
    }
  }, [documentData])

  useEffect(() => {
    if (!documentData || documentData.mode !== 'docx' || !documentData.docxBuffer || !docxStageRef.current) {
      setDocxRenderError('')
      return
    }

    let active = true

    const renderDocx = async () => {
      try {
        const container = docxStageRef.current
        if (!container) return
        container.innerHTML = ''

        const { renderAsync } = await import('docx-preview')
        if (!active) return

        const buffer = documentData.docxBuffer instanceof ArrayBuffer
          ? documentData.docxBuffer
          : documentData.docxBuffer.buffer

        await renderAsync(buffer, container, undefined, {
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: false,
          ignoreWidth: false,
          ignoreHeight: false,
          className: 'docx-native-provider',
        })

        if (!active) return
        setDocxRenderError('')
      } catch {
        if (!active) return
        setDocxRenderError('Cannot render DOCX with local provider. Upload to public URL if you need Word Online provider parity.')
      }
    }

    renderDocx()

    return () => {
      active = false
    }
  }, [documentData])

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || documentData?.mode !== 'pdf') return

    let cancelled = false

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pdfPage)
        if (cancelled) return

        const viewport = page.getViewport({ scale: pdfZoom })
        const canvas = pdfCanvasRef.current
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const annoCanvas = annoCanvasRef.current
        if (annoCanvas) {
          annoCanvas.width = viewport.width
          annoCanvas.height = viewport.height
          annoCanvas.style.width = `${viewport.width}px`
          annoCanvas.style.height = `${viewport.height}px`
        }

        await page.render({ canvasContext: context, viewport }).promise
        if (cancelled) return

        redrawAnnotationCanvas()
      } catch {
        toast.error('Cannot render this PDF page')
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [pdfDoc, pdfPage, pdfZoom, documentData?.mode, annotationsByPage])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentPdfStageFullscreen = document.fullscreenElement === pdfStageRef.current
      setIsPdfFullscreen(isCurrentPdfStageFullscreen)
      if (!isCurrentPdfStageFullscreen) {
        setShowFullscreenBookmarks(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!pdfBookmarkStorageKey) {
      setUserBookmarks([])
      return
    }

    try {
      const raw = localStorage.getItem(pdfBookmarkStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setUserBookmarks(Array.isArray(parsed) ? parsed : [])
    } catch {
      setUserBookmarks([])
    }
  }, [pdfBookmarkStorageKey])

  useEffect(() => {
    if (!pdfBookmarkStorageKey) return
    try {
      localStorage.setItem(pdfBookmarkStorageKey, JSON.stringify(userBookmarks))
    } catch {
      // Ignore persistence failure in private mode/storage-restricted browsers
    }
  }, [pdfBookmarkStorageKey, userBookmarks])

  useEffect(() => {
    if (!pdfDoc || documentData?.mode !== 'pdf' || openError) return

    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        setPdfPage((page) => Math.min(pdfTotalPages || 1, page + 1))
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        setPdfPage((page) => Math.max(1, page - 1))
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        setPdfPage(1)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        setPdfPage(pdfTotalPages || 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [pdfDoc, pdfTotalPages, documentData?.mode, openError])

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const loaded = await readDocumentFile(file)

      if (documentData?.objectUrl) {
        URL.revokeObjectURL(documentData.objectUrl)
      }

      setDocumentData(loaded)
      setOpenError('')
      setQuery('')
      setAnnotationsByPage({})
      setActiveTool(loaded.mode === 'pdf' ? TOOL.HAND : TOOL.SELECT)
      setPdfZoom(1.15)
      setDocxRenderError('')
      toast.success(`Opened ${file.name}`)
    } catch (error) {
      toast.error(error?.message || 'Could not open this file')
    } finally {
      event.target.value = ''
    }
  }

  const handleCloseFile = () => {
    if (documentData?.objectUrl) {
      URL.revokeObjectURL(documentData.objectUrl)
    }

    setDocumentData(null)
    setOpenError('')
    setQuery('')
    setAnnotationsByPage({})
    setPdfDoc(null)
    setPdfPage(1)
    setPdfTotalPages(0)
    setPdfZoom(1.15)
    setActiveTool(TOOL.SELECT)
    setPdfOutlineItems([])
    setUserBookmarks([])
    setIsPdfFullscreen(false)
    setShowFullscreenBookmarks(false)
    setDocxRenderError('')
  }

  const handlePdfFullscreen = async () => {
    const target = pdfStageRef.current
    if (!target) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await target.requestFullscreen()
      }
    } catch {
      toast.error('Fullscreen is not available in this browser')
    }
  }

  const renderedTextHtml = useMemo(() => {
    if (!documentData?.text) return ''

    let html = sanitizeInlineHtml(documentData.text)
    const tokens = [query.trim()]
      .map((token) => token.trim())
      .filter((token, idx, arr) => token.length > 0 && arr.indexOf(token) === idx)
      .sort((a, b) => b.length - a.length)

    for (const token of tokens) {
      const safe = escapeRegExp(sanitizeInlineHtml(token))
      if (!safe) continue
      const regex = new RegExp(`(${safe})`, 'gi')
      html = html.replace(regex, '<mark class="reader-mark">$1</mark>')
    }

    return html.replace(/\n/g, '<br/>')
  }, [documentData?.text, query])

  const statItems = useMemo(() => {
    if (!documentData?.meta) return []
    return [
      { label: 'File', value: documentData.meta.fileName },
      { label: 'Size', value: formatFileSize(documentData.meta.fileSize) },
      { label: 'Words', value: documentData.meta.words.toLocaleString() },
      { label: 'Chars', value: documentData.meta.characters.toLocaleString() },
      { label: 'Pages', value: documentData.mode === 'pdf' ? String(pdfTotalPages || documentData.meta.pageCount || '—') : (documentData.meta.pageCount ? String(documentData.meta.pageCount) : '—') },
      { label: 'Type', value: (documentData.extension || '').toUpperCase() },
    ]
  }, [documentData, pdfTotalPages])

  const getCanvasPointer = (event) => {
    const canvas = annoCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const redrawAnnotationCanvas = () => {
    const canvas = annoCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const pageItems = annotationsByPage[pdfPage] || []
    for (const item of pageItems) {
      if (item.type === TOOL.DRAW) {
        if (!item.points || item.points.length < 2) continue
        ctx.save()
        ctx.strokeStyle = '#2563EB'
        ctx.lineWidth = 2.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(item.points[0].x, item.points[0].y)
        for (let i = 1; i < item.points.length; i += 1) {
          ctx.lineTo(item.points[i].x, item.points[i].y)
        }
        ctx.stroke()
        ctx.restore()
      }

      if (item.type === TOOL.HIGHLIGHT) {
        const { x, y, w, h } = item.rect
        ctx.save()
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)'
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)'
        ctx.lineWidth = 1
        ctx.fillRect(x, y, w, h)
        ctx.strokeRect(x, y, w, h)
        ctx.restore()
      }
    }

    if (drawPath.length > 1 && activeTool === TOOL.DRAW) {
      ctx.save()
      ctx.strokeStyle = '#1D4ED8'
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(drawPath[0].x, drawPath[0].y)
      for (let i = 1; i < drawPath.length; i += 1) {
        ctx.lineTo(drawPath[i].x, drawPath[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  const pushAnnotation = (item) => {
    setAnnotationsByPage((prev) => {
      const pageItems = prev[pdfPage] || []
      return {
        ...prev,
        [pdfPage]: [...pageItems, item],
      }
    })
  }

  const handlePdfPointerDown = (event) => {
    if (!documentData || documentData.mode !== 'pdf') return

    const point = getCanvasPointer(event)
    if (!point) return

    if (activeTool === TOOL.DRAW) {
      setIsDrawing(true)
      setDrawPath([point])
      return
    }

    if (activeTool === TOOL.HIGHLIGHT) {
      setIsDrawing(true)
      setDrawPath([point])
      return
    }
  }

  const handlePdfPointerMove = (event) => {
    if (!isDrawing || documentData?.mode !== 'pdf') return
    const point = getCanvasPointer(event)
    if (!point) return
    setDrawPath((prev) => [...prev, point])
  }

  const handlePdfPointerUp = () => {
    if (!isDrawing || documentData?.mode !== 'pdf') return

    if (activeTool === TOOL.DRAW && drawPath.length > 1) {
      pushAnnotation({ type: TOOL.DRAW, points: drawPath })
    }

    if (activeTool === TOOL.HIGHLIGHT && drawPath.length > 1) {
      const xs = drawPath.map((p) => p.x)
      const ys = drawPath.map((p) => p.y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      const w = Math.max(20, Math.max(...xs) - x)
      const h = Math.max(14, Math.max(...ys) - y)
      pushAnnotation({ type: TOOL.HIGHLIGHT, rect: { x, y, w, h } })
    }

    setDrawPath([])
    setIsDrawing(false)
  }

  const eraseLast = () => {
    setAnnotationsByPage((prev) => {
      const pageItems = prev[pdfPage] || []
      return {
        ...prev,
        [pdfPage]: pageItems.slice(0, -1),
      }
    })
  }

  const clearPageAnnotations = () => {
    setAnnotationsByPage((prev) => ({
      ...prev,
      [pdfPage]: [],
    }))
  }

  const clearAllAnnotations = () => {
    setAnnotationsByPage({})
  }

  const goToPage = (targetPage) => {
    const safe = Math.max(1, Math.min(pdfTotalPages || 1, targetPage))
    setPdfPage(safe)
  }

  const goPrevPage = () => goToPage(pdfPage - 1)
  const goNextPage = () => goToPage(pdfPage + 1)

  const addCurrentPageBookmark = () => {
    if (!pdfDoc || documentData?.mode !== 'pdf') return

    const existing = userBookmarks.some((item) => item.page === pdfPage)
    if (existing) {
      toast('Bookmark already exists for this page')
      return
    }

    const bookmark = {
      id: `user-bookmark-${Date.now()}-${pdfPage}`,
      page: pdfPage,
      title: `Page ${pdfPage}`,
    }

    setUserBookmarks((prev) => [...prev, bookmark].sort((a, b) => a.page - b.page))
    toast.success(`Bookmarked page ${pdfPage}`)
  }

  const removeUserBookmark = (bookmarkId) => {
    setUserBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId))
  }

  return (
    <div className="doc-reader-page">
      <section className="doc-reader-hero">
        <div>
          <h1>Universal Reader Pro</h1>
          <p>Universal Reader workspace with provider-based native rendering for PDF, Word, and text documents.</p>
        </div>
        <div className="doc-reader-hero-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
            <button className="btn btn-primary" onClick={handleOpenFileDialog}>
              Open Document
            </button>
            {documentData && (
              <button className="btn btn-ghost" onClick={handleCloseFile}>
                Close File
              </button>
            )}
          </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILES}
        className="doc-reader-hidden-input"
        onChange={handleFileSelection}
      />

      <section className="doc-reader-layout">
        <aside className="doc-reader-sidebar">
          <div className="doc-card">
            <h3>Reader Controls</h3>
            <button className="btn btn-primary btn-sm btn-full" onClick={handleOpenFileDialog}>
              Open File
            </button>
            {documentData && (
              <button className="btn btn-ghost btn-sm btn-full" onClick={handleCloseFile}>
                Close Current File
              </button>
            )}
            {documentData?.mode === 'pdf' && (
              <button className="btn btn-outline btn-sm btn-full" onClick={handlePdfFullscreen}>
                Fullscreen PDF
              </button>
            )}
          </div>

          {documentData?.mode !== 'pdf' && (
            <>
              <div className="doc-card">
                <h3>Text Tools</h3>
                <label className="doc-field">
                  <span>Search</span>
                  <input
                    type="text"
                    placeholder="Find in document..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <label className="doc-field">
                  <span>Font size: {fontSize}px</span>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  />
                </label>

                <label className="doc-field">
                  <span>Line spacing: {lineHeight.toFixed(1)}</span>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                  />
                </label>
              </div>

            </>
          )}

          {documentData?.mode === 'pdf' && (
            <div className="doc-card">
              <h3>PDF Annotations</h3>
              <p className="doc-muted">Use toolbar tools to draw/highlight like a normal PDF reader.</p>
              <button className="btn btn-secondary btn-sm btn-full" onClick={eraseLast}>Erase Last</button>
              <button className="btn btn-ghost btn-sm btn-full" onClick={clearPageAnnotations}>Clear Page</button>
              <button className="btn btn-ghost btn-sm btn-full" onClick={clearAllAnnotations}>Clear All Pages</button>
            </div>
          )}
        </aside>

        <main className="doc-reader-main">
          {!documentData && (
            <div className="doc-empty-state">
              <h2>No document opened</h2>
              <p>Choose a file to start reading in a dedicated professional viewer.</p>
              <button className="btn btn-primary" onClick={handleOpenFileDialog}>Open first document</button>
            </div>
          )}

          {documentData && (
            <>
              <div className="doc-metadata-grid">
                {statItems.map((item) => (
                  <div key={item.label} className="doc-metadata-item">
                    <span>{item.label}</span>
                    <strong title={item.value}>{item.value}</strong>
                  </div>
                ))}
              </div>

              {documentData?.provider?.label && (
                <div className="doc-provider-banner">
                  <strong>Rendering Provider:</strong> {documentData.provider.label}
                  {documentData.provider?.fallback && (
                    <span> · Fallback: {documentData.provider.fallback}</span>
                  )}
                </div>
              )}

              {documentData.mode === 'pdf' && !openError && (
                <div className="pdf-toolbar">
                  <div className="pdf-toolbar-group">
                    {[TOOL.HAND, TOOL.SELECT, TOOL.HIGHLIGHT, TOOL.DRAW, TOOL.ERASE].map((tool) => (
                      <button
                        key={tool}
                        className={`pdf-tool-btn ${activeTool === tool ? 'pdf-tool-btn-active' : ''}`}
                        onClick={() => {
                          if (tool === TOOL.ERASE) {
                            eraseLast()
                            return
                          }
                          setActiveTool(tool)
                        }}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>

                  <div className="pdf-toolbar-group">
                    <button className="pdf-tool-btn" onClick={() => setPdfZoom((z) => Math.max(0.6, z - 0.1))}>-</button>
                    <span className="pdf-zoom-label">{Math.round(pdfZoom * 100)}%</span>
                    <button className="pdf-tool-btn" onClick={() => setPdfZoom((z) => Math.min(2.5, z + 0.1))}>+</button>
                  </div>

                  <div className="pdf-toolbar-group">
                    <button className="pdf-tool-btn" onClick={goPrevPage} disabled={pdfPage <= 1}>Prev</button>
                    <span className="pdf-page-label">{pdfPage} / {pdfTotalPages || 1}</span>
                    <button className="pdf-tool-btn" onClick={goNextPage} disabled={pdfPage >= (pdfTotalPages || 1)}>Next</button>
                    <button className="pdf-tool-btn" onClick={addCurrentPageBookmark}>Bookmark Page</button>
                  </div>

                  <div className="pdf-toolbar-group">
                    <button className="pdf-tool-btn pdf-tool-btn-primary" onClick={handlePdfFullscreen}>Fullscreen PDF</button>
                  </div>
                </div>
              )}

              {documentData.mode === 'pdf' && !openError && (
                <div className="pdf-stage-shell">
                  <div
                    className={`pdf-stage ${activeTool === TOOL.HAND ? 'pdf-stage-hand' : ''}`}
                    ref={pdfStageRef}
                    onPointerDown={handlePdfPointerDown}
                    onPointerMove={handlePdfPointerMove}
                    onPointerUp={handlePdfPointerUp}
                    onPointerLeave={handlePdfPointerUp}
                  >
                    <canvas ref={pdfCanvasRef} className="pdf-canvas" />
                    <canvas ref={annoCanvasRef} className="pdf-annotation-layer" />

                    {isPdfFullscreen && (
                      <>
                        <button
                          className="pdf-overlay-bookmark-toggle"
                          onClick={() => setShowFullscreenBookmarks((prev) => !prev)}
                          aria-label="Toggle bookmarks"
                        >
                          ☰ Bookmarks
                        </button>

                        <button
                          className="pdf-overlay-nav pdf-overlay-nav-left"
                          onClick={goPrevPage}
                          disabled={pdfPage <= 1}
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                        <button
                          className="pdf-overlay-nav pdf-overlay-nav-right"
                          onClick={goNextPage}
                          disabled={pdfPage >= (pdfTotalPages || 1)}
                          aria-label="Next page"
                        >
                          ›
                        </button>
                        <div className="pdf-fullscreen-page-indicator">Page {pdfPage} / {pdfTotalPages || 1}</div>

                        {showFullscreenBookmarks && (
                          <div className="pdf-fullscreen-bookmarks-panel">
                            <h4>PDF Bookmarks</h4>

                            {userBookmarks.length > 0 && (
                              <div className="pdf-fullscreen-bookmark-group">
                                <p>My bookmarks</p>
                                {userBookmarks.map((bookmark) => (
                                  <button
                                    key={`fs-${bookmark.id}`}
                                    className="pdf-fullscreen-bookmark-link"
                                    onClick={() => {
                                      goToPage(bookmark.page)
                                      setShowFullscreenBookmarks(false)
                                    }}
                                  >
                                    ★ {bookmark.title}
                                  </button>
                                ))}
                              </div>
                            )}

                            {pdfOutlineItems.length > 0 && (
                              <div className="pdf-fullscreen-bookmark-group">
                                <p>Document outline</p>
                                {pdfOutlineItems.map((outline) => (
                                  <button
                                    key={`fs-outline-${outline.id}`}
                                    className="pdf-fullscreen-bookmark-link"
                                    style={{ paddingLeft: `${10 + outline.depth * 12}px` }}
                                    onClick={() => {
                                      goToPage(outline.page)
                                      setShowFullscreenBookmarks(false)
                                    }}
                                  >
                                    {outline.title} · p.{outline.page}
                                  </button>
                                ))}
                              </div>
                            )}

                            {userBookmarks.length === 0 && pdfOutlineItems.length === 0 && (
                              <p className="pdf-fullscreen-bookmark-empty">No bookmark available in this PDF.</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {documentData.mode === 'pdf' && openError && (
                <div className="doc-embed-wrap">
                  <div className="doc-embed-notice">{openError}</div>
                  <iframe
                    src={documentData.objectUrl}
                    title="Embedded PDF viewer"
                    className="doc-embed-viewer"
                  />
                </div>
              )}

              {documentData.mode === 'embedded' && (
                <div className="doc-embed-wrap">
                  {documentData?.providerNote && (
                    <div className="doc-embed-notice">{documentData.providerNote}</div>
                  )}
                  <iframe
                    src={documentData.objectUrl}
                    title="Embedded document viewer"
                    className="doc-embed-viewer"
                  />
                </div>
              )}

              {documentData.mode === 'docx' && (
                <div className="docx-stage-shell">
                  {docxRenderError && <div className="doc-embed-notice">{docxRenderError}</div>}
                  <div ref={docxStageRef} className="docx-native-stage" />
                </div>
              )}

              {documentData.mode !== 'pdf' && documentData.mode !== 'embedded' && documentData.mode !== 'docx' && (
                <article
                  className="doc-text-content"
                  style={{ fontSize: `${fontSize}px`, lineHeight }}
                  dangerouslySetInnerHTML={{ __html: renderedTextHtml }}
                />
              )}

              {documentData.mode === 'pdf' && (
                <section className="doc-pdf-bookmarks-panel">
                  <div className="doc-card">
                    <h3>PDF Bookmarks</h3>
                    <button className="btn btn-primary btn-sm btn-full" onClick={addCurrentPageBookmark}>Add Current Page</button>

                    {userBookmarks.length > 0 && (
                      <div className="pdf-bookmark-list">
                        <p className="doc-muted">My bookmarks</p>
                        {userBookmarks.map((bookmark) => (
                          <div key={bookmark.id} className="pdf-bookmark-row">
                            <button className="pdf-bookmark-link" onClick={() => goToPage(bookmark.page)}>
                              ★ {bookmark.title}
                            </button>
                            <button
                              className="pdf-bookmark-remove"
                              onClick={() => removeUserBookmark(bookmark.id)}
                              aria-label={`Remove bookmark ${bookmark.title}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pdfOutlineItems.length > 0 && (
                      <div className="pdf-bookmark-list">
                        <p className="doc-muted">Document outline</p>
                        {pdfOutlineItems.map((outline) => (
                          <button
                            key={outline.id}
                            className="pdf-bookmark-link pdf-outline-link"
                            style={{ paddingLeft: `${10 + outline.depth * 14}px` }}
                            onClick={() => goToPage(outline.page)}
                          >
                            {outline.title} · p.{outline.page}
                          </button>
                        ))}
                      </div>
                    )}

                    {userBookmarks.length === 0 && pdfOutlineItems.length === 0 && (
                      <p className="doc-muted">No bookmark found in this PDF. You can create your own bookmarks.</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </section>
    </div>
  )
}

export default DocumentReaderPage

