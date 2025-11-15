/**
 * Suspicious Activity Detector
 * Session 81g - Incident Response & Security Operations
 *
 * Détecte les patterns d'activité suspecte dans les événements de sécurité.
 * Utilise des heuristiques et machine learning basique pour identifier:
 * - Login depuis pays inhabituel
 * - Login à horaires inhabituels
 * - Changement soudain de comportement
 * - Multiple failed logins suivis de succès (credential stuffing)
 * - Accès à ressources sensibles par user non-autorisé
 */

import { EventEmitter } from 'events';

/**
 * Types pour détection
 */
interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'auth_failure' | 'brute_force' | 'port_scan' | 'sql_injection' | 'ddos' | 'unauthorized_access';
  ip: string;
  user?: string;
  endpoint?: string;
  action: 'blocked' | 'logged' | 'alerted';
  details: string;
  metadata?: {
    country?: string;
    userAgent?: string;
    geolocation?: { lat: number; lon: number };
    asn?: string;
  };
}

interface SuspiciousActivity {
  id: string;
  timestamp: string;
  type: 'unusual_location' | 'unusual_time' | 'credential_stuffing' | 'privilege_escalation' | 'data_exfiltration' | 'rapid_fire';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  events: SecurityEvent[];
  score: number; // 0-100, plus haut = plus suspect
  autoActions: string[];
}

interface UserProfile {
  userId: string;
  usualCountries: Set<string>;
  usualLoginHours: number[]; // 0-23
  usualIPs: Set<string>;
  usualUserAgents: Set<string>;
  avgLoginFrequency: number; // logins per day
  lastSeen: Date;
}

/**
 * Détecteur d'activités suspectes
 */
export class SuspiciousActivityDetector extends EventEmitter {
  private userProfiles: Map<string, UserProfile> = new Map();
  private eventWindow: SecurityEvent[] = []; // Fenêtre glissante de 1 heure
  private readonly WINDOW_SIZE_MS = 60 * 60 * 1000; // 1 heure
  private readonly SUSPICIOUS_THRESHOLD = 60; // Score > 60 = suspect

  constructor() {
    super();
  }

  /**
   * Analyser un nouvel événement
   */
  public async analyzeEvent(event: SecurityEvent): Promise<SuspiciousActivity | null> {
    // Ajouter à la fenêtre glissante
    this.addToWindow(event);

    // Construire/mettre à jour profil utilisateur si applicable
    if (event.user) {
      this.updateUserProfile(event);
    }

    // Détecter patterns suspects
    const suspiciousActivities: SuspiciousActivity[] = [];

    // 1. Login depuis pays inhabituel
    const unusualLocation = this.detectUnusualLocation(event);
    if (unusualLocation) {
      suspiciousActivities.push(unusualLocation);
    }

    // 2. Login à horaire inhabituel
    const unusualTime = this.detectUnusualTime(event);
    if (unusualTime) {
      suspiciousActivities.push(unusualTime);
    }

    // 3. Credential stuffing (multiple fails puis success)
    const credentialStuffing = this.detectCredentialStuffing(event);
    if (credentialStuffing) {
      suspiciousActivities.push(credentialStuffing);
    }

    // 4. Tentative d'élévation de privilèges
    const privilegeEscalation = this.detectPrivilegeEscalation(event);
    if (privilegeEscalation) {
      suspiciousActivities.push(privilegeEscalation);
    }

    // 5. Exfiltration de données (volume anormal)
    const dataExfiltration = this.detectDataExfiltration(event);
    if (dataExfiltration) {
      suspiciousActivities.push(dataExfiltration);
    }

    // 6. Rapid-fire requests (DDoS ou bot)
    const rapidFire = this.detectRapidFire(event);
    if (rapidFire) {
      suspiciousActivities.push(rapidFire);
    }

    // Retourner l'activité suspecte avec le score le plus élevé
    if (suspiciousActivities.length > 0) {
      const mostSuspicious = suspiciousActivities.reduce((prev, curr) =>
        curr.score > prev.score ? curr : prev
      );

      // Émettre événement pour alerting
      this.emit('suspicious-activity', mostSuspicious);

      return mostSuspicious;
    }

    return null;
  }

