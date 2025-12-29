import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  setCustomerVIP,
} from '../services/customerService';
import type { Customer, CustomerFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';

export const CUSTOMERS_QUERY_KEY = ['customers'];

interface UseCustomersOptions {
  search?: string;
}

export function useCustomers(options?: UseCustomersOptions) {
  return useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, options?.search],
    queryFn: async () => {
      const customers = await getCustomers();
      if (!options?.search) return customers;
      
      const searchLower = options.search.toLowerCase();
      return customers.filter((c: Customer) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(options.search || '')
      );
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, id],
    queryFn: () => (id ? getCustomer(id) : null),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (data: CustomerFormData) => createCustomer(data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      success('Client créé', 'Le client a été ajouté avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de créer le client.');
      console.error(err);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
      updateCustomer(id, data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      success('Client mis à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour le client.');
      console.error(err);
    },
  });
}

export function useSetCustomerVIP() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, isVIP }: { id: string; isVIP: boolean }) =>
      setCustomerVIP(id, isVIP, mode),
    onSuccess: (_, { isVIP }) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      success(
        isVIP ? 'Client VIP' : 'Statut VIP retiré',
        isVIP ? 'Le client est maintenant VIP.' : 'Le statut VIP a été retiré.'
      );
    },
    onError: (err) => {
      error('Erreur', 'Impossible de modifier le statut VIP.');
      console.error(err);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      success('Client supprimé', 'Le client a été supprimé.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer le client.');
      console.error(err);
    },
  });
}

interface CustomerWithStats {
  customer: Customer | null;
  totalBookings: number;
  totalRevenue: number;
  avgStayDuration: number;
  lastStayDate: Date | null;
}

export function useCustomerWithStats(id: string | undefined) {
  return useQuery<CustomerWithStats | null>({
    queryKey: [...CUSTOMERS_QUERY_KEY, id, 'stats'],
    queryFn: async () => {
      if (!id) return null;
      
      const customer = await getCustomer(id);
      if (!customer) return null;

      // Return customer with stats from the customer record
      return {
        customer,
        totalBookings: customer.totalBookings || 0,
        totalRevenue: customer.totalSpentEUR || 0,
        avgStayDuration: customer.totalBookings > 0 ? 3.5 : 0, // Placeholder - would need booking data
        lastStayDate: null, // Would need to fetch last booking
      };
    },
    enabled: !!id,
  });
}
