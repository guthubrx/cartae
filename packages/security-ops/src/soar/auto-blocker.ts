/**
 * Auto-Blocker (SOAR Component)
 * Session 81g - Incident Response & Security Operations
 *
 * Automatise le blocage d'IPs malveillantes basé sur des règles.
 * Intègre avec Fail2ban et iptables pour enforcement.
 *
 * Fonctionnalités:
 * - Auto-ban après X tentatives échouées
 * - Whitelisting d'IPs de confiance
 * - Escalation progressive (rate limit → ban temporaire → ban permanent)
 * - Unbanning automatique après durée
 * - Métriques Prometheus
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Types
 */
export interface BlockRule {
  id: string;
  name: string;
  threshold: number; // Nombre d'infractions avant block
  windowMs: number; // Fenêtre de détection en millisecondes
  duration: number; // Durée du ban en secondes (-1 = permanent)
  action: 'rate_limit' | 'ban_temp' | 'ban_permanent';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: Date;
  expiresAt: Date | null;
  ruleId: string;
  infractions: number;
}

export interface AutoBlockerConfig {
  rules: BlockRule[];
  whitelist: string[];
  enableFail2ban?: boolean;
  enableIptables?: boolean;
  metricsEnabled?: boolean;
}

/**
 * Auto-Blocker Implementation
 */
export class AutoBlocker extends EventEmitter {
  private rules: Map<string, BlockRule> = new Map();
  private whitelist: Set<string> = new Set();
  private infractions: Map<string, { count: number; firstSeen: Date }[]> = new Map();
  private blockedIPs: Map<string, BlockedIP> = new Map();

  private enableFail2ban: boolean;
  private enableIptables: boolean;
  private metricsEnabled: boolean;

  // Metrics
  private metrics = {
    totalBlocks: 0,
    totalUnblocks: 0,
    activeBlocks: 0,
    whitelistHits: 0,
  };

  constructor(config: AutoBlockerConfig) {
    super();

    // Load rules
    config.rules.forEach((rule) => this.rules.set(rule.id, rule));

    // Load whitelist
    config.whitelist.forEach((ip) => this.whitelist.add(ip));

    this.enableFail2ban = config.enableFail2ban ?? true;
    this.enableIptables = config.enableIptables ?? true;
    this.metricsEnabled = config.metricsEnabled ?? true;

    // Auto-unblock expired bans
    this.startUnblockTimer();
  }

