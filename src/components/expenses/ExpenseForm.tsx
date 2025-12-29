import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import DatePicker from '../ui/DatePicker';
import FileUpload from '../ui/FileUpload';
import CurrencyToggle from '../ui/CurrencyToggle';
import Checkbox from '../ui/Checkbox';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { getTransactionByReference } from '../../services/mobileMoneyService';
import { formatForInput } from '../../utils/dates';
import type { ExpenseFormData, Expense, Currency } from '../../types';
import { EXPENSE_CATEGORIES } from '../../types';

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData, receiptFile?: File) => void;
  initialData?: Expense;
  isLoading?: boolean;
  onCancel?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  initialData,
  isLoading,
  onCancel,
}) => {
  const { data: properties } = useProperties(true);
  const { exchangeRate } = useCurrency();
  const [receiptFile, setReceiptFile] = React.useState<File[]>([]);
  const [inputCurrency, setInputCurrency] = React.useState<Currency>('EUR');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: initialData
      ? {
          propertyId: initialData.propertyId,
          date: formatForInput(initialData.date),
          amountEUR: initialData.amountEUR,
          amountFCFA: initialData.amountFCFA,
          category: initialData.category,
          vendor: initialData.vendor || '',
          description: initialData.description,
          paidFromMobileMoney: false,
        }
      : {
          propertyId: undefined,
          date: formatForInput(new Date()),
          amountEUR: 0,
          amountFCFA: 0,
          category: 'other',
          vendor: '',
          description: '',
          paidFromMobileMoney: true,
        },
  });

  const paidFromMobileMoney = watch('paidFromMobileMoney');

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

  const amountEUR = watch('amountEUR');
  const amountFCFA = watch('amountFCFA');
  const [hasMobileMoneyTransaction, setHasMobileMoneyTransaction] = React.useState(false);

  // Check if expense already has a mobile money transaction when editing
  useEffect(() => {
    if (initialData?.id) {
      getTransactionByReference(initialData.id)
        .then((transaction) => {
          setHasMobileMoneyTransaction(!!transaction);
          if (transaction) {
            setValue('paidFromMobileMoney', true);
          }
        })
        .catch((error) => {
          console.error('Error checking mobile money transaction:', error);
        });
    }
  }, [initialData?.id, setValue]);

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

  const propertyOptions = [
    { value: '', label: 'Général (tous appartements)' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const handleFormSubmit = (data: ExpenseFormData) => {
    // Ensure both amounts are set
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
    
    onSubmit(formData, receiptFile[0]);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Date */}
      <Controller
        name="date"
        control={control}
        rules={{ required: 'Date requise' }}
        render={({ field }) => (
          <DatePicker
            label="Date effective"
            error={errors.date?.message}
            required
            value={typeof field.value === 'string' ? field.value : formatForInput(field.value as Date)}
            onChange={field.onChange}
          />
        )}
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

      {/* Category */}
      <Controller
        name="category"
        control={control}
        rules={{ required: 'Catégorie requise' }}
        render={({ field }) => (
          <Select
            label="Catégorie"
            options={[...EXPENSE_CATEGORIES].sort((a, b) => a.label.localeCompare(b.label, 'fr'))}
            error={errors.category?.message}
            required
            {...field}
          />
        )}
      />

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

      {/* Vendor/Supplier */}
      <Input
        label="Fournisseur"
        placeholder="Ex: Orange, Camwater, Canal+..."
        {...register('vendor')}
      />

      {/* Description */}
      <TextArea
        label="Description / Notes"
        placeholder="Détails supplémentaires sur la dépense..."
        rows={2}
        error={errors.description?.message}
        required
        {...register('description', { required: 'Description requise' })}
      />

      {/* Receipt upload */}
      <FileUpload
        label="Reçu (optionnel)"
        accept="image/*"
        value={receiptFile}
        onChange={setReceiptFile}
      />

      {/* Paid from Mobile Money */}
      <div 
        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setValue('paidFromMobileMoney', !paidFromMobileMoney)}
      >
        <Controller
          name="paidFromMobileMoney"
          control={control}
          render={({ field }) => (
            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              />
            </div>
          )}
        />
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 block cursor-pointer">
            Payé depuis le solde Mobile Money
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Si coché, cette dépense sera déduite du solde Mobile Money et apparaîtra dans l'historique des transactions.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Mettre à jour' : 'Enregistrer la dépense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
