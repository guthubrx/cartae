/**
 * MFA Service - Multi-Factor Authentication
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Provides TOTP-based MFA with:
 * - Secret generation + QR code (Google Authenticator, Authy)
 * - 6-digit TOTP verification (30s window)
 * - 8 backup codes (one-time use, bcrypt hashed)
 * - Enable/disable/verify flows
 *
 * Dependencies:
 * - speakeasy: TOTP generation/verification
 * - qrcode: QR code generation for authenticator apps
 * - bcrypt: Backup code hashing
 *
 * @module services/mfa
 */

import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { pool } from '../db/client';

const SALT_ROUNDS = 10;
const BACKUP_CODES_COUNT = 8;
const BACKUP_CODE_LENGTH = 8;

/**
 * MFA Secret with QR Code
 */
export interface MFASetup {
  secret: string; // Base32 secret for manual entry
  qrCode: string; // Data URL for QR code image
  backupCodes?: string[]; // 8 plain backup codes (show once)
}

/**
 * Backup code validation result
 */
export interface BackupCodeValidation {
  valid: boolean;
  remainingCodes: number;
}

/**
 * Generate MFA secret and QR code for user
 * Returns secret (for manual entry) + QR code (for scanning)
 *
 * @param email - User email (shown in authenticator app)
 * @param issuer - App name (default: "Cartae")
 * @returns MFASetup with secret and QR code data URL
 */
export async function generateMFASecret(
  email: string,
  issuer: string = 'Cartae'
): Promise<MFASetup> {
  // Generate base32 secret
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer,
    length: 32,
  });

  if (!secret.base32) {
    throw new Error('Failed to generate MFA secret');
  }

  // Generate QR code as data URL
  const otpauthUrl = secret.otpauth_url;
  if (!otpauthUrl) {
    throw new Error('Failed to generate otpauth URL');
  }

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return {
    secret: secret.base32,
    qrCode: qrCodeDataUrl,
  };
}

/**
 * Verify TOTP token (6-digit code)
 * Uses 30-second window with ±1 window tolerance
 *
 * @param secret - User's MFA secret (base32)
 * @param token - 6-digit code from authenticator app
 * @returns true if valid, false otherwise
 */
export function verifyMFAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow ±30s clock skew
  });
}

/**
 * Generate 8 backup codes (one-time use)
 * Returns plain codes (show to user once) + hashed codes (store in DB)
 *
 * Format: XXXX-XXXX (8 alphanumeric chars with dash)
 *
 * @returns { plain: string[], hashed: string[] }
 */
export async function generateBackupCodes(): Promise<{
  plain: string[];
  hashed: string[];
}> {
  const plain: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Generate random alphanumeric code (XXXX-XXXX)
    const code = generateRandomCode(BACKUP_CODE_LENGTH);
    plain.push(code);

    // Hash for storage
    const hash = await bcrypt.hash(code, SALT_ROUNDS);
    hashed.push(hash);
  }

  return { plain, hashed };
}

/**
 * Generate random alphanumeric code with dash separator
 * Format: XXXX-XXXX
 *
 * @param length - Total length (without dash)
 * @returns Formatted code
 */