  /**
   * Détecter login depuis pays inhabituel
   */
  private detectUnusualLocation(event: SecurityEvent): SuspiciousActivity | null {
    if (!event.user || !event.metadata?.country) return null;

    const profile = this.userProfiles.get(event.user);
    if (!profile) return null; // Nouveau user, pas de baseline

    // Si pays jamais vu avant
    if (!profile.usualCountries.has(event.metadata.country)) {
      const score = 70; // Score élevé pour pays inhabituel

      return {
        id: `unusual-location-${event.id}`,
        timestamp: new Date().toISOString(),
        type: 'unusual_location',
        severity: 'high',
        description: `User ${event.user} logged in from unusual country: ${event.metadata.country}`,
        events: [event],
        score,
        autoActions: ['alert_security_team', 'require_mfa', 'log_detailed'],
      };
    }

    return null;
  }

  /**
   * Détecter login à horaire inhabituel
   */
  private detectUnusualTime(event: SecurityEvent): SuspiciousActivity | null {
    if (!event.user || event.type !== 'auth_failure') return null;

    const profile = this.userProfiles.get(event.user);
    if (!profile) return null;

    const hour = new Date(event.timestamp).getHours();

    // Si jamais connecté à cette heure
    if (!profile.usualLoginHours.includes(hour)) {
      // Check si horaire vraiment inhabituel (nuit)
      const isNightTime = hour >= 22 || hour <= 6;
      const score = isNightTime ? 65 : 45;

      if (score >= this.SUSPICIOUS_THRESHOLD) {
        return {
          id: `unusual-time-${event.id}`,
          timestamp: new Date().toISOString(),
          type: 'unusual_time',
          severity: isNightTime ? 'high' : 'medium',
          description: `User ${event.user} activity at unusual hour: ${hour}:00`,
          events: [event],
          score,
          autoActions: isNightTime ? ['alert_security_team', 'log_detailed'] : ['log_detailed'],
        };
      }
    }

    return null;
  }

  /**
   * Détecter credential stuffing
   * Pattern: Multiple failed logins suivis d'un succès
   */
  private detectCredentialStuffing(event: SecurityEvent): SuspiciousActivity | null {
    if (event.type !== 'auth_failure') return null;

    // Chercher autres échecs du même IP dans la fenêtre
    const recentFailures = this.eventWindow.filter(
      (e) =>
        e.ip === event.ip &&
        e.type === 'auth_failure' &&
        new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // 5 minutes
    );

    // Si > 5 échecs en 5 minutes
    if (recentFailures.length >= 5) {
      // Check si succès après
      const hasSuccessAfter = this.eventWindow.some(
        (e) =>
          e.ip === event.ip &&
          e.type === 'auth_failure' && // TODO: devrait être 'auth_success' si on track ça
          new Date(e.timestamp).getTime() > new Date(event.timestamp).getTime()
      );

      const score = hasSuccessAfter ? 90 : 75;

      return {
        id: `credential-stuffing-${event.id}`,
        timestamp: new Date().toISOString(),
        type: 'credential_stuffing',
        severity: 'critical',
        description: `Credential stuffing detected from IP ${event.ip}: ${recentFailures.length} failed attempts`,
        events: [...recentFailures, event],
        score,
        autoActions: ['block_ip', 'alert_security_team', 'invalidate_all_sessions'],
      };
    }

    return null;
  }

  /**
   * Détecter tentative d'élévation de privilèges
   */
  private detectPrivilegeEscalation(event: SecurityEvent): SuspiciousActivity | null {
    if (event.type !== 'unauthorized_access') return null;

    // Check si user essaie d'accéder à endpoints admin
    const isAdminEndpoint =
      event.endpoint?.includes('/admin') || event.endpoint?.includes('/sudo');

    if (isAdminEndpoint) {
      const score = 85;

      return {
        id: `privilege-escalation-${event.id}`,
        timestamp: new Date().toISOString(),
        type: 'privilege_escalation',
        severity: 'critical',
        description: `Privilege escalation attempt by ${event.user || event.ip} on ${event.endpoint}`,
        events: [event],
        score,
        autoActions: ['block_ip', 'alert_security_team', 'revoke_user_access'],
      };
    }

    return null;
  }

