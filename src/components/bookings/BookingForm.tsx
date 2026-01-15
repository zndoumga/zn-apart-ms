import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import DatePicker from '../ui/DatePicker';
import { useProperties } from '../../hooks/useProperties';
import { useCustomers } from '../../hooks/useCustomers';
import { useCurrency } from '../../store/useAppStore';
import { calculateNights, formatForInput } from '../../utils/dates';
import type { BookingFormData, Booking, Customer } from '../../types';
import { BOOKING_SOURCES, BOOKING_FORM_STATUSES, PAYMENT_STATUSES } from '../../types';

const bookingSchema = z.object({
  propertyId: z.string().min(1, 'Appartement requis'),
  guestName: z.string().min(2, 'Nom du client requis'),
  customerId: z.string().optional(),
  guestEmail: z.string().optional(),
  guestPhone: z.string().optional(),
  checkIn: z.string().min(1, "Date d'arrivée requise"),
  checkOut: z.string().min(1, 'Date de départ requise'),
  guests: z.number().min(1, 'Au moins 1 invité'),
  totalPriceEUR: z.number().min(0, 'Prix invalide'),
  totalPriceFCFA: z.number().min(0, 'Prix invalide'),
  source: z.enum(['airbnb', 'booking', 'direct', 'other']),
  status: z.enum(['inquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled']),
  paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  initialData?: Booking;
  isLoading?: boolean;
  onCancel?: () => void;
}

type InputCurrency = 'EUR' | 'FCFA';

const BookingForm: React.FC<BookingFormProps> = ({
  onSubmit,
  initialData,
  isLoading,
  onCancel,
}) => {
  const { data: properties } = useProperties();
  const { data: customers } = useCustomers();
  const { formatAmount, exchangeRate } = useCurrency();
  const [inputCurrency, setInputCurrency] = useState<InputCurrency>('EUR');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: initialData
      ? {
          propertyId: initialData.propertyId,
          guestName: initialData.guestName,
          checkIn: formatForInput(initialData.checkIn),
          checkOut: formatForInput(initialData.checkOut),
          guests: initialData.guests,
          totalPriceEUR: initialData.totalPriceEUR,
          totalPriceFCFA: initialData.totalPriceFCFA,
          source: initialData.source,
          status: initialData.status,
          paymentStatus: initialData.paymentStatus || 'pending',
          notes: initialData.notes || '',
        }
      : {
          propertyId: '',
          guestName: '',
          customerId: undefined,
          guestEmail: undefined,
          guestPhone: undefined,
          checkIn: formatForInput(new Date()),
          checkOut: '',
          guests: 2,
          totalPriceEUR: 0,
          totalPriceFCFA: 0,
          source: 'airbnb',
          status: 'confirmed',
          paymentStatus: 'pending',
          notes: '',
        },
  });

  const guestName = watch('guestName');

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers || !customerSearch || customerSearch.length < 2) return [];
    const searchLower = customerSearch.toLowerCase();
    return customers
      .filter((c) => 
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower)
      )
      .slice(0, 5); // Limit to 5 results
  }, [customers, customerSearch]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setValue('guestName', customer.name);
    setValue('customerId', customer.id);
    setValue('guestEmail', customer.email || '');
    setValue('guestPhone', customer.phone || '');
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  // Handle guest name change
  const handleGuestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('guestName', value);
    setCustomerSearch(value);
    
    // Clear selected customer if name doesn't match
    if (selectedCustomer && selectedCustomer.name !== value) {
      setSelectedCustomer(null);
      setValue('customerId', undefined);
      setValue('guestEmail', undefined);
      setValue('guestPhone', undefined);
    }
    
    // Show dropdown if there are matches
    if (value.length >= 2 && filteredCustomers.length > 0) {
      setShowCustomerDropdown(true);
    } else {
      setShowCustomerDropdown(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkIn = watch('checkIn');
  const checkOut = watch('checkOut');
  const totalPriceEUR = watch('totalPriceEUR');
  const totalPriceFCFA = watch('totalPriceFCFA');
  const selectedPropertyId = watch('propertyId');

  // Auto-fill price from property
  useEffect(() => {
    if (selectedPropertyId && !initialData) {
      const property = properties?.find((p) => p.id === selectedPropertyId);
      if (property && checkIn && checkOut) {
        const nights = calculateNights(checkIn, checkOut);
        if (nights > 0) {
          const eurPrice = property.basePriceEUR * nights;
          setValue('totalPriceEUR', eurPrice);
          setValue('totalPriceFCFA', Math.round(eurPrice * exchangeRate));
        }
      }
    }
  }, [selectedPropertyId, properties, setValue, initialData, checkIn, checkOut, exchangeRate]);

  // Handle EUR input change
  const handleEURChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const eurValue = parseFloat(e.target.value) || 0;
    setValue('totalPriceEUR', eurValue);
    setValue('totalPriceFCFA', Math.round(eurValue * exchangeRate));
  };

  // Handle FCFA input change
  const handleFCFAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fcfaValue = parseFloat(e.target.value) || 0;
    setValue('totalPriceFCFA', fcfaValue);
    setValue('totalPriceEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100);
  };

  const propertyOptions =
    properties?.map((p) => ({
      value: p.id,
      label: p.name,
    })) || [];

  const handleFormSubmit = (data: BookingFormValues) => {
    const formData: BookingFormData = {
      propertyId: data.propertyId,
      customerId: data.customerId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      totalPriceEUR: data.totalPriceEUR,
      totalPriceFCFA: data.totalPriceFCFA,
      source: data.source,
      status: data.status,
      paymentStatus: data.paymentStatus || 'pending',
      notes: data.notes,
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
      {/* Property selection */}
      <Controller
        name="propertyId"
        control={control}
        render={({ field }) => (
          <Select
            label="Appartement"
            options={propertyOptions}
            placeholder="Sélectionner un appartement"
            error={errors.propertyId?.message}
            required
            {...field}
          />
        )}
      />

      {/* Guest info with customer autocomplete */}
      <div className="relative" ref={customerDropdownRef}>
        <div className="relative">
          <Input
            label="Nom du client"
            placeholder="Jean Dupont"
            error={errors.guestName?.message}
            required
            value={guestName}
            onChange={handleGuestNameChange}
            onFocus={() => {
              if (guestName && guestName.length >= 2 && filteredCustomers.length > 0) {
                setShowCustomerDropdown(true);
              }
            }}
          />
          {selectedCustomer && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer(null);
                setValue('guestName', '');
                setValue('customerId', undefined);
                setValue('guestEmail', undefined);
                setValue('guestPhone', undefined);
                setCustomerSearch('');
              }}
              className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Customer dropdown */}
        {showCustomerDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelectCustomer(customer)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{customer.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {customer.email && <span>{customer.email}</span>}
                  {customer.email && customer.phone && <span> • </span>}
                  {customer.phone && <span>{customer.phone}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {selectedCustomer && (
          <p className="text-xs text-primary-600 mt-1">
            ✓ Client existant sélectionné - Les informations seront pré-remplies lors du check-in
          </p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="checkIn"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Date d'arrivée"
              error={errors.checkIn?.message}
              required
              {...field}
            />
          )}
        />
        <Controller
          name="checkOut"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Date de départ"
              error={errors.checkOut?.message}
              required
              {...field}
            />
          )}
        />
      </div>

      {/* Guests */}
      <Input
        label="Nombre d'invités"
        type="number"
        min={1}
        error={errors.guests?.message}
        required
        {...register('guests', { valueAsNumber: true })}
      />

      {/* Price with currency toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Prix total <span className="text-danger-500">*</span>
          </label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setInputCurrency('EUR')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                inputCurrency === 'EUR'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              EUR €
            </button>
            <button
              type="button"
              onClick={() => setInputCurrency('FCFA')}
              className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-200 ${
                inputCurrency === 'FCFA'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              FCFA
            </button>
          </div>
        </div>

        {inputCurrency === 'EUR' ? (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={totalPriceEUR || ''}
              onChange={handleEURChange}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.00"
            />
            {totalPriceFCFA > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                ≈ {totalPriceFCFA.toLocaleString()} FCFA
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <input
              type="number"
              min={0}
              step={1}
              value={totalPriceFCFA || ''}
              onChange={handleFCFAChange}
              className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">FCFA</span>
            {totalPriceEUR > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                ≈ {totalPriceEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            )}
          </div>
        )}
        {(errors.totalPriceEUR || errors.totalPriceFCFA) && (
          <p className="text-sm text-danger-600">{errors.totalPriceEUR?.message || errors.totalPriceFCFA?.message}</p>
        )}
      </div>

      {/* Total calculation */}
      {(totalPriceEUR > 0 || totalPriceFCFA > 0) && (
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-lg font-bold text-primary-700">
              {formatAmount(totalPriceEUR, totalPriceFCFA)}
            </span>
          </div>
        </div>
      )}

      {/* Source, status, and payment status */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <Select
              label="Source de réservation"
              options={BOOKING_SOURCES}
              error={errors.source?.message}
              {...field}
            />
          )}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="Statut"
              options={BOOKING_FORM_STATUSES}
              error={errors.status?.message}
              {...field}
            />
          )}
        />
      </div>

      {/* Payment status */}
      <Controller
        name="paymentStatus"
        control={control}
        render={({ field }) => (
          <Select
            label="Statut de paiement"
            options={PAYMENT_STATUSES}
            error={errors.paymentStatus?.message}
            {...field}
            value={field.value || 'pending'}
          />
        )}
      />

      {/* Notes */}
      <TextArea
        label="Notes (optionnel)"
        placeholder="Informations supplémentaires..."
        {...register('notes')}
      />
      </div>

      {/* Actions - fixed footer */}
      <div className="flex gap-3 justify-end pt-4 mt-4 border-t bg-white flex-shrink-0">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Mettre à jour' : 'Créer la réservation'}
        </Button>
      </div>
    </form>
  );
};

export default BookingForm;
