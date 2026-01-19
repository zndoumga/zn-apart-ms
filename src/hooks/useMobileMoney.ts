import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMobileMoneyTransactions,
  getCurrentBalance,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/mobileMoneyService';
import type { TransferFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const MOBILE_MONEY_QUERY_KEY = ['mobileMoney'];

export function useTransactions() {
  return useQuery({
    queryKey: [...MOBILE_MONEY_QUERY_KEY, 'transactions'],
    queryFn: getMobileMoneyTransactions,
  });
}

export function useCurrentBalance() {
  return useQuery({
    queryKey: [...MOBILE_MONEY_QUERY_KEY, 'balance'],
    queryFn: getCurrentBalance,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (data: TransferFormData) => createTransaction(data, mode),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: MOBILE_MONEY_QUERY_KEY });
      success(
        data.type === 'deposit' ? 'Dépôt effectué' : 'Retrait effectué',
        'La transaction a été enregistrée.'
      );
    },
    onError: (err) => {
      error('Erreur', 'Impossible d\'effectuer la transaction.');
      console.error(err);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferFormData }) => updateTransaction(id, data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_MONEY_QUERY_KEY });
      success('Transaction modifiée', 'La transaction a été mise à jour.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de modifier la transaction.');
      console.error(err);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_MONEY_QUERY_KEY });
      success('Transaction supprimée', 'La transaction a été annulée.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la transaction.');
      console.error(err);
    },
  });
}

// Alias for backward compatibility
export const useAddTransfer = useCreateTransaction;

// Check if balance is low
export function useIsBalanceLow() {
  const { data: balance } = useCurrentBalance();
  const lowBalanceThresholdEUR = useAppStore((state) => state.lowBalanceThreshold);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  
  // Convert threshold from EUR to FCFA
  const lowBalanceThresholdFCFA = lowBalanceThresholdEUR * exchangeRate;
  
  return {
    data: balance ? balance.balanceFCFA < lowBalanceThresholdFCFA : false,
  };
}
