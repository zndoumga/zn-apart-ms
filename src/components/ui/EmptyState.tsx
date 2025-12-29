import React from 'react';
import { clsx } from 'clsx';
import { FolderOpen, Search, Plus } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        {icon || <FolderOpen className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>}
      {action && (
        <Button onClick={action.onClick} leftIcon={<Plus className="w-4 h-4" />}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export const SearchEmptyState: React.FC<{ searchTerm: string }> = ({ searchTerm }) => {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8 text-gray-400" />}
      title="Aucun résultat"
      description={`Aucun résultat trouvé pour "${searchTerm}". Essayez avec d'autres termes.`}
    />
  );
};

export default EmptyState;

