import React, { useState } from 'react';
import { Plus, MessageSquare, Send } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Card, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  useRequests,
  useCreateRequest,
  useUpdateRequestStatus,
  useAddComment,
} from '../hooks/useRequests';
import { useMode } from '../store/useAppStore';
import { formatRelativeTime } from '../utils/dates';
import type { StaffRequest, RequestFormData, RequestStatus } from '../types';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../types';

const Requests: React.FC = () => {
  const { isAdmin } = useMode();
  const { data: requests, isLoading } = useRequests();
  const createRequest = useCreateRequest();
  const updateStatus = useUpdateRequestStatus();
  const addComment = useAddComment();

  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequest | null>(null);
  const [commentText, setCommentText] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RequestFormData>({
    defaultValues: {
      title: '',
      description: '',
      category: 'other',
      priority: 'normal',
    },
  });

  const handleCreate = async (data: RequestFormData) => {
    await createRequest.mutateAsync(data);
    setShowForm(false);
    reset();
  };

  const handleStatusChange = async (requestId: string, status: RequestStatus) => {
    await updateStatus.mutateAsync({ id: requestId, status });
  };

  const handleAddComment = async () => {
    if (!selectedRequest || !commentText.trim()) return;
    await addComment.mutateAsync({
      requestId: selectedRequest.id,
      content: commentText,
    });
    setCommentText('');
  };

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<RequestStatus, 'warning' | 'primary' | 'success' | 'danger'> = {
      pending: 'warning',
      in_review: 'primary',
      approved: 'success',
      rejected: 'danger',
    };
    const labels: Record<RequestStatus, string> = {
      pending: 'En attente',
      in_review: 'En cours',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    return REQUEST_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const statusOptions = [
    { value: 'pending', label: 'En attente' },
    { value: 'in_review', label: 'En cours' },
    { value: 'approved', label: 'Approuvé' },
    { value: 'rejected', label: 'Rejeté' },
  ];

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes</h1>
          <p className="text-gray-600 mt-1">
            {requests?.length || 0} demande(s)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle demande
        </Button>
      </div>

      {/* Request list */}
      {!requests || requests.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8 text-gray-400" />}
          title="Aucune demande"
          description="Créez votre première demande."
          action={{
            label: 'Nouvelle demande',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card
              key={request.id}
              hover
              onClick={() => setSelectedRequest(request)}
              className="cursor-pointer"
            >
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      {request.priority === 'urgent' && (
                        <Badge variant="danger" size="sm">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{getCategoryLabel(request.category)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(request.createdAt)}</span>
                      {request.comments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {request.comments.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(request.status)}
                    {isAdmin && request.status !== 'approved' && request.status !== 'rejected' && (
                      <Select
                        options={statusOptions}
                        value={request.status}
                        onChange={(value) =>
                          handleStatusChange(request.id, value as RequestStatus)
                        }
                        className="text-xs"
                      />
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle demande"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Input
            label="Titre"
            placeholder="Objet de la demande"
            error={errors.title?.message}
            required
            {...register('title', { required: 'Titre requis' })}
          />

          <TextArea
            label="Description"
            placeholder="Décrivez votre demande en détail..."
            error={errors.description?.message}
            required
            rows={4}
            {...register('description', { required: 'Description requise' })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  label="Catégorie"
                  options={REQUEST_CATEGORIES}
                  {...field}
                />
              )}
            />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  label="Priorité"
                  options={REQUEST_PRIORITIES}
                  {...field}
                />
              )}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createRequest.isPending}>
              Envoyer la demande
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal with comments */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.title || ''}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Status and priority */}
            <div className="flex items-center gap-2">
              {getStatusBadge(selectedRequest.status)}
              {selectedRequest.priority === 'urgent' && (
                <Badge variant="danger">Urgent</Badge>
              )}
              <span className="text-sm text-gray-500">
                {getCategoryLabel(selectedRequest.category)}
              </span>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
              <p className="text-gray-900">{selectedRequest.description}</p>
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Commentaires ({selectedRequest.comments.length})
              </h4>
              
              {selectedRequest.comments.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedRequest.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.author === 'admin'
                          ? 'bg-primary-50 ml-4'
                          : 'bg-gray-100 mr-4'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={comment.author === 'admin' ? 'primary' : 'gray'}
                          size="sm"
                        >
                          {comment.author === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun commentaire</p>
              )}

              {/* Add comment */}
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddComment}
                  isLoading={addComment.isPending}
                  disabled={!commentText.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Admin: Change status */}
            {isAdmin && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Changer le statut
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {(['pending', 'in_review', 'approved', 'rejected'] as RequestStatus[]).map(
                    (status) => (
                      <Button
                        key={status}
                        variant={
                          selectedRequest.status === status
                            ? 'primary'
                            : 'secondary'
                        }
                        size="sm"
                        onClick={() =>
                          handleStatusChange(selectedRequest.id, status)
                        }
                        disabled={updateStatus.isPending}
                      >
                        {status === 'pending' && 'En attente'}
                        {status === 'in_review' && 'En cours'}
                        {status === 'approved' && 'Approuvé'}
                        {status === 'rejected' && 'Rejeté'}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Requests;