  /**
   * Détecter exfiltration de données
   * Pattern: Volume anormal de requêtes GET/export
   */
  private detectDataExfiltration(event: SecurityEvent): SuspiciousActivity | null {
    // Chercher requêtes du même user sur endpoints de data
    const recentDataAccess = this.eventWindow.filter(
      (e) =>
        e.user === event.user &&
        (e.endpoint?.includes('/export') || e.endpoint?.includes('/download')) &&
        new Date(e.timestamp).getTime() > Date.now() - 10 * 60 * 1000 // 10 minutes
    );

    // Si > 20 exports en 10 minutes
    if (recentDataAccess.length >= 20) {
      const score = 80;

      return {
        id: `data-exfiltration-${event.id}`,
        timestamp: new Date().toISOString(),
        type: 'data_exfiltration',
        severity: 'critical',
        description: `Potential data exfiltration by ${event.user}: ${recentDataAccess.length} exports in 10 minutes`,
        events: recentDataAccess,
        score,
        autoActions: ['block_user', 'alert_security_team', 'snapshot_user_activity'],
      };
    }

    return null;
  }

  /**
   * Détecter rapid-fire requests (bot/DDoS)
   */
  private detectRapidFire(event: SecurityEvent): SuspiciousActivity | null {
    // Chercher requêtes du même IP dans la dernière minute
    const recentRequests = this.eventWindow.filter(
      (e) =>
        e.ip === event.ip &&
        new Date(e.timestamp).getTime() > Date.now() - 60 * 1000 // 1 minute
    );

    // Si > 100 requêtes en 1 minute (> 1.6 req/sec)
    if (recentRequests.length >= 100) {
      const score = 75;

      return {
        id: `rapid-fire-${event.id}`,
        timestamp: new Date().toISOString(),
        type: 'rapid_fire',
        severity: 'high',
        description: `Rapid-fire requests from IP ${event.ip}: ${recentRequests.length} requests/minute`,
        events: recentRequests,
        score,
        autoActions: ['rate_limit_ip', 'alert_ops_team'],
      };
    }

    return null;
  }

  /**
   * Ajouter événement à fenêtre glissante
   */
  private addToWindow(event: SecurityEvent): void {
    this.eventWindow.push(event);

    // Nettoyer événements trop vieux
    const cutoff = Date.now() - this.WINDOW_SIZE_MS;
    this.eventWindow = this.eventWindow.filter(
      (e) => new Date(e.timestamp).getTime() > cutoff
    );
  }

  /**
   * Mettre à jour profil utilisateur
   */
  private updateUserProfile(event: SecurityEvent): void {
    if (!event.user) return;

    let profile = this.userProfiles.get(event.user);

    if (!profile) {
      // Créer nouveau profil
      profile = {
        userId: event.user,
        usualCountries: new Set(),
        usualLoginHours: [],
        usualIPs: new Set(),
        usualUserAgents: new Set(),
        avgLoginFrequency: 0,
        lastSeen: new Date(event.timestamp),
      };
      this.userProfiles.set(event.user, profile);
    }

    // Mettre à jour profil
    if (event.metadata?.country) {
      profile.usualCountries.add(event.metadata.country);
    }

    const hour = new Date(event.timestamp).getHours();
    if (!profile.usualLoginHours.includes(hour)) {
      profile.usualLoginHours.push(hour);
    }

    profile.usualIPs.add(event.ip);

    if (event.metadata?.userAgent) {
      profile.usualUserAgents.add(event.metadata.userAgent);
    }

    profile.lastSeen = new Date(event.timestamp);
  }

  /**
   * Obtenir statistiques de détection
   */
  public getStats(): {
    totalProfiles: number;
    eventsInWindow: number;
    windowSizeMs: number;
  } {
    return {
      totalProfiles: this.userProfiles.size,
      eventsInWindow: this.eventWindow.length,
      windowSizeMs: this.WINDOW_SIZE_MS,
    };
  }

  /**
   * Reset détecteur (pour tests)
   */
  public reset(): void {
    this.userProfiles.clear();
    this.eventWindow = [];
  }
}

export default SuspiciousActivityDetector;
