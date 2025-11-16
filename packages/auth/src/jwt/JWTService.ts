/**
 * @cartae/auth - JWT Service
 * Génération et validation de JWT tokens (RS256)
 * Utilise RSA keys stockées dans HashiCorp Vault
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { generateKeyPairSync } from 'crypto';
import type { JWTPayload, TokenPair, JWTConfig, User, UserRole } from '../types';
import { InvalidTokenError, TokenExpiredError, AuthenticationError } from '../types';

export class JWTService {
  private privateKey: string;

  private publicKey: string;

  private config: JWTConfig;

  constructor(privateKey: string, publicKey: string, config?: Partial<JWTConfig>) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.config = {
      accessTokenExpiry: config?.accessTokenExpiry || '15m',
      refreshTokenExpiry: config?.refreshTokenExpiry || '7d',
      issuer: config?.issuer || 'cartae-auth',
      audience: config?.audience || 'cartae-api',
    };
  }

  /**
   * Génère une paire access + refresh tokens
   */
  generateTokenPair(user: User): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Calculer expiration (en secondes)
    const expiresIn = this.parseExpiry(this.config.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Génère un access token (courte durée: 15 min)
   */
  private generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: uuidv4(), // Unique ID pour blacklist
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.config.accessTokenExpiry,
      issuer: this.config.issuer,
      audience: this.config.audience,
    } as any);
  }

  /**
   * Génère un refresh token (longue durée: 7 jours)
   */
  private generateRefreshToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: uuidv4(),
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.config.refreshTokenExpiry,
      issuer: this.config.issuer,
      audience: this.config.audience,
    } as any);
  }

  /**
   * Valide et décode un token JWT
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Valide un access token
   */
  verifyAccessToken(token: string): JWTPayload {
    const payload = this.verifyToken(token);

    if (payload.type !== 'access') {
      throw new InvalidTokenError('Not an access token');
    }

    return payload;
  }

  /**
   * Valide un refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    const payload = this.verifyToken(token);

    if (payload.type !== 'refresh') {
      throw new InvalidTokenError('Not a refresh token');
    }

    return payload;
  }

  /**
   * Décode un token sans vérifier la signature (pour debug)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Extrait le JWT ID (jti) d'un token
   */
  getTokenId(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload?.jti || null;
  }

  /**
   * Parse expiry string ('15m', '7d') vers secondes
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * Vérifie si un token est expiré (sans valider la signature)
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Retourne la date d'expiration d'un token
   */
  getTokenExpiration(token: string): Date | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }
}

/**
 * Fonction helper pour générer une paire de clés RSA
 * (À utiliser lors du setup initial, clés stockées dans Vault)
 */
export function generateRSAKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { privateKey, publicKey };
}
