import './LoadingSpinner.css'

function LoadingSpinner({ size = 'md', text = 'Loading...', fullscreen = false }) {
  const sizeMap = {
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64
  }

  const spinnerSize = sizeMap[size] || sizeMap.md

  if (fullscreen) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner-container">
          <div
            className="spinner"
            style={{ width: spinnerSize, height: spinnerSize }}
          ></div>
          {text && <p className="spinner-text">{text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="spinner-wrapper">
      <div
        className="spinner"
        style={{ width: spinnerSize, height: spinnerSize }}
      ></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  )
}

export default LoadingSpinner
