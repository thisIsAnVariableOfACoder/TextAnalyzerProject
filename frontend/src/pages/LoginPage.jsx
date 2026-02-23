import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, isAuthenticated } = useAuthStore()
  const [formData, setFormData] = useState({ username: '', password: '' })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await login(formData.username, formData.password)
      toast.success('Login successful!')
      navigate('/')
    } catch (err) {
      toast.error(error || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>TextAnalyzer</h1>
          <p>Professional Text Processing & Analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Login to Your Account</h2>

          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your username"
              required
              minLength="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
              minLength="8"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-login"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      <div className="login-background"></div>
    </div>
  )
}

export default LoginPage
