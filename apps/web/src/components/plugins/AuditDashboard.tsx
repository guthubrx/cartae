/**
 * Audit Dashboard Component
 * Displays security audit logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { AuditEvent, AuditQueryFilters } from '@cartae/plugin-system';
// TODO: Fix missing exports in @cartae/plugin-system (AuditEventType, AuditSeverity)
// import { AuditEventType, AuditSeverity } from '@cartae/plugin-system';

// Temporary enums while exports are missing
enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

enum AuditEventType {
  PLUGIN_ACTIVATED = 'PLUGIN_ACTIVATED',
  PLUGIN_DEACTIVATED = 'PLUGIN_DEACTIVATED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  API_CALL = 'API_CALL',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

export interface AuditDashboardProps {
  onQuery: (filters: AuditQueryFilters) => Promise<AuditEvent[]>;
}

const getSeverityColor = (severity: AuditSeverity): string => {
  switch (severity) {
    case AuditSeverity.INFO:
      return '#3b82f6';
    case AuditSeverity.WARNING:
      return '#f59e0b';
    case AuditSeverity.ERROR:
      return '#ef4444';
    case AuditSeverity.CRITICAL:
      return '#dc2626';
    default:
      return '#6b7280';
  }
};

const getSeverityIcon = (severity: AuditSeverity): string => {
  switch (severity) {
    case AuditSeverity.INFO:
      return 'ℹ️';
    case AuditSeverity.WARNING:
      return '⚠️';
    case AuditSeverity.ERROR:
      return '❌';
    case AuditSeverity.CRITICAL:
      return '🚨';
    default:
      return '📝';
  }
};

const getResultBackgroundColor = (result: string): string => {
  if (result === 'success') return '#dcfce7';
  if (result === 'denied') return '#fee2e2';
  return '#fef3c7';
};

const getResultTextColor = (result: string): string => {
  if (result === 'success') return '#16a34a';
  if (result === 'denied') return '#dc2626';
  return '#ca8a04';
};

export function AuditDashboard({ onQuery }: AuditDashboardProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditQueryFilters>({
    limit: 100,
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const results = await onQuery(filters);
      setEvents(results);
    } finally {
      setLoading(false);
    }
  }, [onQuery, filters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const severityCounts = events.reduce(
    (acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = events.filter(e => e.timestamp >= last24h);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          Dashboard d&apos;Audit
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Surveillance et analyse des événements de sécurité
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {events.length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Événements</div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '4px',
              color: getSeverityColor(AuditSeverity.CRITICAL),
            }}
          >
            {severityCounts[AuditSeverity.CRITICAL] || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Critiques</div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '4px',
              color: getSeverityColor(AuditSeverity.ERROR),
            }}
          >
            {severityCounts[AuditSeverity.ERROR] || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Erreurs</div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {recentEvents.length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Dernières 24h</div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <div style={{ marginBottom: '12px', fontWeight: '500' }}>Filtres</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={filters.severity || ''}
            onChange={e =>
              setFilters({
                ...filters,
                severity: e.target.value ? (e.target.value as AuditSeverity) : undefined,
              })
            }
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">Tous les niveaux</option>
            <option value={AuditSeverity.INFO}>Info</option>
            <option value={AuditSeverity.WARNING}>Avertissement</option>
            <option value={AuditSeverity.ERROR}>Erreur</option>
            <option value={AuditSeverity.CRITICAL}>Critique</option>
          </select>

          <select
            value={filters.type || ''}
            onChange={e =>
              setFilters({
                ...filters,
                type: e.target.value ? (e.target.value as AuditEventType) : undefined,
              })
            }
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">Tous les types</option>
            <option value={AuditEventType.PLUGIN_ACTIVATED}>Plugin activé</option>
            <option value={AuditEventType.PLUGIN_DEACTIVATED}>Plugin désactivé</option>
            <option value={AuditEventType.PERMISSION_GRANTED}>Permission accordée</option>
            <option value={AuditEventType.PERMISSION_DENIED}>Permission refusée</option>
            <option value={AuditEventType.API_CALL}>Appel API</option>
            <option value={AuditEventType.SECURITY_ALERT}>Alerte sécurité</option>
          </select>

          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Date/Heure
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Sévérité
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Plugin
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Résultat
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
                  >
                    {loading ? 'Chargement...' : 'Aucun événement trouvé'}
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr
                    key={event.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: `${getSeverityColor(event.severity)}20`,
                          color: getSeverityColor(event.severity),
                          fontWeight: '500',
                        }}
                      >
                        {getSeverityIcon(event.severity)} {event.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                      {event.type}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>
                      {event.pluginId}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{event.action}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getResultBackgroundColor(event.result),
                          color: getResultTextColor(event.result),
                          fontWeight: '500',
                        }}
                      >
                        {event.result}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
