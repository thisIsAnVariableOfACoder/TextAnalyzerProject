import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'
import './UserProfile.css'

function UserProfile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || ''
      })
    }
  }, [isAuthenticated, user, navigate])

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = () => {
    // TODO: Implement profile update API call
    toast.success('Profile updated successfully')
    setEditMode(false)
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h1>My Account</h1>
        <p>Manage your profile and preferences</p>
      </div>

      <div className="profile-content">
        {/* Profile Card */}
        <section className="profile-card">
          <div className="card-header">
            <h2>Profile Information</h2>
            <button
              className={`btn btn-sm ${editMode ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          <div className="profile-avatar">
            <div className="avatar-circle">
              {formData.username?.[0].toUpperCase()}
            </div>
          </div>

          {editMode ? (
            <form className="profile-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  className="form-input"
                  disabled
                />
                <p className="form-help">Username cannot be changed</p>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProfile}
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-item">
                <label>Username</label>
                <p>{formData.username}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{formData.email || 'Not set'}</p>
              </div>
              {user?.created_at && (
                <div className="info-item">
                  <label>Member Since</label>
                  <p>{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="profile-card">
          <div className="card-header">
            <h2>Settings & Preferences</h2>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive updates about new features</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Save Processing History</h4>
                <p>Automatically save all your processing activities</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Dark Mode</h4>
                <p>Use dark theme across the platform</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Account Security */}
        <section className="profile-card">
          <div className="card-header">
            <h2>Account Security</h2>
          </div>

          <div className="security-list">
            <div className="security-item">
              <div className="security-info">
                <h4>Change Password</h4>
                <p>Update your password to keep account secure</p>
              </div>
              <button className="btn btn-outline btn-sm">
                Change
              </button>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h4>Two-Factor Authentication</h4>
                <p>Add an extra layer of security</p>
              </div>
              <button className="btn btn-outline btn-sm">
                Enable
              </button>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h4>Login Sessions</h4>
                <p>Manage your active sessions</p>
              </div>
              <button className="btn btn-outline btn-sm">
                View
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="profile-card danger-zone">
          <div className="card-header">
            <h2>Danger Zone</h2>
          </div>

          <div className="danger-list">
            <div className="danger-item">
              <div className="danger-info">
                <h4>Logout</h4>
                <p>Sign out from this account</p>
              </div>
              <button
                className="btn btn-outline"
                style={{ borderColor: 'var(--dark-gray)', color: 'var(--dark-gray)' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

            <div className="danger-item">
              <div className="danger-info">
                <h4>Delete Account</h4>
                <p>Permanently delete your account and all data</p>
              </div>
              <button className="btn btn-danger">
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default UserProfile
