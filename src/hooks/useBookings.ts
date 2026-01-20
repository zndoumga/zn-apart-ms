import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBookings,
  getBooking,
  getBookingsInRange,
  createBooking,
  updateBooking,
  deleteBooking,
  bulkCreateBookings,
} from '../services/bookingService';
import type { BookingFormData, Booking } from '../types';
import { useAppStore, useToast } from '../store/useAppStore';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export const BOOKINGS_QUERY_KEY = ['bookings'];

export function useBookings() {
  return useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getBookings,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: [...BOOKINGS_QUERY_KEY, id],
    queryFn: () => (id ? getBooking(id) : null),
    enabled: !!id,
  });
}

export function useUpcomingCheckIns() {
  return useQuery({
    queryKey: [...BOOKINGS_QUERY_KEY, 'upcoming'],
    queryFn: async () => {
      const bookings = await getBookings();
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of today
      
      // Include bookings that are confirmed, inquiry, or checked_in (not cancelled or checked_out)
      const validStatuses = ['confirmed', 'inquiry', 'checked_in'];
      
      return bookings
        .filter((b: Booking) => {
          const checkIn = new Date(b.checkIn);
          checkIn.setHours(0, 0, 0, 0); // Normalize to start of day
          const isFutureOrToday = checkIn >= now;
          const hasValidStatus = validStatuses.includes(b.status);
          return isFutureOrToday && hasValidStatus;
        })
        .sort((a: Booking, b: Booking) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
        // Return all upcoming reservations (no limit)
    },
  });
}

export function useBookingsForCalendar(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: [...BOOKINGS_QUERY_KEY, 'calendar', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getBookingsInRange(startDate, endDate),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (data: BookingFormData) => createBooking(data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      success('Réservation créée', 'La réservation a été enregistrée avec succès.');
    },
    onError: (err: any) => {
      const errorMessage = err?.message || err?.error?.message || 'Impossible de créer la réservation.';
      error('Erreur', errorMessage);
      console.error('Error creating booking:', err);
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BookingFormData> }) =>
      updateBooking(id, data, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      success('Réservation mise à jour', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de mettre à jour la réservation.');
      console.error(err);
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (id: string) => deleteBooking(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      success('Réservation supprimée', 'La réservation a été supprimée avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible de supprimer la réservation.');
      console.error(err);
    },
  });
}

export function useBulkCreateBookings() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: (bookings: BookingFormData[]) => bulkCreateBookings(bookings, mode),
    onSuccess: (createdBookings) => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      success(
        'Import réussi',
        `${createdBookings.length} réservation(s) importée(s) avec succès.`
      );
    },
    onError: (err) => {
      error('Erreur d\'import', 'Impossible d\'importer les réservations.');
      console.error(err);
    },
  });
}
