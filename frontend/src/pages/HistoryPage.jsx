import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useHistoryStore from '../stores/historyStore'
import toast from 'react-hot-toast'
import './HistoryPage.css'

function HistoryPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const {
    history,
    currentPage,
    pageSize,
    setCurrentPage,
    removeFromHistory,
    clearHistory,
    getPaginatedHistory,
    fetchHistory
  } = useHistoryStore()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    fetchHistory().catch((error) => {
      toast.error(error?.response?.data?.detail || 'Failed to load history')
    })
  }, [isAuthenticated, navigate, fetchHistory])

  const { items, total, hasMore } = getPaginatedHistory()
  const totalPages = Math.ceil(total / pageSize)

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await removeFromHistory(id)
        toast.success('History item deleted')
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Delete failed')
      }
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all history? This cannot be undone.')) {
      try {
        await clearHistory()
        toast.success('All history cleared')
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Clear history failed')
      }
    }
  }

  if (history.length === 0) {
    return (
      <div className="history-page">
        <div className="history-header">
          <h1>Processing History</h1>
          <p>Your text processing history will appear here</p>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No Processing History Yet</h2>
          <p>Start processing text and your history will appear here</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/editor')}
          >
            Go to Editor
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Processing History</h1>
        <p>View and manage your past processing activities</p>
      </div>

      <div className="history-controls">
        <div className="stats">
          <span className="stat-item">Total Items: <strong>{total}</strong></span>
        </div>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleClearAll}
        >
          Clear All History
        </button>
      </div>

      <div className="history-list">
        {items.map(item => (
          <div key={item.id} className="history-item">
            <div className="item-header">
              <span className={`type-badge type-${item.type}`}>
                {item.type.toUpperCase()}
              </span>
              <span className="item-date">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>

            <div className="item-body">
              <div className="text-preview">
                <p className="label">Input:</p>
                <p className="text">{item.input_text.substring(0, 100)}...</p>
              </div>

              {item.output_text && (
                <div className="text-preview">
                  <p className="label">Output:</p>
                  <p className="text">{item.output_text.substring(0, 100)}...</p>
                </div>
              )}

              {item.input_language && (
                <div className="metadata">
                  <span>{item.input_language} → {item.output_language}</span>
                </div>
              )}
            </div>

            <div className="item-actions">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => navigate(`/editor?history=${item.id}`)}
              >
                View
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Previous
          </button>

          <span className="page-info">
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            className="btn btn-sm"
            disabled={!hasMore}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default HistoryPage
