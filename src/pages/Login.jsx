import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { setAuthSession } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faKey, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import '../App.scss';

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
      <div className="space-y-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
          <FontAwesomeIcon icon={faRightToBracket} />
          <span>Task Flow</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">Organize work. Ship faster.</h1>
        <p className="text-slate-600 dark:text-slate-300">Coordinate boards, users, and tasks in one focused workspace.</p>
      </div>
      <div className="auth-card">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Login</h2>
        <p className="mb-6 mt-1 text-slate-600 dark:text-slate-300">Welcome back to Task Flow.</p>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope} />Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faKey} />Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2">
            {loading ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faRightToBracket} />}
            <span>{loading ? 'Signing in...' : 'Login'}</span>
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
