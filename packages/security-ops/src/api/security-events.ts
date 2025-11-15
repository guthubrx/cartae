/**
 * Security Events API
 * Session 81g - Incident Response & Security Operations
 *
 * Express API pour exposer les événements de sécurité
 * au Security Dashboard.
 *
 * Endpoints:
 * GET /api/security/events - Liste événements avec filtres
 * GET /api/security/events/:id - Détails événement
 * GET /api/security/stats - Statistiques Fail2ban
 * GET /api/security/suspicious - Activités suspectes détectées
 * POST /api/security/ban - Ban manuel d'une IP
 * DELETE /api/security/ban/:ip - Unban IP
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { SuspiciousActivityDetector } from '../monitoring/SuspiciousActivityDetector';

const execAsync = promisify(exec);

/**
 * Router pour Security Events API
 */
const router = Router();

/**
 * Détecteur d'activités suspectes (singleton)
 */
const activityDetector = new SuspiciousActivityDetector();

/**
 * Middleware de validation des erreurs
 */
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/security/events
 * Récupérer liste des événements de sécurité
 */
router.get(
  '/events',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('severity').optional().isIn(['critical', 'high', 'medium', 'low', 'info']),
    query('type').optional().isString(),
    query('ip').optional().isIP(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        pageSize = 25,
        severity,
        type,
        ip,
        dateFrom,
        dateTo,
      } = req.query;

      // Lire logs depuis /var/log/cartae/api.log
      const logsPath = process.env.API_LOG_PATH || '/var/log/cartae/api.log';
      const logsContent = await fs.readFile(logsPath, 'utf-8');
      const logLines = logsContent.split('\n').filter((line) => line.trim());

      // Parser logs JSON
      const events = logLines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((event) => event !== null);

      // Appliquer filtres
      let filtered = events;

      if (severity) {
        filtered = filtered.filter((e) => e.severity === severity);
      }

      if (type) {
        filtered = filtered.filter((e) => e.type === type);
      }

      if (ip) {
        filtered = filtered.filter((e) => e.ip === ip);
      }

      if (dateFrom) {
        const from = new Date(dateFrom as string);
        filtered = filtered.filter((e) => new Date(e.timestamp) >= from);
      }

      if (dateTo) {
        const to = new Date(dateTo as string);
        filtered = filtered.filter((e) => new Date(e.timestamp) <= to);
      }

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const pageSizeNum = parseInt(pageSize as string, 10);
      const startIndex = (pageNum - 1) * pageSizeNum;
      const endIndex = startIndex + pageSizeNum;

      const paginatedEvents = filtered.slice(startIndex, endIndex);

      res.json({
        events: paginatedEvents,
        totalCount: filtered.length,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(filtered.length / pageSizeNum),
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ error: 'Failed to fetch security events' });
    }
  }
);

/**
 * GET /api/security/events/:id
 * Récupérer détails d'un événement
 */
router.get(
  '/events/:id',
  [param('id').isString()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Lire logs
      const logsPath = process.env.API_LOG_PATH || '/var/log/cartae/api.log';
      const logsContent = await fs.readFile(logsPath, 'utf-8');
      const logLines = logsContent.split('\n').filter((line) => line.trim());

      // Chercher événement par ID
      for (const line of logLines) {
        try {
          const event = JSON.parse(line);
          if (event.id === id) {
            return res.json(event);
          }
        } catch {
          continue;
        }
      }

      res.status(404).json({ error: 'Event not found' });
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }
);

/**
 * GET /api/security/stats
 * Récupérer statistiques Fail2ban
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Exécuter fail2ban-client status
    const { stdout: statusOutput } = await execAsync('fail2ban-client status');

    // Parser jails actives
    const jailsMatch = statusOutput.match(/Jail list:\s+(.+)/);
    const jailNames = jailsMatch
      ? jailsMatch[1].split(',').map((j) => j.trim())
      : [];

    // Obtenir stats pour chaque jail
    const jails = await Promise.all(
      jailNames.map(async (jailName) => {
        try {
          const { stdout: jailStatus } = await execAsync(
            `fail2ban-client status ${jailName}`
          );

          // Parser nombre de bans
          const currentlyBannedMatch = jailStatus.match(/Currently banned:\s+(\d+)/);
          const totalBannedMatch = jailStatus.match(/Total banned:\s+(\d+)/);

          return {
            name: jailName,
            active: true,
            currentlyBanned: currentlyBannedMatch
              ? parseInt(currentlyBannedMatch[1], 10)
              : 0,
            totalBanned: totalBannedMatch ? parseInt(totalBannedMatch[1], 10) : 0,
          };
        } catch {
          return {
            name: jailName,
            active: false,
            currentlyBanned: 0,
            totalBanned: 0,
          };
        }
      })
    );

    // Calculer totaux
    const totalBans = jails.reduce((sum, jail) => sum + jail.totalBanned, 0);
    const activeBans = jails.reduce((sum, jail) => sum + jail.currentlyBanned, 0);

    res.json({
      totalBans,
      activeBans,
      jails,
    });
  } catch (error) {
    console.error('Error fetching Fail2ban stats:', error);
    res.status(500).json({ error: 'Failed to fetch Fail2ban stats' });
  }
});

/**
 * GET /api/security/suspicious
 * Récupérer activités suspectes détectées
 */
router.get('/suspicious', async (req: Request, res: Response) => {
  try {
    // TODO: Stocker activités suspectes en DB
    // Pour l'instant, retourner stats du détecteur
    const stats = activityDetector.getStats();

    res.json({
      detectorStats: stats,
      suspiciousActivities: [], // TODO: fetch from DB
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activities' });
  }
});

/**
 * POST /api/security/ban
 * Ban manuel d'une IP
 */
router.post(
  '/ban',
  [
    body('ip').isIP(),
    body('jail').optional().isString(),
    body('duration').optional().isInt({ min: -1 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { ip, jail = 'manual', duration = 3600 } = req.body;

      // Exécuter fail2ban-client set
      await execAsync(`fail2ban-client set ${jail} banip ${ip}`);

      res.json({
        success: true,
        message: `IP ${ip} banned in jail ${jail}`,
        duration,
      });
    } catch (error) {
      console.error('Error banning IP:', error);
      res.status(500).json({ error: 'Failed to ban IP' });
    }
  }
);

/**
 * DELETE /api/security/ban/:ip
 * Unban IP
 */
router.delete(
  '/ban/:ip',
  [param('ip').isIP(), query('jail').optional().isString()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;
      const { jail = 'manual' } = req.query;

      // Exécuter fail2ban-client unban
      await execAsync(`fail2ban-client set ${jail as string} unbanip ${ip}`);

      res.json({
        success: true,
        message: `IP ${ip} unbanned from jail ${jail}`,
      });
    } catch (error) {
      console.error('Error unbanning IP:', error);
      res.status(500).json({ error: 'Failed to unban IP' });
    }
  }
);

/**
 * GET /api/security/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
