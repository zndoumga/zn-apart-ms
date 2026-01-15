import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { Settings, UserMode } from '../types';

const DEFAULT_SETTINGS: Omit<Settings, 'updatedAt'> = {
  exchangeRate: 655.957,
  lowBalanceThreshold: 100,
  defaultCurrency: 'EUR',
  adminPasswordHash: 'admin123', // Simple password - in production, use proper hashing
  investorPasswordHash: 'invest-2025', // Simple password - in production, use proper hashing
  staffPasswordHash: 'Bins2026', // Simple password - in production, use proper hashing
};

/**
 * Get current settings
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .select('*')
    .eq('id', 'global')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Settings don't exist, create default settings
      return createDefaultSettings();
    }
    console.error('Error fetching settings:', error);
    throw error;
  }

  return mapSettingsFromDB(data);
}

/**
 * Create default settings
 */
async function createDefaultSettings(): Promise<Settings> {
  const settingsData = {
    id: 'global',
    exchange_rate: DEFAULT_SETTINGS.exchangeRate,
    low_balance_threshold: DEFAULT_SETTINGS.lowBalanceThreshold,
    default_currency: DEFAULT_SETTINGS.defaultCurrency,
    admin_password_hash: DEFAULT_SETTINGS.adminPasswordHash,
    investor_password_hash: DEFAULT_SETTINGS.investorPasswordHash,
    staff_password_hash: DEFAULT_SETTINGS.staffPasswordHash,
  };

  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .insert(settingsData)
    .select()
    .single();

  if (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }

  return mapSettingsFromDB(data);
}

/**
 * Update settings
 */
export async function updateSettings(
  updates: Partial<Omit<Settings, 'updatedAt'>>,
  performedBy: UserMode
): Promise<Settings> {
  const currentSettings = await getSettings();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.exchangeRate !== undefined) updateData.exchange_rate = updates.exchangeRate;
  if (updates.lowBalanceThreshold !== undefined) updateData.low_balance_threshold = updates.lowBalanceThreshold;
  if (updates.defaultCurrency !== undefined) updateData.default_currency = updates.defaultCurrency;
  if (updates.adminPasswordHash !== undefined) updateData.admin_password_hash = updates.adminPasswordHash;
  if (updates.investorPasswordHash !== undefined) updateData.investor_password_hash = updates.investorPasswordHash;
  if (updates.staffPasswordHash !== undefined) updateData.staff_password_hash = updates.staffPasswordHash;

  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .update(updateData)
    .eq('id', 'global')
    .select()
    .single();

  if (error) {
    console.error('Error updating settings:', error);
    throw error;
  }

  const updatedSettings = mapSettingsFromDB(data);

  await logAction({
    action: 'update',
    entity: 'settings',
    entityId: 'global',
    performedBy,
    previousData: currentSettings,
    newData: updatedSettings,
  });

  return updatedSettings;
}

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const settings = await getSettings();
  // Simple comparison - in production, use proper password hashing
  return password === settings.adminPasswordHash;
}

/**
 * Change admin password
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  performedBy: UserMode
): Promise<boolean> {
  const isValid = await verifyAdminPassword(currentPassword);
  if (!isValid) {
    return false;
  }

  await updateSettings({ adminPasswordHash: newPassword }, performedBy);
  return true;
}

/**
 * Verify investor password
 */
export async function verifyInvestorPassword(password: string): Promise<boolean> {
  const settings = await getSettings();
  // Simple comparison - in production, use proper password hashing
  return password === settings.investorPasswordHash;
}

/**
 * Change investor password
 */
export async function changeInvestorPassword(
  currentPassword: string,
  newPassword: string,
  performedBy: UserMode
): Promise<boolean> {
  const isValid = await verifyInvestorPassword(currentPassword);
  if (!isValid) {
    return false;
  }

  await updateSettings({ investorPasswordHash: newPassword }, performedBy);
  return true;
}

/**
 * Verify staff password
 */
export async function verifyStaffPassword(password: string): Promise<boolean> {
  const settings = await getSettings();
  // Simple comparison - in production, use proper password hashing
  return password === settings.staffPasswordHash;
}

/**
 * Change staff password
 */
export async function changeStaffPassword(
  currentPassword: string,
  newPassword: string,
  performedBy: UserMode
): Promise<boolean> {
  const isValid = await verifyStaffPassword(currentPassword);
  if (!isValid) {
    return false;
  }

  await updateSettings({ staffPasswordHash: newPassword }, performedBy);
  return true;
}

// Helper function to map database row to Settings type
function mapSettingsFromDB(row: Record<string, unknown>): Settings {
  return {
    exchangeRate: (row.exchange_rate as number) || DEFAULT_SETTINGS.exchangeRate,
    lowBalanceThreshold: (row.low_balance_threshold as number) || DEFAULT_SETTINGS.lowBalanceThreshold,
    defaultCurrency: (row.default_currency as Settings['defaultCurrency']) || DEFAULT_SETTINGS.defaultCurrency,
    adminPasswordHash: (row.admin_password_hash as string) || DEFAULT_SETTINGS.adminPasswordHash,
    investorPasswordHash: (row.investor_password_hash as string) || DEFAULT_SETTINGS.investorPasswordHash,
    staffPasswordHash: (row.staff_password_hash as string) || DEFAULT_SETTINGS.staffPasswordHash,
    updatedAt: new Date(row.updated_at as string),
  };
}
