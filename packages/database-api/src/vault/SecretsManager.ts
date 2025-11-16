/**
 * SecretsManager - Gestionnaire centralisé des secrets (Vault + fallback .env)
 * Session 84 - Security Hardening
 *
 * Responsabilités:
 * - Récupère secrets depuis Vault au runtime (pas .env files)
 * - Fallback automatique sur .env si Vault indisponible
 * - Token renewal automatique (toutes les 6h)
 * - Cache secrets en mémoire (évite appels répétés)
 *
 * Usage:
 * ```typescript
 * const secretsManager = new SecretsManager();
 * await secretsManager.initialize();
 *
 * const postgresPassword = await secretsManager.getSecret('POSTGRES_PASSWORD');
 * const jwtSecret = await secretsManager.getSecret('JWT_SECRET');
 * ```
 */

import { VaultClient, getVaultClient, VaultConfig } from './VaultClient';
import dotenv from 'dotenv';

// Charger .env (fallback si Vault down)
dotenv.config();

/**
 * Mode de récupération des secrets
 */
export enum SecretsSource {
  /** Secrets depuis Vault (mode production) */
  VAULT = 'vault',
  /** Secrets depuis .env files (fallback si Vault down) */
  ENV = 'env',
}

/**
 * Configuration SecretsManager
 */
export interface SecretsManagerConfig {
  /** Utiliser Vault pour secrets ? (si false, utilise .env uniquement) */
  useVault: boolean;

  /** Configuration Vault */
  vaultConfig?: VaultConfig;

  /** Intervalle token renewal (ms, par défaut 6h) */
  tokenRenewalInterval?: number;

  /** Timeout pour tenter connexion Vault (ms, par défaut 5s) */
  vaultTimeout?: number;
}

/**
 * SecretsManager - Récupération centralisée des secrets
 *
 * Features:
 * - Vault primary source (production)
 * - Fallback .env (dev ou si Vault down)
 * - Cache mémoire (évite appels répétés)
 * - Auto-renewal token Vault
 */
export class SecretsManager {
  private vaultClient?: VaultClient;

  private source: SecretsSource;

  private cache: Map<string, string> = new Map();

  private renewalTimer?: NodeJS.Timeout;

  private config: SecretsManagerConfig;

  constructor(config?: Partial<SecretsManagerConfig>) {
    this.config = {
      useVault: config?.useVault ?? process.env.VAULT_ENABLED === 'true',
      vaultConfig: config?.vaultConfig,
      tokenRenewalInterval: config?.tokenRenewalInterval ?? 6 * 60 * 60 * 1000, // 6h
      vaultTimeout: config?.vaultTimeout ?? 5000,
    };

    // Par défaut: utiliser .env (jusqu'à initialize())
    this.source = SecretsSource.ENV;
  }

