import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import './UserProfile.css'

function UserProfile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, setUser } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  })
  const [settings, setSettings] = useState({
    email_notifications: true,
    save_history: true,
    dark_mode: false,
    two_factor_enabled: false
  })
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [showPasswordForm, setShowPasswordForm] = useState(false)

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
      setSettings({
        email_notifications: user.settings?.email_notifications ?? true,
        save_history: user.settings?.save_history ?? true,
        dark_mode: user.settings?.dark_mode ?? false,
        two_factor_enabled: user.settings?.two_factor_enabled ?? false
      })
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    authAPI.getMe()
      .then((profile) => {
        setUser(profile)
        setFormData({ username: profile.username || '', email: profile.email || '' })
        setSettings({
          email_notifications: profile.settings?.email_notifications ?? true,
          save_history: profile.settings?.save_history ?? true,
          dark_mode: profile.settings?.dark_mode ?? false,
          two_factor_enabled: profile.settings?.two_factor_enabled ?? false
        })
      })
      .catch(() => {})
  }, [isAuthenticated, setUser])

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

  const handleSaveProfile = async () => {
    try {
      const profile = await authAPI.updateProfile({ email: formData.email || null })
      setUser(profile)
      setEditMode(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to update profile')
    }
  }

  const handleToggleSetting = async (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try {
      const profile = await authAPI.updateSettings({ [key]: value })
      setUser(profile)
      toast.success('Settings updated')
    } catch (error) {
      setSettings(settings)
      toast.error(error?.response?.data?.detail || 'Failed to update settings')
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please enter current and new password')
      return
    }
    try {
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordForm({ currentPassword: '', newPassword: '' })
      setShowPasswordForm(false)
      toast.success('Password changed successfully')
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to change password')
    }
  }

  const handleViewSessions = async () => {
    try {
      const data = await authAPI.getSessions()
      setSessions(data.sessions || [])
      setShowSessions(true)
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load sessions')
    }
  }

  const handleRevokeOthers = async () => {
    try {
      await authAPI.revokeOtherSessions()
      toast.success('Other sessions revoked')
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to revoke sessions')
    }
  }

  const handleDeleteAccount = async () => {
    const password = window.prompt('Confirm password to delete account permanently:')
    if (!password) return
    if (!window.confirm('Delete account permanently? This cannot be undone.')) return

    try {
      await authAPI.deleteAccount(password)
      logout()
      toast.success('Account deleted')
      navigate('/register')
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete account')
    }
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
              {(formData.username?.[0] || user?.username?.[0] || 'U').toUpperCase()}
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
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => handleToggleSetting('email_notifications', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Save Processing History</h4>
                <p>Automatically save all your processing activities</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.save_history}
                  onChange={(e) => handleToggleSetting('save_history', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Dark Mode</h4>
                <p>Use dark theme across the platform</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.dark_mode}
                  onChange={(e) => handleToggleSetting('dark_mode', e.target.checked)}
                />
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
              <button className="btn btn-outline btn-sm" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                Change
              </button>
            </div>

            {showPasswordForm && (
              <div className="security-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <input
                  type="password"
                  className="form-input"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
                <button className="btn btn-primary btn-sm" onClick={handleChangePassword}>Update Password</button>
              </div>
            )}

            <div className="security-item">
              <div className="security-info">
                <h4>Two-Factor Authentication</h4>
                <p>Add an extra layer of security</p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleToggleSetting('two_factor_enabled', !settings.two_factor_enabled)}
              >
                {settings.two_factor_enabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h4>Login Sessions</h4>
                <p>Manage your active sessions</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={handleViewSessions}>
                View
              </button>
            </div>

            {showSessions && (
              <div className="security-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                {(sessions || []).map((s) => (
                  <div key={s.id} className="metadata">
                    <span>{s.device} • {s.current ? 'Current session' : 'Active'}</span>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" onClick={handleRevokeOthers}>Revoke Other Sessions</button>
              </div>
            )}
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
              <button className="btn btn-danger" onClick={handleDeleteAccount}>
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
