import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Upload,
  Pencil, 
  Trash2,
  Filter,
  CalendarRange,
  X,
  Settings,
  Repeat,
  CheckSquare,
  Square,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Card, CardBody } from '../components/ui/Card';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseDetailsModal from '../components/expenses/ExpenseDetailsModal';
import ExpenseImportModal from '../components/expenses/ExpenseImportModal';
import RecurringExpensesModal from '../components/expenses/RecurringExpensesModal';
import BulkAddRecurringExpensesModal from '../components/expenses/BulkAddRecurringExpensesModal';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useBulkCreateExpenses } from '../hooks/useExpenses';
import { useProperties } from '../hooks/useProperties';
import { useCurrency, useMode } from '../store/useAppStore';
import { formatDate } from '../utils/dates';
import { exportExpenses, type ExportFormat } from '../utils/export';
import type { Expense, ExpenseFormData, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES } from '../types';

type SortField = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

const Expenses: React.FC = () => {
  const { isAdmin } = useMode();
  const { formatAmount } = useCurrency();

  // State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRecurringExpenses, setShowRecurringExpenses] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Refs
  const datePickerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: expenses, isLoading } = useExpenses();
  const { data: properties } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const bulkCreateExpenses = useBulkCreateExpenses();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      const matchesSearch =
        !search ||
        expense.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      const matchesProperty =
        !propertyFilter ||
        (propertyFilter === 'general' ? !expense.propertyId : expense.propertyId === propertyFilter);
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRangeStart || dateRangeEnd) {
        const expenseDate = new Date(expense.date);
        if (dateRangeStart) {
          matchesDateRange = matchesDateRange && expenseDate >= new Date(dateRangeStart);
        }
        if (dateRangeEnd) {
          matchesDateRange = matchesDateRange && expenseDate <= new Date(dateRangeEnd);
        }
      }

      return matchesSearch && matchesCategory && matchesProperty && matchesDateRange;
    });
  }, [expenses, search, categoryFilter, propertyFilter, dateRangeStart, dateRangeEnd]);

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amountEUR - b.amountEUR;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredExpenses, sortField, sortDirection]);

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Calculate totals
  const totalEUR = filteredExpenses.reduce((sum, e) => sum + e.amountEUR, 0);
  const totalFCFA = filteredExpenses.reduce((sum, e) => sum + e.amountFCFA, 0);

  const getPropertyName = (propertyId: string | undefined | null) => {
    if (!propertyId) return 'Général';
    return properties?.find((p) => p.id === propertyId)?.name || 'Unknown';
  };

  const getProperty = (propertyId: string | undefined | null) => {
    if (!propertyId) return undefined;
    return properties?.find((p) => p.id === propertyId);
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryBadgeVariant = (category: ExpenseCategory): 'primary' | 'success' | 'warning' | 'danger' | 'gray' => {
    const variants: Partial<Record<ExpenseCategory, 'primary' | 'success' | 'warning' | 'danger' | 'gray'>> = {
      rent: 'danger',
      utilities: 'gray',
      canal_sat: 'primary',
      common_areas: 'warning',
      cleaning: 'primary',
      laundry: 'primary',
      consumables: 'success',
      supplies: 'success',
      maintenance: 'warning',
      wages: 'primary',
      taxes: 'danger',
    };
    return variants[category] || 'gray';
  };

  const handleCreate = async (data: ExpenseFormData, receiptFile?: File) => {
    await createExpense.mutateAsync({ data, receiptFile });
    setShowForm(false);
  };

  const handleUpdate = async (data: ExpenseFormData) => {
    if (!editingExpense) return;
    await updateExpense.mutateAsync({ id: editingExpense.id, data });
    setEditingExpense(null);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    await deleteExpense.mutateAsync(deletingExpense.id);
    setDeletingExpense(null);
    setViewingExpense(null);
  };

  const handleExport = (format: ExportFormat) => {
    if (!filteredExpenses.length) return;
    const propertyNames: Record<string, string> = { '': 'Général' };
    properties?.forEach((p) => {
      propertyNames[p.id] = p.name;
    });
    exportExpenses(filteredExpenses, propertyNames, format);
    setShowExportMenu(false);
  };

  const clearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  const handleRowClick = (expense: Expense) => {
    setViewingExpense(expense);
  };

  const handleEditFromDetails = () => {
    if (viewingExpense) {
      setEditingExpense(viewingExpense);
      setViewingExpense(null);
    }
  };

  const handleDeleteFromDetails = () => {
    if (viewingExpense) {
      setDeletingExpense(viewingExpense);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExpenses.size === 0) return;
    
    // Delete all selected expenses
    await Promise.all(
      Array.from(selectedExpenses).map((id) => deleteExpense.mutateAsync(id))
    );
    
    // Clear selection
    setSelectedExpenses(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const propertyOptions = [
    { value: '', label: 'Propriété' },
    { value: 'general', label: 'Général' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const categoryOptions = [
    { value: '', label: 'Catégorie' },
    ...EXPENSE_CATEGORIES,
  ];

  const hasActiveFilters = categoryFilter || propertyFilter || dateRangeStart || dateRangeEnd;

  const columns = [
    {
      key: 'select',
      header: (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelectAll();
          }}
          className="flex items-center justify-center"
          title={selectedExpenses.size === filteredExpenses.length ? 'Désélectionner tout' : 'Sélectionner tout'}
        >
          {selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0 ? (
            <CheckSquare className="w-5 h-5 text-primary-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      ),
      render: (expense: Expense) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelectExpense(expense.id);
          }}
          className="flex items-center justify-center"
        >
          {selectedExpenses.has(expense.id) ? (
            <CheckSquare className="w-5 h-5 text-primary-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400 hover:text-primary-600" />
          )}
        </button>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (expense: Expense) => formatDate(expense.date),
    },
    {
      key: 'description',
      header: 'Description',
      render: (expense: Expense) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 truncate">
            {expense.vendor 
              ? `${expense.vendor} : ${expense.description}`
              : expense.description
            }
          </p>
          <p className="text-xs text-gray-500">{getPropertyName(expense.propertyId)}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      render: (expense: Expense) => (
        <Badge variant={getCategoryBadgeVariant(expense.category)} size="sm">
          {getCategoryLabel(expense.category)}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (expense: Expense) => (
        <span className="font-medium text-danger-600">
          -{formatAmount(expense.amountEUR, expense.amountFCFA)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (expense: Expense) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="p-2"
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              setEditingExpense(expense);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingExpense(expense);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-gray-600 mt-1">
            {filteredExpenses.length} dépense(s) • Total: {formatAmount(totalEUR, totalFCFA)}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && selectedExpenses.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
              title={`Supprimer ${selectedExpenses.size} dépense(s)`}
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline ml-1">{selectedExpenses.size}</span>
            </Button>
          )}
          {isAdmin && (
            <>
              <div className="relative" ref={exportMenuRef}>
                <Button 
                  variant="outline" 
                  onClick={() => setShowExportMenu(!showExportMenu)} 
                  className="p-2"
                  title="Exporter"
                >
                  <Download className="w-5 h-5" />
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowImport(true)} 
                className="p-2"
                title="Importer"
              >
                <Upload className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowRecurringExpenses(true)} 
                className="p-2"
                title="Gérer les dépenses récurrentes"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowBulkAdd(true)} 
            className="p-2"
            title="Ajouter des dépenses récurrentes"
          >
            <Repeat className="w-5 h-5" />
          </Button>
          <Button 
            onClick={() => setShowForm(true)} 
            className="p-2 bg-red-600 text-white hover:bg-red-700"
            title="Nouvelle dépense"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <Card className="overflow-visible">
        <CardBody className="py-3 overflow-visible">
          {/* Desktop Layout */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            {/* Filter icon + label */}
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
            </div>

            {/* Search - compact */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                categoryFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Property filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                propertyFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              {propertyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Date range picker */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dateRangeStart || dateRangeEnd
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>
                  {dateRangeStart || dateRangeEnd
                    ? `${dateRangeStart || '...'} - ${dateRangeEnd || '...'}`
                    : 'Période'}
                </span>
              </button>

              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[280px]">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Du</label>
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Au</label>
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={clearDateRange}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                      >
                        Effacer
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear all filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setCategoryFilter('');
                  setPropertyFilter('');
                  clearDateRange();
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                <span>Effacer</span>
              </button>
            )}

            {/* Spacer to push sort to the right */}
            <div className="flex-1" />

            {/* Sort buttons */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => handleSortClick('date')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  sortField === 'date' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Date
                {sortField === 'date' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortClick('amount')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                  sortField === 'amount' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Montant
                {sortField === 'amount' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortClick('category')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 ${
                  sortField === 'category' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Catégorie
                {sortField === 'category' && (
                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-2">
            {/* Row 1: Search (half width) + Category (half width) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Search - half width */}
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
              
              {/* Category dropdown - half width */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  categoryFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2: Property + Date Range */}
            <div className="grid grid-cols-2 gap-2">
              {/* Property filter */}
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className={`px-3 py-2 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 h-[38px] ${
                  propertyFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}
              >
                {propertyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Date range picker */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`w-full h-[38px] flex items-center justify-center gap-1.5 px-3 text-sm border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
                    dateRangeStart || dateRangeEnd
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                >
                  <CalendarRange className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs truncate">
                    {dateRangeStart || dateRangeEnd
                      ? `${dateRangeStart || '...'} - ${dateRangeEnd || '...'}`
                      : 'Période'}
                  </span>
                  {(dateRangeStart || dateRangeEnd) && (
                    <X 
                      className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDateRange();
                      }}
                    />
                  )}
                </button>

                {showDatePicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Du</label>
                        <input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Au</label>
                        <input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={clearDateRange}
                          className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Effacer
                        </button>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Sort and Clear */}
            <div className="flex items-center justify-between gap-2">
              {/* Sort buttons */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">Tri:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => handleSortClick('date')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors ${
                      sortField === 'date' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Date
                    {sortField === 'date' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortClick('amount')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 ${
                      sortField === 'amount' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Montant
                    {sortField === 'amount' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortClick('category')}
                    className={`px-3 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors border-l border-gray-200 ${
                      sortField === 'category' 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Catégorie
                    {sortField === 'category' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setCategoryFilter('');
                    setPropertyFilter('');
                    clearDateRange();
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Content */}
      <>
        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <Table
            columns={columns}
            data={sortedExpenses}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Aucune dépense trouvée"
            onRowClick={handleRowClick}
          />
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : sortedExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune dépense trouvée</div>
          ) : (
            sortedExpenses.map((expense) => (
              <Card 
                key={expense.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRowClick(expense)}
              >
                <CardBody className="p-4">
                  {/* Header: Date and Amount */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Date effective</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(expense.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Montant</p>
                      <p className="text-sm font-bold text-danger-600">
                        -{formatAmount(expense.amountEUR, expense.amountFCFA)}
                      </p>
                    </div>
                  </div>

                  {/* Description and Vendor */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">Description</p>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.vendor 
                        ? `${expense.vendor} : ${expense.description}`
                        : expense.description
                      }
                    </p>
                  </div>

                  {/* Category and Property */}
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Catégorie</p>
                      <Badge variant={getCategoryBadgeVariant(expense.category)} size="sm">
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Propriété</p>
                      <p className="text-sm text-gray-900">
                        {getPropertyName(expense.propertyId)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectExpense(expense.id);
                        }}
                        className="p-2"
                        title={selectedExpenses.has(expense.id) ? 'Désélectionner' : 'Sélectionner'}
                      >
                        {selectedExpenses.has(expense.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                        )}
                      </button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2"
                      title="Modifier"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExpense(expense);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Supprimer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingExpense(expense);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </>

      {/* Details Modal */}
      <ExpenseDetailsModal
        expense={viewingExpense}
        property={viewingExpense ? getProperty(viewingExpense.propertyId) : undefined}
        isOpen={!!viewingExpense}
        onClose={() => setViewingExpense(null)}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        isAdmin={isAdmin}
        formatAmount={formatAmount}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle dépense"
        size="lg"
      >
        <ExpenseForm
          onSubmit={handleCreate}
          isLoading={createExpense.isPending}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Modifier la dépense"
        size="lg"
      >
        {editingExpense && (
          <ExpenseForm
            onSubmit={handleUpdate}
            initialData={editingExpense}
            isLoading={updateExpense.isPending}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
        title="Supprimer la dépense ?"
        message="Cette action est irréversible."
        confirmText="Supprimer"
        isLoading={deleteExpense.isPending}
      />

      {/* Bulk Delete confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Supprimer les dépenses sélectionnées ?"
        message={`Êtes-vous sûr de vouloir supprimer ${selectedExpenses.size} dépense(s) ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={deleteExpense.isPending}
      />

      {/* Import Modal */}
      <ExpenseImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={async (expenses) => {
          await bulkCreateExpenses.mutateAsync(expenses);
        }}
        properties={properties || []}
        isLoading={bulkCreateExpenses.isPending}
      />

      {/* Recurring Expenses Management Modal */}
      <RecurringExpensesModal
        isOpen={showRecurringExpenses}
        onClose={() => setShowRecurringExpenses(false)}
      />

      {/* Bulk Add Recurring Expenses Modal */}
      <BulkAddRecurringExpensesModal
        isOpen={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
      />
    </div>
  );
};

export default Expenses;
