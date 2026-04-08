import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { setAuthSession } from '../lib/auth.js';
import { api } from '../lib/api.js';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password }, { auth: false });
      setAuthSession({ token: data.token, user: data.user });
      const to = location.state?.from?.pathname || '/dashboard';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to reach server. Is API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <p className="auth-kicker">
          <span className="auth-logo-mark" aria-hidden="true" />
          <span>Task Flow</span>
        </p>
        <h1>Organize work. Ship faster.</h1>
      </div>
      <div className="auth-card">
        <h2>Login</h2>
        <p className="auth-subtitle">Welcome back to Task Flow.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>

        <p className="auth-footnote">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
