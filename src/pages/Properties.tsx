import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Building2, MapPin, Users, Bed } from 'lucide-react';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { useMode } from '../store/useAppStore';
import type { Property, PropertyFormData } from '../types';
import { AMENITIES, PROPERTY_STATUSES } from '../types';
import CurrencyToggle from '../components/ui/CurrencyToggle';
import PropertyDetailsModal from '../components/properties/PropertyDetailsModal';

type InputCurrency = 'EUR' | 'FCFA';

const Properties: React.FC = () => {
  const { formatAmount, exchangeRate } = useCurrency();
  const { isAdmin, isInvestor } = useMode();
  const { data: properties, isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [showForm, setShowForm] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  // Currency toggles for each field
  const [basePriceCurrency, setBasePriceCurrency] = useState<InputCurrency>('EUR');
  const [rentCurrency, setRentCurrency] = useState<InputCurrency>('EUR');
  const [purchaseCurrency, setPurchaseCurrency] = useState<InputCurrency>('EUR');
  const [travauxCurrency, setTravauxCurrency] = useState<InputCurrency>('EUR');
  const [meublesCurrency, setMeublesCurrency] = useState<InputCurrency>('EUR');
  const [equipementCurrency, setEquipementCurrency] = useState<InputCurrency>('EUR');

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
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
      status: 'active',
    },
  });

  // Register amount fields separately to avoid focus issues
  React.useEffect(() => {
    register('basePriceEUR', { valueAsNumber: true });
    register('basePriceFCFA', { valueAsNumber: true });
    register('rentPriceEUR', { valueAsNumber: true });
    register('rentPriceFCFA', { valueAsNumber: true });
    register('purchasePriceEUR', { valueAsNumber: true });
    register('purchasePriceFCFA', { valueAsNumber: true });
    register('travauxEUR', { valueAsNumber: true });
    register('travauxFCFA', { valueAsNumber: true });
    register('meublesEUR', { valueAsNumber: true });
    register('meublesFCFA', { valueAsNumber: true });
    register('equipementEUR', { valueAsNumber: true });
    register('equipementFCFA', { valueAsNumber: true });
  }, [register]);


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
      rentPriceEUR: property.rentPriceEUR,
      rentPriceFCFA: property.rentPriceFCFA,
      purchasePriceEUR: property.purchasePriceEUR,
      purchasePriceFCFA: property.purchasePriceFCFA,
      travauxEUR: property.travauxEUR,
      travauxFCFA: property.travauxFCFA,
      meublesEUR: property.meublesEUR,
      meublesFCFA: property.meublesFCFA,
      equipementEUR: property.equipementEUR,
      equipementFCFA: property.equipementFCFA,
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
      // Auto-calculate FCFA for investment fields if not set
      rentPriceFCFA: data.rentPriceFCFA || (data.rentPriceEUR ? Math.round(data.rentPriceEUR * exchangeRate) : undefined),
      purchasePriceFCFA: data.purchasePriceFCFA || (data.purchasePriceEUR ? Math.round(data.purchasePriceEUR * exchangeRate) : undefined),
      travauxFCFA: data.travauxFCFA || (data.travauxEUR ? Math.round(data.travauxEUR * exchangeRate) : undefined),
      meublesFCFA: data.meublesFCFA || (data.meublesEUR ? Math.round(data.meublesEUR * exchangeRate) : undefined),
      equipementFCFA: data.equipementFCFA || (data.equipementEUR ? Math.round(data.equipementEUR * exchangeRate) : undefined),
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
      // Auto-calculate FCFA for investment fields if not set
      rentPriceFCFA: data.rentPriceFCFA || (data.rentPriceEUR ? Math.round(data.rentPriceEUR * exchangeRate) : undefined),
      purchasePriceFCFA: data.purchasePriceFCFA || (data.purchasePriceEUR ? Math.round(data.purchasePriceEUR * exchangeRate) : undefined),
      travauxFCFA: data.travauxFCFA || (data.travauxEUR ? Math.round(data.travauxEUR * exchangeRate) : undefined),
      meublesFCFA: data.meublesFCFA || (data.meublesEUR ? Math.round(data.meublesEUR * exchangeRate) : undefined),
      equipementFCFA: data.equipementFCFA || (data.equipementEUR ? Math.round(data.equipementEUR * exchangeRate) : undefined),
    };
    await updateProperty.mutateAsync({ id: editingProperty.id, data: formData, newPhotos: photos });
    setShowForm(false);
    setEditingProperty(null);
    setPhotos([]);
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    await deleteProperty.mutateAsync(deletingProperty.id);
    setDeletingProperty(null);
  };

  const toggleAmenity = useCallback((amenity: string, currentAmenities: string[]) => {
    if (currentAmenities.includes(amenity)) {
      return currentAmenities.filter((a) => a !== amenity);
    }
    return [...currentAmenities, amenity];
  }, []);

  const PropertyForm = ({ onSubmit, isLoading: formLoading, property }: { onSubmit: (data: PropertyFormData) => void; isLoading: boolean; property?: Property }) => {
    // Use useWatch to avoid re-renders from watch() calls
    const basePriceEUR = useWatch({ control, name: 'basePriceEUR' });
    const basePriceFCFA = useWatch({ control, name: 'basePriceFCFA' });
    const rentPriceEUR = useWatch({ control, name: 'rentPriceEUR' });
    const rentPriceFCFA = useWatch({ control, name: 'rentPriceFCFA' });
    const purchasePriceEUR = useWatch({ control, name: 'purchasePriceEUR' });
    const purchasePriceFCFA = useWatch({ control, name: 'purchasePriceFCFA' });
    const travauxEUR = useWatch({ control, name: 'travauxEUR' });
    const travauxFCFA = useWatch({ control, name: 'travauxFCFA' });
    const meublesEUR = useWatch({ control, name: 'meublesEUR' });
    const meublesFCFA = useWatch({ control, name: 'meublesFCFA' });
    const equipementEUR = useWatch({ control, name: 'equipementEUR' });
    const equipementFCFA = useWatch({ control, name: 'equipementFCFA' });

    return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nom de l'appartement"
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
        placeholder="Description de l'appartement..."
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
        {/* Base Price */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Prix de base par nuit
            </label>
            <CurrencyToggle value={basePriceCurrency} onChange={setBasePriceCurrency} size="sm" />
          </div>
          <div className="relative">
            <Controller
              name="basePriceEUR"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const eurValue = parseFloat(value) || 0;
                    field.onChange(eurValue);
                    setValue('basePriceFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={basePriceCurrency === 'EUR' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${basePriceCurrency !== 'EUR' ? 'hidden' : ''}`}
                />
              )}
            />
            <Controller
              name="basePriceFCFA"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const fcfaValue = parseFloat(value) || 0;
                    field.onChange(fcfaValue);
                    setValue('basePriceEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={basePriceCurrency === 'FCFA' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${basePriceCurrency !== 'FCFA' ? 'hidden' : ''}`}
                />
              )}
            />
            {basePriceCurrency === 'EUR' && basePriceFCFA > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {basePriceFCFA?.toLocaleString()} FCFA
              </p>
            )}
            {basePriceCurrency === 'FCFA' && basePriceEUR > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ €{basePriceEUR?.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Rent */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Loyer mensuel
            </label>
            <CurrencyToggle value={rentCurrency} onChange={setRentCurrency} size="sm" />
          </div>
          <div className="relative">
            <Controller
              name="rentPriceEUR"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const eurValue = parseFloat(value) || 0;
                    field.onChange(eurValue);
                    setValue('rentPriceFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={rentCurrency === 'EUR' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${rentCurrency !== 'EUR' ? 'hidden' : ''}`}
                />
              )}
            />
            <Controller
              name="rentPriceFCFA"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const fcfaValue = parseFloat(value) || 0;
                    field.onChange(fcfaValue);
                    setValue('rentPriceEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={rentCurrency === 'FCFA' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${rentCurrency !== 'FCFA' ? 'hidden' : ''}`}
                />
              )}
            />
            {rentCurrency === 'EUR' && rentPriceFCFA > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {rentPriceFCFA?.toLocaleString()} FCFA
              </p>
            )}
            {rentCurrency === 'FCFA' && rentPriceEUR > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ €{rentPriceEUR?.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Investment Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Investissement</h3>
        
        {/* Purchase Price */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Prix d'achat
            </label>
            <CurrencyToggle value={purchaseCurrency} onChange={setPurchaseCurrency} size="sm" />
          </div>
          <div className="relative">
            <Controller
              name="purchasePriceEUR"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const eurValue = parseFloat(value) || 0;
                    field.onChange(eurValue);
                    setValue('purchasePriceFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={purchaseCurrency === 'EUR' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${purchaseCurrency !== 'EUR' ? 'hidden' : ''}`}
                />
              )}
            />
            <Controller
              name="purchasePriceFCFA"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const fcfaValue = parseFloat(value) || 0;
                    field.onChange(fcfaValue);
                    setValue('purchasePriceEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={purchaseCurrency === 'FCFA' ? field.ref : undefined}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${purchaseCurrency !== 'FCFA' ? 'hidden' : ''}`}
                />
              )}
            />
            {purchaseCurrency === 'EUR' && purchasePriceFCFA > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {purchasePriceFCFA?.toLocaleString()} FCFA
              </p>
            )}
            {purchaseCurrency === 'FCFA' && purchasePriceEUR > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ €{purchasePriceEUR?.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Investment breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Travaux
              </label>
              <CurrencyToggle value={travauxCurrency} onChange={setTravauxCurrency} size="sm" />
            </div>
            <div className="relative">
              <Controller
                name="travauxEUR"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const eurValue = parseFloat(value) || 0;
                      field.onChange(eurValue);
                      setValue('travauxFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={travauxCurrency === 'EUR' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${travauxCurrency !== 'EUR' ? 'hidden' : ''}`}
                  />
                )}
              />
              <Controller
                name="travauxFCFA"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const fcfaValue = parseFloat(value) || 0;
                      field.onChange(fcfaValue);
                      setValue('travauxEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={travauxCurrency === 'FCFA' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${travauxCurrency !== 'FCFA' ? 'hidden' : ''}`}
                  />
                )}
              />
              {travauxCurrency === 'EUR' && travauxFCFA > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ {travauxFCFA?.toLocaleString()} FCFA
                </p>
              )}
              {travauxCurrency === 'FCFA' && travauxEUR > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ €{travauxEUR?.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Meubles
              </label>
              <CurrencyToggle value={meublesCurrency} onChange={setMeublesCurrency} size="sm" />
            </div>
            <div className="relative">
              <Controller
                name="meublesEUR"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const eurValue = parseFloat(value) || 0;
                      field.onChange(eurValue);
                      setValue('meublesFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={meublesCurrency === 'EUR' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${meublesCurrency !== 'EUR' ? 'hidden' : ''}`}
                  />
                )}
              />
              <Controller
                name="meublesFCFA"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const fcfaValue = parseFloat(value) || 0;
                      field.onChange(fcfaValue);
                      setValue('meublesEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={meublesCurrency === 'FCFA' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${meublesCurrency !== 'FCFA' ? 'hidden' : ''}`}
                  />
                )}
              />
              {meublesCurrency === 'EUR' && meublesFCFA > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ {meublesFCFA?.toLocaleString()} FCFA
                </p>
              )}
              {meublesCurrency === 'FCFA' && meublesEUR > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ €{meublesEUR?.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Équipement
              </label>
              <CurrencyToggle value={equipementCurrency} onChange={setEquipementCurrency} size="sm" />
            </div>
            <div className="relative">
              <Controller
                name="equipementEUR"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const eurValue = parseFloat(value) || 0;
                      field.onChange(eurValue);
                      setValue('equipementFCFA', Math.round(eurValue * exchangeRate), { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={equipementCurrency === 'EUR' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${equipementCurrency !== 'EUR' ? 'hidden' : ''}`}
                  />
                )}
              />
              <Controller
                name="equipementFCFA"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const fcfaValue = parseFloat(value) || 0;
                      field.onChange(fcfaValue);
                      setValue('equipementEUR', Math.round((fcfaValue / exchangeRate) * 100) / 100, { shouldValidate: false, shouldDirty: false });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={equipementCurrency === 'FCFA' ? field.ref : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${equipementCurrency !== 'FCFA' ? 'hidden' : ''}`}
                  />
                )}
              />
              {equipementCurrency === 'EUR' && equipementFCFA > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ {equipementFCFA?.toLocaleString()} FCFA
                </p>
              )}
              {equipementCurrency === 'FCFA' && equipementEUR > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ €{equipementEUR?.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
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
                  checked={field.value?.includes(amenity) || false}
                  onChange={(checked) => {
                    const currentAmenities = field.value || [];
                    const newAmenities = checked
                      ? [...currentAmenities, amenity]
                      : currentAmenities.filter((a) => a !== amenity);
                    field.onChange(newAmenities);
                  }}
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
          {property ? 'Mettre à jour' : 'Créer l\'appartement'}
        </Button>
      </div>
    </form>
    );
  };

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appartements</h1>
          <p className="text-gray-600 mt-1">
            {properties?.length || 0} appartement(s) enregistré(s)
          </p>
        </div>
        {!isInvestor && (
          <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Ajouter un appartement
          </Button>
        )}
      </div>

      {/* Properties grid */}
      {!properties || properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-gray-400" />}
          title="Aucun appartement"
          description="Ajoutez votre premier appartement pour commencer."
          action={!isInvestor ? {
            label: 'Ajouter un appartement',
            onClick: handleOpenCreate,
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card 
              key={property.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setViewingProperty(property)}
            >
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

                <div className="mt-4 pt-4 border-t">
                  <span className="text-lg font-bold text-primary-600">
                    {formatAmount(property.basePriceEUR, property.basePriceFCFA)}
                    <span className="text-sm font-normal text-gray-500">/nuit</span>
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      <PropertyDetailsModal
        property={viewingProperty}
        isOpen={!!viewingProperty}
        onClose={() => setViewingProperty(null)}
        onEdit={!isInvestor ? () => {
          if (viewingProperty) {
            handleOpenEdit(viewingProperty);
            setViewingProperty(null);
          }
        } : undefined}
        onDelete={!isInvestor ? () => {
          if (viewingProperty) {
            setDeletingProperty(viewingProperty);
            setViewingProperty(null);
          }
        } : undefined}
        isAdmin={isAdmin}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvel appartement"
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
        title="Modifier l'appartement"
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
        title="Supprimer l'appartement ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingProperty?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={deleteProperty.isPending}
      />
    </div>
  );
};

export default Properties;
