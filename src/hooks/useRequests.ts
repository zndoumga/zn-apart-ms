import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRequests,
  getRequest,
  getRequestsByStatus,
  createRequest,
  updateRequestStatus,
  addComment,
  deleteRequest,
} from '../services/requestService';
import type { RequestFormData, RequestStatus, StaffRequest } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const REQUESTS_QUERY_KEY = ['requests'];

export function useRequests() {
  return useQuery({
    queryKey: REQUESTS_QUERY_KEY,
    queryFn: getRequests,
  });
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...REQUESTS_QUERY_KEY, id],
    queryFn: () => (id ? getRequest(id) : null),
    enabled: !!id,
  });
}

export function useRequestsByStatus(status: RequestStatus) {
  return useQuery({
    queryKey: [...REQUESTS_QUERY_KEY, 'status', status],
    queryFn: () => getRequestsByStatus(status),
  });
}

export function useUnresolvedRequestCount() {
  return useQuery({
    queryKey: [...REQUESTS_QUERY_KEY, 'unresolvedCount'],
    queryFn: async () => {
      const requests = await getRequests();
      return requests.filter((r: StaffRequest) => r.status === 'pending' || r.status === 'in_review').length;
    },
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (data: RequestFormData) => createRequest(data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
      success('Demande créée', 'Votre demande a été soumise avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de créer la demande.');
      console.error(err);
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      updateRequestStatus(id, status, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
      success('Statut mis à jour', 'Le statut de la demande a été modifié.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de modifier le statut.');
      console.error(err);
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ requestId, content }: { requestId: string; content: string }) =>
      addComment(requestId, content, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
    },
    onError: (err) => {
      error('Erreur', "Impossible d'ajouter le commentaire.");
      console.error(err);
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteRequest(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
      success('Demande supprimée', 'La demande a été supprimée.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la demande.');
      console.error(err);
    },
  });
}
