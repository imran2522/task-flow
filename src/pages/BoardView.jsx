import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faRightFromBracket, faUserGear } from '@fortawesome/free-solid-svg-icons';
import LoadingState from '../components/LoadingState.jsx';
import './Dashboard.scss';

const initialData = {
  tasks: {},
  columns: {
    todo: { id: 'todo', title: 'To Do', taskIds: [] },
    inprogress: { id: 'inprogress', title: 'In Progress', taskIds: [] },
    done: { id: 'done', title: 'Done', taskIds: [] },
  },
  columnOrder: ['todo', 'inprogress', 'done'],
};

function mapTaskStatusToColumnId(status) {
  if (status === 'done') return 'done';
  if (status === 'in_progress' || status === 'blocked') return 'inprogress';
  return 'todo';
}

function buildBoardFromTasks(tasks) {
  const board = {
    tasks: {},
    columns: {
      todo: { ...initialData.columns.todo, taskIds: [] },
      inprogress: { ...initialData.columns.inprogress, taskIds: [] },
      done: { ...initialData.columns.done, taskIds: [] },
    },
    columnOrder: [...initialData.columnOrder],
  };

  tasks.forEach((task) => {
    const id = task?._id || task?.id;
    if (!id) return;

    const owner = typeof task?.assignee === 'object' && task?.assignee
      ? task.assignee.name || task.assignee.email || 'Unassigned'
      : 'Unassigned';

    board.tasks[id] = {
      id,
      title: task?.title || 'Untitled task',
      owner,
    };

    const columnId = mapTaskStatusToColumnId(task?.status);
    board.columns[columnId].taskIds.push(id);
  });

  return board;
}

function applyTaskMoved(board, payload = {}) {
  const taskId = payload.taskId || payload.draggableId;
  const sourceColumnId = payload.sourceColumnId || payload?.source?.droppableId;
  const destinationColumnId = payload.destinationColumnId || payload?.destination?.droppableId;
  const sourceIndex = Number(payload.sourceIndex ?? payload?.source?.index);
  const destinationIndex = Number(payload.destinationIndex ?? payload?.destination?.index);

  if (!taskId || !sourceColumnId || !destinationColumnId) return board;
  if (!Number.isInteger(sourceIndex) || !Number.isInteger(destinationIndex)) return board;

  const sourceColumn = board.columns[sourceColumnId];
  const destinationColumn = board.columns[destinationColumnId];
  if (!sourceColumn || !destinationColumn) return board;

  const sourceTaskIds = Array.from(sourceColumn.taskIds);
  const destinationTaskIds = sourceColumnId === destinationColumnId
    ? sourceTaskIds
    : Array.from(destinationColumn.taskIds);

  const existingIndexInSource = sourceTaskIds.indexOf(taskId);
  if (existingIndexInSource !== -1) {
    sourceTaskIds.splice(existingIndexInSource, 1);
  }

  const safeDestinationIndex = Math.max(0, Math.min(destinationIndex, destinationTaskIds.length));
  destinationTaskIds.splice(safeDestinationIndex, 0, taskId);

  if (sourceColumnId === destinationColumnId) {
    return {
      ...board,
      columns: {
        ...board.columns,
        [sourceColumnId]: {
          ...sourceColumn,
          taskIds: destinationTaskIds,
        },
      },
    };
  }

  return {
    ...board,
    columns: {
      ...board.columns,
      [sourceColumnId]: {
        ...sourceColumn,
        taskIds: sourceTaskIds,
      },
      [destinationColumnId]: {
        ...destinationColumn,
        taskIds: destinationTaskIds,
      },
    },
  };
}

