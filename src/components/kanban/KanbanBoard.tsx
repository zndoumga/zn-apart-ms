import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import type { Task, TaskStatus } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'À faire' },
  { id: 'in_progress', title: 'En cours' },
  { id: 'done', title: 'Terminé' },
];

interface KanbanBoardProps {
  onTaskClick?: (task: Task) => void;
  tasks?: Task[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onTaskClick, tasks: providedTasks }) => {
  const { data: allTasks, isLoading } = useTasks();
  const updateTaskStatus = useUpdateTaskStatus();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Use provided tasks if available, otherwise use all tasks
  const tasks = providedTasks || allTasks;

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    tasks?.forEach((task: Task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;

    // Find the task being dragged
    for (const status of Object.keys(tasksByStatus)) {
      const task = tasksByStatus[status as TaskStatus]?.find(
        (t: Task) => t.id === taskId
      );
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Check if dropped on a column
    if (COLUMNS.some((col) => col.id === newStatus)) {
      updateTaskStatus.mutate({ id: taskId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-6">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];

          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={columnTasks.length}
            >
              <SortableContext
                items={columnTasks.map((t: Task) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {columnTasks.map((task: Task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                    />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
