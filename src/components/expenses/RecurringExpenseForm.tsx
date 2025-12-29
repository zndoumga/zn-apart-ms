import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import CurrencyToggle from '../ui/CurrencyToggle';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import type { RecurringExpenseFormData, RecurringExpense, Currency } from '../../types';
import { EXPENSE_CATEGORIES } from '../../types';

interface RecurringExpenseFormProps {
  onSubmit: (data: RecurringExpenseFormData) => void;
  initialData?: RecurringExpense;
  isLoading?: boolean;
  onCancel?: () => void;
}

const RecurringExpenseForm: React.FC<RecurringExpenseFormProps> = ({
  onSubmit,
  initialData,
  isLoading,
  onCancel,
}) => {
  const { data: properties } = useProperties(true);
  const { exchangeRate } = useCurrency();
  const [inputCurrency, setInputCurrency] = React.useState<Currency>('EUR');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringExpenseFormData>({
    defaultValues: initialData
      ? {
          propertyId: initialData.propertyId,
          category: initialData.category,
          vendor: initialData.vendor || '',
          description: initialData.description,
          amountEUR: initialData.amountEUR,
          amountFCFA: initialData.amountFCFA,
        }
      : {
          propertyId: undefined,
          category: 'other',
          vendor: '',
          description: '',
          amountEUR: 0,
          amountFCFA: 0,
        },
  });

  const propertyOptions = [
    { value: '', label: 'Général (tous appartements)' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const amountEUR = watch('amountEUR');
  const amountFCFA = watch('amountFCFA');

  // Register amount fields with validation
  React.useEffect(() => {
    register('amountEUR', {
      required: 'Montant requis',
      min: { value: 0.01, message: 'Montant invalide' },
      valueAsNumber: true,
    });
    register('amountFCFA', {
      required: 'Montant requis',
      min: { value: 1, message: 'Montant invalide' },
      valueAsNumber: true,
    });
  }, [register]);

  // Handle EUR input change
  const handleEURChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const eurValue = parseFloat(e.target.value) || 0;
    setValue('amountEUR', eurValue);
    setValue('amountFCFA', Math.round(eurValue * exchangeRate));
  };

  // Handle FCFA input change
  const handleFCFAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fcfaValue = parseFloat(e.target.value) || 0;
    setValue('amountFCFA', fcfaValue);
    setValue('amountEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100);
  };

  const handleFormSubmit = (data: RecurringExpenseFormData) => {
    const formData = {
      ...data,
      propertyId: data.propertyId || undefined,
      vendor: data.vendor || undefined,
      amountEUR: data.amountEUR || 0,
      amountFCFA: data.amountFCFA || Math.round((data.amountEUR || 0) * exchangeRate),
    };
    
    // Validate that at least one amount is greater than 0
    if (formData.amountEUR <= 0 && formData.amountFCFA <= 0) {
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Property */}
      <Controller
        name="propertyId"
        control={control}
        render={({ field }) => (
          <Select
            label="Appartement"
            options={propertyOptions}
            helperText="Laissez 'Général' pour les dépenses communes"
            value={field.value || ''}
            onChange={(val) => field.onChange(val || undefined)}
          />
        )}
      />

      {/* Category */}
      <Controller
        name="category"
        control={control}
        rules={{ required: 'Catégorie requise' }}
        render={({ field }) => (
          <Select
            label="Catégorie"
            options={EXPENSE_CATEGORIES}
            error={errors.category?.message}
            required
            {...field}
          />
        )}
      />

      {/* Vendor/Supplier */}
      <Input
        label="Fournisseur"
        placeholder="Ex: Orange, Camwater, Canal+..."
        {...register('vendor')}
      />

      {/* Description */}
      <TextArea
        label="Description"
        placeholder="Description de la dépense récurrente..."
        rows={2}
        error={errors.description?.message}
        required
        {...register('description', { required: 'Description requise' })}
      />

      {/* Amount with currency toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Montant <span className="text-danger-500">*</span>
          </label>
          <CurrencyToggle value={inputCurrency} onChange={setInputCurrency} />
        </div>

        {inputCurrency === 'EUR' ? (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amountEUR || ''}
              onChange={handleEURChange}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.00"
            />
            {amountFCFA > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                ≈ {amountFCFA.toLocaleString()} FCFA
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <input
              type="number"
              min={0}
              step={1}
              value={amountFCFA || ''}
              onChange={handleFCFAChange}
              className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">FCFA</span>
            {amountEUR > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                ≈ {amountEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            )}
          </div>
        )}
        {inputCurrency === 'EUR' && errors.amountEUR && (
          <p className="text-sm text-danger-600">{errors.amountEUR.message}</p>
        )}
        {inputCurrency === 'FCFA' && errors.amountFCFA && (
          <p className="text-sm text-danger-600">{errors.amountFCFA.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Mettre à jour' : 'Créer le modèle'}
        </Button>
      </div>
    </form>
  );
};

export default RecurringExpenseForm;