  /**
   * Initialise SecretsManager
   *
   * Tente connexion à Vault, sinon fallback sur .env
   */
  async initialize(): Promise<void> {
    if (!this.config.useVault) {
      console.log('📋 SecretsManager: Using .env files (VAULT_ENABLED=false)');
      this.source = SecretsSource.ENV;
      return;
    }

    try {
      console.log('🔐 SecretsManager: Attempting Vault connection...');

      // Créer VaultClient avec config
      const vaultConfig: VaultConfig = this.config.vaultConfig || {
        endpoint: process.env.VAULT_ADDR || 'http://cartae-vault:8200',
        token: process.env.VAULT_TOKEN || '',
        mountPoint: process.env.VAULT_MOUNT_POINT || 'secret',
        apiVersion: 'v2',
        requestTimeout: this.config.vaultTimeout,
      };

      if (!vaultConfig.token) {
        throw new Error('VAULT_TOKEN not set');
      }

      this.vaultClient = getVaultClient(vaultConfig);

      // Vérifier Vault ready (unsealed, initialized)
      await this.vaultClient.ensureVaultReady();

      this.source = SecretsSource.VAULT;
      console.log('✅ SecretsManager: Connected to Vault successfully');

      // Démarrer token renewal automatique
      this.startTokenRenewal();
    } catch (error) {
      console.warn('⚠️  SecretsManager: Vault connection failed, falling back to .env');
      console.warn(`   Reason: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.source = SecretsSource.ENV;
    }
  }

  /**
   * Récupère un secret (depuis Vault ou .env selon disponibilité)
   *
   * @param key Nom du secret (ex: 'POSTGRES_PASSWORD', 'JWT_SECRET')
   * @param vaultPath Chemin Vault optionnel (par défaut: 'cartae/{key}')
   * @returns Valeur du secret
   */
  async getSecret(key: string, vaultPath?: string): Promise<string> {
    // Vérifier cache d'abord
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    let value: string | undefined;

    if (this.source === SecretsSource.VAULT && this.vaultClient) {
      try {
        // Récupérer depuis Vault
        const path = vaultPath || `cartae/${key.toLowerCase()}`;
        const secret = await this.vaultClient.readSecret(path);

        value = secret.value || secret[key];

        if (!value) {
          throw new Error(`Secret '${path}' exists but has no 'value' or '${key}' field`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to get secret '${key}' from Vault, trying .env`);
        console.warn(`   Reason: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Fallback .env
        value = process.env[key];
      }
    } else {
      // Source = .env (mode dev ou Vault down)
      value = process.env[key];
    }

    if (!value) {
      throw new Error(
        `Secret '${key}' not found in ${this.source === SecretsSource.VAULT ? 'Vault' : '.env'}`
      );
    }

    // Mettre en cache
    this.cache.set(key, value);

    return value;
  }

  /**
   * Écrit un secret dans Vault (si disponible)
   *
   * Note: N'écrit PAS dans .env (read-only)
   *
   * @param key Nom du secret
   * @param value Valeur du secret
   * @param vaultPath Chemin Vault optionnel
   */
  async setSecret(key: string, value: string, vaultPath?: string): Promise<void> {
    if (this.source !== SecretsSource.VAULT || !this.vaultClient) {
      throw new Error('Cannot write secrets: Vault not available (using .env)');
    }

    const path = vaultPath || `cartae/${key.toLowerCase()}`;

    await this.vaultClient.writeSecret(path, { value });

    // Mettre à jour cache
    this.cache.set(key, value);

    console.log(`✅ Secret '${key}' written to Vault at '${path}'`);
  }

  /**
   * Vide le cache (force re-fetch depuis Vault/env)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️  SecretsManager cache cleared');
  }

  /**
   * Récupère la source actuelle des secrets
   */
  getSource(): SecretsSource {
    return this.source;
  }

  /**
   * Démarre le token renewal automatique (toutes les 6h par défaut)
   */
  private startTokenRenewal(): void {
    if (!this.vaultClient) {
      return;
    }

    const interval = this.config.tokenRenewalInterval!;

    this.renewalTimer = setInterval(async () => {
      try {
        await this.vaultClient!.renewToken();
        console.log('✅ Vault token renewed successfully');
      } catch (error) {
        console.error('❌ Failed to renew Vault token:', error);

        // Si token renewal échoue, passer en mode .env
        console.warn('⚠️  Falling back to .env due to token renewal failure');
        this.source = SecretsSource.ENV;
        this.stopTokenRenewal();
      }
    }, interval);

    console.log(`🔄 Token renewal scheduled every ${interval / 1000 / 60 / 60}h`);
  }

  /**
   * Arrête le token renewal automatique
   */
  private stopTokenRenewal(): void {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = undefined;
      console.log('🛑 Token renewal stopped');
    }
  }

  /**
   * Nettoie les ressources (arrête timers)
   */
  async shutdown(): Promise<void> {
    this.stopTokenRenewal();
    this.cache.clear();
    console.log('🔌 SecretsManager shutdown complete');
  }
}

/**
 * Singleton instance SecretsManager
 */
let secretsManagerInstance: SecretsManager | null = null;

/**
 * Récupère instance singleton SecretsManager
 */
export function getSecretsManager(config?: Partial<SecretsManagerConfig>): SecretsManager {
  if (!secretsManagerInstance) {
    secretsManagerInstance = new SecretsManager(config);
  }

  return secretsManagerInstance;
}

/**
 * Reset singleton (tests uniquement)
 */
export function resetSecretsManager(): void {
  if (secretsManagerInstance) {
    secretsManagerInstance.shutdown();
    secretsManagerInstance = null;
  }
}
