import React, { useState } from 'react';
import { Plus, Search, Users, Mail, Phone, Globe, Download } from 'lucide-react';
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
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerWithStats,
} from '../hooks/useCustomers';
import { useCurrency } from '../store/useAppStore';
import { formatDate } from '../utils/dates';
import { exportCustomersToCSV } from '../utils/export';
import type { Customer, CustomerFormData } from '../types';

const Customers: React.FC = () => {
  const { formatAmount } = useCurrency();

  // State
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Queries
  const { data: customers, isLoading } = useCustomers({
    search,
  });
  const { data: customerDetails } = useCustomerWithStats(viewingCustomerId || undefined);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

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

  // Filter customers
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return [];
    return customers.filter((customer) => {
      if (vipFilter === 'vip' && !customer.isVIP) return false;
      if (vipFilter === 'regular' && customer.isVIP) return false;
      return true;
    });
  }, [customers, vipFilter]);

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
              <span>{customer.phone}</span>
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
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setViewingCustomerId(customer.id);
            }}
          >
            Voir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(customer);
            }}
          >
            Modifier
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
          <Button
            variant="secondary"
            onClick={() => {
              if (filteredCustomers && filteredCustomers.length > 0) {
                const stats: Record<string, { bookings: number; revenue: number }> = {};
                filteredCustomers.forEach((c) => {
                  stats[c.id] = { bookings: c.totalBookings, revenue: c.totalSpentEUR };
                });
                exportCustomersToCSV(filteredCustomers, stats);
              }
            }}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exporter
          </Button>
          <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Nouveau client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom, email, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              options={vipOptions}
              value={vipFilter}
              onChange={setVipFilter}
              className="w-48"
            />
          </div>
        </CardBody>
      </Card>

      {/* Table */}
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
        <Card>
          <Table
            columns={columns}
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Aucun client trouvé"
            onRowClick={(customer) => setViewingCustomerId(customer.id)}
          />
        </Card>
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

      {/* View Customer Modal */}
      <Modal
        isOpen={!!viewingCustomerId}
        onClose={() => setViewingCustomerId(null)}
        title="Détails du client"
        size="lg"
      >
        {customerDetails?.customer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {customerDetails.customer.name}
                </h3>
                {getStatusBadge(customerDetails.customer)}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  handleOpenEdit(customerDetails.customer!);
                  setViewingCustomerId(null);
                }}
              >
                Modifier
              </Button>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-4">
              {customerDetails.customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{customerDetails.customer.email}</span>
                </div>
              )}
              {customerDetails.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{customerDetails.customer.phone}</span>
                </div>
              )}
              {customerDetails.customer.nationality && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span>{customerDetails.customer.nationality}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {customerDetails.totalBookings}
                  </p>
                  <p className="text-sm text-gray-500">Réservations</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-success-600">
                    {formatAmount(customerDetails.totalRevenue, customerDetails.totalRevenue * 656)}
                  </p>
                  <p className="text-sm text-gray-500">Revenu total</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {customerDetails.avgStayDuration.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Nuits moyennes</p>
                </CardBody>
              </Card>
            </div>

            {/* Notes */}
            {customerDetails.customer.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                <p className="text-gray-600">{customerDetails.customer.notes}</p>
              </div>
            )}

            {/* Tags */}
            {customerDetails.customer.tags && customerDetails.customer.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
                <div className="flex gap-2 flex-wrap">
                  {customerDetails.customer.tags.map((tag) => (
                    <Badge key={tag} variant="gray">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Last stay */}
            {customerDetails.lastStayDate && (
              <p className="text-sm text-gray-500">
                Dernier séjour: {formatDate(customerDetails.lastStayDate)}
              </p>
            )}
          </div>
        )}
      </Modal>

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