function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  // Insert dash in middle (XXXX-XXXX)
  const half = Math.floor(length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

/**
 * Enable MFA for user
 * Stores secret and generates backup codes
 *
 * Flow:
 * 1. Generate secret + QR code
 * 2. Generate 8 backup codes
 * 3. Store secret + hashed backup codes in users table
 * 4. Set mfa_enabled = TRUE
 * 5. Return setup data (secret, QR, plain backup codes - show once!)
 *
 * @param userId - User UUID
 * @param email - User email (for QR code label)
 * @returns MFASetup with secret, QR code, backup codes
 */
export async function enableMFA(
  userId: string,
  email: string
): Promise<MFASetup> {
  // Generate secret + QR code
  const { secret, qrCode } = await generateMFASecret(email);

  // Generate backup codes
  const { plain, hashed } = await generateBackupCodes();

  // Store in database
  await pool.query(
    `
    UPDATE users
    SET
      mfa_enabled = TRUE,
      mfa_secret = $1,
      backup_codes = $2,
      updated_at = NOW()
    WHERE id = $3
    `,
    [secret, JSON.stringify(hashed), userId]
  );

  return {
    secret,
    qrCode,
    backupCodes: plain, // Show to user ONCE, they must save them
  };
}

/**
 * Confirm MFA setup by verifying first TOTP token
 * User scans QR code → enters 6-digit code → we verify → activate MFA
 *
 * This is the final step of MFA enrollment:
 * 1. User calls enableMFA → gets secret + QR
 * 2. User scans QR code in authenticator app
 * 3. User submits first 6-digit code
 * 4. We verify code with confirmMFASetup
 * 5. If valid → MFA is now active
 *
 * @param userId - User UUID
 * @param token - 6-digit TOTP code from authenticator
 * @returns true if confirmed, false if invalid token
 */
export async function confirmMFASetup(
  userId: string,
  token: string
): Promise<boolean> {
  // Get user's MFA secret
  const result = await pool.query(
    `SELECT mfa_secret FROM users WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user || !user.mfa_secret) {
    throw new Error('MFA secret not found for user');
  }

  // Verify TOTP token
  const isValid = verifyMFAToken(user.mfa_secret, token);

  if (!isValid) {
    return false;
  }

  // Token valid → MFA confirmed (already enabled in enableMFA)
  return true;
}

/**
 * Disable MFA for user
 * Removes secret and backup codes, sets mfa_enabled = FALSE
 *
 * @param userId - User UUID
 */
export async function disableMFA(userId: string): Promise<void> {
  await pool.query(
    `
    UPDATE users
    SET
      mfa_enabled = FALSE,
      mfa_secret = NULL,
      backup_codes = NULL,
      updated_at = NOW()
    WHERE id = $1
    `,
    [userId]
  );
}

/**
 * Check if user has MFA enabled
 *
 * @param userId - User UUID
 * @returns true if MFA enabled, false otherwise
 */
export async function isMFAEnabled(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT mfa_enabled FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0]?.mfa_enabled || false;
}

/**
 * Verify MFA token for user (TOTP or backup code)
 * Tries TOTP first, then backup codes if TOTP fails
 *
 * @param userId - User UUID
 * @param token - 6-digit TOTP code OR backup code (XXXX-XXXX)
 * @returns true if valid, false otherwise
 */
export async function verifyUserMFA(
  userId: string,
  token: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT mfa_secret, backup_codes FROM users WHERE id = $1 AND mfa_enabled = TRUE`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    return false; // MFA not enabled or user not found
  }

  // Try TOTP first (6 digits, no dash)
  if (/^\d{6}$/.test(token)) {
    const isValidTOTP = verifyMFAToken(user.mfa_secret, token);
    if (isValidTOTP) {
      return true;
    }
  }

  // Try backup code (XXXX-XXXX format)
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) {
    const backupCodeResult = await useBackupCode(userId, token);
    return backupCodeResult.valid;
  }

  return false;
}

/**
 * Use backup code (one-time use)
 * Verifies code and removes it from user's backup codes
 *
 * @param userId - User UUID
 * @param code - Backup code (XXXX-XXXX)
 * @returns { valid: boolean, remainingCodes: number }
 */
export async function useBackupCode(
  userId: string,
  code: string
): Promise<BackupCodeValidation> {
  const result = await pool.query(
    `SELECT backup_codes FROM users WHERE id = $1 AND mfa_enabled = TRUE`,
    [userId]
  );

  const user = result.rows[0];
  if (!user || !user.backup_codes) {
    return { valid: false, remainingCodes: 0 };
  }

  const hashedCodes: string[] = user.backup_codes;

  // Check each hashed backup code
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(code, hashedCodes[i]);

    if (isMatch) {
      // Remove used code
      const remainingCodes = hashedCodes.filter((_, index) => index !== i);

      // Update database
      await pool.query(
        `
        UPDATE users
        SET backup_codes = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [JSON.stringify(remainingCodes), userId]
      );

      return {
        valid: true,
        remainingCodes: remainingCodes.length,
      };
    }
  }

  // No match found
  return { valid: false, remainingCodes: hashedCodes.length };
}

/**
 * Regenerate backup codes for user
 * Replaces all existing backup codes with new ones
 *
 * @param userId - User UUID
 * @returns Plain backup codes (show to user once)
 */
export async function regenerateBackupCodes(
  userId: string
): Promise<string[]> {
  // Check if MFA is enabled
  const mfaEnabled = await isMFAEnabled(userId);
  if (!mfaEnabled) {
    throw new Error('MFA not enabled for user');
  }

  // Generate new codes
  const { plain, hashed } = await generateBackupCodes();

  // Store hashed codes
  await pool.query(
    `
    UPDATE users
    SET backup_codes = $1, updated_at = NOW()
    WHERE id = $2
    `,
    [JSON.stringify(hashed), userId]
  );

  return plain; // Return plain codes to show to user
}

/**
 * Get remaining backup codes count
 *
 * @param userId - User UUID
 * @returns Number of remaining backup codes
 */
export async function getRemainingBackupCodesCount(
  userId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT backup_codes FROM users WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user || !user.backup_codes) {
    return 0;
  }

  return user.backup_codes.length;
}