  /**
   * Rapporter une infraction
   * Retourne true si IP a été bloquée, false sinon
   */
  public async reportInfraction(
    ip: string,
    ruleId: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    // Check whitelist
    if (this.isWhitelisted(ip)) {
      this.metrics.whitelistHits++;
      this.emit('whitelist-hit', { ip, ruleId });
      return false;
    }

    // Get rule
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Unknown rule: ${ruleId}`);
    }

    // Ajouter infraction
    const infractions = this.infractions.get(ip) || [];
    infractions.push({ count: 1, firstSeen: new Date() });

    // Nettoyer infractions en dehors de la fenêtre
    const cutoff = Date.now() - rule.windowMs;
    const recentInfractions = infractions.filter(
      (inf) => inf.firstSeen.getTime() > cutoff
    );

    this.infractions.set(ip, recentInfractions);

    // Compter total d'infractions dans la fenêtre
    const totalInfractions = recentInfractions.reduce((sum, inf) => sum + inf.count, 0);

    // Vérifier seuil
    if (totalInfractions >= rule.threshold) {
      await this.blockIP(ip, rule, totalInfractions, metadata);
      return true;
    }

    // Émettre warning si proche du seuil
    if (totalInfractions >= rule.threshold * 0.8) {
      this.emit('threshold-approaching', {
        ip,
        ruleId,
        infractions: totalInfractions,
        threshold: rule.threshold,
      });
    }

    return false;
  }

  /**
   * Bloquer une IP
   */
  private async blockIP(
    ip: string,
    rule: BlockRule,
    infractions: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Check si déjà bloquée
    if (this.blockedIPs.has(ip)) {
      // Escalate si déjà bloqué
      await this.escalateBlock(ip, rule);
      return;
    }

    // Calculer expiration
    const blockedAt = new Date();
    const expiresAt = rule.duration === -1 ? null : new Date(Date.now() + rule.duration * 1000);

    // Créer record
    const blockedIP: BlockedIP = {
      ip,
      reason: `Rule ${rule.name} triggered: ${infractions} infractions in ${rule.windowMs}ms`,
      blockedAt,
      expiresAt,
      ruleId: rule.id,
      infractions,
    };

    this.blockedIPs.set(ip, blockedIP);

    // Apply block
    await this.applyBlock(ip, rule);

    // Update metrics
    this.metrics.totalBlocks++;
    this.metrics.activeBlocks++;

    // Emit event
    this.emit('block', { ...blockedIP, metadata });

    console.log(`[AutoBlocker] Blocked IP ${ip}: ${blockedIP.reason}`);
  }

  /**
   * Appliquer blocage (Fail2ban + iptables)
   */
  private async applyBlock(ip: string, rule: BlockRule): Promise<void> {
    const actions: Promise<void>[] = [];

    // Fail2ban
    if (this.enableFail2ban) {
      actions.push(this.fail2banBan(ip, rule));
    }

    // Iptables
    if (this.enableIptables) {
      actions.push(this.iptablesBan(ip));
    }

    await Promise.allSettled(actions);
  }

  /**
   * Ban via Fail2ban
   */
  private async fail2banBan(ip: string, rule: BlockRule): Promise<void> {
    try {
      // Déterminer jail selon rule
      const jail = rule.severity === 'critical' ? 'cartae-recidive' : 'cartae-brute-force';

      await execAsync(`fail2ban-client set ${jail} banip ${ip}`);
      console.log(`[AutoBlocker] Fail2ban banned ${ip} in jail ${jail}`);
    } catch (error) {
      console.error(`[AutoBlocker] Fail2ban ban failed for ${ip}:`, error);
    }
  }

  /**
   * Ban via iptables
   */
  private async iptablesBan(ip: string): Promise<void> {
    try {
      await execAsync(`iptables -I INPUT -s ${ip} -j DROP`);
      console.log(`[AutoBlocker] iptables banned ${ip}`);
    } catch (error) {
      console.error(`[AutoBlocker] iptables ban failed for ${ip}:`, error);
    }
  }

  /**
   * Escalate blocage (ban temp → ban permanent)
   */
  private async escalateBlock(ip: string, rule: BlockRule): Promise<void> {
    const existingBlock = this.blockedIPs.get(ip);
    if (!existingBlock) return;

    console.log(`[AutoBlocker] Escalating block for ${ip}`);

    // Si déjà permanent, ne rien faire
    if (existingBlock.expiresAt === null) {
      return;
    }

    // Escalate à permanent
    existingBlock.expiresAt = null;
    existingBlock.reason += ' [ESCALATED TO PERMANENT]';

    this.emit('block-escalated', existingBlock);
  }

  /**
   * Débloquer une IP manuellement
   */
  public async unblockIP(ip: string, reason: string = 'manual'): Promise<void> {
    const blockedIP = this.blockedIPs.get(ip);
    if (!blockedIP) {
      throw new Error(`IP ${ip} is not blocked`);
    }

    // Remove block
    await this.removeBlock(ip);

    this.blockedIPs.delete(ip);
    this.infractions.delete(ip);

    // Update metrics
    this.metrics.totalUnblocks++;
    this.metrics.activeBlocks--;

    // Emit event
    this.emit('unblock', { ip, reason });

    console.log(`[AutoBlocker] Unblocked IP ${ip}: ${reason}`);
  }

  /**
   * Retirer blocage (Fail2ban + iptables)
   */
  private async removeBlock(ip: string): Promise<void> {
    const actions: Promise<void>[] = [];

    // Fail2ban
    if (this.enableFail2ban) {
      actions.push(this.fail2banUnban(ip));
    }

    // Iptables
    if (this.enableIptables) {
      actions.push(this.iptablesUnban(ip));
    }

    await Promise.allSettled(actions);
  }

  /**
   * Unban via Fail2ban
   */
  private async fail2banUnban(ip: string): Promise<void> {
    try {
      // Unban de tous les jails
      const jails = ['cartae-api-auth', 'cartae-brute-force', 'cartae-recidive'];

      for (const jail of jails) {
        try {
          await execAsync(`fail2ban-client set ${jail} unbanip ${ip}`);
        } catch {
          // Jail peut ne pas exister ou IP pas bannie dedans
        }
      }

      console.log(`[AutoBlocker] Fail2ban unbanned ${ip}`);
    } catch (error) {
      console.error(`[AutoBlocker] Fail2ban unban failed for ${ip}:`, error);
    }
  }

  /**
   * Unban via iptables
   */
  private async iptablesUnban(ip: string): Promise<void> {
    try {
      await execAsync(`iptables -D INPUT -s ${ip} -j DROP`);
      console.log(`[AutoBlocker] iptables unbanned ${ip}`);
    } catch (error) {
      // Règle peut ne pas exister
      console.warn(`[AutoBlocker] iptables unban failed for ${ip} (rule may not exist)`);
    }
  }

  /**
   * Timer auto-unblock pour bans temporaires expirés
   */
  private startUnblockTimer(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [ip, blockedIP] of this.blockedIPs.entries()) {
        // Skip si permanent
        if (blockedIP.expiresAt === null) continue;

        // Check si expiré
        if (blockedIP.expiresAt.getTime() <= now) {
          this.unblockIP(ip, 'expired').catch((err) =>
            console.error(`Failed to auto-unblock ${ip}:`, err)
          );
        }
      }
    }, 60 * 1000); // Check toutes les minutes
  }

  /**
   * Vérifier si IP est whitelisted
   */
  private isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  /**
   * Ajouter IP à whitelist
   */
  public addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.emit('whitelist-add', { ip });
  }

  /**
   * Retirer IP de whitelist
   */
  public removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
    this.emit('whitelist-remove', { ip });
  }

  /**
   * Obtenir liste des IPs bloquées
   */
  public getBlockedIPs(): BlockedIP[] {
    return Array.from(this.blockedIPs.values());
  }

  /**
   * Obtenir métriques
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalBlocks: 0,
      totalUnblocks: 0,
      activeBlocks: this.blockedIPs.size,
      whitelistHits: 0,
    };
  }
}

export default AutoBlocker;
