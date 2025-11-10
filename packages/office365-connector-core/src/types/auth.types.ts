/**
 * Types pour l'authentification Office 365
 */

export interface TokenData {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  capturedAt: string; // ISO timestamp
  scope?: string;
}

