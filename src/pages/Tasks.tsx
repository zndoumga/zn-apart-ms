import React, { useState, useMemo } from 'react';
import { Plus, Building2, Search } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Badge from '../components/ui/Badge';
import { Card, CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import KanbanBoard from '../components/kanban/KanbanBoard';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import { useCreateTask, useUpdateTask, useDeleteTask, useTasks, useUpdateTaskStatus } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import { useMode } from '../store/useAppStore';
import type { Task, TaskFormData, TaskStatus } from '../types';
import { TASK_PRIORITIES } from '../types';

const COLUMNS: { id: Task['status']; title: string }[] = [
  { id: 'todo', title: 'À faire' },
  { id: 'in_progress', title: 'En cours' },
  { id: 'done', title: 'Terminé' },
];

const Tasks: React.FC = () => {
  const { isAdmin } = useMode();
  const { data: properties } = useProperties();

  // State
  const [showForm, setShowForm] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Queries
  const { data: tasks } = useTasks();
  
  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: 'staff',
      propertyId: '',
    },
  });

  const handleOpenCreate = () => {
    reset({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: 'staff',
      propertyId: '',
    });
    setShowForm(true);
  };

  const handleTaskClick = (task: Task) => {
    // Both admin and staff: open details modal
    setViewingTask(task);
  };

  const handleOpenEdit = (task: Task) => {
    reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignedTo: task.assignedTo,
      propertyId: task.propertyId || '',
    });
    setEditingTask(task);
  };

  const handleEditFromDetails = () => {
    if (viewingTask) {
      reset({
        title: viewingTask.title,
        description: viewingTask.description || '',
        priority: viewingTask.priority,
        assignedTo: viewingTask.assignedTo,
        propertyId: viewingTask.propertyId || '',
      });
      setEditingTask(viewingTask);
      setViewingTask(null);
    }
  };

  const handleDeleteFromDetails = () => {
    if (viewingTask) {
      setDeletingTask(viewingTask);
      setViewingTask(null);
    }
  };

  const handleCreate = async (data: TaskFormData) => {
    await createTask.mutateAsync(data);
    setShowForm(false);
    reset();
  };

  const handleUpdate = async (data: TaskFormData) => {
    if (!editingTask) return;
    await updateTask.mutateAsync({
      id: editingTask.id,
      data,
    });
    setEditingTask(null);
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    await deleteTask.mutateAsync(deletingTask.id);
    setDeletingTask(null);
  };

  const propertyOptions = [
    { value: '', label: 'Toutes les propriétés' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const assigneeOptions = [
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' },
  ];

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let filtered = tasks.filter((task) => {
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = !statusFilter || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        // Sort by priority: high > medium > low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
    });

    return filtered;
  }, [tasks, search, statusFilter, sortBy, sortDirection]);

  const TaskForm = ({ onSubmit, isLoading }: { onSubmit: (data: TaskFormData) => void; isLoading: boolean }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Titre"
        placeholder="Titre de la tâche"
        error={errors.title?.message}
        required
        {...register('title', { required: 'Titre requis' })}
      />

      <TextArea
        label="Description"
        placeholder="Description de la tâche..."
        {...register('description')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select
              label="Priorité"
              options={TASK_PRIORITIES}
              {...field}
            />
          )}
        />

        {isAdmin && (
          <Controller
            name="assignedTo"
            control={control}
            render={({ field }) => (
              <Select
                label="Assigné à"
                options={assigneeOptions}
                {...field}
              />
            )}
          />
        )}
      </div>

      <Controller
        name="propertyId"
        control={control}
        render={({ field }) => (
          <Select
            label="Propriété (optionnel)"
            options={propertyOptions}
            {...field}
          />
        )}
      />

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        >
          Annuler
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {editingTask ? 'Mettre à jour' : 'Créer la tâche'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
          <p className="text-gray-600 mt-1">
            Gérez les tâches avec le tableau Kanban
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Nouvelle tâche
            </Button>
          )}
        </div>
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
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <option value="">Tous les statuts</option>
              <option value="todo">À faire</option>
              <option value="in_progress">En cours</option>
              <option value="done">Terminé</option>
            </select>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tri:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => {
                    if (sortBy === 'date') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('date');
                      setSortDirection('desc');
                    }
                  }}
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
                  onClick={() => {
                    if (sortBy === 'priority') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('priority');
                      setSortDirection('desc');
                    }
                  }}
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

            {/* Row 2: Status Filter + Sort */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  statusFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <option value="">Tous les statuts</option>
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
              </select>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 whitespace-nowrap">Tri:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-1">
                  <button
                    onClick={() => {
                      if (sortBy === 'date') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('date');
                        setSortDirection('desc');
                      }
                    }}
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
                    onClick={() => {
                      if (sortBy === 'priority') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('priority');
                        setSortDirection('desc');
                      }
                    }}
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
          </div>
        </CardBody>
      </Card>

      {/* Desktop Kanban Board */}
      <div className="hidden md:block">
        <KanbanBoard 
          onTaskClick={handleTaskClick}
          tasks={filteredAndSortedTasks}
        />
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-4">
        {COLUMNS.map((column) => {
          const columnTasks = filteredAndSortedTasks.filter((t) => t.status === column.id);
          
          return (
            <div key={column.id} className="space-y-2">
              {/* Status Header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune tâche
                </div>
              ) : (
                <div className="space-y-3">
                  {columnTasks.map((task) => {
                    const propertyName = task.propertyId
                      ? properties?.find((p) => p.id === task.propertyId)?.name
                      : null;
                    
                    const priorityStyle = {
                      high: { badge: 'danger' as const, border: 'border-l-danger-500' },
                      medium: { badge: 'warning' as const, border: 'border-l-warning-500' },
                      low: { badge: 'gray' as const, border: 'border-l-gray-400' },
                    }[task.priority];
                    
                    const priorityLabel = {
                      high: 'Haute',
                      medium: 'Moyenne',
                      low: 'Basse',
                    }[task.priority];

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`bg-white rounded-lg shadow-sm border-l-4 p-4 cursor-pointer hover:shadow-md transition-shadow ${priorityStyle.border}`}
                      >
                        {/* Title */}
                        <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>

                        {/* Description */}
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant={priorityStyle.badge} size="sm">
                            {priorityLabel}
                          </Badge>

                          {propertyName && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Building2 className="w-3 h-3" />
                              <span>{propertyName}</span>
                            </div>
                          )}

                          <Badge
                            variant={task.assignedTo === 'admin' ? 'primary' : 'gray'}
                            size="sm"
                          >
                            {task.assignedTo === 'admin' ? 'Admin' : 'Staff'}
                          </Badge>
                        </div>

                        {/* Status Change (for staff) */}
                        {!isAdmin && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <select
                              value={task.status}
                              onChange={(e) => {
                                updateTaskStatus.mutate({
                                  id: task.id,
                                  status: e.target.value as Task['status'],
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="todo">À faire</option>
                              <option value="in_progress">En cours</option>
                              <option value="done">Terminé</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Details Modal (for staff) */}
      <TaskDetailsModal
        task={viewingTask}
        property={viewingTask ? properties?.find(p => p.id === viewingTask.propertyId) : undefined}
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={isAdmin ? handleEditFromDetails : undefined}
        onDelete={isAdmin ? handleDeleteFromDetails : undefined}
        isAdmin={isAdmin}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle tâche"
        size="md"
      >
        <TaskForm
          onSubmit={handleCreate}
          isLoading={createTask.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Modifier la tâche"
        size="md"
      >
        <TaskForm
          onSubmit={handleUpdate}
          isLoading={updateTask.isPending}
        />
        {isAdmin && editingTask && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="danger"
              onClick={() => {
                setDeletingTask(editingTask);
                setEditingTask(null);
              }}
              className="w-full"
            >
              Supprimer cette tâche
            </Button>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDelete}
        title="Supprimer la tâche ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingTask?.title}" ?`}
        confirmText="Supprimer"
        isLoading={deleteTask.isPending}
      />
    </div>
  );
};

export default Tasks;

