/**
 * Audit Service - Compliance Logging
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Provides comprehensive audit logging with:
 * - Who/What/When tracking (user, resource, action, timestamp)
 * - IP address and User-Agent logging
 * - JSON diffs (old_values → new_values)
 * - Query with filters (user, resource, action, date range)
 * - CSV export for compliance
 * - Statistics for dashboard
 *
 * All mutations (create, update, delete) should be logged via logAuditEvent()
 *
 * @module services/audit
 */

import { Pool } from 'pg';
import { pool } from '../db/client';

/**
 * Audit Log Event (input for logging)
 */
export interface AuditEvent {
  userId: string;
  userEmail: string; // Denormalized (preserved if user deleted)
  resource: string; // items, users, settings, etc.
  action: string; // create, update, delete, access_denied, login, etc.
  resourceId?: string; // UUID of modified resource
  oldValues?: Record<string, unknown>; // State before change
  newValues?: Record<string, unknown>; // State after change
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Log Record (output from queries)
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  resource: string;
  action: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  userId?: string;
  userEmail?: string;
  resource?: string;
  action?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit statistics for dashboard
 */
export interface AuditStats {
  totalEvents: number;
  eventsByAction: Array<{ action: string; count: number }>;
  eventsByResource: Array<{ resource: string; count: number }>;
  eventsByUser: Array<{ userId: string; userEmail: string; count: number }>;
  recentEvents: AuditLog[];
}

/**
 * Log audit event to database
 * This is the main function to call when logging any action
 *
 * @param event - Audit event to log
 * @param dbPool - Database pool (default: global pool)
 */
export async function logAuditEvent(
  event: AuditEvent,
  dbPool: Pool = pool
): Promise<void> {
  try {
    await dbPool.query(
      `
      INSERT INTO audit_logs (
        user_id,
        user_email,
        resource,
        action,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        event.userId,
        event.userEmail,
        event.resource,
        event.action,
        event.resourceId || null,
        event.oldValues ? JSON.stringify(event.oldValues) : null,
        event.newValues ? JSON.stringify(event.newValues) : null,
        event.ipAddress || null,
        event.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

/**
 * Query audit logs with filters and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  dbPool: Pool = pool
): Promise<AuditLog[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push('user_id = $' + paramIndex++);
    params.push(filters.userId);
  }

  if (filters.userEmail) {
    conditions.push('user_email ILIKE $' + paramIndex++);
    params.push('%' + filters.userEmail + '%');
  }

  if (filters.resource) {
    conditions.push('resource = $' + paramIndex++);
    params.push(filters.resource);
  }

  if (filters.action) {
    conditions.push('action = $' + paramIndex++);
    params.push(filters.action);
  }

  if (filters.resourceId) {
    conditions.push('resource_id = $' + paramIndex++);
    params.push(filters.resourceId);
  }

  if (filters.startDate) {
    conditions.push('timestamp >= $' + paramIndex++);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('timestamp <= $' + paramIndex++);
    params.push(filters.endDate);
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const query = `
    SELECT
      id,
      timestamp,
      user_id,
      user_email,
      resource,
      action,
      resource_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    FROM audit_logs
    ` + whereClause + `
    ORDER BY timestamp DESC
    LIMIT $` + paramIndex++ + `
    OFFSET $` + paramIndex++ + `
  `;

  params.push(limit, offset);

  const result = await dbPool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userEmail: row.user_email,
    resource: row.resource,
    action: row.action,
    resourceId: row.resource_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  }));
}

/**
 * Count audit logs matching filters
 */
export async function countAuditLogs(
  filters: AuditLogFilters = {},
  dbPool: Pool = pool
): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push('user_id = $' + paramIndex++);
    params.push(filters.userId);
  }

  if (filters.userEmail) {
    conditions.push('user_email ILIKE $' + paramIndex++);
    params.push('%' + filters.userEmail + '%');
  }

  if (filters.resource) {
    conditions.push('resource = $' + paramIndex++);
    params.push(filters.resource);
  }

  if (filters.action) {
    conditions.push('action = $' + paramIndex++);
    params.push(filters.action);
  }

  if (filters.resourceId) {
    conditions.push('resource_id = $' + paramIndex++);
    params.push(filters.resourceId);
  }

  if (filters.startDate) {
    conditions.push('timestamp >= $' + paramIndex++);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('timestamp <= $' + paramIndex++);
    params.push(filters.endDate);
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const query = `
    SELECT COUNT(*) as count
    FROM audit_logs
    ` + whereClause + `
  `;

  const result = await dbPool.query(query, params);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsCSV(
  filters: AuditLogFilters = {},
  dbPool: Pool = pool
): Promise<string> {
  const logs = await getAuditLogs(
    { ...filters, limit: 100000, offset: 0 },
    dbPool
  );

  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Email',
    'Resource',
    'Action',
    'Resource ID',
    'Old Values',
    'New Values',
    'IP Address',
    'User Agent',
  ];

  const csvRows: string[] = [headers.join(',')];

  for (const log of logs) {
    const row = [
      log.id,
      log.timestamp.toISOString(),
      log.userId,
      escapeCSV(log.userEmail),
      log.resource,
      log.action,
      log.resourceId || '',
      escapeCSV(JSON.stringify(log.oldValues || {})),
      escapeCSV(JSON.stringify(log.newValues || {})),
      log.ipAddress || '',
      escapeCSV(log.userAgent || ''),
    ];

    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Escape CSV field
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Get audit statistics for dashboard
 */
export async function getAuditStats(
  dbPool: Pool = pool
): Promise<AuditStats> {
  const totalResult = await dbPool.query(
    `SELECT COUNT(*) as count FROM audit_logs`
  );
  const totalEvents = parseInt(totalResult.rows[0].count, 10);

  const actionResult = await dbPool.query(`
    SELECT action, COUNT(*) as count
    FROM audit_logs
    GROUP BY action
    ORDER BY count DESC
    LIMIT 10
  `);
  const eventsByAction = actionResult.rows.map((row) => ({
    action: row.action,
    count: parseInt(row.count, 10),
  }));

  const resourceResult = await dbPool.query(`
    SELECT resource, COUNT(*) as count
    FROM audit_logs
    GROUP BY resource
    ORDER BY count DESC
    LIMIT 10
  `);
  const eventsByResource = resourceResult.rows.map((row) => ({
    resource: row.resource,
    count: parseInt(row.count, 10),
  }));

  const userResult = await dbPool.query(`
    SELECT user_id, user_email, COUNT(*) as count
    FROM audit_logs
    GROUP BY user_id, user_email
    ORDER BY count DESC
    LIMIT 10
  `);
  const eventsByUser = userResult.rows.map((row) => ({
    userId: row.user_id,
    userEmail: row.user_email,
    count: parseInt(row.count, 10),
  }));

  const recentEvents = await getAuditLogs({ limit: 20, offset: 0 }, dbPool);

  return {
    totalEvents,
    eventsByAction,
    eventsByResource,
    eventsByUser,
    recentEvents,
  };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditHistory(
  resource: string,
  resourceId: string,
  dbPool: Pool = pool
): Promise<AuditLog[]> {
  return getAuditLogs({ resource, resourceId }, dbPool);
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditHistory(
  userId: string,
  dbPool: Pool = pool
): Promise<AuditLog[]> {
  return getAuditLogs({ userId }, dbPool);
}
