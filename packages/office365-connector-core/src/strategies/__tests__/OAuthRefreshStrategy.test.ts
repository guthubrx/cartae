/**
 * Tests unitaires pour OAuthRefreshStrategy
 * Coverage cible : ≥85%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthRefreshStrategy } from '../OAuthRefreshStrategy';

// Mock fetch global
const mockFetch = vi.fn();

beforeEach(() => {
  (global as any).fetch = mockFetch;
  (global as any).window = {
    location: {
      hostname: 'localhost',
    },
  };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OAuthRefreshStrategy', () => {
  describe('name', () => {
    it('doit avoir le nom "OAuthRefresh"', () => {
      const strategy = new OAuthRefreshStrategy();
      expect(strategy.name).toBe('OAuthRefresh');
    });
  });

  describe('canRefresh', () => {
    it('doit supporter tous les types de tokens', () => {
      const strategy = new OAuthRefreshStrategy();

      expect(strategy.canRefresh('owa')).toBe(true);
      expect(strategy.canRefresh('graph')).toBe(true);
      expect(strategy.canRefresh('teams')).toBe(true);
      expect(strategy.canRefresh('sharepoint')).toBe(true);
    });
  });

  describe('refresh', () => {
    it('doit throw si refresh_token manquant', async () => {
      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', null)).rejects.toThrow(
        'Refresh token manquant pour owa'
      );
    });

    it('doit appeler le backend avec le refresh_token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      });

      const strategy = new OAuthRefreshStrategy();

      await strategy.refresh('owa', 'my-refresh-token');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/office365/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'my-refresh-token',
          tokenType: 'owa',
        }),
      });
    });

    it('doit utiliser localhost:3001 en dev', async () => {
      window.location.hostname = 'localhost';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      await strategy.refresh('owa', 'refresh-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3001'),
        expect.any(Object)
      );
    });

    it('doit utiliser api.cartae.com en production', async () => {
      window.location.hostname = 'cartae.com';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      await strategy.refresh('owa', 'refresh-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.cartae.com'),
        expect.any(Object)
      );
    });

    it('doit retourner les nouvelles données du token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-access-token-123',
          refreshToken: 'new-refresh-token-456',
        }),
      });

      const strategy = new OAuthRefreshStrategy();

      const result = await strategy.refresh('owa', 'old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-456',
        expiresIn: 3599,
        capturedAt: expect.any(String),
      });
    });

    it('doit throw si backend retourne HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', 'refresh-token')).rejects.toThrow(
        'Backend refresh failed (500): Internal Server Error'
      );
    });

    it('doit throw si backend retourne success=false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid refresh token',
        }),
      });

      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', 'bad-refresh-token')).rejects.toThrow(
        'OAuth refresh échoué: Invalid refresh token'
      );
    });

    it('doit throw avec message requiresReauth si refresh_token expiré', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          requiresReauth: true,
        }),
      });

      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', 'expired-refresh-token')).rejects.toThrow(
        'Refresh token expiré pour owa'
      );

      await expect(strategy.refresh('owa', 'expired-refresh-token')).rejects.toThrow(
        'Re-connexion Office365 requise'
      );
    });

    it('doit gérer les erreurs réseau (fetch throw)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', 'refresh-token')).rejects.toThrow('Network error');
    });

    it('doit gérer les erreurs inconnues (non-Error)', async () => {
      mockFetch.mockRejectedValue('Something weird happened');

      const strategy = new OAuthRefreshStrategy();

      await expect(strategy.refresh('owa', 'refresh-token')).rejects.toThrow(
        'Erreur inconnue lors du refresh OAuth: Something weird happened'
      );
    });

    it('doit logger les étapes de refresh', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      await strategy.refresh('owa', 'refresh-token-xyz');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Refresh owa via OAuth'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Refresh token disponible pour owa')
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token owa rafraîchi via OAuth')
      );
    });

    it('doit logger les erreurs', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      mockFetch.mockRejectedValue(new Error('Backend down'));

      const strategy = new OAuthRefreshStrategy();

      try {
        await strategy.refresh('owa', 'refresh-token');
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur OAuth refresh'),
        expect.any(String)
      );
    });

    it('doit fonctionner pour tous les types de tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();

      const types: Array<'owa' | 'graph' | 'teams' | 'sharepoint'> = [
        'owa',
        'graph',
        'teams',
        'sharepoint',
      ];

      for (const type of types) {
        const result = await strategy.refresh(type, 'refresh-token');
        expect(result.accessToken).toBe('new-token');
      }
    });

    it('doit masquer une partie du refresh_token dans les logs (sécurité)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      const longRefreshToken = 'very-long-refresh-token-that-should-be-truncated-for-logs';

      await strategy.refresh('owa', longRefreshToken);

      // Vérifie qu'on log seulement les premiers 20 caractères
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('very-long-refresh-to'));

      // Vérifie qu'on ne log PAS le token complet
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(longRefreshToken));
    });

    it('doit utiliser expiresIn=3599 (1 heure standard Microsoft)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      const result = await strategy.refresh('owa', 'refresh-token');

      expect(result.expiresIn).toBe(3599);
    });

    it('doit retourner capturedAt avec timestamp actuel', async () => {
      const beforeTime = new Date().toISOString();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        }),
      });

      const strategy = new OAuthRefreshStrategy();
      const result = await strategy.refresh('owa', 'refresh-token');

      const afterTime = new Date().toISOString();

      expect(result.capturedAt).toBeDefined();
      expect(result.capturedAt >= beforeTime).toBe(true);
      expect(result.capturedAt <= afterTime).toBe(true);
    });
  });
});
