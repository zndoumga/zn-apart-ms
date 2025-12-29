import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import type { TaskStatus } from '../../types';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  count: number;
  children: React.ReactNode;
}

const COLUMN_COLORS: Record<TaskStatus, { bg: string; badge: string; border: string }> = {
  todo: {
    bg: 'bg-gray-50',
    badge: 'bg-gray-200 text-gray-700',
    border: 'border-gray-200',
  },
  in_progress: {
    bg: 'bg-primary-50',
    badge: 'bg-primary-200 text-primary-700',
    border: 'border-primary-200',
  },
  done: {
    bg: 'bg-success-50',
    badge: 'bg-success-200 text-success-700',
    border: 'border-success-200',
  },
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  count,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const colors = COLUMN_COLORS[id];

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'w-full rounded-xl border-2 transition-colors',
        colors.bg,
        isOver ? 'border-primary-400' : colors.border
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span
            className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              colors.badge
            )}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-4 min-h-[400px]">{children}</div>
    </div>
  );
};

export default KanbanColumn;

