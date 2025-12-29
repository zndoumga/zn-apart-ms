import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  setCustomerVIP,
} from '../services/customerService';
import { getBookingsByCustomer } from '../services/bookingService';
import type { Customer, CustomerFormData } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';
import { differenceInDays } from 'date-fns';

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

      // Fetch actual bookings for this customer to calculate real stats
      // First try by customer_id
      let bookings = await getBookingsByCustomer(id);
      
      console.log(`[Customer Stats] Customer ID: ${id}, Name: ${customer.name}, Email: ${customer.email}`);
      console.log(`[Customer Stats] Bookings by customer_id: ${bookings.length}`);
      
      // If no bookings found by customer_id, try matching by email or name
      if (bookings.length === 0 && (customer.email || customer.name)) {
        const { supabase, TABLES } = await import('../services/supabase');
        const { mapBookingFromDB } = await import('../services/bookingService');
        
        let query = supabase
          .from(TABLES.BOOKINGS)
          .select('*')
          .neq('is_deleted', true);
        
        // Build OR conditions for matching
        const conditions: string[] = [];
        
        // Match by email if available
        if (customer.email) {
          conditions.push(`guest_email.eq.${customer.email}`);
        }
        
        // Also try matching by name (case-insensitive, partial match)
        if (customer.name) {
          // Try exact match first
          conditions.push(`guest_name.ilike.${customer.name}`);
          // Also try partial match
          conditions.push(`guest_name.ilike.%${customer.name}%`);
        }
        
        // Add customer_id as fallback
        conditions.push(`customer_id.eq.${id}`);
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
        
        const { data, error } = await query.order('check_in', { ascending: false });
        
        console.log(`[Customer Stats] Bookings by email/name: ${data?.length || 0}, Error:`, error);
        
        if (!error && data) {
          bookings = data.map(mapBookingFromDB);
          console.log(`[Customer Stats] Matched bookings:`, bookings.map(b => ({ id: b.id, guestName: b.guestName, guestEmail: b.guestEmail, totalPriceEUR: b.totalPriceEUR })));
        }
      }
      
      console.log(`[Customer Stats] Total bookings found: ${bookings.length}`);
      console.log(`[Customer Stats] Total revenue: ${bookings.reduce((sum, b) => sum + b.totalPriceEUR, 0)}`);
      
      // Calculate stats from actual bookings
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPriceEUR, 0);
      
      // Calculate average stay duration
      let totalNights = 0;
      bookings.forEach((booking) => {
        const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
        totalNights += nights;
      });
      const avgStayDuration = totalBookings > 0 ? totalNights / totalBookings : 0;
      
      // Get last stay date
      const lastStayDate = bookings.length > 0 
        ? new Date(bookings[0].checkIn) // Already sorted by checkIn desc
        : null;

      return {
        customer,
        totalBookings,
        totalRevenue,
        avgStayDuration,
        lastStayDate,
      };
    },
    enabled: !!id,
  });
}
