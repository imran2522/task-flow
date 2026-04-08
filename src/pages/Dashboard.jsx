import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      <p>Welcome: {user?.name || user?.email || 'User'}</p>
      <p>Token: {token ? 'present' : 'missing'}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
