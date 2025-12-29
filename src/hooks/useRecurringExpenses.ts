import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecurringExpenses,
  getRecurringExpense,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from '../services/recurringExpenseService';
import type { RecurringExpense, RecurringExpenseFormData } from '../types';

export function useRecurringExpenses() {
  return useQuery({
    queryKey: ['recurringExpenses'],
    queryFn: getRecurringExpenses,
  });
}

export function useRecurringExpense(id: string) {
  return useQuery({
    queryKey: ['recurringExpense', id],
    queryFn: () => getRecurringExpense(id),
    enabled: !!id,
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecurringExpenseFormData) => createRecurringExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
    },
  });
}

export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringExpenseFormData> }) =>
      updateRecurringExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
    },
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
    },
  });
}

