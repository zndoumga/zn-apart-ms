import React, { useState } from 'react';
import { Plus, Wrench, Camera, Download } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import DatePicker from '../components/ui/DatePicker';
import FileUpload from '../components/ui/FileUpload';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Card, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import {
  useMaintenance,
  useCreateMaintenance,
  useDeleteMaintenance,
} from '../hooks/useMaintenance';
import { useProperties } from '../hooks/useProperties';
import { useCurrency } from '../store/useAppStore';
import { formatDate, formatForInput } from '../utils/dates';
import { exportMaintenanceToCSV } from '../utils/export';
import type { MaintenanceEntry, MaintenanceFormData, MaintenanceCategory, MaintenanceStatus } from '../types';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_STATUSES } from '../types';

const Maintenance: React.FC = () => {
  const { formatAmount, exchangeRate } = useCurrency();
  const { data: properties } = useProperties();
  const { data: entries, isLoading } = useMaintenance();
  const createMaintenance = useCreateMaintenance();
  const deleteMaintenance = useDeleteMaintenance();

  const [showForm, setShowForm] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<MaintenanceEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<MaintenanceEntry | null>(null);
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
  } = useForm<MaintenanceFormData>({
    defaultValues: {
      propertyId: '',
      date: formatForInput(new Date()),
      category: 'other',
      description: '',
      costEUR: 0,
      provider: '',
      notes: '',
      status: 'scheduled',
    },
  });

  const costEUR = watch('costEUR');

  const handleCreate = async (data: MaintenanceFormData) => {
    await createMaintenance.mutateAsync({
      data,
      beforePhotos,
      afterPhotos,
    });
    setShowForm(false);
    setBeforePhotos([]);
    setAfterPhotos([]);
    reset();
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    await deleteMaintenance.mutateAsync(deletingEntry.id);
    setDeletingEntry(null);
  };

  const getPropertyName = (propertyId: string) => {
    return properties?.find((p) => p.id === propertyId)?.name || 'Unknown';
  };

  const getCategoryBadge = (category: MaintenanceCategory) => {
    const variants: Record<MaintenanceCategory, 'primary' | 'warning' | 'success' | 'gray' | 'danger'> = {
      plumbing: 'primary',
      electrical: 'warning',
      hvac: 'success',
      appliance: 'gray',
      structural: 'danger',
      cleaning: 'success',
      other: 'gray',
    };
    const label = MAINTENANCE_CATEGORIES.find((c) => c.value === category)?.label || category;
    return <Badge variant={variants[category]}>{label}</Badge>;
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    const variants: Record<MaintenanceStatus, 'primary' | 'warning' | 'success' | 'gray'> = {
      scheduled: 'gray',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'gray',
    };
    const label = MAINTENANCE_STATUSES.find((s) => s.value === status)?.label || status;
    return <Badge variant={variants[status]}>{label}</Badge>;
  };

  const filteredEntries = entries?.filter((entry) => {
    const matchesProperty = !propertyFilter || entry.propertyId === propertyFilter;
    const matchesCategory = !categoryFilter || entry.category === categoryFilter;
    return matchesProperty && matchesCategory;
  });

  const propertyOptions = [
    { value: '', label: 'Tous les appartements' },
    ...(properties?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...MAINTENANCE_CATEGORIES,
  ];

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (entry: MaintenanceEntry) => formatDate(entry.date),
    },
    {
      key: 'property',
      header: 'Appartement',
      render: (entry: MaintenanceEntry) => getPropertyName(entry.propertyId),
    },
    {
      key: 'category',
      header: 'Catégorie',
      render: (entry: MaintenanceEntry) => getCategoryBadge(entry.category),
    },
    {
      key: 'description',
      header: 'Description',
      render: (entry: MaintenanceEntry) => (
        <p className="truncate max-w-xs">{entry.description}</p>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (entry: MaintenanceEntry) => getStatusBadge(entry.status),
    },
    {
      key: 'cost',
      header: 'Coût',
      render: (entry: MaintenanceEntry) => (
        <span className="font-medium">
          {formatAmount(entry.costEUR, entry.costFCFA)}
        </span>
      ),
    },
    {
      key: 'photos',
      header: 'Photos',
      render: (entry: MaintenanceEntry) => (
        <div className="flex items-center gap-1">
          {(entry.beforePhotos.length > 0 || entry.afterPhotos.length > 0) && (
            <Camera className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">
            {entry.beforePhotos.length + entry.afterPhotos.length}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (entry: MaintenanceEntry) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setViewingEntry(entry);
            }}
          >
            Voir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingEntry(entry);
            }}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">
            Journal de maintenance des appartements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (filteredEntries && filteredEntries.length > 0) {
                const propertyNames: Record<string, string> = {};
                properties?.forEach((p) => {
                  propertyNames[p.id] = p.name;
                });
                exportMaintenanceToCSV(filteredEntries, propertyNames);
              }
            }}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exporter
          </Button>
          <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nouvelle entrée
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <Select
              options={propertyOptions}
              value={propertyFilter}
              onChange={setPropertyFilter}
              className="w-48"
            />
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-48"
            />
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      {!filteredEntries || filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-8 h-8 text-gray-400" />}
          title="Aucune entrée de maintenance"
          description="Enregistrez les travaux effectués."
          action={{
            label: 'Nouvelle entrée',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <Card>
          <Table
            columns={columns}
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Aucune entrée trouvée"
            onRowClick={(entry) => setViewingEntry(entry)}
          />
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle entrée de maintenance"
        size="lg"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="propertyId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Appartement"
                  options={propertyOptions.slice(1)}
                  required
                  {...field}
                />
              )}
            />
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date"
                  required
                  value={typeof field.value === 'string' ? field.value : formatForInput(field.value as Date)}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select label="Catégorie" options={MAINTENANCE_CATEGORIES} {...field} />
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select label="Statut" options={MAINTENANCE_STATUSES} value={field.value || 'scheduled'} onChange={field.onChange} />
              )}
            />
          </div>

          <div>
            <Input
              label="Coût (EUR)"
              type="number"
              min={0}
              step={0.01}
              {...register('costEUR', { valueAsNumber: true })}
            />
            {costEUR && costEUR > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {Math.round(costEUR * exchangeRate).toLocaleString()} FCFA
              </p>
            )}
          </div>

          <TextArea
            label="Description"
            placeholder="Décrivez les travaux effectués..."
            required
            {...register('description', { required: 'Description requise' })}
          />

          <Input
            label="Prestataire"
            placeholder="Nom du technicien ou entreprise"
            {...register('provider')}
          />

          <TextArea
            label="Notes"
            placeholder="Notes supplémentaires..."
            {...register('notes')}
          />

          <div className="grid grid-cols-2 gap-4">
            <FileUpload
              label="Photos avant"
              multiple
              value={beforePhotos}
              onChange={setBeforePhotos}
            />
            <FileUpload
              label="Photos après"
              multiple
              value={afterPhotos}
              onChange={setAfterPhotos}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMaintenance.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        title="Détails de maintenance"
        size="lg"
      >
        {viewingEntry && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Appartement</p>
                <p className="font-medium">{getPropertyName(viewingEntry.propertyId)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(viewingEntry.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Catégorie</p>
                {getCategoryBadge(viewingEntry.category)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                {getStatusBadge(viewingEntry.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Coût</p>
                <p className="font-medium text-lg">
                  {formatAmount(viewingEntry.costEUR, viewingEntry.costFCFA)}
                </p>
              </div>
              {viewingEntry.provider && (
                <div>
                  <p className="text-sm text-gray-500">Prestataire</p>
                  <p className="font-medium">{viewingEntry.provider}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p>{viewingEntry.description}</p>
            </div>

            {viewingEntry.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-600">{viewingEntry.notes}</p>
              </div>
            )}

            {/* Photos */}
            {viewingEntry.beforePhotos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Photos avant</p>
                <div className="flex gap-2 flex-wrap">
                  {viewingEntry.beforePhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Avant ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {viewingEntry.afterPhotos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Photos après</p>
                <div className="flex gap-2 flex-wrap">
                  {viewingEntry.afterPhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Après ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
        title="Supprimer l'entrée ?"
        message="Cette action est irréversible."
        confirmText="Supprimer"
        isLoading={deleteMaintenance.isPending}
      />
    </div>
  );
};

export default Maintenance;
