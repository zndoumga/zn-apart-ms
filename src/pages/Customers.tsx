import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Users, Mail, Phone, Globe, Download, Pencil, Trash2, ArrowUpDown, Filter, MessageSquare, Send, Calendar, MapPin, User, Clock, Tag, FileText } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Checkbox from '../components/ui/Checkbox';
import { Card, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerWithStats,
} from '../hooks/useCustomers';
import { useCustomerComments, useAddCustomerComment, useDeleteCustomerComment } from '../hooks/useCustomerComments';
import { useBookings } from '../hooks/useBookings';
import { useProperties } from '../hooks/useProperties';
import { useCurrency, useMode } from '../store/useAppStore';
import { formatDate, formatRelativeTime } from '../utils/dates';
import { exportCustomersToCSV } from '../utils/export';
import type { Customer, CustomerFormData, CustomerComment, Booking } from '../types';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const Customers: React.FC = () => {
  const { formatAmount } = useCurrency();
  const { isAdmin } = useMode();

  // State
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Queries
  const { data: customers, isLoading } = useCustomers({
    search,
  });
  const { data: customerDetails } = useCustomerWithStats(viewingCustomerId || undefined);
  const { data: allBookings } = useBookings();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Calculate booking counts dynamically from actual bookings
  const bookingCountsByCustomer = useMemo(() => {
    if (!allBookings) return new Map<string, number>();
    
    const counts = new Map<string, number>();
    allBookings.forEach((booking) => {
      if (booking.customerId) {
        counts.set(booking.customerId, (counts.get(booking.customerId) || 0) + 1);
      }
    });
    return counts;
  }, [allBookings]);

  // Enhance customers with actual booking counts
  const customersWithBookingCounts = useMemo(() => {
    if (!customers) return [];
    return customers.map((customer) => ({
      ...customer,
      totalBookings: bookingCountsByCustomer.get(customer.id) || 0,
    }));
  }, [customers, bookingCountsByCustomer]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CustomerFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      nationality: '',
      preferredLanguage: 'fr',
      notes: '',
      tags: [],
    },
  });

  const isVIP = watch('tags')?.includes('VIP');

  const handleOpenCreate = () => {
    reset({
      name: '',
      email: '',
      phone: '',
      nationality: '',
      preferredLanguage: 'fr',
      notes: '',
      tags: [],
    });
    setShowForm(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    reset({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      nationality: customer.nationality || '',
      preferredLanguage: customer.preferredLanguage || 'fr',
      notes: customer.notes || '',
      tags: customer.tags || [],
    });
    setEditingCustomer(customer);
  };

  const handleCreate = async (data: CustomerFormData) => {
    await createCustomer.mutateAsync(data);
    setShowForm(false);
    reset();
  };

  const handleUpdate = async (data: CustomerFormData) => {
    if (!editingCustomer) return;
    await updateCustomer.mutateAsync({ id: editingCustomer.id, data });
    setEditingCustomer(null);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    await deleteCustomer.mutateAsync(deletingCustomer.id);
    setDeletingCustomer(null);
  };

  const handleVIPToggle = (checked: boolean) => {
    const currentTags = watch('tags') || [];
    if (checked && !currentTags.includes('VIP')) {
      setValue('tags', [...currentTags, 'VIP']);
    } else if (!checked) {
      setValue('tags', currentTags.filter((t) => t !== 'VIP'));
    }
  };

  const formatPhoneNumber = (phone: string) => {
  if (!phone) return phone;
  // If phone starts with +, add space after country code (typically 1-4 digits after +)
  if (phone.startsWith('+')) {
    // Match country code (1-4 digits) and add space after it
    return phone.replace(/^(\+\d{1,4})(\d)/, '$1 $2');
  }
  return phone;
};

const getStatusBadge = (customer: Customer) => {
    if (customer.isVIP) {
      return <Badge variant="success">VIP</Badge>;
    }
    if (customer.totalBookings > 2) {
      return <Badge variant="primary">Régulier</Badge>;
    }
    return <Badge variant="gray">Nouveau</Badge>;
  };

  const vipOptions = [
    { value: '', label: 'Tous les clients' },
    { value: 'vip', label: 'VIP uniquement' },
    { value: 'regular', label: 'Non-VIP' },
  ];

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    if (!customersWithBookingCounts) return [];
    
    // Filter
    let filtered = customersWithBookingCounts.filter((customer) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower) ||
          customer.nationality?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // VIP filter
      if (vipFilter === 'vip' && !customer.isVIP) return false;
      if (vipFilter === 'regular' && customer.isVIP) return false;
      return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [customers, search, vipFilter, sortField, sortDirection]);

  const handleSortClick = (field: 'name' | 'date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate most common booking source for each customer
  const getMostCommonSource = (customerId: string) => {
    const bookings = allBookings?.filter((b: Booking) => b.customerId === customerId) || [];
    if (bookings.length === 0) return null;
    const sourceCounts: Record<string, number> = {};
    bookings.forEach((booking: Booking) => {
      sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
    });
    const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
    return sortedSources.length > 0 ? sortedSources[0][0] : null;
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return '-';
    const labels: Record<string, string> = {
      airbnb: 'Airbnb',
      booking: 'Booking.com',
      direct: 'Direct',
      other: 'Autre',
    };
    return labels[source] || source;
  };

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (customer: Customer) => (
        <div>
          <p className="font-medium text-gray-900">{customer.name}</p>
          {customer.nationality && (
            <p className="text-xs text-gray-500">{customer.nationality}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (customer: Customer) => (
        <div className="text-sm">
          {customer.email && (
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="w-3 h-3" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="w-3 h-3" />
              <span>{formatPhoneNumber(customer.phone)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (customer: Customer) => getStatusBadge(customer),
    },
    {
      key: 'bookings',
      header: 'Réservations',
      render: (customer: Customer) => (
        <span className="text-sm">{customer.totalBookings}</span>
      ),
    },
    {
      key: 'channel',
      header: 'Canal',
      render: (customer: Customer) => {
        const source = getMostCommonSource(customer.id);
        return (
          <Badge variant="gray" size="sm">
            {getSourceLabel(source)}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Ajouté le',
      render: (customer: Customer) => formatDate(customer.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (customer: Customer) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="p-2"
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(customer);
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
              setDeletingCustomer(customer);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const CustomerForm = () => (
    <form
      onSubmit={handleSubmit(editingCustomer ? handleUpdate : handleCreate)}
      className="space-y-4"
    >
      <Input
        label="Nom complet"
        placeholder="Jean Dupont"
        error={errors.name?.message}
        required
        {...register('name', { required: 'Nom requis' })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="jean@example.com"
          {...register('email')}
        />
        <Input
          label="Téléphone"
          placeholder="+33 6 12 34 56 78"
          {...register('phone')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nationalité"
          placeholder="France"
          {...register('nationality')}
        />
        <Controller
          name="preferredLanguage"
          control={control}
          render={({ field }) => (
            <Select
              label="Langue préférée"
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
              ]}
              {...field}
            />
          )}
        />
      </div>

      <Checkbox
        label="Client VIP"
        checked={isVIP}
        onChange={handleVIPToggle}
      />

      <TextArea
        label="Notes"
        placeholder="Notes sur le client..."
        {...register('notes')}
      />

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          isLoading={createCustomer.isPending || updateCustomer.isPending}
        >
          {editingCustomer ? 'Mettre à jour' : 'Ajouter le client'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">{filteredCustomers?.length || 0} client(s)</p>
        </div>
        <div className="flex gap-2">
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
                  onClick={() => {
                    if (filteredCustomers && filteredCustomers.length > 0) {
                      const stats: Record<string, { bookings: number; revenue: number }> = {};
                      filteredCustomers.forEach((c) => {
                        stats[c.id] = { bookings: c.totalBookings, revenue: c.totalSpentEUR };
                      });
                      exportCustomersToCSV(filteredCustomers, stats);
                      setShowExportMenu(false);
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}
          </div>
          <Button 
            onClick={handleOpenCreate} 
            variant="outline"
            className="p-2"
            title="Nouveau client"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <Card className="overflow-visible">
        <CardBody className="py-3 overflow-visible">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter icon + label */}
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Filtres</span>
            </div>

            {/* Search - compact */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {/* VIP filter dropdown */}
            <select
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                vipFilter ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              {vipOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Spacer to push sort buttons to the right */}
            <div className="flex-1" />

            {/* Sort buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Tri:</span>
              <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleSortClick('name')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors rounded-l-md ${
                    sortField === 'name' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Alphabétique
                  {sortField === 'name' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortClick('date')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-gray-200 rounded-r-md ${
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
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Desktop Table View */}
      {!filteredCustomers || filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-gray-400" />}
          title="Aucun client"
          description="Ajoutez votre premier client."
          action={{
            label: 'Nouveau client',
            onClick: handleOpenCreate,
          }}
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <Table
              columns={columns}
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyMessage="Aucun client trouvé"
              onRowClick={(customer) => setViewingCustomerId(customer.id)}
            />
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun client trouvé</div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setViewingCustomerId(customer.id)}
                >
                  <CardBody className="p-4">
                    {/* Header: Name and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {customer.name}
                        </h3>
                        {customer.nationality && (
                          <p className="text-xs text-gray-500">
                            {customer.nationality}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(customer)}
                        <Button
                          size="sm"
                          variant="outline"
                          className="p-1.5"
                          title="Modifier"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(customer);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2 mb-3">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{formatPhoneNumber(customer.phone)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats and Channel */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Réservations</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {customer.totalBookings}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Canal</p>
                        <Badge variant="gray" size="sm">
                          {getSourceLabel(getMostCommonSource(customer.id))}
                        </Badge>
                      </div>
                    </div>

                    {/* Date Added */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Ajouté le {formatDate(customer.createdAt)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm || !!editingCustomer}
        onClose={() => {
          setShowForm(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Modifier le client' : 'Nouveau client'}
        size="lg"
      >
        <CustomerForm />
      </Modal>

      <CustomerDetailsModal
        customerId={viewingCustomerId}
        customer={customerDetails?.customer || customers?.find(c => c.id === viewingCustomerId) || null}
        customerStats={customerDetails ? {
          totalBookings: customerDetails.totalBookings,
          totalRevenue: customerDetails.totalRevenue,
          avgStayDuration: customerDetails.avgStayDuration,
          lastStayDate: customerDetails.lastStayDate,
        } : null}
        isOpen={!!viewingCustomerId}
        onClose={() => setViewingCustomerId(null)}
        onEdit={() => {
          const customerToEdit = customerDetails?.customer || customers?.find(c => c.id === viewingCustomerId);
          if (customerToEdit) {
            handleOpenEdit(customerToEdit);
            setViewingCustomerId(null);
          }
        }}
        onDelete={() => {
          const customerToDelete = customerDetails?.customer || customers?.find(c => c.id === viewingCustomerId);
          if (customerToDelete) {
            setDeletingCustomer(customerToDelete);
            setViewingCustomerId(null);
          }
        }}
        isAdmin={isAdmin}
        formatAmount={formatAmount}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
        title="Supprimer le client ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingCustomer?.name}" ?`}
        confirmText="Supprimer"
        isLoading={deleteCustomer.isPending}
      />
    </div>
  );
};

export default Customers;
