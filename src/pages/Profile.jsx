import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getUser } from '../lib/auth.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMoon, faRightFromBracket, faSun, faUserGear } from '@fortawesome/free-solid-svg-icons';
import './Dashboard.scss';
import './Profile.scss';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getUser();
  const userRole = user?.role === 'user' || !user?.role ? 'viewer' : user.role;

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
    if (!themeReady) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyMode = () => {
      const nextEffectiveTheme = themeMode === 'auto'
        ? (media.matches ? 'dark' : 'light')
        : themeMode;

      setEffectiveTheme(nextEffectiveTheme);
      document.documentElement.classList.toggle('dark', nextEffectiveTheme === 'dark');
      window.localStorage.setItem('theme_mode', themeMode);
      window.localStorage.setItem('theme', nextEffectiveTheme);
      window.dispatchEvent(new CustomEvent('theme-mode-change', { detail: { mode: themeMode } }));
    };

    applyMode();

    if (themeMode === 'auto') {
      media.addEventListener('change', applyMode);
      return () => media.removeEventListener('change', applyMode);
    }
  }, [themeMode, themeReady]);

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <section className="dashboard-shell profile-shell">
      <header className="dashboard-header profile-header">
        <div>
          <h2>Profile</h2>
          <p>Manage your account details and display preferences.</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Dashboard</span>
          </button>
          <button onClick={handleLogout} className="btn-ghost inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <section className="profile-grid">
        <article className="profile-card">
          <div className="profile-card-heading">
            <FontAwesomeIcon icon={faUserGear} />
            <h3>Account</h3>
          </div>
          <dl className="profile-details">
            <div>
              <dt>Name</dt>
              <dd>{user?.name || 'Unknown user'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || 'No email available'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{userRole}</dd>
            </div>
          </dl>
        </article>

        <article className="profile-card">
          <div className="profile-card-heading">
            <FontAwesomeIcon icon={effectiveTheme === 'dark' ? faMoon : faSun} />
            <h3>Preferences</h3>
          </div>
          <div className="profile-preferences">
            <label htmlFor="profile-theme-mode">Theme mode</label>
            <select
              id="profile-theme-mode"
              value={themeMode}
              onChange={(event) => setThemeMode(event.target.value)}
              aria-label="Theme mode"
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p>
              Current display: <strong>{effectiveTheme}</strong>
            </p>
          </div>
        </article>
      </section>
    </section>
  );
}