function applyTaskCreated(board, payload = {}) {
  const task = payload.task || payload;
  const taskId = task?._id || task?.id;
  if (!taskId || board.tasks[taskId]) return board;

  const owner = typeof task?.assignee === 'object' && task?.assignee
    ? task.assignee.name || task.assignee.email || 'Unassigned'
    : (task?.owner || 'Unassigned');

  const columnId = mapTaskStatusToColumnId(task?.status);
  const targetColumn = board.columns[columnId];
  if (!targetColumn) return board;

  return {
    ...board,
    tasks: {
      ...board.tasks,
      [taskId]: {
        id: taskId,
        title: task?.title || 'Untitled task',
        owner,
      },
    },
    columns: {
      ...board.columns,
      [columnId]: {
        ...targetColumn,
        taskIds: [taskId, ...targetColumn.taskIds],
      },
    },
  };
}

export default function BoardView() {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const token = getToken();
  const user = getUser();

  const [boards, setBoards] = useState([]);
  const [board, setBoard] = useState(initialData);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskFormError, setTaskFormError] = useState('');
  const [dropError, setDropError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const userRole = user?.role === 'user' || !user?.role ? 'viewer' : user.role;
  const canCreateTasks = userRole === 'admin' || userRole === 'contributor';
  const canEditTasks = userRole === 'admin' || userRole === 'editor';

  const activeBoard = useMemo(
    () => boards.find((item) => (item.id || item._id) === boardId) || null,
    [boards, boardId]
  );

  const statusByColumnId = {
    todo: 'todo',
    inprogress: 'in_progress',
    done: 'done',
  };

  useEffect(() => {
    if (!boardId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_board_id', boardId);
    }

    let active = true;

    async function loadBoards() {
      try {
        const result = await api.get('/api/projects');
        const items = Array.isArray(result) ? result : [];
        if (!active) return;
        setBoards(items);

        const exists = items.some((item) => (item.id || item._id) === boardId);
        if (!exists) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        if (!active) return;
        setLoadError(error?.message || 'Failed to load board.');
      }
    }

    loadBoards();

    return () => {
      active = false;
    };
  }, [boardId, navigate]);

  useEffect(() => {
    if (!boardId) return;

    let active = true;

    async function loadTasks() {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await api.get(`/api/tasks?project=${boardId}`);
        const items = Array.isArray(result) ? result : (result?.items || []);
        if (!active) return;
        setBoard(buildBoardFromTasks(items));
      } catch (error) {
        if (!active) return;
        setLoadError(error?.message || 'Failed to load tasks.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadTasks();

    return () => {
      active = false;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();

    function handleTaskMoved(payload) {
      setBoard((prev) => applyTaskMoved(prev, payload));
    }

    function handleTaskCreated(payload) {
      setBoard((prev) => applyTaskCreated(prev, payload));
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinBoard', boardId);
    socket.on('taskMoved', handleTaskMoved);
    socket.on('taskCreated', handleTaskCreated);

    return () => {
      socket.emit('leaveBoard', boardId);
      socket.off('taskMoved', handleTaskMoved);
      socket.off('taskCreated', handleTaskCreated);
    };
  }, [boardId]);

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!canCreateTasks) {
      setTaskFormError('You do not have permission to create tasks.');
      return;
    }

    const title = taskTitle.trim();
    if (!title) {
      setTaskFormError('Task title is required.');
      return;
    }

    setTaskFormError('');
    setIsCreatingTask(true);

    try {
      const created = await api.post('/api/tasks', {
        title,
        status: taskStatus,
        project: boardId,
        createdBy: user?.id,
      });

      const createdId = created?._id || created?.id;
      const createdTaskPayload = {
        ...created,
        _id: createdId,
        title: created?.title || title,
        status: created?.status || taskStatus,
        owner: user?.name || user?.email || 'Unassigned',
      };

      setBoard((prev) => applyTaskCreated(prev, createdTaskPayload));
      getSocket().emit('taskCreated', {
        boardId,
        task: createdTaskPayload,
      });

      setTaskTitle('');
      setTaskStatus('todo');
    } catch (error) {
      setTaskFormError(error?.message || 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function onDragEnd(result) {
    if (!canEditTasks) return;

    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId
      && destination.index === source.index
    ) {
      return;
    }

    const start = board.columns[source.droppableId];
    const finish = board.columns[destination.droppableId];

    if (start === finish) {
      const nextTaskIds = Array.from(start.taskIds);
      nextTaskIds.splice(source.index, 1);
      nextTaskIds.splice(destination.index, 0, draggableId);

      const nextColumn = {
        ...start,
        taskIds: nextTaskIds,
      };

      setBoard((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [nextColumn.id]: nextColumn,
        },
      }));

      getSocket().emit('taskMoved', {
        boardId,
        taskId: draggableId,
        sourceColumnId: source.droppableId,
        destinationColumnId: destination.droppableId,
        sourceIndex: source.index,
        destinationIndex: destination.index,
      });
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    const nextStart = {
      ...start,
      taskIds: startTaskIds,
    };

    const nextFinish = {
      ...finish,
      taskIds: finishTaskIds,
    };

    const previousBoard = board;

    setBoard((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [nextStart.id]: nextStart,
        [nextFinish.id]: nextFinish,
      },
    }));

    getSocket().emit('taskMoved', {
      boardId,
      taskId: draggableId,
      sourceColumnId: source.droppableId,
      destinationColumnId: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index,
    });

    const nextStatus = statusByColumnId[destination.droppableId];
    if (!nextStatus) return;

    setDropError('');
    setUpdatingTaskId(draggableId);

    try {
      await api.patch(`/api/tasks/${draggableId}`, {
        status: nextStatus,
        project: boardId,
      });
    } catch (error) {
      setBoard(previousBoard);
      setDropError(error?.message || 'Failed to update task status.');
    } finally {
      setUpdatingTaskId(null);
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
          <h2>{activeBoard?.name || 'Board'}</h2>
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

      <form className="task-create-form" onSubmit={handleCreateTask}>
        <input
          type="text"
          value={taskTitle}
          onChange={(event) => setTaskTitle(event.target.value)}
          placeholder="Add task to this board"
          aria-label="Task title"
          disabled={!canCreateTasks}
        />
        <select
          value={taskStatus}
          onChange={(event) => setTaskStatus(event.target.value)}
          aria-label="Task status"
          disabled={!canCreateTasks}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <button type="submit" disabled={isCreatingTask || !canCreateTasks} className="inline-flex items-center gap-2">
          {isCreatingTask ? <span className="loading-spinner loading-spinner-sm" aria-hidden="true" /> : <FontAwesomeIcon icon={faPlus} />}
          <span>{isCreatingTask ? 'Adding...' : 'Add Task'}</span>
        </button>
      </form>

      <p className="permission-note">
        {canEditTasks ? 'You can edit task status on this board.' : 'You can view tasks only on this board.'}
      </p>

      {dropError && <p role="alert">{dropError}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {taskFormError && <p role="alert">{taskFormError}</p>}
      {isLoading ? (
        <LoadingState label="Loading tasks..." />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="board-columns" role="list" aria-label="Task columns">
            {board.columnOrder.map((columnId) => {
              const column = board.columns[columnId];
              const tasks = column.taskIds.map((taskId) => board.tasks[taskId]);

              return (
                <Droppable key={column.id} droppableId={column.id} isDropDisabled={!canEditTasks}>
                  {(provided, snapshot) => (
                    <section className="board-column-wrap" role="listitem">
                      <div className="board-column-header">
                        <h3>{column.title}</h3>
                        <span>{tasks.length}</span>
                      </div>

                      <div
                        className={`board-column ${snapshot.isDraggingOver ? 'is-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEditTasks}>
                            {(dragProvided, dragSnapshot) => (
                              <article
                                className={`task-card ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <p>{task.title}</p>
                                <small>Owner: {task.owner}</small>
                                {updatingTaskId === task.id && <small>Saving...</small>}
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </section>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </section>
  );
}
