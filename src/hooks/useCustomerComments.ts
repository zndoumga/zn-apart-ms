import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomerComments, addCustomerComment, deleteCustomerComment } from '../services/customerCommentService';
import { useAppStore, useToast } from '../store/useAppStore';

export const CUSTOMER_COMMENTS_QUERY_KEY = ['customer-comments'];

export function useCustomerComments(customerId: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMER_COMMENTS_QUERY_KEY, customerId],
    queryFn: () => (customerId ? getCustomerComments(customerId) : []),
    enabled: !!customerId,
  });
}

export function useAddCustomerComment(customerId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (content: string) => addCustomerComment(customerId, content, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CUSTOMER_COMMENTS_QUERY_KEY, customerId] });
      success('Commentaire ajouté', 'Votre commentaire a été ajouté.');
    },
    onError: (err) => {
      error('Erreur', "Impossible d'ajouter le commentaire.");
      console.error(err);
    },
  });
}

export function useDeleteCustomerComment(customerId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => deleteCustomerComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CUSTOMER_COMMENTS_QUERY_KEY, customerId] });
      success('Commentaire supprimé', 'Le commentaire a été supprimé.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer le commentaire.');
      console.error(err);
    },
  });
}

