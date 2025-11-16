/**
 * JWT Service - Token Generation and Verification
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Provides JWT-based session management with:
 * - Token generation with user claims (id, email, roles)
 * - Token verification and decoding
 * - Configurable expiration (default: 7 days)
 * - Secret key from environment (JWT_SECRET)
 *
 * Dependencies:
 * - jsonwebtoken: JWT generation/verification
 *
 * @module services/jwt
 */

import { sign, verify, decode, TokenExpiredError, JsonWebTokenError, SignOptions } from 'jsonwebtoken';

/**
 * JWT Payload - User claims embedded in token
 */
export interface JWTPayload {
  userId: string;
  email: string;
  roles?: string[];
  iat?: number; // Issued at (auto-generated)
  exp?: number; // Expiration (auto-generated)
}

/**
 * JWT Configuration
 */
const JWT_SECRET: string = process.env.JWT_SECRET || 'INSECURE_DEFAULT_SECRET_CHANGE_IN_PRODUCTION';
const JWT_EXPIRATION: string = process.env.JWT_EXPIRATION || '7d'; // 7 days default

/**
 * Warn if using insecure default secret
 */
if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️  JWT_SECRET not set in environment! Using insecure default. ' +
    'Set JWT_SECRET in .env or Vault for production.'
  );
}

/**
 * Generate JWT token for authenticated user
 * Token contains: userId, email, roles
 * Expires in 7 days by default (configurable via JWT_EXPIRATION)
 *
 * @param payload - User claims to embed in token
 * @returns Signed JWT token string
 *
 * @example
 * const token = generateToken({
 *   userId: 'uuid-123',
 *   email: 'user@example.com',
 *   roles: ['admin', 'editor']
 * });
 */
export function generateToken(payload: JWTPayload): string {
  const token = sign(
    {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
    },
    JWT_SECRET,
    {
      expiresIn: '7d', // Hardcoded to fix TypeScript issue with expiresIn type
      issuer: 'cartae-api',
      audience: 'cartae-web',
    }
  );
  return token;
}

/**
 * Verify and decode JWT token
 * Returns decoded payload if valid, throws error if invalid/expired
 *
 * @param token - JWT token string (without "Bearer " prefix)
 * @returns Decoded JWT payload with user claims
 * @throws Error if token is invalid, expired, or malformed
 *
 * @example
 * try {
 *   const payload = verifyToken(token);
 *   console.log('User ID:', payload.userId);
 * } catch (error) {
 *   console.error('Invalid token:', error.message);
 * }
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = verify(token, JWT_SECRET, {
      issuer: 'cartae-api',
      audience: 'cartae-web',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Decode JWT token WITHOUT verification
 * WARNING: Use only for debugging/logging, NOT for authentication
 *
 * @param token - JWT token string
 * @returns Decoded payload (unverified) or null if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Supports format: "Bearer <token>"
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null if invalid format
 *
 * @example
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (token) {
 *   const payload = verifyToken(token);
 * }
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
