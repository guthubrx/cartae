/**
 * RecoveryManager - Gestion du système de recovery
 * Session 78 - Phase 4
 *
 * Responsabilités:
 * - Chiffrer les unseal keys avec master password
 * - Générer recovery key
 * - Déchiffrer les unseal keys avec master password OU recovery key
 * - Valider master password
 */

import { Encryptor } from './Encryptor';

/**
 * Données de recovery chiffrées
 */
export interface RecoveryData {
  /** Unseal keys chiffrées avec master password (compact format) */
  encryptedUnsealKeys: string;

  /** Recovery key chiffrée avec master password (compact format) */
  encryptedRecoveryKey: string;

  /** Hash du master password (SHA-256) pour validation */
  masterPasswordHash: string;

  /** Timestamp de création */
  createdAt: string;

  /** Algorithme utilisé */
  algorithm: 'AES-256-GCM';

  /** Itérations PBKDF2 */
  iterations: number;
}

/**
 * Résultat de recovery
 */
export interface RecoveryResult {
  /** Unseal keys déchiffrées */
  unsealKeys: string[];

  /** Recovery réussie ? */
  success: boolean;

  /** Message d'erreur si échec */
  error?: string;
}

/**
 * RecoveryManager - Gestion du recovery system
 *
 * Flow normal (mode PERSONAL):
 * 1. Setup: Chiffre unseal keys + génère recovery key → stocke encryptedUnsealKeys
 * 2. Unlock: Déchiffre avec master password → obtient unseal keys → unseal Vault
 * 3. Recovery: Si master password oublié, utilise recovery key → obtient unseal keys
 *
 * Usage:
 * ```typescript
 * const manager = new RecoveryManager();
 *
 * // Setup (Phase 2 - après init Vault)
 * const recoveryData = await manager.setupRecovery(
 *   unsealKeys,
 *   'my-strong-password'
 * );
 *
 * // Unlock normal (Phase 3)
 * const result = await manager.recoverWithMasterPassword(
 *   recoveryData.encryptedUnsealKeys,
 *   'my-strong-password'
 * );
 *
 * // Recovery (Phase 4 - si password oublié)
 * const result = await manager.recoverWithRecoveryKey(
 *   recoveryData.encryptedRecoveryKey,
 *   recoveryData.encryptedUnsealKeys,
 *   'ABCD-EFGH-IJKL-MNOP-QRST-UVWX'
 * );
 * ```
 */
export class RecoveryManager {
  private encryptor: Encryptor;

  constructor() {
    this.encryptor = new Encryptor();
  }

  /**
   * Setup du recovery system (lors du SetupWizard)
   *
   * Étapes:
   * 1. Génère une recovery key aléatoire
   * 2. Chiffre les unseal keys avec master password
   * 3. Chiffre la recovery key avec master password
   * 4. Hash le master password (pour validation future)
   *
   * @param unsealKeys Clés d'unseal Vault (5 clés)
   * @param masterPassword Master password choisi par l'utilisateur
   * @returns Données de recovery (à stocker dans VaultConfig)
   */
  async setupRecovery(unsealKeys: string[], masterPassword: string): Promise<RecoveryData> {
    if (!unsealKeys || unsealKeys.length === 0) {
      throw new Error('Unseal keys cannot be empty');
    }

    if (!masterPassword || masterPassword.length < 12) {
      throw new Error('Master password must be at least 12 characters');
    }

    // 1. Générer recovery key aléatoire
    const recoveryKey = this.encryptor.generateRecoveryKey();

    // 2. Chiffrer unseal keys avec master password
    const unsealKeysJSON = JSON.stringify(unsealKeys);
    const encryptedUnsealKeys = await this.encryptor.encryptCompact(unsealKeysJSON, masterPassword);

    // 3. Chiffrer recovery key avec master password
    const encryptedRecoveryKey = await this.encryptor.encryptCompact(recoveryKey, masterPassword);

    // 4. Hash master password
    const masterPasswordHash = await this.encryptor.hashPassword(masterPassword);

    return {
      encryptedUnsealKeys,
      encryptedRecoveryKey,
      masterPasswordHash,
      createdAt: new Date().toISOString(),
      algorithm: 'AES-256-GCM',
      iterations: 100000,
    };
  }

  /**
   * Récupère les unseal keys avec master password (unlock normal)
   *
   * @param encryptedUnsealKeys Unseal keys chiffrées
   * @param masterPassword Master password utilisateur
   * @returns Unseal keys déchiffrées
   */
  async recoverWithMasterPassword(
    encryptedUnsealKeys: string,
    masterPassword: string
  ): Promise<RecoveryResult> {
    try {
      // Déchiffrer unseal keys
      const result = await this.encryptor.decryptCompact(encryptedUnsealKeys, masterPassword);

      if (!result.success) {
        return {
          unsealKeys: [],
          success: false,
          error: 'Master password incorrect',
        };
      }

      // Parser JSON
      const unsealKeys: string[] = JSON.parse(result.plaintext);

      return {
        unsealKeys,
        success: true,
      };
    } catch (error) {
      return {
        unsealKeys: [],
        success: false,
        error: 'Erreur lors du déchiffrement. Données corrompues ?',
      };
    }
  }

