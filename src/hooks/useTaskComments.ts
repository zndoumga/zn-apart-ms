import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskComments, addTaskComment, deleteTaskComment } from '../services/taskCommentService';
import { useAppStore, useToast } from '../store/useAppStore';

export const TASK_COMMENTS_QUERY_KEY = ['task-comments'];

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId],
    queryFn: () => (taskId ? getTaskComments(taskId) : []),
    enabled: !!taskId,
  });
}

export function useAddTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (content: string) => addTaskComment(taskId, content, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId] });
      success('Commentaire ajouté', 'Votre commentaire a été ajouté.');
    },
    onError: (err) => {
      error('Erreur', "Impossible d'ajouter le commentaire.");
      console.error(err);
    },
  });
}

export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId] });
      success('Commentaire supprimé', 'Le commentaire a été supprimé.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer le commentaire.');
      console.error(err);
    },
  });
}

