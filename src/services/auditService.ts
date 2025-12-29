import { supabase, TABLES } from './supabase';
import type { AuditLogEntry, UserMode } from '../types';

interface LogActionParams {
  action: AuditLogEntry['action'];
  entity: AuditLogEntry['entity'];
  entityId: string;
  performedBy: UserMode;
  previousData?: unknown;
  newData?: unknown;
}

/**
 * Log an action to the audit log
 */
export async function logAction(params: LogActionParams): Promise<void> {
  const { action, entity, entityId, performedBy, previousData, newData } = params;

  const logData = {
    action,
    entity,
    entity_id: entityId,
    performed_by: performedBy,
    previous_data: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
    new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
  };

  const { error } = await supabase
    .from(TABLES.AUDIT_LOG)
    .insert(logData);

  if (error) {
    // Don't throw - audit logging should not break main operations
    console.error('Error logging action:', error);
  }
}

/**
 * Get all audit log entries
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.AUDIT_LOG)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }

  return (data || []).map(mapAuditLogFromDB);
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  entity: AuditLogEntry['entity'],
  entityId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.AUDIT_LOG)
    .select('*')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audit logs for entity:', error);
    throw error;
  }

  return (data || []).map(mapAuditLogFromDB);
}

/**
 * Get audit logs by action type
 */
export async function getAuditLogsByAction(
  action: AuditLogEntry['action']
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.AUDIT_LOG)
    .select('*')
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching audit logs by action:', error);
    throw error;
  }

  return (data || []).map(mapAuditLogFromDB);
}

/**
 * Format an audit log entry for display
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  const entityNames: Record<AuditLogEntry['entity'], string> = {
    property: 'Appartement',
    booking: 'Réservation',
    expense: 'Dépense',
    customer: 'Client',
    task: 'Tâche',
    request: 'Demande',
    mobile_money: 'Mobile Money',
    maintenance: 'Maintenance',
    settings: 'Paramètres',
  };

  const actionNames: Record<AuditLogEntry['action'], string> = {
    create: 'créé',
    update: 'modifié',
    delete: 'supprimé',
  };

  const entityName = entityNames[entry.entity] || entry.entity;
  const actionName = actionNames[entry.action] || entry.action;
  const performer = entry.performedBy === 'admin' ? 'Admin' : 'Staff';

  return `${performer} a ${actionName} ${entityName}`;
}

/**
 * Get changes between previous and new data
 */
export function getChanges(
  previousData: Record<string, unknown> | undefined,
  newData: Record<string, unknown> | undefined
): { field: string; oldValue: unknown; newValue: unknown }[] {
  if (!previousData || !newData) {
    return [];
  }

  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

  allKeys.forEach((key) => {
    const oldValue = previousData[key];
    const newValue = newData[key];

    // Skip internal fields
    if (['createdAt', 'updatedAt', 'id'].includes(key)) {
      return;
    }

    // Compare values (simple comparison)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field: key, oldValue, newValue });
    }
  });

  return changes;
}

// Helper function to map database row to AuditLogEntry type
function mapAuditLogFromDB(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    action: row.action as AuditLogEntry['action'],
    entity: row.entity as AuditLogEntry['entity'],
    entityId: row.entity_id as string,
    performedBy: row.performed_by as UserMode,
    previousData: (row.previous_data as Record<string, unknown>) || undefined,
    newData: (row.new_data as Record<string, unknown>) || undefined,
    createdAt: new Date(row.created_at as string),
  };
}
