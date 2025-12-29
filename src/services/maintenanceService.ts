import { supabase, TABLES } from './supabase';
import { uploadFiles, deleteFiles } from './storageService';
import { logAction } from './auditService';
import type { MaintenanceEntry, MaintenanceFormData, UserMode } from '../types';

// Helper to convert string or Date to ISO string
function toISOString(value: string | Date): string {
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

/**
 * Get all maintenance entries
 */
export async function getMaintenanceEntries(): Promise<MaintenanceEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.MAINTENANCE)
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance entries:', error);
    throw error;
  }

  return (data || []).map(mapMaintenanceFromDB);
}

/**
 * Get maintenance entries by property ID
 */
export async function getMaintenanceByProperty(propertyId: string): Promise<MaintenanceEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.MAINTENANCE)
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance by property:', error);
    throw error;
  }

  return (data || []).map(mapMaintenanceFromDB);
}

/**
 * Get a single maintenance entry by ID
 */
export async function getMaintenanceEntry(id: string): Promise<MaintenanceEntry | null> {
  const { data, error } = await supabase
    .from(TABLES.MAINTENANCE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching maintenance entry:', error);
    throw error;
  }

  return data ? mapMaintenanceFromDB(data) : null;
}

/**
 * Create a new maintenance entry
 */
export async function createMaintenanceEntry(
  formData: MaintenanceFormData,
  beforePhotos: File[],
  afterPhotos: File[],
  performedBy: UserMode
): Promise<MaintenanceEntry> {
  // Upload photos
  let beforePhotoUrls: string[] = [];
  let afterPhotoUrls: string[] = [];

  if (beforePhotos.length > 0) {
    beforePhotoUrls = await uploadFiles(beforePhotos, 'MAINTENANCE_PHOTOS', 'before');
  }
  if (afterPhotos.length > 0) {
    afterPhotoUrls = await uploadFiles(afterPhotos, 'MAINTENANCE_PHOTOS', 'after');
  }

  const maintenanceData = {
    property_id: formData.propertyId,
    category: formData.category,
    description: formData.description,
    date: toISOString(formData.date),
    cost_eur: formData.costEUR || 0,
    cost_fcfa: formData.costFCFA || 0,
    provider: formData.provider || null,
    status: formData.status || 'scheduled',
    before_photos: beforePhotoUrls,
    after_photos: afterPhotoUrls,
    notes: formData.notes || null,
  };

  const { data, error } = await supabase
    .from(TABLES.MAINTENANCE)
    .insert(maintenanceData)
    .select()
    .single();

  if (error) {
    console.error('Error creating maintenance entry:', error);
    throw error;
  }

  const entry = mapMaintenanceFromDB(data);

  await logAction({
    action: 'create',
    entity: 'maintenance',
    entityId: entry.id,
    performedBy,
    newData: entry,
  });

  return entry;
}

/**
 * Update a maintenance entry
 */
export async function updateMaintenanceEntry(
  id: string,
  formData: Partial<MaintenanceFormData>,
  newBeforePhotos: File[] = [],
  newAfterPhotos: File[] = [],
  beforePhotosToDelete: string[] = [],
  afterPhotosToDelete: string[] = [],
  performedBy: UserMode
): Promise<MaintenanceEntry> {
  const currentEntry = await getMaintenanceEntry(id);
  if (!currentEntry) {
    throw new Error('Maintenance entry not found');
  }

  // Handle photo changes
  let updatedBeforePhotos = [...currentEntry.beforePhotos];
  let updatedAfterPhotos = [...currentEntry.afterPhotos];

  // Delete removed photos
  if (beforePhotosToDelete.length > 0) {
    await deleteFiles(beforePhotosToDelete, 'MAINTENANCE_PHOTOS');
    updatedBeforePhotos = updatedBeforePhotos.filter((url) => !beforePhotosToDelete.includes(url));
  }
  if (afterPhotosToDelete.length > 0) {
    await deleteFiles(afterPhotosToDelete, 'MAINTENANCE_PHOTOS');
    updatedAfterPhotos = updatedAfterPhotos.filter((url) => !afterPhotosToDelete.includes(url));
  }

  // Upload new photos
  if (newBeforePhotos.length > 0) {
    const newUrls = await uploadFiles(newBeforePhotos, 'MAINTENANCE_PHOTOS', 'before');
    updatedBeforePhotos = [...updatedBeforePhotos, ...newUrls];
  }
  if (newAfterPhotos.length > 0) {
    const newUrls = await uploadFiles(newAfterPhotos, 'MAINTENANCE_PHOTOS', 'after');
    updatedAfterPhotos = [...updatedAfterPhotos, ...newUrls];
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    before_photos: updatedBeforePhotos,
    after_photos: updatedAfterPhotos,
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId;
  if (formData.category !== undefined) updateData.category = formData.category;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.date !== undefined) updateData.date = toISOString(formData.date);
  if (formData.costEUR !== undefined) updateData.cost_eur = formData.costEUR;
  if (formData.costFCFA !== undefined) updateData.cost_fcfa = formData.costFCFA;
  if (formData.provider !== undefined) updateData.provider = formData.provider;
  if (formData.status !== undefined) updateData.status = formData.status;
  if (formData.notes !== undefined) updateData.notes = formData.notes;

  const { data, error } = await supabase
    .from(TABLES.MAINTENANCE)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating maintenance entry:', error);
    throw error;
  }

  const updatedEntry = mapMaintenanceFromDB(data);

  await logAction({
    action: 'update',
    entity: 'maintenance',
    entityId: id,
    performedBy,
    previousData: currentEntry,
    newData: updatedEntry,
  });

  return updatedEntry;
}

/**
 * Delete a maintenance entry
 */
export async function deleteMaintenanceEntry(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const entry = await getMaintenanceEntry(id);
  if (!entry) {
    throw new Error('Maintenance entry not found');
  }

  // Delete associated photos
  const allPhotos = [...entry.beforePhotos, ...entry.afterPhotos];
  if (allPhotos.length > 0) {
    await deleteFiles(allPhotos, 'MAINTENANCE_PHOTOS');
  }

  const { error } = await supabase
    .from(TABLES.MAINTENANCE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting maintenance entry:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'maintenance',
    entityId: id,
    performedBy,
    previousData: entry,
  });
}

// Helper function to map database row to MaintenanceEntry type
function mapMaintenanceFromDB(row: Record<string, unknown>): MaintenanceEntry {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    category: row.category as MaintenanceEntry['category'],
    description: row.description as string,
    date: new Date(row.date as string),
    costEUR: (row.cost_eur as number) || 0,
    costFCFA: (row.cost_fcfa as number) || 0,
    provider: (row.provider as string) || undefined,
    status: row.status as MaintenanceEntry['status'],
    beforePhotos: (row.before_photos as string[]) || [],
    afterPhotos: (row.after_photos as string[]) || [],
    notes: (row.notes as string) || undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
