import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  getTask,
  getTasksByStatus,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../services/taskService';
import type { TaskFormData, TaskStatus, Task } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const TASKS_QUERY_KEY = ['tasks'];

export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: getTasks,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, id],
    queryFn: () => (id ? getTask(id) : null),
    enabled: !!id,
  });
}

export function useTasksByStatus(status: TaskStatus) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'status', status],
    queryFn: () => getTasksByStatus(status),
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'counts'],
    queryFn: async () => {
      const tasks = await getTasks();
      return {
        todo: tasks.filter((t: Task) => t.status === 'todo').length,
        inProgress: tasks.filter((t: Task) => t.status === 'in_progress').length,
        done: tasks.filter((t: Task) => t.status === 'done').length,
        total: tasks.length,
      };
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (data: TaskFormData) => createTask(data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      success('Tâche créée', 'La tâche a été ajoutée avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de créer la tâche.');
      console.error(err);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) =>
      updateTask(id, data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      success('Tâche mise à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour la tâche.');
      console.error(err);
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTaskStatus(id, status, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteTask(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      success('Tâche supprimée', 'La tâche a été supprimée.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la tâche.');
      console.error(err);
    },
  });
}
