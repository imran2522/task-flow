import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faBookOpen,
  faPlus,
  faRightFromBracket,
  faTrash,
  faUserGear,
} from '@fortawesome/free-solid-svg-icons';
import LoadingState from '../components/LoadingState.jsx';
import './Dashboard.scss';

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();

  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [lastBoardId, setLastBoardId] = useState('');
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  const [boardFormName, setBoardFormName] = useState('');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [boardFormError, setBoardFormError] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isRenamingBoard, setIsRenamingBoard] = useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [openingBoardId, setOpeningBoardId] = useState('');

  const userRole = user?.role === 'user' || !user?.role ? 'viewer' : user.role;
  const canManageBoards = userRole === 'admin';

  const activeBoard = useMemo(
    () => boards.find((item) => (item.id || item._id) === selectedBoardId) || null,
    [boards, selectedBoardId]
  );

  const lastVisitedBoard = useMemo(
    () => boards.find((item) => (item.id || item._id) === lastBoardId) || null,
    [boards, lastBoardId]
  );

  useEffect(() => {
    setRenameBoardName(activeBoard?.name || '');
  }, [activeBoard?.id, activeBoard?.name, activeBoard?._id]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setLastBoardId(localStorage.getItem('last_board_id') || '');
    }

    let active = true;

    async function loadBoards() {
      setIsLoadingBoards(true);
      setBoardFormError('');

      try {
        const result = await api.get('/api/projects');
        const items = Array.isArray(result) ? result : [];
        if (!active) return;

        setBoards(items);

        if (items.length) {
          const firstId = items[0].id || items[0]._id;
          setSelectedBoardId((prev) => prev || firstId);
        } else {
          setSelectedBoardId('');
        }
      } catch (error) {
        if (!active) return;
        setBoardFormError(error?.message || 'Failed to load boards.');
      } finally {
        if (active) setIsLoadingBoards(false);
      }
    }

    loadBoards();

    return () => {
      active = false;
    };
  }, []);

  async function handleCreateBoard(event) {
    event.preventDefault();
    const name = boardFormName.trim();
    if (!name) {
      setBoardFormError('Board name is required.');
      return;
    }

    if (!user?.id) {
      setBoardFormError('Please login again before creating a board.');
      return;
    }

    setBoardFormError('');
    setIsCreatingBoard(true);

    try {
      const created = await api.post('/api/projects', {
        name,
        owner: user.id,
      });

      const nextBoards = [created, ...boards];
      setBoards(nextBoards);
      setBoardFormName('');

      const createdBoardId = created.id || created._id;
      setSelectedBoardId(createdBoardId);
    } catch (error) {
      setBoardFormError(error?.message || 'Failed to create board.');
    } finally {
      setIsCreatingBoard(false);
    }
  }

  async function handleRenameBoard(event) {
    event.preventDefault();
    if (!activeBoard) {
      setBoardFormError('Select a board to rename.');
      return;
    }

    const nextName = renameBoardName.trim();
    if (!nextName) {
      setBoardFormError('New board name is required.');
      return;
    }

    if (nextName === activeBoard.name) {
      return;
    }

    setBoardFormError('');
    setIsRenamingBoard(true);

    try {
      const boardIdValue = activeBoard.id || activeBoard._id;
      const updated = await api.patch(`/api/projects/${boardIdValue}`, { name: nextName });
      setBoards((prev) => prev.map((item) => {
        const id = item.id || item._id;
        return id === boardIdValue ? updated : item;
      }));
    } catch (error) {
      setBoardFormError(error?.message || 'Failed to rename board.');
    } finally {
      setIsRenamingBoard(false);
    }
  }

  async function handleDeleteBoard() {
    if (!activeBoard) {
      setBoardFormError('Select a board to delete.');
      return;
    }

    const confirmed = window.confirm(`Delete board "${activeBoard.name}" and all its tasks?`);
    if (!confirmed) return;

    setBoardFormError('');
    setIsDeletingBoard(true);

    try {
      const boardIdValue = activeBoard.id || activeBoard._id;
      await api.delete(`/api/projects/${boardIdValue}`);

      const remaining = boards.filter((item) => (item.id || item._id) !== boardIdValue);
      setBoards(remaining);

      if (remaining.length) {
        const nextBoardId = remaining[0].id || remaining[0]._id;
        setSelectedBoardId(nextBoardId);
      } else {
        setSelectedBoardId('');
      }
    } catch (error) {
      setBoardFormError(error?.message || 'Failed to delete board.');
    } finally {
      setIsDeletingBoard(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  function handleOpenLastBoard() {
    if (!lastVisitedBoard) return;
    const id = lastVisitedBoard.id || lastVisitedBoard._id;
    setOpeningBoardId(id);
    navigate(`/boards/${id}`);
  }

  function handleOpenBoard(boardId) {
    if (!boardId) return;
    setOpeningBoardId(boardId);
    navigate(`/boards/${boardId}`);
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h2>Boards Dashboard</h2>
          <p>Welcome: {user?.name || user?.email || 'User'}</p>
          <p>Role: {userRole}</p>
        </div>
        <div className="dashboard-actions">
          {canManageBoards && (
            <button onClick={() => navigate('/users')} className="btn-secondary inline-flex items-center gap-2">
              <FontAwesomeIcon icon={faUserGear} />
              <span>Manage Users</span>
            </button>
          )}
          <button
            onClick={handleOpenLastBoard}
            disabled={!lastVisitedBoard || Boolean(openingBoardId)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            {openingBoardId && openingBoardId === (lastVisitedBoard?.id || lastVisitedBoard?._id)
              ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
              : <FontAwesomeIcon icon={faBookOpen} />}
            <span>{openingBoardId && openingBoardId === (lastVisitedBoard?.id || lastVisitedBoard?._id) ? 'Opening...' : 'Open Last Board'}</span>
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

      {canManageBoards && (
        <form className="board-create-form" onSubmit={handleCreateBoard}>
          <input
            type="text"
            value={boardFormName}
            onChange={(event) => setBoardFormName(event.target.value)}
            placeholder="Create a new board"
            aria-label="Board name"
          />
          <button type="submit" disabled={isCreatingBoard} className="inline-flex items-center gap-2">
            {isCreatingBoard ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faPlus} />}
            <span>{isCreatingBoard ? 'Creating...' : 'Create Board'}</span>
          </button>
        </form>
      )}

      <form className="board-manage-form" onSubmit={handleRenameBoard}>
        <select
          aria-label="Select board"
          value={selectedBoardId}
          onChange={(event) => setSelectedBoardId(event.target.value)}
          disabled={isLoadingBoards || !boards.length}
        >
          {!boards.length && <option value="">No boards</option>}
          {boards.map((item) => {
            const id = item.id || item._id;
            return (
              <option key={id} value={id}>{item.name}</option>
            );
          })}
        </select>
        {canManageBoards && (
          <>
            <input
              type="text"
              value={renameBoardName}
              onChange={(event) => setRenameBoardName(event.target.value)}
              placeholder="Rename selected board"
              aria-label="Rename board"
              disabled={!activeBoard}
            />
            <button type="submit" disabled={!activeBoard || isRenamingBoard} className="btn-secondary inline-flex items-center gap-2">
              {isRenamingBoard ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faUserGear} />}
              <span>{isRenamingBoard ? 'Saving...' : 'Rename Board'}</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => activeBoard && handleOpenBoard(activeBoard.id || activeBoard._id)}
          disabled={!activeBoard || Boolean(openingBoardId)}
          className="btn-secondary inline-flex items-center gap-2"
        >
          {openingBoardId && openingBoardId === (activeBoard?.id || activeBoard?._id)
            ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
            : <FontAwesomeIcon icon={faArrowUpRightFromSquare} />}
          <span>{openingBoardId && openingBoardId === (activeBoard?.id || activeBoard?._id) ? 'Opening...' : 'Open Board'}</span>
        </button>
        {canManageBoards && (
          <button
            type="button"
            onClick={handleDeleteBoard}
            disabled={!activeBoard || isDeletingBoard}
            className="btn-danger inline-flex items-center gap-2"
          >
            {isDeletingBoard ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faTrash} />}
            <span>{isDeletingBoard ? 'Deleting...' : 'Delete Board'}</span>
          </button>
        )}
      </form>

      {!canManageBoards && (
        <p className="permission-note">Only admins can create, rename, or delete boards.</p>
      )}

      {boardFormError && <p role="alert">{boardFormError}</p>}

      {isLoadingBoards ? (
        <LoadingState label="Loading boards..." />
      ) : (
        <div className="boards-grid">
          {boards.map((item) => {
            const id = item.id || item._id;
            return (
              <article key={id} className="board-tile">
                <h3>{item.name}</h3>
                <p>Key: {item.key}</p>
                <button
                  onClick={() => handleOpenBoard(id)}
                  disabled={Boolean(openingBoardId)}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {openingBoardId === id
                    ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
                    : <FontAwesomeIcon icon={faArrowUpRightFromSquare} />}
                  <span>{openingBoardId === id ? 'Opening...' : 'View Board'}</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
