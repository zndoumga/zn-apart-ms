import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBookingComments,
  addBookingComment,
  deleteBookingComment,
} from '../services/bookingCommentService';
import { useAppStore, useToast } from '../store/useAppStore';

export const BOOKING_COMMENTS_QUERY_KEY = ['booking-comments'];

export function useBookingComments(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...BOOKING_COMMENTS_QUERY_KEY, bookingId],
    queryFn: () => (bookingId ? getBookingComments(bookingId) : []),
    enabled: !!bookingId,
  });
}

export function useAddBookingComment(bookingId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (content: string) => addBookingComment(bookingId, content, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BOOKING_COMMENTS_QUERY_KEY, bookingId] });
      success('Commentaire ajouté', 'Votre commentaire a été ajouté.');
    },
    onError: (err) => {
      error('Erreur', "Impossible d'ajouter le commentaire.");
      console.error(err);
    },
  });
}

export function useDeleteBookingComment(bookingId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => deleteBookingComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BOOKING_COMMENTS_QUERY_KEY, bookingId] });
      success('Commentaire supprimé', 'Le commentaire a été supprimé.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer le commentaire.');
      console.error(err);
    },
  });
}

