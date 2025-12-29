import React, { useState } from 'react';
import { 
  Calendar, 
  User, 
  Home,
  MessageSquare,
  Pencil,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import TextArea from '../ui/TextArea';
import type { Task, TaskStatus, Property, TaskComment } from '../../types';
import { formatDate, formatRelativeTime } from '../../utils/dates';
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from '../../hooks/useTaskComments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskDetailsModalProps {
  task: Task | null;
  property?: Property;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin: boolean;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  property,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  const [newComment, setNewComment] = useState('');
  
  const taskId = task?.id || '';
  const { data: comments, isLoading: commentsLoading } = useTaskComments(taskId);
  const addComment = useAddTaskComment(taskId);
  const deleteComment = useDeleteTaskComment(taskId);

  if (!task) return null;

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, 'success' | 'primary' | 'gray'> = {
      todo: 'gray',
      in_progress: 'primary',
      done: 'success',
    };
    const labels: Record<TaskStatus, string> = {
      todo: 'À faire',
      in_progress: 'En cours',
      done: 'Terminé',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'danger' | 'warning' | 'gray'> = {
      high: 'danger',
      medium: 'warning',
      low: 'gray',
    };
    const labels: Record<string, string> = {
      high: 'Haute',
      medium: 'Moyenne',
      low: 'Basse',
    };
    return <Badge variant={variants[priority] || 'gray'}>{labels[priority] || priority}</Badge>;
  };

  const getAssigneeLabel = (assignee?: string) => {
    const labels: Record<string, string> = {
      staff: 'Staff',
      admin: 'Admin',
      cleaning: 'Nettoyage',
      maintenance: 'Maintenance',
    };
    return labels[assignee || ''] || assignee || 'Non assigné';
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment.trim());
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const footerContent = (
    <div className="flex justify-between items-center">
      <div>
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
        {isAdmin && onEdit && (
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de la tâche"
      size="lg"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Task Header */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
            <div className="flex gap-2">
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
          </div>
          
          {task.description && (
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          )}
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-2 gap-4">
          {property && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Home className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Propriété:</span>
              <span>{property.name}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Assigné à:</span>
            <span>{getAssigneeLabel(task.assignedTo)}</span>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Échéance:</span>
              <span>{format(new Date(task.dueDate), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
          )}

          {task.completedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-success-500" />
              <span className="font-medium">Terminé le:</span>
              <span>{format(new Date(task.completedAt), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Créé:</span>
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Commentaires</h3>
            {comments && comments.length > 0 && (
              <Badge variant="gray" size="sm">
                {comments.length}
              </Badge>
            )}
          </div>

          {/* Comments List */}
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {commentsLoading ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : comments && comments.length > 0 ? (
              comments.map((comment: TaskComment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="text-xs text-danger-600 hover:text-danger-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Aucun commentaire pour le moment.</p>
            )}
          </div>

          {/* Add Comment */}
          <div className="flex gap-2">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ajouter un commentaire..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
              isLoading={addComment.isPending}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailsModal;

