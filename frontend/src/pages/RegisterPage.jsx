import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'
import './RegisterPage.css'

function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error, isAuthenticated } = useAuthStore()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [formError, setFormError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setFormError('Please fill in all fields')
      return false
    }

    if (formData.username.length < 3) {
      setFormError('Username must be at least 3 characters')
      return false
    }

    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid email')
      return false
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error(formError)
      return
    }

    try {
      await register(formData.username, formData.password, formData.email)
      toast.success('Registration successful! You can now login.')
      navigate('/login')
    } catch (err) {
      toast.error(error || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>TextAnalyzer</h1>
          <p>Create Your Account</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <h2>Sign Up</h2>

          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choose a username"
              required
              minLength="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
              required
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
              placeholder="Create a strong password"
              required
              minLength="8"
            />
            <p className="form-help">At least 8 characters</p>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
              required
              minLength="8"
            />
          </div>

          {(error || formError) && (
            <div className="alert alert-error">
              {error || formError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-register"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link">
              Login here
            </Link>
          </p>
        </div>
      </div>

      <div className="register-background"></div>
    </div>
  )
}

export default RegisterPage
