/**
 * Office365MailConnector - Connecteur pour emails Office 365 (OWA REST API)
 *
 * Wrapper autour de OwaRestEmailService et EmailTransformer existants.
 * Implémente l'interface SourceConnector pour intégration avec SourceManager.
 *
 * Réutilise :
 * - OwaRestEmailService.listInboxEmails() - Récupération emails
 * - transformEmailToCartaeItem() - Transformation Email → CartaeItem
 * - TokenInterceptorService - Authentification (via Office365ConnectorBase)
 */

import { Office365ConnectorBase, type Office365BaseConfig } from './Office365ConnectorBase';
import type { FieldMapping, TestConnectionResult, SyncOptions, SyncProgress } from '../types';
import type { CartaeItem } from '../../types/CartaeItem';

/**
 * Configuration spécifique au connecteur Mail
 */
export interface Office365MailConfig extends Office365BaseConfig {
  /** Type de service (toujours 'owa' pour emails) */
  serviceType: 'owa';

  /** Nombre maximum d'emails à récupérer par sync */
  maxResults?: number;

  /** Inclure uniquement les emails non lus */
  unreadOnly?: boolean;

  /** Ajouter des tags par défaut aux emails importés */
  addDefaultTags?: boolean;

  /** Extraire priorité depuis sujet/corps (heuristique) */
  extractPriority?: boolean;
}

/**
 * Connecteur Office 365 Mail
 */
export class Office365MailConnector extends Office365ConnectorBase {
  type = 'office365-mail';

  /**
   * Service OWA (initialisé lors du premier sync)
   */
  private owaService: any = null;

