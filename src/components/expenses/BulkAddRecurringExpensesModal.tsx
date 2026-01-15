import React, { useState, useMemo } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import Checkbox from '../ui/Checkbox';
import Select from '../ui/Select';
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { useBulkCreateExpenses } from '../../hooks/useExpenses';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { formatForInput, getFirstDayOfMonth, getLastDayOfMonth } from '../../utils/dates';
import { EXPENSE_CATEGORIES } from '../../types';
import type { ExpenseFormData } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  // Generate year options (current year ± 2 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
  }, []);

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const date = new Date(2000, i - 1, 1);
      months.push({
        value: i.toString(),
        label: format(date, 'MMMM', { locale: fr }),
      });
    }
    return months;
  }, []);

  // Add month to selection
  const handleAddMonth = () => {
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setSelectedMonths((prev) => new Set([...prev, monthKey]));
  };

  // Remove month from selection
  const handleRemoveMonth = (monthKey: string) => {
    setSelectedMonths((prev) => {
      const newSet = new Set(prev);
      newSet.delete(monthKey);
      return newSet;
    });
  };

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
    if (!recurringExpenses || selectedExpenses.size === 0 || selectedMonths.size === 0) return;

    // Create expenses for each selected month
    const expensesToCreate: ExpenseFormData[] = [];
    
    Array.from(selectedMonths).forEach((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const expenseDate = new Date(year, month - 1, 1);

      Array.from(selectedExpenses).forEach((id) => {
        const template = recurringExpenses.find((e) => e.id === id);
        if (!template) return;
        expensesToCreate.push({
          propertyId: template.propertyId,
          category: template.category,
          vendor: template.vendor,
          description: template.description,
          amountEUR: template.amountEUR,
          amountFCFA: template.amountFCFA,
          date: formatForInput(expenseDate),
        });
      });
    });

    bulkCreateMutation.mutate(expensesToCreate, {
      onSuccess: () => {
        setSelectedExpenses(new Set());
        setSelectedMonths(new Set());
        onClose();
      },
    });
  };

  const footerContent = (
    <div className="flex justify-between items-center">
      <div className="text-sm text-gray-600">
        {selectedExpenses.size} dépense{selectedExpenses.size > 1 ? 's' : ''} × {selectedMonths.size} mois = {selectedExpenses.size * selectedMonths.size} dépense{selectedExpenses.size * selectedMonths.size > 1 ? 's' : ''} à créer
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={bulkCreateMutation.isPending}
          disabled={selectedExpenses.size === 0 || selectedMonths.size === 0}
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
            Sélectionner les mois <span className="text-danger-500">*</span>
          </label>
          
          {/* Year and Month dropdowns */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Select
              label="Année"
              options={yearOptions}
              value={selectedYear.toString()}
              onChange={(value) => setSelectedYear(parseInt(value))}
            />
            <Select
              label="Mois"
              options={monthOptions}
              value={selectedMonth.toString()}
              onChange={(value) => setSelectedMonth(parseInt(value))}
            />
          </div>

          {/* Add month button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMonth}
            className="w-full mb-3"
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Ajouter ce mois
          </Button>

          {/* Selected months list */}
          {selectedMonths.size > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Mois sélectionnés:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedMonths)
                  .sort()
                  .map((monthKey) => {
                    const [year, month] = monthKey.split('-').map(Number);
                    const date = new Date(year, month - 1, 1);
                    return (
                      <div
                        key={monthKey}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                      >
                        <span className="text-primary-700 font-medium">
                          {format(date, 'MMMM yyyy', { locale: fr })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMonth(monthKey)}
                          className="text-primary-500 hover:text-primary-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
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

