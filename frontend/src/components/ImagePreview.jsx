import './ImagePreview.css'

function ImagePreview({ imageSrc, fileName = 'Preview', onClose }) {
  return (
    <div className="image-preview">
      <div className="preview-header">
        <h4>Image Preview</h4>
        <p className="preview-filename">{fileName}</p>
        {onClose && (
          <button className="preview-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="preview-container">
        <img
          src={imageSrc}
          alt="Preview"
          className="preview-image"
        />
      </div>

      <div className="preview-info">
        <p>Image ready for text extraction</p>
      </div>
    </div>
  )
}

export default ImagePreview
