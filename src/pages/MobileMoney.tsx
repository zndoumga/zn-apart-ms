import React, { useState } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import DatePicker from '../components/ui/DatePicker';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
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
  });

  const transactionType = watch('type');
  const amountEUR = watch('amountEUR');

  const handleAddTransaction = async (data: TransferFormData) => {
    // Calculate FCFA from EUR if not provided
    const formData = {
      ...data,
      amountFCFA: data.amountFCFA || Math.round(data.amountEUR * exchangeRate),
    };
    await createTransaction.mutateAsync(formData);
    setShowTransfer(false);
    reset();
  };

  const handleEditTransaction = (transaction: MobileMoneyTransaction) => {
    if (transaction.type !== 'deposit') return; // Only allow editing deposits
    setEditingTransaction(transaction);
    reset({
      type: transaction.type,
      amountEUR: transaction.amountEUR,
      amountFCFA: transaction.amountFCFA,
      description: transaction.description,
      date: formatForInput(transaction.date),
      reference: transaction.reference || '',
    });
    setShowTransfer(true);
  };

  const handleUpdateTransaction = async (data: TransferFormData) => {
    if (!editingTransaction) return;
    const formData = {
      ...data,
      amountFCFA: data.amountFCFA || Math.round(data.amountEUR * exchangeRate),
    };
    await updateTransaction.mutateAsync({ id: editingTransaction.id, data: formData });
    setShowTransfer(false);
    setEditingTransaction(null);
    reset();
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    await deleteTransaction.mutateAsync(deletingTransaction.id);
    setDeletingTransaction(null);
  };

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    if (!typeFilter) return transactions;
    return transactions.filter((t) => t.type === typeFilter);
  }, [transactions, typeFilter]);

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
        <Button onClick={() => setShowTransfer(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle transaction
        </Button>
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
          <div className="flex gap-4">
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-48"
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
        <Table
          columns={columns}
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          isLoading={loadingTransactions}
          emptyMessage="Aucune transaction"
        />
      </Card>

      {/* Add/Edit Transaction Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => {
          setShowTransfer(false);
          setEditingTransaction(null);
          reset();
        }}
        title={editingTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
        size="md"
      >
        <form onSubmit={handleSubmit(editingTransaction ? handleUpdateTransaction : handleAddTransaction)} className="space-y-4">
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
            <Input
              label="Montant (EUR)"
              type="number"
              min={0}
              step={0.01}
              error={errors.amountEUR?.message}
              required
              {...register('amountEUR', {
                valueAsNumber: true,
                required: 'Montant requis',
                min: { value: 0.01, message: 'Montant invalide' },
              })}
            />
            {amountEUR > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {Math.round(amountEUR * exchangeRate).toLocaleString()} FCFA
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
            required
            {...register('description', { required: 'Description requise' })}
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
