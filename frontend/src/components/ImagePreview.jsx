import './ImagePreview.css'

function ImagePreview({ imageSrc, fileName, onClose }) {
  if (!imageSrc) return null

  return (
    <div className="image-preview">
      <div className="image-preview-header">
        <div className="image-preview-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="image-preview-name">{fileName || 'Image Preview'}</span>
        </div>
        <button
          className="image-preview-close"
          onClick={onClose}
          title="Remove image"
          aria-label="Close preview"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="image-preview-body">
        <img
          src={imageSrc}
          alt={fileName || 'Uploaded image'}
          className="preview-image"
        />
      </div>
    </div>
  )
}

export default ImagePreview
