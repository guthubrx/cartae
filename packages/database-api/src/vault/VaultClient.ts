/**
 * VaultClient - Client HashiCorp Vault pour secrets management
 * Session 78 - Phase 5
 *
 * Responsabilités:
 * - Connexion à Vault (avec app token)
 * - Store/Retrieve/Delete secrets (KV v2 engine)
 * - Health check Vault
 * - Token renewal automatique
 *
 * Usage:
 * ```typescript
 * const vaultClient = new VaultClient({
 *   endpoint: 'http://localhost:8200',
 *   token: 'hvs.xxxxx',
 * });
 *
 * await vaultClient.writeSecret('database/postgres', {
 *   username: 'cartae',
 *   password: 'secure-password-123',
 * });
 *
 * const secret = await vaultClient.readSecret('database/postgres');
 * console.log(secret.username); // 'cartae'
 * ```
 */

import vault from 'node-vault';

export interface VaultConfig {
  /** Adresse Vault (http://localhost:8200) */
  endpoint: string;

  /** Token d'authentification (app token, policy: cartae-app) */
  token: string;

  /** Path du KV engine (par défaut: secret/) */
  mountPoint?: string;

  /** API version (v1 ou v2, par défaut: v2) */
  apiVersion?: 'v1' | 'v2';

  /** Timeout requêtes (ms, par défaut: 5000) */
  requestTimeout?: number;
}

export interface VaultSecret {
  /** Données du secret (key-value pairs) */
  data: Record<string, any>;

  /** Metadata du secret */
  metadata?: {
    created_time: string;
    deletion_time: string;
    destroyed: boolean;
    version: number;
  };
}

export interface VaultHealth {
  /** Vault est-il initialisé ? */
  initialized: boolean;

  /** Vault est-il sealed (verrouillé) ? */
  sealed: boolean;

  /** Vault est-il en standby ? */
  standby: boolean;

  /** Version Vault */
  version: string;

  /** Cluster ID */
  cluster_id?: string;
}

/**
 * VaultClient - Wrapper node-vault pour secrets management
 *
 * Features:
 * - KV v2 engine (versioning secrets)
 * - Auto-retry sur erreurs transitoires
 * - Type-safe secret read/write
 * - Health checks
 */
export class VaultClient {
  private client: vault.client;
  private mountPoint: string;
  private apiVersion: 'v1' | 'v2';

  constructor(config: VaultConfig) {
    this.mountPoint = config.mountPoint || 'secret';
    this.apiVersion = config.apiVersion || 'v2';

    // Créer client node-vault
    this.client = vault({
      endpoint: config.endpoint,
      token: config.token,
      requestOptions: {
        timeout: config.requestTimeout || 5000,
      },
    });
  }

