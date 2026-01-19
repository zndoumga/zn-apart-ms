import React, { useState, useMemo } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Pencil, Trash2, Search } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import DatePicker from '../components/ui/DatePicker';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CurrencyToggle from '../components/ui/CurrencyToggle';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import {
  useCurrentBalance,
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useIsBalanceLow,
} from '../hooks/useMobileMoney';
import { useCurrency, useMode } from '../store/useAppStore';
import { formatDate, formatForInput } from '../utils/dates';
import type { MobileMoneyTransaction, TransferFormData } from '../types';

const MobileMoney: React.FC = () => {
  const { formatAmount, currency, exchangeRate } = useCurrency();
  const { isAdmin } = useMode();

  // State
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MobileMoneyTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<MobileMoneyTransaction | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Queries
  const { data: balance } = useCurrentBalance();
  const { data: transactions, isLoading: loadingTransactions } = useTransactions();
  const { data: isLowBalance } = useIsBalanceLow();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransferFormData>({
    defaultValues: {
      type: 'deposit',
      amountEUR: 0,
      amountFCFA: 0,
      description: '',
      date: formatForInput(new Date()),
      reference: '',
    },
    mode: 'onChange', // Validate on change to catch errors early
  });
  
  // Register amount fields for validation (hidden fields)
  register('amountEUR', {
    required: false, // We'll validate manually
    valueAsNumber: true,
  });
  register('amountFCFA', {
    required: false, // We'll validate manually
    valueAsNumber: true,
  });

  const transactionType = watch('type');
  const amountEUR = watch('amountEUR');
  const amountFCFA = watch('amountFCFA');
  const [inputCurrency, setInputCurrency] = useState<'EUR' | 'FCFA'>('EUR');
  const [inputAmount, setInputAmount] = useState<number>(0);

  // Calculate the other currency when input amount or currency changes
  React.useEffect(() => {
    if (inputAmount > 0 && exchangeRate > 0) {
      if (inputCurrency === 'EUR') {
        const calculatedFCFA = Math.round(inputAmount * exchangeRate);
        setValue('amountEUR', inputAmount, { shouldValidate: true, shouldDirty: false });
        setValue('amountFCFA', calculatedFCFA, { shouldValidate: true, shouldDirty: false });
      } else {
        const calculatedEUR = parseFloat((inputAmount / exchangeRate).toFixed(2));
        setValue('amountFCFA', inputAmount, { shouldValidate: true, shouldDirty: false });
        setValue('amountEUR', calculatedEUR, { shouldValidate: true, shouldDirty: false });
      }
    } else if (editingTransaction && inputAmount > 0) {
      // When editing, ensure form fields are synced
      if (inputCurrency === 'EUR') {
        const calculatedFCFA = Math.round(inputAmount * exchangeRate);
        setValue('amountEUR', inputAmount, { shouldValidate: true, shouldDirty: false });
        setValue('amountFCFA', calculatedFCFA, { shouldValidate: true, shouldDirty: false });
      } else {
        const calculatedEUR = parseFloat((inputAmount / exchangeRate).toFixed(2));
        setValue('amountFCFA', inputAmount, { shouldValidate: true, shouldDirty: false });
        setValue('amountEUR', calculatedEUR, { shouldValidate: true, shouldDirty: false });
      }
    }
  }, [inputAmount, inputCurrency, exchangeRate, setValue, editingTransaction]);

  // Generate default description if none provided
  const generateDefaultDescription = (type: 'deposit' | 'withdrawal', amountFCFA: number, date: string | Date): string => {
    const dateStr = typeof date === 'string' ? formatDate(date) : formatDate(date);
    const amountStr = amountFCFA.toLocaleString();
    return type === 'deposit' 
      ? `Dépôt ${amountStr} FCFA le ${dateStr}`
      : `Retrait ${amountStr} FCFA le ${dateStr}`;
  };

  const handleAddTransaction = async (data: TransferFormData) => {
    // Ensure both amounts are set based on input currency
    const calculatedEUR = inputCurrency === 'EUR' 
      ? inputAmount 
      : (inputAmount > 0 ? parseFloat((inputAmount / exchangeRate).toFixed(2)) : 0);
    const calculatedFCFA = inputCurrency === 'FCFA' 
      ? inputAmount 
      : (inputAmount > 0 ? Math.round(inputAmount * exchangeRate) : 0);
    
    const formData = {
      ...data,
      amountEUR: calculatedEUR,
      amountFCFA: calculatedFCFA,
      description: data.description?.trim() || generateDefaultDescription(data.type, calculatedFCFA, data.date),
    };
    await createTransaction.mutateAsync(formData);
    setShowTransfer(false);
    reset();
    setInputAmount(0);
    setInputCurrency('EUR');
  };

  const handleEditTransaction = (transaction: MobileMoneyTransaction) => {
    if (transaction.type !== 'deposit') return; // Only allow editing deposits
    setEditingTransaction(transaction);
    // Set input to EUR by default, user can toggle
    setInputCurrency('EUR');
    // Ensure we have a valid amount
    const initialAmount = transaction.amountEUR || transaction.amountFCFA / exchangeRate || 0;
    setInputAmount(initialAmount);
    reset({
      type: transaction.type,
      amountEUR: transaction.amountEUR || 0,
      amountFCFA: transaction.amountFCFA || 0,
      description: transaction.description || '',
      date: formatForInput(transaction.date),
      reference: transaction.reference || '',
    });
    setShowTransfer(true);
  };

  const handleUpdateTransaction = async (data: TransferFormData) => {
    if (!editingTransaction) {
      console.error('No editing transaction set');
      return;
    }
    
    // Use inputAmount if it's set and valid, otherwise use the form data or editing transaction data
    let finalAmount = inputAmount;
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      // Fall back to form data based on selected currency
      finalAmount = inputCurrency === 'EUR' ? (data.amountEUR || 0) : (data.amountFCFA || 0);
    }
    
    // If still no valid amount, use the original transaction amount
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      finalAmount = inputCurrency === 'EUR' 
        ? (editingTransaction.amountEUR || 0)
        : (editingTransaction.amountFCFA || 0);
    }
    
    // Final validation - ensure we have a valid amount
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      // Show validation error - don't return silently
      console.error('Invalid amount for update:', { inputAmount, finalAmount, inputCurrency, formData: data, editingTransaction });
      alert('Veuillez saisir un montant valide');
      return;
    }
    
    // Calculate both amounts
    const calculatedEUR = inputCurrency === 'EUR' 
      ? finalAmount 
      : parseFloat((finalAmount / exchangeRate).toFixed(2));
    const calculatedFCFA = inputCurrency === 'FCFA' 
      ? finalAmount 
      : Math.round(finalAmount * exchangeRate);
    
    // Validate calculated amounts
    if (!calculatedEUR || calculatedEUR <= 0 || !calculatedFCFA || calculatedFCFA <= 0 || isNaN(calculatedEUR) || isNaN(calculatedFCFA)) {
      console.error('Invalid calculated amounts:', { calculatedEUR, calculatedFCFA, finalAmount, inputCurrency, exchangeRate });
      alert('Erreur de calcul des montants');
      return;
    }
    
    const formData: TransferFormData = {
      type: data.type || editingTransaction.type,
      amountEUR: calculatedEUR,
      amountFCFA: calculatedFCFA,
      description: (data.description?.trim() || '') || generateDefaultDescription(data.type || editingTransaction.type, calculatedFCFA, data.date || editingTransaction.date),
      date: data.date || editingTransaction.date,
      reference: data.reference || editingTransaction.reference || '',
    };
    
    // Log the data being sent for debugging
    console.log('Updating transaction with data:', {
      id: editingTransaction.id,
      formData,
      inputAmount,
      finalAmount,
      inputCurrency,
      originalTransaction: editingTransaction,
    });
    
    try {
      await updateTransaction.mutateAsync({ id: editingTransaction.id, data: formData });
      setShowTransfer(false);
      setEditingTransaction(null);
      reset();
      setInputAmount(0);
      setInputCurrency('EUR');
    } catch (error) {
      console.error('Error updating transaction - full error:', error);
      // Error is handled by the mutation hook, but let's also show it here
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    await deleteTransaction.mutateAsync(deletingTransaction.id);
    setDeletingTransaction(null);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter((t) => {
      const matchesType = !typeFilter || t.type === typeFilter;
      const matchesSearch = !search || 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        (t.reference && t.reference.toLowerCase().includes(search.toLowerCase()));
      
      return matchesType && matchesSearch;
    });
  }, [transactions, typeFilter, search]);

  const typeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'deposit', label: 'Dépôts' },
    { value: 'withdrawal', label: 'Retraits' },
  ];

  const transactionTypeOptions = [
    { value: 'deposit', label: 'Dépôt (entrée)' },
    { value: 'withdrawal', label: 'Retrait (sortie)' },
  ];

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (t: MobileMoneyTransaction) => formatDate(t.date),
    },
    {
      key: 'type',
      header: 'Type',
      render: (t: MobileMoneyTransaction) => (
        <div className="flex items-center gap-2">
          {t.type === 'deposit' ? (
            <ArrowUpCircle className="w-4 h-4 text-success-500" />
          ) : (
            <ArrowDownCircle className="w-4 h-4 text-danger-500" />
          )}
          <span>{t.type === 'deposit' ? 'Dépôt' : 'Retrait'}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (t: MobileMoneyTransaction) => (
        <div>
          <p className="font-medium text-gray-900">{t.description}</p>
          {t.reference && (
            <p className="text-xs text-gray-500">{t.reference}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (t: MobileMoneyTransaction) => (
        <span
          className={
            t.type === 'deposit'
              ? 'text-success-600 font-medium'
              : 'text-danger-600 font-medium'
          }
        >
          {t.type === 'deposit' ? '+' : '-'}
          {formatAmount(t.amountEUR, t.amountFCFA)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (t: MobileMoneyTransaction) => (
        isAdmin && t.type === 'deposit' ? (
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="p-2"
              title="Modifier"
              onClick={(e) => {
                e.stopPropagation();
                handleEditTransaction(t);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingTransaction(t);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Money</h1>
          <p className="text-gray-600 mt-1">Gérez votre compte Mobile Money</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowTransfer(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nouvelle transaction
          </Button>
        )}
      </div>

      {/* Balance card */}
      <Card>
        <CardBody className="py-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Solde actuel</p>
            <p className="text-4xl font-bold text-gray-900">
              {formatAmount(balance?.balanceEUR || 0, balance?.balanceFCFA || 0)}
            </p>
            {currency === 'EUR' && balance && (
              <p className="text-lg text-gray-500 mt-1">
                {balance.balanceFCFA.toLocaleString()} FCFA
              </p>
            )}
            {currency === 'FCFA' && balance && (
              <p className="text-lg text-gray-500 mt-1">
                {balance.balanceEUR.toFixed(2)} €
              </p>
            )}
            {isLowBalance && (
              <div className="mt-4 flex items-center justify-center gap-2 text-warning-600">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">Solde bas - Pensez à ajouter des fonds</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <Card>
        <CardBody>
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-48"
            />
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-full"
            />
          </div>
        </CardBody>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Historique des transactions
          </h3>
        </CardHeader>
        
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            isLoading={loadingTransactions}
            emptyMessage="Aucune transaction"
          />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
          {loadingTransactions ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune transaction</div>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card 
                key={transaction.id}
                className="border-l-4"
                style={{
                  borderLeftColor: transaction.type === 'deposit' ? '#10b981' : '#ef4444'
                }}
              >
                <CardBody className="p-4">
                  {/* Header: Date and Type */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {transaction.type === 'deposit' ? (
                        <ArrowUpCircle className="w-5 h-5 text-success-500" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-danger-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {transaction.type === 'deposit' ? 'Dépôt' : 'Retrait'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">Description</p>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.description}
                    </p>
                    {transaction.reference && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Réf: {transaction.reference}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Montant</p>
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === 'deposit'
                          ? 'text-success-600'
                          : 'text-danger-600'
                      }`}
                    >
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatAmount(transaction.amountEUR, transaction.amountFCFA)}
                    </p>
                  </div>

                  {/* Actions (Admin only, for deposits) */}
                  {isAdmin && transaction.type === 'deposit' && (
                    <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="p-2"
                        title="Modifier"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Supprimer"
                        onClick={() => setDeletingTransaction(transaction)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Add/Edit Transaction Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => {
          setShowTransfer(false);
          setEditingTransaction(null);
          reset();
          setInputAmount(0);
          setInputCurrency('EUR');
        }}
        title={editingTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
        size="md"
      >
        <form onSubmit={handleSubmit(
          editingTransaction ? handleUpdateTransaction : handleAddTransaction,
          (errors) => {
            console.error('Form validation errors:', errors);
            // If there are validation errors, show them
            if (Object.keys(errors).length > 0) {
              console.error('Validation failed:', errors);
            }
          }
        )} className="space-y-4">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Type de transaction"
                options={transactionTypeOptions}
                {...field}
                disabled={!!editingTransaction} // Disable type change when editing
              />
            )}
          />

          <div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label={`Montant (${inputCurrency === 'EUR' ? 'EUR' : 'FCFA'})`}
                  type="number"
                  min={0}
                  step={inputCurrency === 'EUR' ? 0.01 : 1}
                  value={inputAmount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setInputAmount(value);
                    if (inputCurrency === 'EUR') {
                      setValue('amountEUR', value, { shouldValidate: true });
                      setValue('amountFCFA', value > 0 ? Math.round(value * exchangeRate) : 0, { shouldValidate: false });
                    } else {
                      setValue('amountFCFA', value, { shouldValidate: true });
                      setValue('amountEUR', value > 0 ? parseFloat((value / exchangeRate).toFixed(2)) : 0, { shouldValidate: false });
                    }
                  }}
                  error={inputAmount <= 0 ? 'Montant requis' : (errors.amountEUR?.message || errors.amountFCFA?.message)}
                  required
                />
              </div>
              <div className="pb-2">
                <CurrencyToggle
                  value={inputCurrency}
                  onChange={(currency) => {
                    setInputCurrency(currency);
                    // Convert current amount when switching currency
                    if (inputAmount > 0 && exchangeRate > 0) {
                      if (currency === 'EUR') {
                        // Currently in FCFA, convert to EUR
                        const convertedEUR = parseFloat((inputAmount / exchangeRate).toFixed(2));
                        setInputAmount(convertedEUR);
                      } else {
                        // Currently in EUR, convert to FCFA
                        const convertedFCFA = Math.round(inputAmount * exchangeRate);
                        setInputAmount(convertedFCFA);
                      }
                    }
                  }}
                  size="md"
                />
              </div>
            </div>
            {inputAmount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {inputCurrency === 'EUR' 
                  ? `≈ ${Math.round(inputAmount * exchangeRate).toLocaleString()} FCFA`
                  : `≈ ${(inputAmount / exchangeRate).toFixed(2)} €`}
              </p>
            )}
          </div>

          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date"
                error={errors.date?.message}
                required
                value={typeof field.value === 'string' ? field.value : formatForInput(field.value as Date)}
                onChange={field.onChange}
              />
            )}
          />

          <TextArea
            label="Description"
            placeholder="Description de la transaction..."
            error={errors.description?.message}
            {...register('description')}
          />

          <Input
            label="Référence (optionnel)"
            placeholder="Numéro de transaction, virement..."
            {...register('reference')}
          />

          <div className={`${transactionType === 'deposit' ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'} border rounded-lg p-4`}>
            <p className={`text-sm ${transactionType === 'deposit' ? 'text-success-800' : 'text-danger-800'}`}>
              {transactionType === 'deposit'
                ? '✓ Ce montant sera ajouté au solde Mobile Money.'
                : '✓ Ce montant sera retiré du solde Mobile Money.'}
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowTransfer(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={editingTransaction ? updateTransaction.isPending : createTransaction.isPending}>
              {editingTransaction ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDelete}
        title="Supprimer la transaction ?"
        message={`Êtes-vous sûr de vouloir supprimer cette transaction de ${deletingTransaction ? formatAmount(deletingTransaction.amountEUR, deletingTransaction.amountFCFA) : ''} ? Cette action est irréversible et affectera le solde.`}
        confirmText="Supprimer"
        isLoading={deleteTransaction.isPending}
      />
    </div>
  );
};

export default MobileMoney;
