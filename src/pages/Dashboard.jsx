import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { clearAuthSession, getToken, getUser } from '../lib/auth.js';
import { useState } from 'react';
import './Dashboard.css';

const initialData = {
  tasks: {
    'task-1': { id: 'task-1', title: 'Define sprint goals', owner: 'Asha' },
    'task-2': { id: 'task-2', title: 'Wireframe dashboard', owner: 'Imran' },
    'task-3': { id: 'task-3', title: 'Build auth endpoints', owner: 'Mina' },
    'task-4': { id: 'task-4', title: 'Connect React routing', owner: 'Leo' },
    'task-5': { id: 'task-5', title: 'Polish board interactions', owner: 'Nora' },
  },
  columns: {
    todo: {
      id: 'todo',
      title: 'To Do',
      taskIds: ['task-1', 'task-2'],
    },
    inprogress: {
      id: 'inprogress',
      title: 'In Progress',
      taskIds: ['task-3', 'task-4'],
    },
    done: {
      id: 'done',
      title: 'Done',
      taskIds: ['task-5'],
    },
  },
  columnOrder: ['todo', 'inprogress', 'done'],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const [board, setBoard] = useState(initialData);

  function onDragEnd(result) {
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

    setBoard((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [nextStart.id]: nextStart,
        [nextFinish.id]: nextFinish,
      },
    }));
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
