import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import RecurringExpenseForm from './RecurringExpenseForm';
import { useRecurringExpenses, useCreateRecurringExpense, useUpdateRecurringExpense, useDeleteRecurringExpense } from '../../hooks/useRecurringExpenses';
import { useProperties } from '../../hooks/useProperties';
import { useCurrency } from '../../store/useAppStore';
import { EXPENSE_CATEGORIES } from '../../types';
import type { RecurringExpense, RecurringExpenseFormData } from '../../types';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: recurringExpenses, isLoading } = useRecurringExpenses();
  const { data: properties } = useProperties();
  const createMutation = useCreateRecurringExpense();
  const updateMutation = useUpdateRecurringExpense();
  const deleteMutation = useDeleteRecurringExpense();
  const { formatAmount } = useCurrency();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<RecurringExpense | null>(null);

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getPropertyName = (propertyId: string | undefined) => {
    if (!propertyId) return 'Général';
    return properties?.find((p) => p.id === propertyId)?.name || 'Unknown';
  };

  const handleCreate = (data: RecurringExpenseFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowForm(false);
      },
    });
  };

  const handleUpdate = (data: RecurringExpenseFormData) => {
    if (!editingExpense) return;
    updateMutation.mutate(
      { id: editingExpense.id, data },
      {
        onSuccess: () => {
          setEditingExpense(null);
          setShowForm(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingExpense) return;
    deleteMutation.mutate(deletingExpense.id, {
      onSuccess: () => {
        setDeletingExpense(null);
      },
    });
  };

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const footerContent = showForm ? null : (
    <div className="flex justify-end">
      <Button onClick={onClose}>Fermer</Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={showForm ? (editingExpense ? 'Modifier le modèle' : 'Nouveau modèle') : 'Dépenses récurrentes'}
        size="lg"
        footer={footerContent}
      >
        {showForm ? (
          <RecurringExpenseForm
            initialData={editingExpense || undefined}
            onSubmit={editingExpense ? handleUpdate : handleCreate}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNew}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau modèle
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : !recurringExpenses || recurringExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun modèle de dépense récurrente. Créez-en un pour commencer.
              </div>
            ) : (
              <div className="space-y-2">
                {recurringExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">
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
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                        className="p-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingExpense(expense)}
                        className="p-1.5 text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
        title="Supprimer le modèle"
        message={`Êtes-vous sûr de vouloir supprimer ce modèle de dépense récurrente ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </>
  );
};

export default RecurringExpensesModal;

