import React, { useState } from 'react';
import { History } from 'lucide-react';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Card, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { useAuditLogs } from '../hooks/useAuditLog';
import { formatDateTime, formatRelativeTime } from '../utils/dates';
import type { AuditLogEntry, AuditAction, AuditEntity } from '../types';

const AuditLog: React.FC = () => {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [performedByFilter, setPerformedByFilter] = useState<string>('');

  const { data: logs, isLoading } = useAuditLogs();

  const entityOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'booking', label: 'Réservations' },
    { value: 'expense', label: 'Dépenses' },
    { value: 'property', label: 'Appartements' },
    { value: 'customer', label: 'Clients' },
    { value: 'task', label: 'Tâches' },
    { value: 'request', label: 'Demandes' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'settings', label: 'Paramètres' },
  ];

  const performedByOptions = [
    { value: '', label: 'Tous les utilisateurs' },
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' },
  ];

  const getActionBadge = (action: AuditAction) => {
    const variants: Record<AuditAction, 'success' | 'primary' | 'danger'> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
    };
    const labels: Record<AuditAction, string> = {
      create: 'Création',
      update: 'Modification',
      delete: 'Suppression',
    };
    return <Badge variant={variants[action]}>{labels[action]}</Badge>;
  };

  const getEntityLabel = (entity: AuditEntity) => {
    const labels: Record<AuditEntity, string> = {
      booking: 'Réservation',
      expense: 'Dépense',
      property: 'Appartement',
      customer: 'Client',
      task: 'Tâche',
      request: 'Demande',
      maintenance: 'Maintenance',
      mobile_money: 'Mobile Money',
      settings: 'Paramètres',
    };
    return labels[entity] || entity;
  };

  const renderChanges = (entry: AuditLogEntry) => {
    if (entry.action === 'create') {
      return <span className="text-success-600">Nouvel élément créé</span>;
    }

    if (entry.action === 'delete') {
      return <span className="text-danger-600">Élément supprimé</span>;
    }

    // Compare previousData and newData to show changes
    const prev = entry.previousData || {};
    const next = entry.newData || {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    const changes: { field: string; oldVal: unknown; newVal: unknown }[] = [];

    allKeys.forEach((key) => {
      if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
        changes.push({ field: key, oldVal: prev[key], newVal: next[key] });
      }
    });

    if (changes.length === 0) return <span className="text-gray-500">Aucun changement</span>;

    return (
      <div className="space-y-1">
        {changes.slice(0, 3).map((change, i) => (
          <div key={i} className="text-xs">
            <span className="text-gray-500">{change.field}:</span>{' '}
            <span className="text-danger-600 line-through">
              {String(change.oldVal ?? '-')}
            </span>{' '}
            →{' '}
            <span className="text-success-600">
              {String(change.newVal ?? '-')}
            </span>
          </div>
        ))}
        {changes.length > 3 && (
          <span className="text-xs text-gray-400">
            +{changes.length - 3} autres modifications
          </span>
        )}
      </div>
    );
  };

  // Filter logs client-side
  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesEntity = !entityFilter || log.entity === entityFilter;
      const matchesPerformedBy = !performedByFilter || log.performedBy === performedByFilter;
      return matchesEntity && matchesPerformedBy;
    });
  }, [logs, entityFilter, performedByFilter]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (entry: AuditLogEntry) => (
        <div>
          <p className="text-sm">{formatDateTime(entry.createdAt)}</p>
          <p className="text-xs text-gray-500">{formatRelativeTime(entry.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (entry: AuditLogEntry) => getActionBadge(entry.action),
    },
    {
      key: 'entity',
      header: 'Type',
      render: (entry: AuditLogEntry) => (
        <span className="text-sm">{getEntityLabel(entry.entity)}</span>
      ),
    },
    {
      key: 'changes',
      header: 'Modifications',
      render: (entry: AuditLogEntry) => renderChanges(entry),
    },
    {
      key: 'performedBy',
      header: 'Par',
      render: (entry: AuditLogEntry) => (
        <Badge variant={entry.performedBy === 'admin' ? 'primary' : 'gray'}>
          {entry.performedBy === 'admin' ? 'Admin' : 'Staff'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="text-gray-600 mt-1">
          Historique de toutes les modifications
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <Select
              options={entityOptions}
              value={entityFilter}
              onChange={setEntityFilter}
              className="w-48"
            />
            <Select
              options={performedByOptions}
              value={performedByFilter}
              onChange={setPerformedByFilter}
              className="w-48"
            />
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      {!filteredLogs || filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8 text-gray-400" />}
          title="Aucune entrée"
          description="Les actions seront enregistrées ici."
        />
      ) : (
        <Card>
          <Table
            columns={columns}
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Aucune entrée trouvée"
          />
        </Card>
      )}
    </div>
  );
};

export default AuditLog;

