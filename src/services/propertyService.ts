import { supabase, TABLES } from './supabase';
import { uploadFiles, deleteFiles } from './storageService';
import { logAction } from './auditService';
import type { Property, PropertyFormData, UserMode } from '../types';

/**
 * Get all properties
 */
export async function getProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from(TABLES.PROPERTIES)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }

  return (data || []).map(mapPropertyFromDB);
}

/**
 * Get a single property by ID
 */
export async function getProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from(TABLES.PROPERTIES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching property:', error);
    throw error;
  }

  return data ? mapPropertyFromDB(data) : null;
}

/**
 * Create a new property
 */
export async function createProperty(
  formData: PropertyFormData,
  photos: File[],
  performedBy: UserMode
): Promise<Property> {
  // Upload photos first
  let photoUrls: string[] = [];
  if (photos.length > 0) {
    photoUrls = await uploadFiles(photos, 'PROPERTY_PHOTOS', 'properties');
  }

  const propertyData = {
    name: formData.name,
    address: formData.address,
    description: formData.description || null,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    max_guests: formData.maxGuests,
    amenities: formData.amenities,
    base_price_eur: formData.basePriceEUR,
    base_price_fcfa: formData.basePriceFCFA,
    cleaning_fee_eur: formData.cleaningFeeEUR || 0,
    cleaning_fee_fcfa: formData.cleaningFeeFCFA || 0,
    status: formData.status,
    photos: photoUrls,
  };

  const { data, error } = await supabase
    .from(TABLES.PROPERTIES)
    .insert(propertyData)
    .select()
    .single();

  if (error) {
    console.error('Error creating property:', error);
    throw error;
  }

  const property = mapPropertyFromDB(data);

  // Log the action
  await logAction({
    action: 'create',
    entity: 'property',
    entityId: property.id,
    performedBy,
    newData: property,
  });

  return property;
}

/**
 * Update a property
 */
export async function updateProperty(
  id: string,
  formData: Partial<PropertyFormData>,
  newPhotos: File[] = [],
  photosToDelete: string[] = [],
  performedBy: UserMode
): Promise<Property> {
  // Get current property for audit log
  const currentProperty = await getProperty(id);
  if (!currentProperty) {
    throw new Error('Property not found');
  }

  // Handle photo changes
  let updatedPhotos = [...currentProperty.photos];

  // Delete removed photos
  if (photosToDelete.length > 0) {
    await deleteFiles(photosToDelete, 'PROPERTY_PHOTOS');
    updatedPhotos = updatedPhotos.filter((url) => !photosToDelete.includes(url));
  }

  // Upload new photos
  if (newPhotos.length > 0) {
    const newPhotoUrls = await uploadFiles(newPhotos, 'PROPERTY_PHOTOS', 'properties');
    updatedPhotos = [...updatedPhotos, ...newPhotoUrls];
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    photos: updatedPhotos,
  };

  if (formData.name !== undefined) updateData.name = formData.name;
  if (formData.address !== undefined) updateData.address = formData.address;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.bedrooms !== undefined) updateData.bedrooms = formData.bedrooms;
  if (formData.bathrooms !== undefined) updateData.bathrooms = formData.bathrooms;
  if (formData.maxGuests !== undefined) updateData.max_guests = formData.maxGuests;
  if (formData.amenities !== undefined) updateData.amenities = formData.amenities;
  if (formData.basePriceEUR !== undefined) updateData.base_price_eur = formData.basePriceEUR;
  if (formData.basePriceFCFA !== undefined) updateData.base_price_fcfa = formData.basePriceFCFA;
  if (formData.cleaningFeeEUR !== undefined) updateData.cleaning_fee_eur = formData.cleaningFeeEUR;
  if (formData.cleaningFeeFCFA !== undefined) updateData.cleaning_fee_fcfa = formData.cleaningFeeFCFA;
  if (formData.status !== undefined) updateData.status = formData.status;

  const { data, error } = await supabase
    .from(TABLES.PROPERTIES)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating property:', error);
    throw error;
  }

  const updatedProperty = mapPropertyFromDB(data);

  // Log the action
  await logAction({
    action: 'update',
    entity: 'property',
    entityId: id,
    performedBy,
    previousData: currentProperty,
    newData: updatedProperty,
  });

  return updatedProperty;
}

/**
 * Delete a property
 */
export async function deleteProperty(
  id: string,
  performedBy: UserMode
): Promise<void> {
  // Get current property for cleanup and audit
  const property = await getProperty(id);
  if (!property) {
    throw new Error('Property not found');
  }

  // Delete associated photos
  if (property.photos.length > 0) {
    await deleteFiles(property.photos, 'PROPERTY_PHOTOS');
  }

  const { error } = await supabase
    .from(TABLES.PROPERTIES)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting property:', error);
    throw error;
  }

  // Log the action
  await logAction({
    action: 'delete',
    entity: 'property',
    entityId: id,
    performedBy,
    previousData: property,
  });
}

// Helper function to map database row to Property type
function mapPropertyFromDB(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    name: row.name as string,
    address: row.address as string,
    description: (row.description as string) || '',
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    maxGuests: row.max_guests as number,
    amenities: (row.amenities as string[]) || [],
    basePriceEUR: row.base_price_eur as number,
    basePriceFCFA: row.base_price_fcfa as number,
    cleaningFeeEUR: (row.cleaning_fee_eur as number) || 0,
    cleaningFeeFCFA: (row.cleaning_fee_fcfa as number) || 0,
    status: row.status as Property['status'],
    photos: (row.photos as string[]) || [],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
