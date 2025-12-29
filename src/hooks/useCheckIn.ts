import { useMutation, useQueryClient } from '@tanstack/react-query';
import { processCheckIn, getCustomer } from '../services/checkInService';
import { useAppStore, useToast } from '../store/useAppStore';
import { BOOKINGS_QUERY_KEY } from './useBookings';
import type { CheckInFormData } from '../types';

export function useProcessCheckIn(bookingId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const mode = useAppStore((state) => state.mode);

  return useMutation({
    mutationFn: ({
      checkInData,
      idFileFront,
      idFileBack,
      signatureDataUrl,
    }: {
      checkInData: CheckInFormData;
      idFileFront: File | null;
      idFileBack: File | null;
      signatureDataUrl: string | null;
    }) => processCheckIn(bookingId, checkInData, idFileFront, idFileBack, signatureDataUrl, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      success('Check-in effectué', 'Le client a été enregistré avec succès.');
    },
    onError: (err) => {
      error('Erreur', 'Impossible d\'effectuer le check-in.');
      console.error(err);
    },
  });
}

export { getCustomer };

