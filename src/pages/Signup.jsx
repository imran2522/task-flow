import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { setAuthSession } from '../lib/auth.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faIdCard, faKey, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import '../App.scss';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, email, password }, { auth: false });
      const loginData = await api.post('/api/auth/login', { email, password }, { auth: false });
      setAuthSession({ token: loginData.token, user: loginData.user });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="space-y-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
          <FontAwesomeIcon icon={faUserPlus} />
          <span>Task Flow</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">Build momentum with every task.</h1>
        <p className="text-slate-600 dark:text-slate-300">Create an account and start collaborating with your team.</p>
      </div>
      <div className="auth-card">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Create Account</h2>
        <p className="mb-6 mt-1 text-slate-600 dark:text-slate-300">Start managing your task flow.</p>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faIdCard} />Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faKey} />Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2">
            {loading ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faUserPlus} />}
            <span>{loading ? 'Creating account...' : 'Sign up'}</span>
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
