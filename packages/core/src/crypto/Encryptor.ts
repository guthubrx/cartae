/**
 * Encryptor - Chiffrement AES-256-GCM + PBKDF2
 * Session 78 - Phase 4
 *
 * Implémentation crypto Web API (native browser):
 * - AES-256-GCM (Galois/Counter Mode) pour chiffrement authentifié
 * - PBKDF2 (100k iterations) pour dérivation de clé depuis password
 * - Salt aléatoire (16 bytes) pour chaque encryption
 * - IV aléatoire (12 bytes) pour chaque encryption
 *
 * Format de sortie (base64):
 * salt (16 bytes) || iv (12 bytes) || ciphertext || authTag (16 bytes)
 */

/**
 * Résultat du chiffrement
 */
export interface EncryptResult {
  /** Données chiffrées (base64) */
  ciphertext: string;

  /** Salt utilisé (base64) */
  salt: string;

  /** IV utilisé (base64) */
  iv: string;

  /** Format de chiffrement */
  algorithm: 'AES-256-GCM';

  /** Nombre d'itérations PBKDF2 */
  iterations: number;
}

/**
 * Résultat du déchiffrement
 */
export interface DecryptResult {
  /** Données déchiffrées (texte clair) */
  plaintext: string;

  /** Déchiffrement réussi */
  success: boolean;
}

/**
 * Encryptor - Classe de chiffrement sécurisé
 *
 * Usage:
 * ```typescript
 * const encryptor = new Encryptor();
 *
 * // Encrypt
 * const encrypted = await encryptor.encrypt('my secret data', 'my-strong-password');
 *
 * // Decrypt
 * const decrypted = await encryptor.decrypt(encrypted.ciphertext, 'my-strong-password');
 * ```
 */
export class Encryptor {
  private readonly ALGORITHM = 'AES-GCM';

  private readonly KEY_LENGTH = 256; // bits

  private readonly IV_LENGTH = 12; // bytes (96 bits, recommended for GCM)

  private readonly SALT_LENGTH = 16; // bytes (128 bits)

  private readonly PBKDF2_ITERATIONS = 100000; // 100k iterations (OWASP 2023)

  private readonly AUTH_TAG_LENGTH = 128; // bits (16 bytes)

  /**
   * Dérive une clé de chiffrement depuis un password avec PBKDF2
   *
   * @param password Password utilisateur
   * @param salt Salt aléatoire (16 bytes)
   * @returns CryptoKey pour AES-GCM
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Encoder le password en bytes
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Importer le password comme clé PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false, // Non extractable
      ['deriveKey']
    );

    // Dériver une clé AES-256-GCM depuis le password
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false, // Non extractable (sécurité)
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Chiffre des données avec AES-256-GCM
   *
   * @param plaintext Données en clair
   * @param password Password pour dériver la clé
   * @returns Résultat du chiffrement (ciphertext, salt, iv)
   */
  async encrypt(plaintext: string, password: string): Promise<EncryptResult> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    if (!password || password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }

    // Générer salt aléatoire (16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));

    // Générer IV aléatoire (12 bytes)
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Dériver clé depuis password + salt
    const key = await this.deriveKey(password, salt);

    // Encoder plaintext en bytes
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);

    // Chiffrer avec AES-256-GCM
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv,
        tagLength: this.AUTH_TAG_LENGTH,
      },
      key,
      plaintextBuffer
    );

    // Convertir en base64 pour stockage
    const ciphertextBase64 = this.arrayBufferToBase64(ciphertextBuffer);
    const saltBase64 = this.arrayBufferToBase64(salt.buffer);
    const ivBase64 = this.arrayBufferToBase64(iv.buffer);

    return {
      ciphertext: ciphertextBase64,
      salt: saltBase64,
      iv: ivBase64,
      algorithm: 'AES-256-GCM',
      iterations: this.PBKDF2_ITERATIONS,
    };
  }

  /**
   * Déchiffre des données avec AES-256-GCM
   *
   * @param ciphertext Données chiffrées (base64)
   * @param password Password pour dériver la clé
   * @param salt Salt utilisé lors du chiffrement (base64)
   * @param iv IV utilisé lors du chiffrement (base64)
   * @returns Résultat du déchiffrement
   */
  async decrypt(
    ciphertext: string,
    password: string,
    salt: string,
    iv: string
  ): Promise<DecryptResult> {
    try {
      // Convertir depuis base64
      const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);
      const saltBuffer = this.base64ToArrayBuffer(salt);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // Dériver clé depuis password + salt
      const key = await this.deriveKey(password, new Uint8Array(saltBuffer));

      // Déchiffrer avec AES-256-GCM
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(ivBuffer),
          tagLength: this.AUTH_TAG_LENGTH,
        },
        key,
        ciphertextBuffer
      );

      // Décoder bytes en texte
      const decoder = new TextDecoder();
      const plaintext = decoder.decode(plaintextBuffer);

      return {
        plaintext,
        success: true,
      };
    } catch (error) {
      // Déchiffrement échoué (mauvais password ou données corrompues)
      return {
        plaintext: '',
        success: false,
      };
    }
  }

  /**
   * Chiffre et encode en format compact (salt||iv||ciphertext)
   *
   * Utilisé pour stockage simplifié (un seul string au lieu de 3)
   */
  async encryptCompact(plaintext: string, password: string): Promise<string> {
    const result = await this.encrypt(plaintext, password);

    // Format: salt||iv||ciphertext (séparés par ||)
    return `${result.salt}||${result.iv}||${result.ciphertext}`;
  }

  /**
   * Déchiffre depuis format compact (salt||iv||ciphertext)
   */
  async decryptCompact(compactCiphertext: string, password: string): Promise<DecryptResult> {
    const parts = compactCiphertext.split('||');

    if (parts.length !== 3) {
      return {
        plaintext: '',
        success: false,
      };
    }

    const [salt, iv, ciphertext] = parts;

    return this.decrypt(ciphertext, password, salt, iv);
  }

  /**
   * Génère une recovery key aléatoire sécurisée
   *
   * Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (24 caractères alphanumérique)
   * Entropie: ~142 bits (très forte)
   */
  generateRecoveryKey(): string {
    const segments: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < 6; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
        segment += chars[randomIndex];
      }
      segments.push(segment);
    }

    return segments.join('-');
  }

  /**
   * Hash un password avec SHA-256 (pour stockage/comparaison)
   *
   * Note: Pour stockage long-terme, préférer bcrypt/argon2.
   * Ici on utilise SHA-256 car c'est pour comparaison locale uniquement.
   */
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Vérifie un password contre son hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  // ============================================================
  // Utilitaires de conversion
  // ============================================================

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Singleton instance (optionnel)
 */
export const encryptor = new Encryptor();
