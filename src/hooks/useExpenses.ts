import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkCreateExpenses,
} from '../services/expenseService';
import type { ExpenseFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';
import { MOBILE_MONEY_QUERY_KEY } from './useMobileMoney';

export const EXPENSES_QUERY_KEY = ['expenses'];

export function useExpenses() {
  return useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: getExpenses,
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, id],
    queryFn: () => (id ? getExpense(id) : null),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: async ({
      data,
      receiptFile,
    }: {
      data: ExpenseFormData;
      receiptFile?: File;
    }) => {
      return createExpense(data, receiptFile || null, mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MOBILE_MONEY_QUERY_KEY });
      success('Dépense enregistrée', 'La dépense a été ajoutée avec succès.');
    },
    onError: (err) => {
      error('Erreur', "Impossible d'enregistrer la dépense.");
      console.error(err);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      id,
      data,
      newReceipt,
    }: {
      id: string;
      data: Partial<ExpenseFormData>;
      newReceipt?: File;
    }) => updateExpense(id, data, newReceipt || null, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      success('Dépense mise à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour la dépense.');
      console.error(err);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      success('Dépense supprimée', 'La dépense a été supprimée.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la dépense.');
      console.error(err);
    },
  });
}

// Get expenses grouped by category
export function useExpensesByCategory() {
  const { data: expenses, ...rest } = useExpenses();

  const byCategory = React.useMemo(() => {
    if (!expenses) return {};
    
    return expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { count: 0, totalEUR: 0, totalFCFA: 0 };
      }
      acc[category].count += 1;
      acc[category].totalEUR += expense.amountEUR;
      acc[category].totalFCFA += expense.amountFCFA;
      return acc;
    }, {} as Record<string, { count: number; totalEUR: number; totalFCFA: number }>);
  }, [expenses]);

  return { data: byCategory, ...rest };
}

export function useBulkCreateExpenses() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (expenses: ExpenseFormData[]) => bulkCreateExpenses(expenses, mode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MOBILE_MONEY_QUERY_KEY });
      success('Import réussi', `${data.length} dépense(s) importée(s) avec succès.`);
    },
    onError: (err) => {
      error('Erreur', "Impossible d'importer les dépenses.");
      console.error(err);
    },
  });
}
