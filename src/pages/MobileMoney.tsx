import React, { useState } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import DatePicker from '../components/ui/DatePicker';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import {
  useCurrentBalance,
  useTransactions,
  useCreateTransaction,
  useIsBalanceLow,
} from '../hooks/useMobileMoney';
import { useCurrency } from '../store/useAppStore';
import { formatDate, formatForInput } from '../utils/dates';
import type { MobileMoneyTransaction, TransferFormData } from '../types';

const MobileMoney: React.FC = () => {
  const { formatAmount, currency, exchangeRate } = useCurrency();

  // State
  const [showTransfer, setShowTransfer] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Queries
  const { data: balance } = useCurrentBalance();
  const { data: transactions, isLoading: loadingTransactions } = useTransactions();
  const { data: isLowBalance } = useIsBalanceLow();
  const createTransaction = useCreateTransaction();

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
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
            </div>
          </CardBody>
        </Card>

        {/* Low balance alert */}
        {isLowBalance && (
          <Card className="border-warning-200 bg-warning-50">
            <CardBody className="flex flex-col items-center justify-center text-center py-8">
              <AlertTriangle className="w-10 h-10 text-warning-500 mb-2" />
              <p className="font-medium text-warning-800">Solde bas</p>
              <p className="text-sm text-warning-600 mt-1">
                Pensez à ajouter des fonds
              </p>
            </CardBody>
          </Card>
        )}
      </div>

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

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Nouvelle transaction"
        size="md"
      >
        <form onSubmit={handleSubmit(handleAddTransaction)} className="space-y-4">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Type de transaction"
                options={transactionTypeOptions}
                {...field}
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
            <Button type="submit" isLoading={createTransaction.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MobileMoney;