  /**
   * Validation de configuration spécifique au Mail
   */
  protected validateSpecificConfig(config: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Vérifier serviceType = 'owa'
    if (config.serviceType !== 'owa') {
      errors.push('serviceType doit être "owa" pour le connecteur Mail');
    }

    // Valider maxResults si fourni
    if (config.maxResults !== undefined) {
      if (
        typeof config.maxResults !== 'number' ||
        config.maxResults < 1 ||
        config.maxResults > 1000
      ) {
        errors.push('maxResults doit être un nombre entre 1 et 1000');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Test de connexion spécifique au Mail
   */
  protected async testSpecificConnection(
    config: Record<string, any>
  ): Promise<TestConnectionResult> {
    const mailConfig = config as Office365MailConfig;

    try {
      // Initialiser OwaService si pas déjà fait
      if (!this.owaService) {
        await this.initializeOwaService();
      }

      // Tester récupération d'un petit échantillon d'emails
      const testEmails = await this.owaService.listInboxEmails(3);

      return {
        success: true,
        message: `Connexion réussie à OWA REST API`,
        details: {
          endpoint: this.getEndpoint('owa'),
          auth: 'ok',
          permissions: ['read', 'sync'],
          sampleData: {
            emailsAvailable: testEmails.length,
            firstEmailSubject: testEmails[0]?.subject || 'N/A',
            lastSync: new Date().toISOString(),
          },
          latency: 0, // TODO: Mesurer latency réelle si besoin
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur de connexion à OWA',
        errors: [
          error instanceof Error ? error.message : 'Erreur inconnue',
          'Vérifiez que vous êtes connecté à outlook.office365.com',
        ],
      };
    }
  }

  /**
   * Synchronisation spécifique au Mail
   */
  protected async syncSpecific(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }> {
    const mailConfig = config as Office365MailConfig;

    try {
      // Initialiser OwaService si pas déjà fait
      if (!this.owaService) {
        await this.initializeOwaService();
      }

      // Déterminer nombre d'emails à récupérer
      const maxResults = Math.min(
        options?.limit || mailConfig.maxResults || 50,
        1000 // Hard limit
      );

      // Émettre progression initiale
      if (options?.onProgress) {
        const progress: SyncProgress = {
          processed: 0,
          total: maxResults,
          percentage: 0,
          rate: 0,
          eta: 0,
          currentItem: 'Récupération des emails...',
        };
        options.onProgress(progress);
      }

      // Récupérer emails via OwaRestEmailService (RÉUTILISATION)
      console.log(`[Office365MailConnector] Récupération de ${maxResults} emails...`);
      const rawEmails = await this.owaService.listInboxEmails(maxResults);

      // Filtrer unreadOnly si demandé
      const filteredEmails = mailConfig.unreadOnly
        ? rawEmails.filter((email: any) => !email.isRead)
        : rawEmails;

      console.log(
        `[Office365MailConnector] ${filteredEmails.length} emails récupérés (après filtres)`
      );

      // Transformer emails → CartaeItems via EmailTransformer (RÉUTILISATION)
      const { transformEmailToCartaeItem } = await import(
        '@cartae-private/office365-connector/src/transformers/EmailTransformer'
      );

      const items: CartaeItem[] = [];
      const errors: Array<{ itemId: string; error: string }> = [];

      for (let i = 0; i < filteredEmails.length; i++) {
        const email = filteredEmails[i];

        try {
          // Émettre progression
          if (options?.onProgress) {
            const progress: SyncProgress = {
              processed: i + 1,
              total: filteredEmails.length,
              percentage: Math.round(((i + 1) / filteredEmails.length) * 100),
              rate: 0, // TODO: Calculer rate réel si besoin
              eta: 0,
              currentItem: email.subject || `Email ${i + 1}`,
            };
            options.onProgress(progress);
          }

          // Transformer Email → CartaeItem (RÉUTILISATION)
          const cartaeItem = transformEmailToCartaeItem(email, {
            addDefaultTags: mailConfig.addDefaultTags ?? true,
            extractPriority: mailConfig.extractPriority ?? true,
          });

          // Appliquer field mappings (si custom)
          const mappedItem = this.applyFieldMappings(cartaeItem, fieldMappings);

          items.push(mappedItem);
        } catch (error) {
          console.error(`[Office365MailConnector] Erreur transformation email ${email.id}:`, error);
          errors.push({
            itemId: email.id,
            error: error instanceof Error ? error.message : 'Erreur transformation',
          });
        }
      }

      console.log(
        `[Office365MailConnector] ✅ Sync terminée: ${items.length} items, ${errors.length} erreurs`
      );

      return {
        items,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('[Office365MailConnector] Erreur sync:', error);
      throw this.handleError(error, 'Erreur synchronisation emails');
    }
  }

  /**
   * Initialiser OwaRestEmailService
   */
  private async initializeOwaService(): Promise<void> {
    if (this.owaService) {
      return; // Déjà initialisé
    }

    try {
      // Import dynamique pour éviter dépendances au chargement
      const { OwaRestEmailService } = await import(
        '@cartae-private/office365-connector/src/services/OwaRestEmailService'
      );

      // Vérifier que tokenInterceptor est initialisé
      if (!this.tokenInterceptor) {
        await this.initializeTokenInterceptor();
      }

      // Créer instance OwaService (RÉUTILISATION)
      this.owaService = new OwaRestEmailService(this.tokenInterceptor!);

      console.log('[Office365MailConnector] OwaRestEmailService initialisé');
    } catch (error) {
      console.error('[Office365MailConnector] Erreur initialisation OwaService:', error);
      throw new Error(
        "Impossible d'initialiser OwaRestEmailService. " +
          'Vérifiez que @cartae-private/office365-connector est installé.'
      );
    }
  }

  /**
   * Appliquer les field mappings custom sur un CartaeItem
   */
  private applyFieldMappings(item: CartaeItem, mappings: FieldMapping[]): CartaeItem {
    // Si aucun mapping custom, retourner item tel quel
    if (!mappings || mappings.length === 0) {
      return item;
    }

    // Clone pour éviter mutation
    const mappedItem = { ...item };

    // Appliquer chaque mapping
    for (const mapping of mappings) {
      try {
        // Récupérer valeur source (depuis metadata.office365 si existe)
        const sourceValue = this.getNestedValue(item, mapping.sourceField);

        if (sourceValue !== undefined) {
          // Définir valeur cible
          this.setNestedValue(mappedItem, mapping.targetField, sourceValue);
        } else if (mapping.defaultValue !== undefined) {
          // Utiliser valeur par défaut si source manquante
          this.setNestedValue(mappedItem, mapping.targetField, mapping.defaultValue);
        } else if (mapping.required) {
          console.warn(
            `[Office365MailConnector] Field mapping requis manquant: ${mapping.sourceField} → ${mapping.targetField}`
          );
        }
      } catch (error) {
        console.error(`[Office365MailConnector] Erreur application mapping ${mapping.id}:`, error);
      }
    }

    return mappedItem;
  }

  /**
   * Récupérer une valeur nested dans un objet (ex: "metadata.office365.emailId")
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Définir une valeur nested dans un objet (ex: "metadata.customField")
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Nettoyer les ressources
   */
  override destroy(): void {
    super.destroy();
    this.owaService = null;
  }
}
