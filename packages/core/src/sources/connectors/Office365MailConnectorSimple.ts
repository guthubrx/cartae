/**
 * Office365MailConnectorSimple - Connecteur Office 365 Mail MINIMAL
 *
 * Version simple qui :
 * - Utilise window.cartaeExtension pour récupérer les tokens
 * - Appelle directement Microsoft Graph API
 * - Transforme les emails en CartaeItems
 * - AUCUNE dépendance externe à @cartae-private
 */

import type { SourceConnector } from '../SourceManager';
import type { FieldMapping, TestConnectionResult, SyncOptions } from '../types';
import type { CartaeItem } from '../../types/CartaeItem';

/**
 * Configuration minimale pour Office365 Mail
 */
export interface Office365MailConfig {
  /** Nombre max d'emails à synchroniser (défaut: 50) */
  maxEmails?: number;

  /** Filtre dossier (défaut: Inbox) */
  folder?: string;
}

/**
 * Interface pour l'extension browser Cartae
 */
interface CartaeExtension {
  getToken(service: 'graph'): Promise<string | null>;
  isAuthenticated(): boolean;
}

/**
 * Interface Email Microsoft Graph API
 */
interface GraphEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  from: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  receivedDateTime: string;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  categories: string[];
}

/**
 * Connecteur Office 365 Mail minimal
 */
export class Office365MailConnectorSimple implements SourceConnector {
  type = 'office365-mail-simple';
  name = 'Office 365 Mail (Simple)';
  description = 'Synchronisation emails Office 365 via Microsoft Graph API';

  private config: Office365MailConfig = {};
  private graphEndpoint = 'https://graph.microsoft.com/v1.0';

  /**
   * Récupère le token d'authentification depuis l'extension browser
   */
  private async getAuthToken(): Promise<string> {
    // Vérifier si l'extension est disponible
    const ext = (window as any).cartaeExtension as CartaeExtension | undefined;

    if (!ext) {
      throw new Error(
        'Extension browser Cartae non détectée. ' +
        'Installez l\'extension browser pour utiliser ce connecteur.'
      );
    }

    if (!ext.isAuthenticated()) {
      throw new Error(
        'Non authentifié Office 365. ' +
        'Utilisez l\'extension browser pour vous connecter.'
      );
    }

    const token = await ext.getToken('graph');

    if (!token) {
      throw new Error('Impossible de récupérer le token Office 365');
    }

    return token;
  }

  /**
   * Appelle Microsoft Graph API
   */
  private async callGraphAPI<T>(endpoint: string): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.graphEndpoint}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Transforme un email Graph en CartaeItem
   */
  private emailToCartaeItem(email: GraphEmail): CartaeItem {
    return {
      id: `office365-mail-${email.id}`,
      title: email.subject || '(Sans sujet)',
      type: 'email',
      content: email.bodyPreview || '',
      tags: email.categories || [],
      categories: ['work', 'email'],
      source: {
        connector: this.type,
        sourceId: email.id,
      },
      metadata: {
        author: email.from?.emailAddress?.address || 'unknown',
        participants: email.toRecipients?.map(r => r.emailAddress.address) || [],
        startDate: new Date(email.receivedDateTime),
        priority: email.importance === 'high' ? 'high' : email.importance === 'low' ? 'low' : 'medium',
        status: email.isRead ? 'read' : 'unread',
        hasAttachments: email.hasAttachments,
      },
      archived: false,
      favorite: false,
      createdAt: new Date(email.receivedDateTime),
      updatedAt: new Date(email.receivedDateTime),
    };
  }

  // ========== Méthodes SourceConnector ==========

  async configure(config: Record<string, any>): Promise<void> {
    this.config = config as Office365MailConfig;
    console.log('[Office365MailSimple] Configured:', this.config);
  }

  async validateConfig(config: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    // Pas de validation stricte nécessaire pour la config minimale
    return { valid: true };
  }

  async testConnection(config: Record<string, any>): Promise<TestConnectionResult> {
    try {
      // Tester en récupérant 1 email
      const response = await this.callGraphAPI<{ value: GraphEmail[] }>(
        '/me/messages?$top=1'
      );

      return {
        success: true,
        message: 'Connexion réussie à Microsoft Graph API',
        details: {
          endpoint: this.graphEndpoint,
          messagesFound: response.value.length,
          authenticated: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion',
      };
    }
  }

  async sync(
    options?: SyncOptions,
    onProgress?: (progress: number) => void
  ): Promise<CartaeItem[]> {
    const maxEmails = this.config.maxEmails || 50;

    console.log('[Office365MailSimple] Début synchronisation:', { maxEmails });

    try {
      // Récupérer les emails via Graph API
      const response = await this.callGraphAPI<{ value: GraphEmail[] }>(
        `/me/messages?$top=${maxEmails}&$orderby=receivedDateTime desc`
      );

      const emails = response.value;
      console.log(`[Office365MailSimple] ${emails.length} emails récupérés`);

      // Transformer en CartaeItems
      const items: CartaeItem[] = [];

      for (let i = 0; i < emails.length; i++) {
        const item = this.emailToCartaeItem(emails[i]);
        items.push(item);

        // Notifier progression
        if (onProgress) {
          const progress = Math.round(((i + 1) / emails.length) * 100);
          onProgress(progress);
        }
      }

      console.log('[Office365MailSimple] Synchronisation terminée:', items.length, 'items');

      return items;
    } catch (error) {
      console.error('[Office365MailSimple] Erreur sync:', error);
      throw error;
    }
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      type: 'object',
      properties: {
        maxEmails: {
          type: 'number',
          title: 'Nombre max d\'emails',
          description: 'Nombre maximum d\'emails à synchroniser (défaut: 50)',
          default: 50,
          minimum: 1,
          maximum: 1000,
        },
        folder: {
          type: 'string',
          title: 'Dossier',
          description: 'Nom du dossier à synchroniser (défaut: Inbox)',
          default: 'Inbox',
        },
      },
    };
  }

  async mapFields(
    sourceData: Record<string, any>,
    mappings: FieldMapping[]
  ): Promise<Partial<CartaeItem>> {
    // Transformation déjà faite dans emailToCartaeItem
    // Cette méthode est là pour compatibilité interface
    return {};
  }

  destroy(): void {
    console.log('[Office365MailSimple] Destroyed');
  }
}
