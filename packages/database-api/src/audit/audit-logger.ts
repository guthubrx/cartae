/**
 * Audit Logger Middleware
 * Session 81g - Incident Response & Security Operations
 *
 * Middleware Express qui log TOUTES les requêtes dans un audit trail immutable.
 * Implémente le pattern WORM (Write Once Read Many) pour compliance.
 *
 * Fonctionnalités:
 * - Log automatique de toutes requêtes HTTP
 * - Capture user, action, resource, IP, user-agent
 * - Hash chain pour détection de tampering
 * - Storage PostgreSQL avec contraintes d'immutabilité
 * - Support compliance (SOC2, GDPR, HIPAA)
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AuditStorage } from './audit-storage';

/**
 * Types pour audit log
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  query: Record<string, any>;
  body: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  statusCode: number;
  responseTime: number;
  errorMessage: string | null;
  metadata: Record<string, any>;
  hashPrev: string | null;
  hashCurrent: string;
}

/**
 * Configuration du logger
 */
export interface AuditLoggerConfig {
  storage: AuditStorage;
  excludePaths?: string[];
  excludeMethods?: string[];
  sensitiveFields?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  hashAlgorithm?: string;
}

/**
 * Audit Logger Middleware
 */
export class AuditLogger {
  private storage: AuditStorage;
  private excludePaths: Set<string>;
  private excludeMethods: Set<string>;
  private sensitiveFields: Set<string>;
  private includeRequestBody: boolean;
  private includeResponseBody: boolean;
  private hashAlgorithm: string;
  private lastHash: string | null = null;

  constructor(config: AuditLoggerConfig) {
    this.storage = config.storage;
    this.excludePaths = new Set(config.excludePaths || ['/health', '/metrics']);
    this.excludeMethods = new Set(config.excludeMethods || ['OPTIONS']);
    this.sensitiveFields = new Set(config.sensitiveFields || [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
    ]);
    this.includeRequestBody = config.includeRequestBody ?? true;
    this.includeResponseBody = config.includeResponseBody ?? false;
    this.hashAlgorithm = config.hashAlgorithm || 'sha256';
  }

  /**
   * Middleware Express
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip si path exclu
      if (this.shouldExclude(req)) {
        return next();
      }

      const startTime = Date.now();

      // Capturer response (intercept res.json)
      const originalJson = res.json.bind(res);
      let responseBody: any = null;

      res.json = function (body: any) {
        responseBody = body;
        return originalJson(body);
      };

      // Attendre fin de réponse
      res.on('finish', async () => {
        try {
          const entry = await this.createAuditEntry(
            req,
            res,
            responseBody,
            Date.now() - startTime
          );
          await this.storage.write(entry);
        } catch (error) {
          console.error('Failed to write audit log:', error);
          // Ne pas bloquer la requête en cas d'erreur audit
        }
      });

      next();
    };
  }

  /**
   * Vérifier si requête doit être exclue
   */
  private shouldExclude(req: Request): boolean {
    return (
      this.excludePaths.has(req.path) ||
      this.excludeMethods.has(req.method.toUpperCase())
    );
  }

  /**
   * Créer entrée d'audit
   */
  private async createAuditEntry(
    req: Request,
    res: Response,
    responseBody: any,
    responseTime: number
  ): Promise<AuditLogEntry> {
    // Extraire user info (depuis req.user si auth middleware)
    const user = (req as any).user;
    const userId = user?.id || null;
    const username = user?.username || user?.email || null;

    // Déterminer action et resource depuis path
    const { action, resource, resourceId } = this.parsePathInfo(req);

    // Sanitize request body (retirer champs sensibles)
    const sanitizedBody = this.includeRequestBody
      ? this.sanitize(req.body)
      : null;

    // Sanitize response body
    const sanitizedResponse = this.includeResponseBody
      ? this.sanitize(responseBody)
      : null;

    // Déterminer status
    const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';

    // IP address (gérer proxies)
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';

    // User agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Error message si failure
    const errorMessage = status === 'failure' ? (responseBody?.error || responseBody?.message) : null;

    // Metadata additionnelle
    const metadata: Record<string, any> = {
      headers: this.sanitize(req.headers),
      query: req.query,
      params: req.params,
    };

    if (sanitizedResponse) {
      metadata.response = sanitizedResponse;
    }

    // Calculer hash (hash chain)
    const hashCurrent = this.computeHash({
      userId,
      username,
      action,
      resource,
      resourceId,
      method: req.method,
      path: req.path,
      ipAddress,
      timestamp: new Date().toISOString(),
      hashPrev: this.lastHash,
    });

    // Mettre à jour lastHash pour prochain entry
    const hashPrev = this.lastHash;
    this.lastHash = hashCurrent;

    return {
      id: uuidv4(),
      timestamp: new Date(),
      userId,
      username,
      action,
      resource,
      resourceId,
      method: req.method,
      path: req.path,
      query: req.query as Record<string, any>,
      body: sanitizedBody,
      ipAddress,
      userAgent,
      status,
      statusCode: res.statusCode,
      responseTime,
      errorMessage,
      metadata,
      hashPrev,
      hashCurrent,
    };
  }

