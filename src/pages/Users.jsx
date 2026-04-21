import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFloppyDisk,
  faPenToSquare,
  faPlus,
  faRightFromBracket,
  faTrash,
  faUserGear,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import LoadingState from '../components/LoadingState.jsx';
import './Dashboard.scss';

export default function UsersPage() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [usersPage, setUsersPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState('');
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'viewer',
    password: '',
  });

  const userRole = user?.role === 'user' || !user?.role ? 'viewer' : user.role;
  const canManageUsers = userRole === 'admin';

  const usersPageSize = 5;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((item) => {
      const matchesQuery = !q
        || String(item.name || '').toLowerCase().includes(q)
        || String(item.email || '').toLowerCase().includes(q);
      const matchesRole = userRoleFilter === 'all' || item.role === userRoleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const totalUsersPages = Math.max(1, Math.ceil(filteredUsers.length / usersPageSize));

  const pagedUsers = useMemo(() => {
    const start = (usersPage - 1) * usersPageSize;
    return filteredUsers.slice(start, start + usersPageSize);
  }, [filteredUsers, usersPage]);

  useEffect(() => {
    if (!canManageUsers) {
      navigate('/dashboard', { replace: true });
      return;
    }

    let active = true;

    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const result = await api.get('/api/users');
        if (!active) return;
        setUsers(Array.isArray(result) ? result : []);
      } catch (error) {
        if (!active) return;
        setUserFormError(error?.message || 'Failed to load users.');
      } finally {
        if (active) setIsLoadingUsers(false);
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, [canManageUsers, navigate]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, userRoleFilter]);

  useEffect(() => {
    if (usersPage > totalUsersPages) {
      setUsersPage(totalUsersPages);
    }
  }, [usersPage, totalUsersPages]);

  function resetUserForm() {
    setEditingUserId('');
    setUserForm({ name: '', email: '', role: 'viewer', password: '' });
  }

  function handleEditUser(target) {
    setEditingUserId(target.id);
    setUserForm({
      name: target.name || '',
      email: target.email || '',
      role: target.role || 'viewer',
      password: '',
    });
    setUserFormError('');
    setUserFormSuccess('');
  }

  async function handleUserSubmit(event) {
    event.preventDefault();

    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
    };

    if (!payload.name || !payload.email) {
      setUserFormError('Name and email are required.');
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      setUserFormError('Password is required for new users.');
      return;
    }

    if (userForm.password.trim()) {
      payload.password = userForm.password.trim();
    }

    setIsSavingUser(true);
    setUserFormError('');
    setUserFormSuccess('');

    try {
      if (editingUserId) {
        const updated = await api.patch(`/api/users/${editingUserId}`, payload);
        setUsers((prev) => prev.map((item) => (item.id === editingUserId ? updated : item)));
        setUserFormSuccess('User updated.');
      } else {
        const created = await api.post('/api/users', payload);
        setUsers((prev) => [created, ...prev]);
        setUserFormSuccess('User created.');
      }

      resetUserForm();
    } catch (error) {
      setUserFormError(error?.message || 'Failed to save user.');
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleDeleteUser(target) {
    const confirmed = window.confirm(`Delete user "${target.name}"?`);
    if (!confirmed) return;

    setDeletingUserId(target.id);
    setUserFormError('');
    setUserFormSuccess('');

    try {
      await api.delete(`/api/users/${target.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== target.id));
      setUserFormSuccess('User deleted.');

      if (editingUserId === target.id) {
        resetUserForm();
      }
    } catch (error) {
      setUserFormError(error?.message || 'Failed to delete user.');
    } finally {
      setDeletingUserId('');
    }
  }

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h2>User Management</h2>
          <p>Welcome: {user?.name || user?.email || 'User'}</p>
          <p>Role: {userRole}</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Dashboard</span>
          </button>
          <button onClick={() => navigate('/profile')} className="btn-secondary inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faUserGear} />
            <span>Profile</span>
          </button>
          <span className={`token-pill ${token ? 'ok' : 'warn'}`}>
            Token: {token ? 'present' : 'missing'}
          </span>
          <button onClick={handleLogout} className="btn-ghost inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <section className="admin-users">
        <h3 className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faUsers} />Users</h3>

        <form className="user-form" onSubmit={handleUserSubmit}>
          <input
            type="text"
            value={userForm.name}
            onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Full name"
            aria-label="User name"
          />
          <input
            type="email"
            value={userForm.email}
            onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            aria-label="User email"
          />
          <select
            value={userForm.role}
            onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
            aria-label="User role"
          >
            <option value="admin">admin</option>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="contributor">contributor</option>
          </select>
          <input
            type="password"
            value={userForm.password}
            onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder={editingUserId ? 'New password (optional)' : 'Password'}
            aria-label="User password"
          />
          <button type="submit" disabled={isSavingUser} className="inline-flex items-center gap-2">
            {isSavingUser ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={editingUserId ? faFloppyDisk : faPlus} />}
            <span>{isSavingUser ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}</span>
          </button>
          {editingUserId && (
            <button type="button" onClick={resetUserForm} className="btn-secondary">Cancel Edit</button>
          )}
        </form>

        {userFormError && <p role="alert">{userFormError}</p>}
        {userFormSuccess && <p className="success-note">{userFormSuccess}</p>}

        {isLoadingUsers && <LoadingState label="Loading users..." />}

        <div className="users-toolbar">
          <input
            type="text"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users"
          />
          <select
            value={userRoleFilter}
            onChange={(event) => setUserRoleFilter(event.target.value)}
            aria-label="Filter users by role"
          >
            <option value="all">All roles</option>
            <option value="admin">admin</option>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="contributor">contributor</option>
          </select>
        </div>

        <div className="users-list">
          {pagedUsers.map((item) => (
            <article key={item.id} className="user-row">
              <div>
                <strong>{item.name}</strong>
                <p>{item.email} - {item.role}</p>
              </div>
              <div className="user-row-actions">
                <button type="button" onClick={() => handleEditUser(item)} className="btn-secondary inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faPenToSquare} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="btn-danger inline-flex items-center gap-2"
                  onClick={() => handleDeleteUser(item)}
                  disabled={deletingUserId === item.id || item.id === user?.id}
                >
                  {deletingUserId === item.id ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faTrash} />}
                  <span>{deletingUserId === item.id ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </article>
          ))}
          {!isLoadingUsers && !pagedUsers.length && <p>No users match the current filters.</p>}
        </div>

        <div className="users-pagination">
          <button
            type="button"
            onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
            disabled={usersPage <= 1}
          >
            Previous
          </button>
          <span>Page {usersPage} of {totalUsersPages}</span>
          <button
            type="button"
            onClick={() => setUsersPage((prev) => Math.min(totalUsersPages, prev + 1))}
            disabled={usersPage >= totalUsersPages}
          >
            Next
          </button>
        </div>
      </section>
    </section>
  );
}
