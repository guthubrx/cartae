/**
 * Audit Routes - Compliance Logging and Export
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Endpoints:
 * - GET /api/audit - Query audit logs (requires admin role)
 * - GET /api/audit/stats - Get audit statistics (requires admin role)
 * - GET /api/audit/export - Export audit logs to CSV (requires admin role)
 *
 * All endpoints require admin role for security/compliance
 *
 * @module api/routes/audit
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/permissions';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/permissions';
import {
  getAuditLogs,
  countAuditLogs,
  getAuditStats,
  exportAuditLogsCSV,
  AuditLogFilters,
} from '../../services/audit';

const router = Router();

/* ==================== Validation Schemas ==================== */

const QueryAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

/* ==================== Routes ==================== */

/**
 * GET /api/audit
 * Query audit logs with filters
 * Requires: admin role
 *
 * Query params:
 * - userId (UUID)
 * - userEmail (string, partial match)
 * - resource (string)
 * - action (string)
 * - resourceId (UUID)
 * - startDate (ISO 8601)
 * - endDate (ISO 8601)
 * - limit (number, default 100)
 * - offset (number, default 0)
 */
router.get('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = QueryAuditLogsSchema.parse(req.query);

    const filters: AuditLogFilters = {
      userId: query.userId,
      userEmail: query.userEmail,
      resource: query.resource,
      action: query.action,
      resourceId: query.resourceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    };

    const logs = await getAuditLogs(filters);
    const total = await countAuditLogs(filters);

    res.json({
      logs,
      pagination: {
        total,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 100) < total,
      },
    });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to query audit logs',
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics for dashboard
 * Requires: admin role
 *
 * Returns:
 * - totalEvents (number)
 * - eventsByAction (array)
 * - eventsByResource (array)
 * - eventsByUser (array)
 * - recentEvents (array)
 */
router.get('/stats', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getAuditStats();

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch audit stats',
    });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs to CSV
 * Requires: admin role
 *
 * Query params: same as GET /api/audit
 * Returns: CSV file with Content-Disposition header
 */
router.get('/export', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = QueryAuditLogsSchema.parse(req.query);

    const filters: AuditLogFilters = {
      userId: query.userId,
      userEmail: query.userEmail,
      resource: query.resource,
      action: query.action,
      resourceId: query.resourceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const csv = await exportAuditLogsCSV(filters);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = 'audit-logs-' + timestamp + '.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to export audit logs',
    });
  }
});

export default router;
