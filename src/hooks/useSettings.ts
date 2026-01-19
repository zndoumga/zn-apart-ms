import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getSettings,
  updateSettings,
  changeAdminPassword,
  changeInvestorPassword,
  changeStaffPassword,
} from '../services/settingsService';
import type { Settings } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const SETTINGS_QUERY_KEY = ['settings'];

export function useSettings() {
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);
  const setLowBalanceThreshold = useAppStore((state) => state.setLowBalanceThreshold);
  
  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSettings,
  });

  // Sync settings to Zustand store when loaded
  useEffect(() => {
    if (query.data) {
      if (query.data.exchangeRate !== undefined) {
        setExchangeRate(query.data.exchangeRate);
      }
      if (query.data.lowBalanceThreshold !== undefined) {
        setLowBalanceThreshold(query.data.lowBalanceThreshold);
      }
    }
  }, [query.data, setExchangeRate, setLowBalanceThreshold]);

  return query;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);
  const setLowBalanceThreshold = useAppStore((state) => state.setLowBalanceThreshold);

  return useMutation({
    mutationFn: (data: Partial<Omit<Settings, 'updatedAt'>>) =>
      updateSettings(data, mode),
    onSuccess: (updatedSettings) => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      // Update the local exchange rate in Zustand store
      if (updatedSettings.exchangeRate !== undefined) {
        setExchangeRate(updatedSettings.exchangeRate);
      }
      // Update the low balance threshold in Zustand store
      if (updatedSettings.lowBalanceThreshold !== undefined) {
        setLowBalanceThreshold(updatedSettings.lowBalanceThreshold);
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

export function useChangeInvestorPassword() {
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changeInvestorPassword(currentPassword, newPassword, mode),
    onSuccess: (changed) => {
      if (changed) {
        success('Mot de passe modifié', 'Le mot de passe investisseur a été changé.');
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

export function useChangeStaffPassword() {
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changeStaffPassword(currentPassword, newPassword, mode),
    onSuccess: (changed) => {
      if (changed) {
        success('Mot de passe modifié', 'Le mot de passe staff a été changé.');
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