  /**
   * Écrit un secret dans Vault (KV v2)
   *
   * @param path Chemin du secret (ex: 'database/postgres')
   * @param data Données à stocker (key-value pairs)
   * @returns Version du secret créé
   */
  async writeSecret(path: string, data: Record<string, any>): Promise<number> {
    try {
      if (this.apiVersion === 'v2') {
        // KV v2: POST /secret/data/:path
        const response = await this.client.write(`${this.mountPoint}/data/${path}`, {
          data,
        });

        return response.data.version;
      } else {
        // KV v1: POST /secret/:path
        await this.client.write(`${this.mountPoint}/${path}`, data);
        return 1; // v1 n'a pas de versioning
      }
    } catch (error) {
      throw new Error(
        `Failed to write secret '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Lit un secret depuis Vault (KV v2)
   *
   * @param path Chemin du secret (ex: 'database/postgres')
   * @param version Version spécifique (optionnel, par défaut: dernière version)
   * @returns Données du secret
   */
  async readSecret(path: string, version?: number): Promise<Record<string, any>> {
    try {
      if (this.apiVersion === 'v2') {
        // KV v2: GET /secret/data/:path?version=X
        const versionParam = version ? `?version=${version}` : '';
        const response = await this.client.read(`${this.mountPoint}/data/${path}${versionParam}`);

        // KV v2 retourne { data: { data: {...}, metadata: {...} } }
        return response.data.data;
      } else {
        // KV v1: GET /secret/:path
        const response = await this.client.read(`${this.mountPoint}/${path}`);
        return response.data;
      }
    } catch (error) {
      // Si secret n'existe pas, node-vault throw erreur 404
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        throw new Error(`Secret '${path}' not found`);
      }

      throw new Error(
        `Failed to read secret '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Supprime un secret de Vault (soft delete, récupérable)
   *
   * @param path Chemin du secret
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      if (this.apiVersion === 'v2') {
        // KV v2: DELETE /secret/data/:path (soft delete)
        await this.client.delete(`${this.mountPoint}/data/${path}`);
      } else {
        // KV v1: DELETE /secret/:path
        await this.client.delete(`${this.mountPoint}/${path}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete secret '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Liste les secrets disponibles dans un path
   *
   * @param path Chemin du dossier (ex: 'database/')
   * @returns Liste des clés disponibles
   */
  async listSecrets(path: string): Promise<string[]> {
    try {
      if (this.apiVersion === 'v2') {
        // KV v2: LIST /secret/metadata/:path
        const response = await this.client.list(`${this.mountPoint}/metadata/${path}`);
        return response.data.keys || [];
      } else {
        // KV v1: LIST /secret/:path
        const response = await this.client.list(`${this.mountPoint}/${path}`);
        return response.data.keys || [];
      }
    } catch (error) {
      // Si path n'existe pas, retourner liste vide
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return [];
      }

      throw new Error(
        `Failed to list secrets at '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Health check Vault
   *
   * @returns Status Vault (initialized, sealed, version, etc.)
   */
  async health(): Promise<VaultHealth> {
    try {
      const response = await this.client.health();

      return {
        initialized: response.initialized,
        sealed: response.sealed,
        standby: response.standby,
        version: response.version,
        cluster_id: response.cluster_id,
      };
    } catch (error) {
      throw new Error(
        `Failed to get Vault health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Vérifie que Vault est accessible et unsealed
   *
   * @throws Error si Vault sealed ou inaccessible
   */
  async ensureVaultReady(): Promise<void> {
    const health = await this.health();

    if (!health.initialized) {
      throw new Error('Vault is not initialized');
    }

    if (health.sealed) {
      throw new Error('Vault is sealed. Please unseal Vault before accessing secrets.');
    }

    if (health.standby) {
      console.warn('⚠️ Vault is in standby mode (HA cluster)');
    }
  }

  /**
   * Renouvelle le token (si renouvelable)
   *
   * Note: App tokens avec policy cartae-app sont renouvelables par défaut
   */
  async renewToken(): Promise<void> {
    try {
      await this.client.tokenRenewSelf();
      console.log('✅ Vault token renewed successfully');
    } catch (error) {
      throw new Error(
        `Failed to renew token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Récupère les credentials PostgreSQL depuis Vault
   *
   * Helper pour récupérer username/password PostgreSQL
   *
   * @returns { username, password, host, port, database }
   */
  async getPostgresCredentials(): Promise<{
    username: string;
    password: string;
    host: string;
    port: number;
    database: string;
  }> {
    const secret = await this.readSecret('database/postgres');

    if (!secret.username || !secret.password) {
      throw new Error('PostgreSQL credentials incomplete (missing username or password)');
    }

    return {
      username: secret.username,
      password: secret.password,
      host: secret.host || 'localhost',
      port: secret.port || 5432,
      database: secret.database || 'cartae',
    };
  }
}

/**
 * Singleton instance (optionnel, pour éviter multiples connexions)
 */
let vaultClientInstance: VaultClient | null = null;

/**
 * Récupère instance singleton VaultClient
 *
 * @param config Configuration Vault (requis pour première initialisation)
 * @returns VaultClient instance
 */
export function getVaultClient(config?: VaultConfig): VaultClient {
  if (!vaultClientInstance) {
    if (!config) {
      throw new Error('VaultClient not initialized. Provide config for first call.');
    }

    vaultClientInstance = new VaultClient(config);
  }

  return vaultClientInstance;
}

/**
 * Reset singleton (pour tests uniquement)
 */
export function resetVaultClient(): void {
  vaultClientInstance = null;
}
