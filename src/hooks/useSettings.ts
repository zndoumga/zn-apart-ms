import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  updateSettings,
  changeAdminPassword,
} from '../services/settingsService';
import type { Settings } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const SETTINGS_QUERY_KEY = ['settings'];

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);

  return useMutation({
    mutationFn: (data: Partial<Omit<Settings, 'updatedAt'>>) =>
      updateSettings(data, mode),
    onSuccess: (updatedSettings) => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      // Update the local exchange rate in Zustand store
      if (updatedSettings.exchangeRate) {
        setExchangeRate(updatedSettings.exchangeRate);
      }
      success('Paramètres mis à jour', 'Les paramètres ont été enregistrés.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour les paramètres.');
      console.error(err);
    },
  });
}

export function useChangeAdminPassword() {
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changeAdminPassword(currentPassword, newPassword, mode),
    onSuccess: (changed) => {
      if (changed) {
        success('Mot de passe modifié', 'Le mot de passe admin a été changé.');
      } else {
        error('Erreur', 'Mot de passe actuel incorrect.');
      }
    },
    onError: (err) => {
      error('Erreur', 'Impossible de changer le mot de passe.');
      console.error(err);
    },
  });
}