  /**
   * Parser path pour extraire action/resource
   * Exemple: POST /api/users/123 -> action=create, resource=users, resourceId=123
   */
  private parsePathInfo(req: Request): {
    action: string;
    resource: string;
    resourceId: string | null;
  } {
    const method = req.method.toUpperCase();
    const pathParts = req.path.split('/').filter((p) => p);

    // Déterminer action depuis méthode HTTP
    let action = method.toLowerCase();
    if (method === 'GET') action = 'read';
    if (method === 'POST') action = 'create';
    if (method === 'PUT' || method === 'PATCH') action = 'update';
    if (method === 'DELETE') action = 'delete';

    // Déterminer resource (généralement 2ème segment)
    let resource = pathParts[1] || 'unknown';
    let resourceId: string | null = null;

    // Si 3ème segment est un ID (numérique ou UUID)
    if (pathParts[2]) {
      const potentialId = pathParts[2];
      if (/^\d+$/.test(potentialId) || /^[0-9a-f-]{36}$/i.test(potentialId)) {
        resourceId = potentialId;
      }
    }

    // Overrides spécifiques
    if (req.path.includes('/login')) action = 'login';
    if (req.path.includes('/logout')) action = 'logout';
    if (req.path.includes('/auth')) resource = 'auth';

    return { action, resource, resourceId };
  }

  /**
   * Sanitizer pour retirer champs sensibles
   */
  private sanitize(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Masquer champs sensibles
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Calculer hash pour hash chain
   */
  private computeHash(data: any): string {
    const hash = crypto.createHash(this.hashAlgorithm);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Vérifier intégrité de la hash chain
   * Retourne true si intégrité OK, false si tampering détecté
   */
  public async verifyIntegrity(): Promise<boolean> {
    const entries = await this.storage.readAll();

    let prevHash: string | null = null;

    for (const entry of entries) {
      // Vérifier que hashPrev correspond au hash précédent
      if (entry.hashPrev !== prevHash) {
        console.error(`Integrity violation at entry ${entry.id}`);
        return false;
      }

      // Recalculer hash et vérifier
      const expectedHash = this.computeHash({
        userId: entry.userId,
        username: entry.username,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        method: entry.method,
        path: entry.path,
        ipAddress: entry.ipAddress,
        timestamp: entry.timestamp.toISOString(),
        hashPrev: entry.hashPrev,
      });

      if (expectedHash !== entry.hashCurrent) {
        console.error(`Hash mismatch at entry ${entry.id}`);
        return false;
      }

      prevHash = entry.hashCurrent;
    }

    return true;
  }

  /**
   * Logger événement custom (hors requête HTTP)
   */
  public async logEvent(event: Partial<AuditLogEntry>): Promise<void> {
    const entry: AuditLogEntry = {
      id: event.id || uuidv4(),
      timestamp: event.timestamp || new Date(),
      userId: event.userId || null,
      username: event.username || null,
      action: event.action || 'unknown',
      resource: event.resource || 'system',
      resourceId: event.resourceId || null,
      method: event.method || 'SYSTEM',
      path: event.path || '/system',
      query: event.query || {},
      body: event.body || null,
      ipAddress: event.ipAddress || 'system',
      userAgent: event.userAgent || 'system',
      status: event.status || 'success',
      statusCode: event.statusCode || 200,
      responseTime: event.responseTime || 0,
      errorMessage: event.errorMessage || null,
      metadata: event.metadata || {},
      hashPrev: this.lastHash,
      hashCurrent: this.computeHash({
        ...event,
        timestamp: (event.timestamp || new Date()).toISOString(),
        hashPrev: this.lastHash,
      }),
    };

    this.lastHash = entry.hashCurrent;

    await this.storage.write(entry);
  }
}

export default AuditLogger;
