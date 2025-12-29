import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import KanbanBoard from '../components/kanban/KanbanBoard';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import { useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import { useMode } from '../store/useAppStore';
import type { Task, TaskFormData } from '../types';
import { TASK_PRIORITIES } from '../types';

const Tasks: React.FC = () => {
  const { isAdmin } = useMode();
  const { data: properties } = useProperties();

  // State
  const [showForm, setShowForm] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

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

      {/* Kanban Board */}
      <KanbanBoard onTaskClick={handleTaskClick} />

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

