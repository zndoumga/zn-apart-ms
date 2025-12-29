import React, { useState, useMemo } from 'react';
import { Plus, MessageSquare, Send, Search } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Card, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  useRequests,
  useCreateRequest,
  useUpdateRequestStatus,
  useAddComment,
  useDeleteRequest,
} from '../hooks/useRequests';
import { useMode, useAppStore } from '../store/useAppStore';
import { formatRelativeTime } from '../utils/dates';
import type { StaffRequest, RequestFormData, RequestStatus } from '../types';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../types';

const Requests: React.FC = () => {
  const { isAdmin } = useMode();
  const mode = useAppStore((state) => state.mode);
  const { data: requests, isLoading } = useRequests();
  const createRequest = useCreateRequest();
  const updateStatus = useUpdateRequestStatus();
  const addComment = useAddComment();
  const deleteRequest = useDeleteRequest();

  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequest | null>(null);
  const [commentText, setCommentText] = useState('');
  const [deletingRequest, setDeletingRequest] = useState<StaffRequest | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const handleDelete = async () => {
    if (!deletingRequest) return;
    await deleteRequest.mutateAsync(deletingRequest.id);
    setDeletingRequest(null);
    setSelectedRequest(null);
  };

  // Check if current user can modify/delete this request
  const canModifyRequest = (request: StaffRequest | null) => {
    if (!request) return false;
    // Admin can modify any request
    if (isAdmin) return true;
    // Staff can modify any request (since they are the ones creating them)
    // All staff requests have submittedBy === 'staff'
    return true;
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

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    if (!requests) return [];

    let filtered = requests.filter((request) => {
      const matchesSearch =
        !search ||
        request.title.toLowerCase().includes(search.toLowerCase()) ||
        request.description.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesCategory = !categoryFilter || request.category === categoryFilter;
      const matchesPriority = !priorityFilter || request.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });

    // Sort requests
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          const statusOrder = { pending: 1, in_review: 2, approved: 3, rejected: 4 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case 'priority':
          const priorityOrder = { urgent: 2, normal: 1 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [requests, search, statusFilter, categoryFilter, priorityFilter, sortBy, sortDirection]);

  const handleSortClick = (field: 'date' | 'status' | 'priority') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

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
            {filteredAndSortedRequests.length} demande(s)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle demande
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardBody className="py-3">
          {/* Desktop Layout */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | '')}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Tous les statuts</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                categoryFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Toutes les catégories</option>
              {REQUEST_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                priorityFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Toutes les priorités</option>
              {REQUEST_PRIORITIES.map((pri) => (
                <option key={pri.value} value={pri.value}>
                  {pri.label}
                </option>
              ))}
            </select>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tri:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => handleSortClick('date')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                    sortBy === 'date' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Date
                  {sortBy === 'date' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('status')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                    sortBy === 'status' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Statut
                  {sortBy === 'status' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('priority')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                    sortBy === 'priority' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Priorité
                  {sortBy === 'priority' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            {/* Row 1: Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Row 2: Filters */}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | '')}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Statut</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  categoryFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Catégorie</option>
                {REQUEST_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  priorityFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Priorité</option>
                {REQUEST_PRIORITIES.map((pri) => (
                  <option key={pri.value} value={pri.value}>
                    {pri.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Tri:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-1">
                <button
                  onClick={() => handleSortClick('date')}
                  className={`flex-1 px-2 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors h-[38px] ${
                    sortBy === 'date' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Date
                  {sortBy === 'date' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('status')}
                  className={`flex-1 px-2 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 h-[38px] ${
                    sortBy === 'status' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Statut
                  {sortBy === 'status' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('priority')}
                  className={`flex-1 px-2 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 h-[38px] ${
                    sortBy === 'priority' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Priorité
                  {sortBy === 'priority' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Request list */}
      {!requests || filteredAndSortedRequests.length === 0 ? (
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
          {filteredAndSortedRequests.map((request) => (
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

            {/* Status Change Dropdown */}
            {canModifyRequest(selectedRequest) && (
              <div className="pt-4 border-t">
                <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Changer le statut
                  </label>
                  <select
                    value={selectedRequest.status}
                    onChange={(e) => {
                      handleStatusChange(selectedRequest.id, e.target.value as RequestStatus);
                    }}
                    disabled={updateStatus.isPending}
                    className="w-full px-3 py-2.5 text-sm font-medium border-2 border-primary-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="pending">En attente</option>
                    <option value="in_review">En cours</option>
                    <option value="approved">Approuvé</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>
              </div>
            )}

            {/* Delete Button */}
            {canModifyRequest(selectedRequest) && (
              <div className="pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={() => setDeletingRequest(selectedRequest)}
                  className="w-full"
                >
                  Supprimer cette demande
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingRequest}
        onClose={() => setDeletingRequest(null)}
        onConfirm={handleDelete}
        title="Supprimer la demande ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingRequest?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={deleteRequest.isPending}
      />
    </div>
  );
};

export default Requests;
