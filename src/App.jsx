import './App.scss'
import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardCheck, faMoon, faRightToBracket, faSun, faUserGear, faUserPlus, faUsers } from '@fortawesome/free-solid-svg-icons'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BoardView from './pages/BoardView.jsx'
import ProfilePage from './pages/Profile.jsx'
import UsersPage from './pages/Users.jsx'
import { getToken, getUser } from './lib/auth.js'

function RequireAuth({ children }) {
  const token = typeof localStorage !== 'undefined' ? getToken() : null;
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function GuestOnly({ children }) {
  const token = typeof localStorage !== 'undefined' ? getToken() : null;
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const token = typeof localStorage !== 'undefined' ? getToken() : null;
  const user = typeof localStorage !== 'undefined' ? getUser() : null;
  const role = user?.role === 'user' || !user?.role ? 'viewer' : user.role;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const token = typeof localStorage !== 'undefined' ? getToken() : null;
  const user = typeof localStorage !== 'undefined' ? getUser() : null;
  const role = user?.role === 'user' || !user?.role ? 'viewer' : user.role;
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const [themeMode, setThemeMode] = useState('auto');
  const [effectiveTheme, setEffectiveTheme] = useState('light');
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedMode = window.localStorage.getItem('theme_mode');
    const legacyTheme = window.localStorage.getItem('theme');

    if (savedMode === 'auto' || savedMode === 'light' || savedMode === 'dark') {
      setThemeMode(savedMode);
      setThemeReady(true);
      return;
    }

    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      setThemeMode(legacyTheme);
      setThemeReady(true);
      return;
    }

    setThemeMode('auto');
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleThemeModeChange(event) {
      const nextMode = event?.detail?.mode;
      if (nextMode === 'auto' || nextMode === 'light' || nextMode === 'dark') {
        setThemeMode(nextMode);
      }
    }

    window.addEventListener('theme-mode-change', handleThemeModeChange);
    return () => window.removeEventListener('theme-mode-change', handleThemeModeChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyEffectiveTheme = () => {
      if (themeMode === 'auto') {
        setEffectiveTheme(media.matches ? 'dark' : 'light');
        return;
      }
      setEffectiveTheme(themeMode);
    };

    applyEffectiveTheme();

    if (themeMode === 'auto') {
      media.addEventListener('change', applyEffectiveTheme);
      return () => media.removeEventListener('change', applyEffectiveTheme);
    }
  }, [themeMode]);

  useEffect(() => {
    if (!themeReady) return;
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme_mode', themeMode);
      window.localStorage.setItem('theme', effectiveTheme);
    }
  }, [themeMode, effectiveTheme, themeReady]);

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <nav className="top-nav">
          <div className="top-nav-inner">
            {!token && (
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faRightToBracket} />
                <span className="compact-label">Login</span>
              </NavLink>
            )}
            {!token && (
              <NavLink to="/signup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faUserPlus} />
                <span className="compact-label">Signup</span>
              </NavLink>
            )}
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FontAwesomeIcon icon={faClipboardCheck} />
              <span className="compact-label">Dashboard</span>
            </NavLink>
            {token && (
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faUserGear} />
                <span className="compact-label">Profile</span>
              </NavLink>
            )}
            {token && role === 'admin' && (
              <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faUsers} />
                <span className="compact-label">Users</span>
              </NavLink>
            )}
            {token && (
              <div className="theme-indicator" title="Theme can be changed from the profile page">
                <FontAwesomeIcon icon={effectiveTheme === 'dark' ? faMoon : faSun} />
                <span className="theme-indicator-label">Theme</span>
                <span className="theme-indicator-value">{themeMode}</span>
              </div>
            )}
          </div>
        </nav>
      )}
      <main className="page-wrap">
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestOnly>
                <Signup />
              </GuestOnly>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/boards/:boardId"
            element={
              <RequireAuth>
                <BoardView />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
