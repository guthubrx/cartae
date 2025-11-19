/**
 * Office365ConnectorBase - Classe abstraite de base pour les connecteurs Office 365
 *
 * Fournit les fonctionnalités communes à tous les connecteurs Office 365 :
 * - Initialisation du TokenInterceptorService
 * - Validation de configuration de base
 * - Utilitaires pour gestion des tokens
 * - Gestion des erreurs
 *
 * Les connecteurs spécifiques (Mail, Calendar, OneDrive) étendent cette classe.
 */

import type { SourceConnector } from '../SourceManager';
import type { FieldMapping, TestConnectionResult, SyncOptions } from '../types';
import type { CartaeItem } from '../../types/CartaeItem';

/**
 * Configuration de base pour tous les connecteurs Office 365
 */
export interface Office365BaseConfig {
  /** Type de service Office 365 ('owa' | 'graph' | 'sharepoint' | 'teams') */
  serviceType: 'owa' | 'graph' | 'sharepoint' | 'teams';

  /** Endpoint de l'API (optionnel, utilise defaults si non fourni) */
  endpoint?: string;

  /** Options additionnelles spécifiques au connecteur */
  [key: string]: any;
}

/**
 * Interface pour TokenInterceptorService (simplifié pour types)
 */
export interface ITokenInterceptor {
  startMonitoring(): Promise<void>;
  stopMonitoring(): void;
  getToken(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string | null>;
  hasTokens(): boolean;
  isAuthenticated(): boolean;
}

/**
 * Classe abstraite de base pour tous les connecteurs Office 365
 */
export abstract class Office365ConnectorBase implements SourceConnector {
  /**
   * Type de connecteur (doit être défini par les classes enfants)
   */
  abstract type: string;

  /**
   * Service d'interception de tokens
   */
  protected tokenInterceptor: ITokenInterceptor | null = null;

  /**
   * Configuration du connecteur
   */
  protected config: Office365BaseConfig | null = null;

  /**
   * Endpoints par défaut pour chaque service
   */
  protected readonly DEFAULT_ENDPOINTS = {
    owa: 'https://outlook.office.com/api/v2.0',
    graph: 'https://graph.microsoft.com/v1.0',
    sharepoint: 'https://{tenant}.sharepoint.com/_api',
    teams: 'https://graph.microsoft.com/v1.0',
  };

  /**
   * Initialiser le TokenInterceptorService
   */
  protected async initializeTokenInterceptor(): Promise<void> {
    if (this.tokenInterceptor) {
      return; // Déjà initialisé
    }

    try {
      // Import dynamique pour éviter dépendance circulaire
      const { TokenInterceptorService } = await import(
        '@cartae-private/office365-connector/src/services/auth/TokenInterceptorService'
      );

      this.tokenInterceptor = new TokenInterceptorService();
      await this.tokenInterceptor.startMonitoring();

      console.log('[Office365ConnectorBase] TokenInterceptorService initialisé');
    } catch (error) {
      console.error(
        '[Office365ConnectorBase] Erreur initialisation TokenInterceptorService:',
        error
      );
      throw new Error(
        "Impossible d'initialiser TokenInterceptorService. " +
          "Vérifiez que l'extension Firefox Office365 est chargée."
      );
    }
  }

  /**
   * Récupérer un token pour le service configuré
   */
  protected async getServiceToken(
    serviceType: 'owa' | 'graph' | 'sharepoint' | 'teams'
  ): Promise<string> {
    if (!this.tokenInterceptor) {
      await this.initializeTokenInterceptor();
    }

    const token = await this.tokenInterceptor!.getToken(serviceType);

    if (!token) {
      throw new Error(
        `Token ${serviceType} non disponible. ` +
          "Assurez-vous d'être connecté à Office 365 (outlook.office365.com) " +
          "et que l'extension Firefox capture les tokens."
      );
    }

    return token;
  }

  /**
   * Vérifier si l'authentification est disponible
   */
  protected async isAuthenticationAvailable(): Promise<boolean> {
    if (!this.tokenInterceptor) {
      try {
        await this.initializeTokenInterceptor();
      } catch {
        return false;
      }
    }

    return this.tokenInterceptor!.isAuthenticated();
  }

  /**
   * Validation de configuration de base (commune à tous les connecteurs)
   */
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Vérifier serviceType
    if (!config.serviceType) {
      errors.push('serviceType est requis');
    } else if (!['owa', 'graph', 'sharepoint', 'teams'].includes(config.serviceType)) {
      errors.push('serviceType doit être "owa", "graph", "sharepoint" ou "teams"');
    }

    // Validation spécifique au connecteur (implémentée par classes enfants)
    const specificValidation = this.validateSpecificConfig(config);
    if (!specificValidation.valid && specificValidation.errors) {
      errors.push(...specificValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validation spécifique au connecteur (à implémenter par classes enfants)
   */
  protected abstract validateSpecificConfig(config: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  };

  /**
   * Test de connexion (méthode commune)
   */
  async testConnection(config: Record<string, any>): Promise<TestConnectionResult> {
    // Valider config d'abord
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Configuration invalide',
        errors: validation.errors,
      };
    }

    this.config = config as Office365BaseConfig;

    // Vérifier tokens disponibles
    const authAvailable = await this.isAuthenticationAvailable();
    if (!authAvailable) {
      return {
        success: false,
        message: 'Authentification non disponible',
        errors: [
          'Extension Firefox Office365 non chargée ou tokens non disponibles',
          "Connectez-vous à outlook.office365.com et rechargez l'extension",
        ],
      };
    }

    // Test spécifique au connecteur
    return this.testSpecificConnection(config);
  }

  /**
   * Test de connexion spécifique (à implémenter par classes enfants)
   */
  protected abstract testSpecificConnection(
    config: Record<string, any>
  ): Promise<TestConnectionResult>;

  /**
   * Synchronisation (méthode commune - délègue aux classes enfants)
   */
  async sync(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }> {
    this.config = config as Office365BaseConfig;

    // Vérifier authentification
    const authAvailable = await this.isAuthenticationAvailable();
    if (!authAvailable) {
      throw new Error(
        'Authentification non disponible. ' +
          "Connectez-vous à Office 365 et assurez-vous que l'extension Firefox est active."
      );
    }

    // Déléguer à la méthode spécifique
    return this.syncSpecific(config, fieldMappings, options);
  }

  /**
   * Synchronisation spécifique (à implémenter par classes enfants)
   */
  protected abstract syncSpecific(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }>;

  /**
   * Récupérer l'endpoint pour le service configuré
   */
  protected getEndpoint(serviceType: 'owa' | 'graph' | 'sharepoint' | 'teams'): string {
    return this.config?.endpoint || this.DEFAULT_ENDPOINTS[serviceType];
  }

  /**
   * Gérer les erreurs de manière uniforme
   */
  protected handleError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }

  /**
   * Nettoyer les ressources
   */
  destroy(): void {
    if (this.tokenInterceptor) {
      this.tokenInterceptor.stopMonitoring();
      this.tokenInterceptor = null;
    }
    this.config = null;
  }
}
