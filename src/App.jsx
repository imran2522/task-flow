import './App.css'
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { getToken } from './lib/auth.js'

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

function App() {
  const token = typeof localStorage !== 'undefined' ? getToken() : null;
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div>
      {!isAuthPage && (
        <nav style={{ display: 'flex', gap: 12, padding: 12 }}>
          {!token && <Link to="/login">Login</Link>}
          {!token && <Link to="/signup">Signup</Link>}
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      )}
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
