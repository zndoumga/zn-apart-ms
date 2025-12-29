import { useQuery } from '@tanstack/react-query';
import {
  getAuditLogs,
  getAuditLogsForEntity,
} from '../services/auditService';
import type { AuditLogEntry } from '../types';

export const AUDIT_LOG_QUERY_KEY = ['auditLog'];

export function useAuditLogs() {
  return useQuery({
    queryKey: AUDIT_LOG_QUERY_KEY,
    queryFn: getAuditLogs,
  });
}

export function useEntityAuditHistory(
  entity: AuditLogEntry['entity'],
  entityId: string | undefined
) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEY, entity, entityId],
    queryFn: () => (entityId ? getAuditLogsForEntity(entity, entityId) : []),
    enabled: !!entityId,
  });
}
