import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../services/propertyService';
import type { PropertyFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const PROPERTIES_QUERY_KEY = ['properties'];

export function useProperties(activeOnly?: boolean) {
  return useQuery({
    queryKey: [...PROPERTIES_QUERY_KEY, { activeOnly }],
    queryFn: async () => {
      const properties = await getProperties();
      if (activeOnly) {
        return properties.filter((p) => p.status === 'active');
      }
      return properties;
    },
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: [...PROPERTIES_QUERY_KEY, id],
    queryFn: () => (id ? getProperty(id) : null),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ data, photos }: { data: PropertyFormData; photos: File[] }) =>
      createProperty(data, photos, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
      success('Appartement créé', 'L\'appartement a été ajouté avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de créer l\'appartement.');
      console.error(err);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      id,
      data,
      newPhotos = [],
      photosToDelete = [],
    }: {
      id: string;
      data: Partial<PropertyFormData>;
      newPhotos?: File[];
      photosToDelete?: string[];
    }) => updateProperty(id, data, newPhotos, photosToDelete, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
      success('Appartement mis à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour l\'appartement.');
      console.error(err);
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteProperty(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
      success('Appartement supprimé', 'L\'appartement a été supprimé avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer l\'appartement.');
      console.error(err);
    },
  });
}
