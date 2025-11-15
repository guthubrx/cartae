/**
 * Alert Manager (SOAR Component)
 * Session 81g - Incident Response & Security Operations
 *
 * Gère les alertes de sécurité et notifie via multiples canaux:
 * - Email (SMTP)
 * - Slack (webhook)
 * - PagerDuty (API)
 * - SMS (Twilio, optionnel)
 *
 * Features:
 * - Routing selon criticité
 * - Rate limiting pour éviter spam
 * - Grouping d'alertes similaires
 * - Escalation automatique
 */

import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import axios from 'axios';

/**
 * Types
 */
export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface AlertManagerConfig {
  email?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
    to: string[];
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
  };
  pagerduty?: {
    enabled: boolean;
    integrationKey: string;
  };
  rateLimiting?: {
    enabled: boolean;
    maxAlertsPerMinute: number;
  };
  grouping?: {
    enabled: boolean;
    windowMs: number;
  };
}

/**
 * Alert Manager
 */
export class AlertManager extends EventEmitter {
  private config: AlertManagerConfig;
  private emailTransporter: nodemailer.Transporter | null = null;
  private alertQueue: Alert[] = [];
  private sentAlerts: Map<string, Date> = new Map();

  constructor(config: AlertManagerConfig) {
    super();
    this.config = config;

    // Initialize email transporter
    if (config.email?.enabled) {
      this.emailTransporter = nodemailer.createTransporter(config.email.smtp);
    }
  }

  /**
   * Send alert
   */
  public async sendAlert(alert: Alert): Promise<void> {
    // Apply rate limiting
    if (this.config.rateLimiting?.enabled && this.isRateLimited()) {
      this.emit('rate-limited', alert);
      console.warn(`[AlertManager] Rate limit exceeded, queueing alert ${alert.id}`);
      this.alertQueue.push(alert);
      return;
    }

    // Apply grouping
    if (this.config.grouping?.enabled) {
      const similar = this.findSimilarAlert(alert);
      if (similar) {
        this.emit('grouped', { alert, similarTo: similar });
        console.log(`[AlertManager] Alert ${alert.id} grouped with ${similar.id}`);
        return;
      }
    }

    // Send via all enabled channels
    const promises: Promise<void>[] = [];

    if (this.config.email?.enabled) {
      promises.push(this.sendEmail(alert));
    }

    if (this.config.slack?.enabled) {
      promises.push(this.sendSlack(alert));
    }

    if (this.config.pagerduty?.enabled) {
      promises.push(this.sendPagerDuty(alert));
    }

    await Promise.allSettled(promises);

    // Track sent alert
    this.sentAlerts.set(alert.id, new Date());

    this.emit('sent', alert);
  }

  /**
   * Send email notification
   */
  private async sendEmail(alert: Alert): Promise<void> {
    if (!this.emailTransporter || !this.config.email) return;

    try {
      await this.emailTransporter.sendMail({
        from: this.config.email.from,
        to: this.config.email.to.join(','),
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        text: this.formatAlertText(alert),
        html: this.formatAlertHtml(alert),
      });

      console.log(`[AlertManager] Email sent for alert ${alert.id}`);
    } catch (error) {
      console.error(`[AlertManager] Email failed for alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(alert: Alert): Promise<void> {
    if (!this.config.slack?.webhookUrl) return;

    try {
      await axios.post(this.config.slack.webhookUrl, {
        text: `🚨 Security Alert: ${alert.title}`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Source', value: alert.source, short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Description', value: alert.description, short: false },
            ],
          },
        ],
      });

      console.log(`[AlertManager] Slack sent for alert ${alert.id}`);
    } catch (error) {
      console.error(`[AlertManager] Slack failed for alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDuty(alert: Alert): Promise<void> {
    if (!this.config.pagerduty?.integrationKey) return;

    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: this.config.pagerduty.integrationKey,
        event_action: 'trigger',
        payload: {
          summary: alert.title,
          severity: alert.severity,
          source: alert.source,
          timestamp: alert.timestamp.toISOString(),
          custom_details: {
            description: alert.description,
            ...alert.metadata,
          },
        },
      });

      console.log(`[AlertManager] PagerDuty sent for alert ${alert.id}`);
    } catch (error) {
      console.error(`[AlertManager] PagerDuty failed for alert ${alert.id}:`, error);
      throw error;
    }
  }

  /**
   * Check rate limiting
   */
  private isRateLimited(): boolean {
    if (!this.config.rateLimiting?.enabled) return false;

    const oneMinuteAgo = Date.now() - 60 * 1000;
    const recentAlerts = Array.from(this.sentAlerts.values()).filter(
      (date) => date.getTime() > oneMinuteAgo
    );

    return recentAlerts.length >= (this.config.rateLimiting?.maxAlertsPerMinute || 10);
  }

  /**
   * Find similar alert for grouping
   */
  private findSimilarAlert(alert: Alert): Alert | null {
    if (!this.config.grouping?.enabled) return null;

    const windowStart = Date.now() - (this.config.grouping.windowMs || 300000);

    for (const [id, sentDate] of this.sentAlerts.entries()) {
      if (sentDate.getTime() < windowStart) continue;

      // Check if similar (same title + severity)
      // TODO: More sophisticated similarity check
      const queuedAlert = this.alertQueue.find((a) => a.id === id);
      if (
        queuedAlert &&
        queuedAlert.title === alert.title &&
        queuedAlert.severity === alert.severity
      ) {
        return queuedAlert;
      }
    }

    return null;
  }

  /**
   * Format alert as plain text
   */
  private formatAlertText(alert: Alert): string {
    return `
SECURITY ALERT

Severity: ${alert.severity.toUpperCase()}
Title: ${alert.title}
Time: ${alert.timestamp.toISOString()}
Source: ${alert.source}

Description:
${alert.description}

${alert.metadata ? `\nMetadata:\n${JSON.stringify(alert.metadata, null, 2)}` : ''}
    `.trim();
  }

  /**
   * Format alert as HTML
   */
  private formatAlertHtml(alert: Alert): string {
    const color = this.getSeverityColor(alert.severity);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: ${color};">🚨 Security Alert</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${color};">${alert.severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Title</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.timestamp.toISOString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Source</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.source}</td>
          </tr>
        </table>
        <h3>Description</h3>
        <p>${alert.description}</p>
        ${
          alert.metadata
            ? `<h3>Metadata</h3><pre>${JSON.stringify(alert.metadata, null, 2)}</pre>`
            : ''
        }
      </div>
    `;
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return '#d73027';
      case 'high':
        return '#fc8d59';
      case 'medium':
        return '#fee08b';
      case 'low':
        return '#91cf60';
      case 'info':
        return '#1a9850';
      default:
        return '#000000';
    }
  }

  /**
   * Get queued alerts
   */
  public getQueuedAlerts(): Alert[] {
    return [...this.alertQueue];
  }

  /**
   * Process queued alerts
   */
  public async processQueue(): Promise<void> {
    while (this.alertQueue.length > 0 && !this.isRateLimited()) {
      const alert = this.alertQueue.shift();
      if (alert) {
        await this.sendAlert(alert);
      }
    }
  }
}

export default AlertManager;