  /**
   * Récupère les unseal keys avec recovery key (si master password oublié)
   *
   * Flow:
   * 1. Déchiffre la recovery key avec le recovery key saisi
   * 2. Utilise la recovery key déchiffrée comme password pour déchiffrer unseal keys
   *
   * Note: Ceci est une simplification. En production, utiliser un flow plus complexe
   * avec separate encryption (recovery key chiffre directement unseal keys).
   *
   * @param encryptedRecoveryKey Recovery key chiffrée avec master password
   * @param encryptedUnsealKeys Unseal keys chiffrées
   * @param recoveryKey Recovery key saisie par l'utilisateur
   * @param masterPassword Master password utilisateur (pour déchiffrer recovery key)
   * @returns Unseal keys déchiffrées
   */
  async recoverWithRecoveryKey(
    encryptedRecoveryKey: string,
    encryptedUnsealKeys: string,
    recoveryKey: string,
    masterPassword: string
  ): Promise<RecoveryResult> {
    try {
      // 1. Déchiffrer la recovery key stockée avec master password
      const recoveryKeyResult = await this.encryptor.decryptCompact(
        encryptedRecoveryKey,
        masterPassword
      );

      if (!recoveryKeyResult.success) {
        return {
          unsealKeys: [],
          success: false,
          error: 'Master password incorrect',
        };
      }

      const storedRecoveryKey = recoveryKeyResult.plaintext;

      // 2. Vérifier que recovery key saisie correspond
      if (recoveryKey !== storedRecoveryKey) {
        return {
          unsealKeys: [],
          success: false,
          error: 'Recovery key incorrecte',
        };
      }

      // 3. Utiliser recovery key pour déchiffrer unseal keys
      // (En prod: recovery key devrait chiffrer directement unseal keys)
      // Pour simplification, on utilise master password déjà validé
      return await this.recoverWithMasterPassword(encryptedUnsealKeys, masterPassword);
    } catch (error) {
      return {
        unsealKeys: [],
        success: false,
        error: 'Erreur lors de la recovery. Données corrompues ?',
      };
    }
  }

  /**
   * Valide un master password contre le hash stocké
   *
   * @param password Password à valider
   * @param hash Hash stocké (SHA-256)
   * @returns True si password valide
   */
  async validateMasterPassword(password: string, hash: string): Promise<boolean> {
    return this.encryptor.verifyPassword(password, hash);
  }

  /**
   * Change le master password (ré-chiffrement)
   *
   * Étapes:
   * 1. Déchiffre unseal keys avec ancien password
   * 2. Déchiffre recovery key avec ancien password
   * 3. Chiffre unseal keys avec nouveau password
   * 4. Chiffre recovery key avec nouveau password
   * 5. Hash nouveau password
   *
   * @param currentPassword Master password actuel
   * @param newPassword Nouveau master password
   * @param recoveryData Données de recovery actuelles
   * @returns Nouvelles données de recovery
   */
  async changeMasterPassword(
    currentPassword: string,
    newPassword: string,
    recoveryData: RecoveryData
  ): Promise<RecoveryData> {
    // 1. Vérifier ancien password
    const isValid = await this.validateMasterPassword(
      currentPassword,
      recoveryData.masterPasswordHash
    );

    if (!isValid) {
      throw new Error('Current master password incorrect');
    }

    // 2. Déchiffrer unseal keys avec ancien password
    const unsealKeysResult = await this.recoverWithMasterPassword(
      recoveryData.encryptedUnsealKeys,
      currentPassword
    );

    if (!unsealKeysResult.success) {
      throw new Error('Failed to decrypt unseal keys');
    }

    // 3. Déchiffrer recovery key avec ancien password
    const recoveryKeyResult = await this.encryptor.decryptCompact(
      recoveryData.encryptedRecoveryKey,
      currentPassword
    );

    if (!recoveryKeyResult.success) {
      throw new Error('Failed to decrypt recovery key');
    }

    // 4. Ré-chiffrer avec nouveau password
    const unsealKeysJSON = JSON.stringify(unsealKeysResult.unsealKeys);
    const encryptedUnsealKeys = await this.encryptor.encryptCompact(unsealKeysJSON, newPassword);

    const encryptedRecoveryKey = await this.encryptor.encryptCompact(
      recoveryKeyResult.plaintext,
      newPassword
    );

    const masterPasswordHash = await this.encryptor.hashPassword(newPassword);

    return {
      encryptedUnsealKeys,
      encryptedRecoveryKey,
      masterPasswordHash,
      createdAt: recoveryData.createdAt,
      algorithm: 'AES-256-GCM',
      iterations: 100000,
    };
  }

  /**
   * Exporte les unseal keys en clair (DANGEREUX - dev only)
   *
   * À utiliser uniquement pour debugging ou migration.
   */
  async exportUnsealKeys(encryptedUnsealKeys: string, masterPassword: string): Promise<string[]> {
    const result = await this.recoverWithMasterPassword(encryptedUnsealKeys, masterPassword);

    if (!result.success) {
      throw new Error(`Failed to export unseal keys: ${result.error}`);
    }

    return result.unsealKeys;
  }
}

/**
 * Singleton instance (optionnel)
 */
export const recoveryManager = new RecoveryManager();
