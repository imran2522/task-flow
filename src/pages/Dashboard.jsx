import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { useEffect, useState } from 'react';
import './Dashboard.css';

const initialData = {
  tasks: {},
  columns: {
    todo: {
      id: 'todo',
      title: 'To Do',
      taskIds: [],
    },
    inprogress: {
      id: 'inprogress',
      title: 'In Progress',
      taskIds: [],
    },
    done: {
      id: 'done',
      title: 'Done',
      taskIds: [],
    },
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

function logDropDebug(event, payload) {
  if (!import.meta.env.DEV) return;
  console.info('[task-drop]', event, payload);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const [board, setBoard] = useState(initialData);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [dropError, setDropError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const statusByColumnId = {
    todo: 'todo',
    inprogress: 'in_progress',
    done: 'done',
  };

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await api.get('/api/tasks');
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
  }, []);

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
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

    const nextStatus = statusByColumnId[destination.droppableId];
    if (!nextStatus) return;

    setDropError('');
    setUpdatingTaskId(draggableId);

    logDropDebug('status-update-start', {
      taskId: draggableId,
      from: source.droppableId,
      to: destination.droppableId,
      status: nextStatus,
      endpoint: '/api/tasks/:id',
    });

    try {
      await api.patch(`/api/tasks/${draggableId}`, { status: nextStatus });
      logDropDebug('status-update-success', {
        taskId: draggableId,
        endpoint: '/api/tasks/:id',
      });
    } catch (error) {
      // Fallback for environments exposing only the custom status endpoint.
      if (error?.status === 404) {
        logDropDebug('status-update-fallback-start', {
          taskId: draggableId,
          endpoint: '/update-task-status',
        });

        try {
          await api.put('/update-task-status', { id: draggableId, status: nextStatus });
          logDropDebug('status-update-fallback-success', {
            taskId: draggableId,
            endpoint: '/update-task-status',
          });
          return;
        } catch (fallbackError) {
          logDropDebug('status-update-fallback-failed', {
            taskId: draggableId,
            message: fallbackError?.message,
            status: fallbackError?.status,
          });
          setBoard(previousBoard);
          setDropError(fallbackError?.message || 'Failed to update task status.');
          return;
        }
      }

      logDropDebug('status-update-failed', {
        taskId: draggableId,
        message: error?.message,
        status: error?.status,
      });

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
          <h2>Task Board</h2>
          <p>Welcome: {user?.name || user?.email || 'User'}</p>
        </div>
        <div className="dashboard-actions">
          <span className={`token-pill ${token ? 'ok' : 'warn'}`}>
            Token: {token ? 'present' : 'missing'}
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {dropError && <p role="alert">{dropError}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {isLoading && <p>Loading tasks...</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns" role="list" aria-label="Task columns">
          {board.columnOrder.map((columnId) => {
            const column = board.columns[columnId];
            const tasks = column.taskIds.map((taskId) => board.tasks[taskId]);

            return (
              <Droppable key={column.id} droppableId={column.id}>
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
                        <Draggable key={task.id} draggableId={task.id} index={index}>
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
    </section>
  );
}
