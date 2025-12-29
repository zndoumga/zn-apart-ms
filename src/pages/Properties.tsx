import React, { useState } from 'react';
import { Plus, Building2, MapPin, Users, Bed, Edit, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';
import FileUpload from '../components/ui/FileUpload';
import { Card, CardBody } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
} from '../hooks/useProperties';
import { useCurrency } from '../store/useAppStore';
import type { Property, PropertyFormData } from '../types';
import { AMENITIES, PROPERTY_STATUSES } from '../types';

const Properties: React.FC = () => {
  const { formatAmount, exchangeRate } = useCurrency();
  const { data: properties, isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<PropertyFormData>({
    defaultValues: {
      name: '',
      address: '',
      description: '',
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      amenities: [],
      basePriceEUR: 50,
      basePriceFCFA: 32800,
      cleaningFeeEUR: 20,
      cleaningFeeFCFA: 13120,
      status: 'active',
    },
  });

  const basePriceEUR = watch('basePriceEUR');

  const handleOpenCreate = () => {
    reset({
      name: '',
      address: '',
      description: '',
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      amenities: [],
      basePriceEUR: 50,
      basePriceFCFA: 32800,
      cleaningFeeEUR: 20,
      cleaningFeeFCFA: 13120,
      status: 'active',
    });
    setPhotos([]);
    setShowForm(true);
  };

  const handleOpenEdit = (property: Property) => {
    reset({
      name: property.name,
      address: property.address,
      description: property.description,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      amenities: property.amenities,
      basePriceEUR: property.basePriceEUR,
      basePriceFCFA: property.basePriceFCFA,
      cleaningFeeEUR: property.cleaningFeeEUR,
      cleaningFeeFCFA: property.cleaningFeeFCFA,
      status: property.status,
    });
    setPhotos([]);
    setEditingProperty(property);
  };

  const handleCreate = async (data: PropertyFormData) => {
    // Auto-calculate FCFA if not set
    const formData = {
      ...data,
      basePriceFCFA: data.basePriceFCFA || Math.round(data.basePriceEUR * exchangeRate),
      cleaningFeeFCFA: data.cleaningFeeFCFA || Math.round((data.cleaningFeeEUR || 0) * exchangeRate),
    };
    await createProperty.mutateAsync({ data: formData, photos });
    setShowForm(false);
    setPhotos([]);
  };

  const handleUpdate = async (data: PropertyFormData) => {
    if (!editingProperty) return;
    const formData = {
      ...data,
      basePriceFCFA: data.basePriceFCFA || Math.round(data.basePriceEUR * exchangeRate),
      cleaningFeeFCFA: data.cleaningFeeFCFA || Math.round((data.cleaningFeeEUR || 0) * exchangeRate),
    };
    await updateProperty.mutateAsync({ id: editingProperty.id, data: formData, newPhotos: photos });
    setEditingProperty(null);
    setPhotos([]);
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    await deleteProperty.mutateAsync(deletingProperty.id);
    setDeletingProperty(null);
  };

  const toggleAmenity = (amenity: string, currentAmenities: string[]) => {
    if (currentAmenities.includes(amenity)) {
      return currentAmenities.filter((a) => a !== amenity);
    }
    return [...currentAmenities, amenity];
  };

  const PropertyForm = ({ onSubmit, isLoading: formLoading, property }: { onSubmit: (data: PropertyFormData) => void; isLoading: boolean; property?: Property }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nom de la propriété"
          placeholder="Appartement Douala Centre"
          error={errors.name?.message}
          required
          {...register('name', { required: 'Nom requis' })}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="Statut"
              options={PROPERTY_STATUSES}
              {...field}
            />
          )}
        />
      </div>

      <Input
        label="Adresse"
        placeholder="123 Rue Example, Douala"
        error={errors.address?.message}
        required
        {...register('address', { required: 'Adresse requise' })}
      />

      <TextArea
        label="Description"
        placeholder="Description de la propriété..."
        {...register('description')}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Chambres"
          type="number"
          min={1}
          {...register('bedrooms', { valueAsNumber: true })}
        />
        <Input
          label="Salles de bain"
          type="number"
          min={1}
          {...register('bathrooms', { valueAsNumber: true })}
        />
        <Input
          label="Invités max"
          type="number"
          min={1}
          {...register('maxGuests', { valueAsNumber: true })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Prix de base par nuit (EUR)"
            type="number"
            min={0}
            step={0.01}
            {...register('basePriceEUR', { valueAsNumber: true })}
          />
          {basePriceEUR > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              ≈ {Math.round(basePriceEUR * exchangeRate).toLocaleString()} FCFA
            </p>
          )}
        </div>
        <Input
          label="Frais de ménage (EUR)"
          type="number"
          min={0}
          step={0.01}
          {...register('cleaningFeeEUR', { valueAsNumber: true })}
        />
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Équipements
        </label>
        <Controller
          name="amenities"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {AMENITIES.map((amenity) => (
                <Checkbox
                  key={amenity}
                  label={amenity}
                  checked={field.value.includes(amenity)}
                  onChange={() => field.onChange(toggleAmenity(amenity, field.value))}
                />
              ))}
            </div>
          )}
        />
      </div>

      <FileUpload
        label="Photos"
        multiple
        value={photos}
        onChange={setPhotos}
      />

      {/* Existing photos */}
      {property && property.photos.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos existantes
          </label>
          <div className="flex gap-2 flex-wrap">
            {property.photos.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowForm(false);
            setEditingProperty(null);
          }}
        >
          Annuler
        </Button>
        <Button type="submit" isLoading={formLoading}>
          {property ? 'Mettre à jour' : 'Créer la propriété'}
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétés</h1>
          <p className="text-gray-600 mt-1">
            {properties?.length || 0} propriété(s) enregistrée(s)
          </p>
        </div>
        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Ajouter une propriété
        </Button>
      </div>

      {/* Properties grid */}
      {!properties || properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-gray-400" />}
          title="Aucune propriété"
          description="Ajoutez votre première propriété pour commencer."
          action={{
            label: 'Ajouter une propriété',
            onClick: handleOpenCreate,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              {/* Image */}
              <div className="h-48 bg-gray-100">
                {property.photos.length > 0 ? (
                  <img
                    src={property.photos[0]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{property.address}</span>
                    </div>
                  </div>
                  <Badge variant={property.status === 'active' ? 'success' : 'gray'}>
                    {property.status === 'active' ? 'Actif' : property.status === 'maintenance' ? 'Maintenance' : 'Inactif'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{property.bedrooms} ch.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{property.maxGuests} pers.</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-lg font-bold text-primary-600">
                    {formatAmount(property.basePriceEUR, property.basePriceFCFA)}
                    <span className="text-sm font-normal text-gray-500">/nuit</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(property)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger-600"
                      onClick={() => setDeletingProperty(property)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle propriété"
        size="lg"
      >
        <PropertyForm
          onSubmit={handleCreate}
          isLoading={createProperty.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProperty}
        onClose={() => setEditingProperty(null)}
        title="Modifier la propriété"
        size="lg"
      >
        {editingProperty && (
          <PropertyForm
            onSubmit={handleUpdate}
            isLoading={updateProperty.isPending}
            property={editingProperty}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProperty}
        onClose={() => setDeletingProperty(null)}
        onConfirm={handleDelete}
        title="Supprimer la propriété ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingProperty?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={deleteProperty.isPending}
      />
    </div>
  );
};

export default Properties;
