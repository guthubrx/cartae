/**
 * Tests unitaires pour TokenRefreshManager
 * Coverage cible : ≥85%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenRefreshManager } from '../TokenRefreshManager';
import type {
  ITokenRefreshStrategy,
  TokenType,
  TokenData,
} from '../../strategies/ITokenRefreshStrategy';

// Mock window.cartaeBrowserStorage
const mockBrowserStorage = {
  get: vi.fn(),
  set: vi.fn(),
};

beforeEach(() => {
  (global as any).window = {
    setInterval: vi.fn((fn, delay) => {
      return setTimeout(fn, delay); // Mock setInterval with setTimeout
    }),
    clearInterval: vi.fn(id => clearTimeout(id)),
  };
  (window as any).cartaeBrowserStorage = mockBrowserStorage;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock Strategy qui réussit toujours
class MockSuccessStrategy implements ITokenRefreshStrategy {
  name = 'MockSuccess';

  canRefresh(tokenType: TokenType): boolean {
    return true;
  }

  async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
    return {
      accessToken: `new-${tokenType}-token`,
      refreshToken: refreshToken || null,
      expiresIn: 3599,
      capturedAt: new Date().toISOString(),
    };
  }
}

// Mock Strategy qui échoue toujours
class MockFailStrategy implements ITokenRefreshStrategy {
  name = 'MockFail';

  canRefresh(tokenType: TokenType): boolean {
    return true;
  }

  async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
    throw new Error('MockFail: Refresh failed');
  }
}

// Mock Strategy avec canRefresh sélectif
class MockSelectiveStrategy implements ITokenRefreshStrategy {
  name = 'MockSelective';

  canRefresh(tokenType: TokenType): boolean {
    return tokenType === 'owa' || tokenType === 'graph';
  }

  async refresh(tokenType: TokenType, refreshToken: string | null): Promise<TokenData> {
    return {
      accessToken: `selective-${tokenType}-token`,
      refreshToken: null,
      expiresIn: 3599,
      capturedAt: new Date().toISOString(),
    };
  }
}

describe('TokenRefreshManager', () => {
  describe('constructor', () => {
    it('doit initialiser avec les stratégies fournies', () => {
      const strategy1 = new MockSuccessStrategy();
      const strategy2 = new MockFailStrategy();

      const manager = new TokenRefreshManager([strategy1, strategy2]);

      expect(manager).toBeDefined();
    });

    it('doit afficher log avec nombre de stratégies', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const strategies = [new MockSuccessStrategy(), new MockFailStrategy()];

      new TokenRefreshManager(strategies);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 stratégies'),
        expect.any(String)
      );
    });
  });

  describe('startMonitoring', () => {
    it('doit charger les tokens existants au démarrage', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(mockBrowserStorage.get).toHaveBeenCalled();
      expect(manager.hasTokens()).toBe(true);
    });

    it('doit démarrer un intervalle de monitoring (30s)', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });

  describe('stopMonitoring', () => {
    it("doit arrêter l'intervalle de monitoring", async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();
      manager.stopMonitoring();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('doit retourner le token si disponible et non expiré', async () => {
      const capturedAt = new Date();
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const token = await manager.getToken('owa');

      expect(token).toBe('owa-token-123');
    });

    it('doit retourner null si token non disponible', async () => {
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const token = await manager.getToken('owa');

      expect(token).toBeNull();
    });

    it('doit auto-refresh si token expiré (< 5 min restantes)', async () => {
      const capturedAt = new Date(Date.now() - 3595 * 1000); // Capturé il y a ~59m55s
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-old-token',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const token = await manager.getToken('owa');

      expect(mockBrowserStorage.set).toHaveBeenCalled();
      expect(token).toBe('new-owa-token'); // Token rafraîchi
    });
  });

  describe('refreshToken (via getToken)', () => {
    it("doit essayer chaque stratégie dans l'ordre jusqu'à succès", async () => {
      const capturedAt = new Date(Date.now() - 3595 * 1000);
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-old-token',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
      });

      const failStrategy = new MockFailStrategy();
      const successStrategy = new MockSuccessStrategy();

      const manager = new TokenRefreshManager([failStrategy, successStrategy]);
      await manager.startMonitoring();

      const token = await manager.getToken('owa');

      expect(token).toBe('new-owa-token'); // Succès avec 2ème stratégie
    });

    it('doit skip les stratégies qui ne supportent pas le tokenType', async () => {
      const capturedAt = new Date(Date.now() - 3595 * 1000);
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-teams': 'teams-old-token',
        'cartae-o365-token-teams-refresh': 'teams-refresh-123',
        'cartae-o365-token-teams-expires-in': 3599,
        'cartae-o365-token-teams-captured-at': capturedAt.toISOString(),
      });

      const selectiveStrategy = new MockSelectiveStrategy(); // Ne supporte QUE owa/graph
      const successStrategy = new MockSuccessStrategy(); // Supporte tout

      const manager = new TokenRefreshManager([selectiveStrategy, successStrategy]);
      await manager.startMonitoring();

      const token = await manager.getToken('teams');

      expect(token).toBe('new-teams-token'); // Succès avec 2ème stratégie
    });

    it('doit throw si toutes les stratégies échouent', async () => {
      const capturedAt = new Date(Date.now() - 3595 * 1000);
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-old-token',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
      });

      const manager = new TokenRefreshManager([new MockFailStrategy()]);
      await manager.startMonitoring();

      await expect(manager.getToken('owa')).rejects.toThrow('toutes stratégies échouées');
    });

    it('doit persister le nouveau token dans browser.storage', async () => {
      const capturedAt = new Date(Date.now() - 3595 * 1000);
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-old-token',
        'cartae-o365-token-owa-refresh': 'owa-refresh-123',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      await manager.getToken('owa');

      expect(mockBrowserStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'cartae-o365-token-owa': 'new-owa-token',
        })
      );
    });
  });

  describe('hasTokens', () => {
    it('doit retourner true si au moins un token chargé', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(manager.hasTokens()).toBe(true);
    });

    it('doit retourner false si aucun token chargé', async () => {
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(manager.hasTokens()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('doit retourner true si hasTokens() est true', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(manager.isAuthenticated()).toBe(true);
    });
  });

  describe('getAccessToken', () => {
    it('doit retourner le token OWA', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
        'cartae-o365-token-owa-expires-in': 3599,
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const token = await manager.getAccessToken();

      expect(token).toBe('owa-token-123');
    });

    it('doit throw si token OWA non disponible', async () => {
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      await expect(manager.getAccessToken()).rejects.toThrow('Token OWA non disponible');
    });
  });

  describe('checkTokenExpiration', () => {
    it('doit retourner hasToken=false si token absent', async () => {
      mockBrowserStorage.get.mockResolvedValue({});

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const status = manager.checkTokenExpiration('owa');

      expect(status).toEqual({
        hasToken: false,
        isExpired: true,
        shouldRefresh: true,
      });
    });

    it('doit retourner isExpired=true si token expiré', async () => {
      const capturedAt = new Date(Date.now() - 3600 * 1000); // 1 heure dans le passé
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
        'cartae-o365-token-owa-expires-in': 3599,
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const status = manager.checkTokenExpiration('owa');

      expect(status.hasToken).toBe(true);
      expect(status.isExpired).toBe(true);
    });

    it('doit retourner shouldRefresh=true si < 10 minutes restantes', async () => {
      const capturedAt = new Date(Date.now() - 3000 * 1000); // 50 minutes dans le passé
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-owa-captured-at': capturedAt.toISOString(),
        'cartae-o365-token-owa-expires-in': 3599,
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const status = manager.checkTokenExpiration('owa');

      expect(status.shouldRefresh).toBe(true);
    });
  });

  describe('getAllTokens', () => {
    it('doit retourner une copie de tous les tokens', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
        'cartae-o365-token-graph': 'graph-token-456',
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      const tokens = manager.getAllTokens();

      expect(tokens.size).toBe(2);
      expect(tokens.has('owa')).toBe(true);
      expect(tokens.has('graph')).toBe(true);
    });
  });

  describe('logout', () => {
    it('doit vider le cache local', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(manager.hasTokens()).toBe(true);

      await manager.logout();

      expect(manager.hasTokens()).toBe(false);
    });

    it('doit nettoyer browser.storage', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'owa-token-123',
      });

      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      await manager.logout();

      expect(mockBrowserStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'cartae-o365-token-owa': null,
          'cartae-o365-token-graph': null,
        })
      );
    });
  });

  describe('loadTokensFromStorage - edge cases', () => {
    it("doit gérer l'absence de window.cartaeBrowserStorage", async () => {
      (window as any).cartaeBrowserStorage = undefined;

      const consoleSpy = vi.spyOn(console, 'warn');
      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Extension Firefox non chargée')
      );
    });

    it('doit gérer les erreurs de lecture storage', async () => {
      mockBrowserStorage.get.mockRejectedValue(new Error('Storage read failed'));

      const consoleSpy = vi.spyOn(console, 'error');
      const manager = new TokenRefreshManager([new MockSuccessStrategy()]);
      await manager.startMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur chargement tokens'),
        expect.any(Error)
      );
    });
  });
});
