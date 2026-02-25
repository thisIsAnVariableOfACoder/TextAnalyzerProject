import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import EditorPage from './pages/EditorPage'
import HistoryPage from './pages/HistoryPage'
import UserProfile from './pages/UserProfile'
import useAuthStore from './stores/authStore'
import './App.css'

function App() {
  const { user } = useAuthStore()

  useEffect(() => {
    const darkModeEnabled = Boolean(user?.settings?.dark_mode)
    document.documentElement.classList.toggle('theme-dark', darkModeEnabled)
  }, [user?.settings?.dark_mode])

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Auth pages - no header/footer */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main app pages - with header/footer */}
          <Route
            path="*"
            element={
              <>
                <Header />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/editor" element={<EditorPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/account" element={<UserProfile />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxWidth: '380px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App
