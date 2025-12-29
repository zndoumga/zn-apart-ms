import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import Checkbox from '../ui/Checkbox';
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { useBulkCreateExpenses } from '../../hooks/useExpenses';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { formatForInput, getFirstDayOfMonth, getLastDayOfMonth } from '../../utils/dates';
import { EXPENSE_CATEGORIES } from '../../types';
import type { ExpenseFormData } from '../../types';

interface BulkAddRecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkAddRecurringExpensesModal: React.FC<BulkAddRecurringExpensesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: recurringExpenses, isLoading } = useRecurringExpenses();
  const { data: properties } = useProperties();
  const bulkCreateMutation = useBulkCreateExpenses();
  const { formatAmount } = useCurrency();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getPropertyName = (propertyId: string | undefined) => {
    if (!propertyId) return 'Général';
    return properties?.find((p) => p.id === propertyId)?.name || 'Unknown';
  };

  const handleToggleExpense = (id: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExpenses(newSelected);
  };

  const handleSelectAll = () => {
    if (!recurringExpenses) return;
    if (selectedExpenses.size === recurringExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(recurringExpenses.map((e) => e.id)));
    }
  };

  const handleSubmit = () => {
    if (!recurringExpenses || selectedExpenses.size === 0 || !selectedMonth) return;

    // Parse month string (YYYY-MM) and get first day
    const [year, month] = selectedMonth.split('-').map(Number);
    const expenseDate = new Date(year, month - 1, 1);

    const expensesToCreate: ExpenseFormData[] = Array.from(selectedExpenses)
      .map((id) => {
        const template = recurringExpenses.find((e) => e.id === id);
        if (!template) return null;
        return {
          propertyId: template.propertyId,
          category: template.category,
          vendor: template.vendor,
          description: template.description,
          amountEUR: template.amountEUR,
          amountFCFA: template.amountFCFA,
          date: formatForInput(expenseDate),
        };
      })
      .filter((e): e is ExpenseFormData => e !== null);

    bulkCreateMutation.mutate(expensesToCreate, {
      onSuccess: () => {
        setSelectedExpenses(new Set());
        onClose();
      },
    });
  };

  const footerContent = (
    <div className="flex justify-between items-center">
      <div className="text-sm text-gray-600">
        {selectedExpenses.size} dépense{selectedExpenses.size > 1 ? 's' : ''} sélectionnée{selectedExpenses.size > 1 ? 's' : ''}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={bulkCreateMutation.isPending}
          disabled={selectedExpenses.size === 0 || !selectedMonth}
        >
          Ajouter les dépenses
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter des dépenses récurrentes"
      size="lg"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Month selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mois <span className="text-danger-500">*</span>
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pl-10 pr-3 py-2 text-sm"
            required
          />
        </div>

        {/* Recurring expenses list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Sélectionner les dépenses à ajouter
            </label>
            {recurringExpenses && recurringExpenses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedExpenses.size === recurringExpenses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : !recurringExpenses || recurringExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun modèle de dépense récurrente disponible. Créez-en d'abord dans les paramètres.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {recurringExpenses.map((expense) => {
                const isSelected = selectedExpenses.has(expense.id);
                return (
                  <div
                    key={expense.id}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleToggleExpense(expense.id)}
                  >
                    <div className="mt-0.5">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleExpense(expense.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-xs text-gray-900">
                          {getCategoryLabel(expense.category)}
                        </span>
                        {expense.vendor && (
                          <span className="text-xs text-gray-500">• {expense.vendor}</span>
                        )}
                        <span className="text-xs text-gray-400">• {getPropertyName(expense.propertyId)}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mb-0.5">{expense.description}</p>
                      <p className="text-xs font-medium text-primary-600">
                        {formatAmount(expense.amountEUR, expense.amountFCFA)}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkAddRecurringExpensesModal;

