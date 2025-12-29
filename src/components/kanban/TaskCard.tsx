import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { GripVertical, Building2 } from 'lucide-react';
import Badge from '../ui/Badge';
import { useProperties } from '../../hooks/useProperties';
import { formatRelativeTime } from '../../utils/dates';
import type { Task, TaskPriority } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

const PRIORITY_STYLES: Record<TaskPriority, { badge: 'danger' | 'warning' | 'gray'; border: string }> = {
  high: { badge: 'danger', border: 'border-l-danger-500' },
  medium: { badge: 'warning', border: 'border-l-warning-500' },
  low: { badge: 'gray', border: 'border-l-gray-400' },
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isDragging }) => {
  const { data: properties } = useProperties();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityStyle = PRIORITY_STYLES[task.priority];
  const propertyName = task.propertyId
    ? properties?.find((p) => p.id === task.propertyId)?.name
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white rounded-lg shadow-sm border-l-4 p-4 cursor-pointer',
        'hover:shadow-md transition-shadow',
        priorityStyle.border,
        (isDragging || isSorting) && 'opacity-50 shadow-lg rotate-2'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 -ml-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant={priorityStyle.badge} size="sm">
              {PRIORITY_LABELS[task.priority]}
            </Badge>

            {propertyName && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{propertyName}</span>
              </div>
            )}

            <span className="text-xs text-gray-400 ml-auto">
              {formatRelativeTime(task.createdAt)}
            </span>
          </div>

          {/* Assigned to */}
          <div className="mt-2">
            <Badge
              variant={task.assignedTo === 'admin' ? 'primary' : 'gray'}
              size="sm"
            >
              {task.assignedTo === 'admin' ? 'Admin' : 'Staff'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

