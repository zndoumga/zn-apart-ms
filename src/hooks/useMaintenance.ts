import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMaintenanceEntries,
  getMaintenanceEntry,
  getMaintenanceByProperty,
  createMaintenanceEntry,
  updateMaintenanceEntry,
  deleteMaintenanceEntry,
} from '../services/maintenanceService';
import type { MaintenanceFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const MAINTENANCE_QUERY_KEY = ['maintenance'];

export function useMaintenance() {
  return useQuery({
    queryKey: MAINTENANCE_QUERY_KEY,
    queryFn: getMaintenanceEntries,
  });
}

export function useMaintenanceEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...MAINTENANCE_QUERY_KEY, id],
    queryFn: () => (id ? getMaintenanceEntry(id) : null),
    enabled: !!id,
  });
}

export function useMaintenanceByProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: [...MAINTENANCE_QUERY_KEY, 'property', propertyId],
    queryFn: () => (propertyId ? getMaintenanceByProperty(propertyId) : []),
    enabled: !!propertyId,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      data,
      beforePhotos = [],
      afterPhotos = [],
    }: {
      data: MaintenanceFormData;
      beforePhotos?: File[];
      afterPhotos?: File[];
    }) => createMaintenanceEntry(data, beforePhotos, afterPhotos, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEY });
      success('Maintenance enregistrée', "L'entrée de maintenance a été ajoutée.");
    },
    onError: (err) => {
      error('Erreur', "Impossible d'enregistrer la maintenance.");
      console.error(err);
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      id,
      data,
      newBeforePhotos = [],
      newAfterPhotos = [],
      beforePhotosToDelete = [],
      afterPhotosToDelete = [],
    }: {
      id: string;
      data: Partial<MaintenanceFormData>;
      newBeforePhotos?: File[];
      newAfterPhotos?: File[];
      beforePhotosToDelete?: string[];
      afterPhotosToDelete?: string[];
    }) =>
      updateMaintenanceEntry(
        id,
        data,
        newBeforePhotos,
        newAfterPhotos,
        beforePhotosToDelete,
        afterPhotosToDelete,
        mode
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEY });
      success('Maintenance mise à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour la maintenance.');
      console.error(err);
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteMaintenanceEntry(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEY });
      success('Maintenance supprimée', "L'entrée a été supprimée.");
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la maintenance.');
      console.error(err);
    },
  });
}
