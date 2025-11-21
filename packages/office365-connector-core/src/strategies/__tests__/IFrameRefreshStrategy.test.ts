/**
 * Tests unitaires pour IFrameRefreshStrategy
 * Coverage cible : ≥85%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IFrameRefreshStrategy } from '../IFrameRefreshStrategy';

// Mock DOM APIs
const mockBrowserStorage = {
  get: vi.fn(),
};

beforeEach(() => {
  // Setup DOM
  (global as any).document = {
    createElement: vi.fn((tag: string) => {
      const element = {
        style: {},
        src: '',
        remove: vi.fn(),
      };
      return element;
    }),
    body: {
      appendChild: vi.fn(),
    },
  };

  (global as any).window = {};
  (window as any).cartaeBrowserStorage = mockBrowserStorage;

  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IFrameRefreshStrategy', () => {
  describe('name', () => {
    it('doit avoir le nom "IFrameRefresh"', () => {
      const strategy = new IFrameRefreshStrategy();
      expect(strategy.name).toBe('IFrameRefresh');
    });
  });

  describe('canRefresh', () => {
    it('doit supporter OWA', () => {
      const strategy = new IFrameRefreshStrategy();
      expect(strategy.canRefresh('owa')).toBe(true);
    });

    it('doit supporter Graph', () => {
      const strategy = new IFrameRefreshStrategy();
      expect(strategy.canRefresh('graph')).toBe(true);
    });

    it('ne doit PAS supporter Teams', () => {
      const strategy = new IFrameRefreshStrategy();
      expect(strategy.canRefresh('teams')).toBe(false);
    });

    it('ne doit PAS supporter SharePoint', () => {
      const strategy = new IFrameRefreshStrategy();
      expect(strategy.canRefresh('sharepoint')).toBe(false);
    });
  });

  describe('refresh', () => {
    it('doit créer un iframe caché pointant vers outlook.office365.com', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'old-token',
        'cartae-o365-token-owa-refresh': 'refresh-token',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
      });

      const strategy = new IFrameRefreshStrategy();

      // Mock setTimeout pour accélérer le test
      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');

      // Fast-forward 5 secondes
      vi.advanceTimersByTime(5000);

      await refreshPromise;

      expect(document.createElement).toHaveBeenCalledWith('iframe');
      expect(document.body.appendChild).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('doit attendre 5 secondes pour la capture de token', async () => {
      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'new-token-captured',
        'cartae-o365-token-owa-refresh': 'refresh-token',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
      });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');

      // Avancer de 4 secondes (pas encore fini)
      vi.advanceTimersByTime(4000);
      // Normalement le promise n'est pas résolu encore, mais on peut pas tester ça facilement

      // Avancer du dernier second
      vi.advanceTimersByTime(1000);

      const result = await refreshPromise;

      expect(result.accessToken).toBe('new-token-captured');

      vi.useRealTimers();
    });

    it('doit retourner le nouveau token capturé', async () => {
      const capturedAt = new Date().toISOString();
      mockBrowserStorage.get
        .mockResolvedValueOnce({
          // Avant refresh
          'cartae-o365-token-owa': 'old-token',
        })
        .mockResolvedValueOnce({
          // Après refresh
          'cartae-o365-token-owa': 'new-token-123',
          'cartae-o365-token-owa-refresh': 'new-refresh-123',
          'cartae-o365-token-owa-expires-in': 3599,
          'cartae-o365-token-owa-captured-at': capturedAt,
        });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'old-refresh');
      vi.advanceTimersByTime(5000);

      const result = await refreshPromise;

      expect(result).toEqual({
        accessToken: 'new-token-123',
        refreshToken: 'new-refresh-123',
        expiresIn: 3599,
        capturedAt,
      });

      vi.useRealTimers();
    });

    it("doit cleanup l'iframe après la capture", async () => {
      const mockIframe = {
        style: {},
        src: '',
        remove: vi.fn(),
      };

      (document.createElement as any).mockReturnValue(mockIframe);

      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'new-token',
        'cartae-o365-token-owa-refresh': 'refresh-token',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
      });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');
      vi.advanceTimersByTime(5000);

      await refreshPromise;

      expect(mockIframe.remove).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('doit throw si extension non disponible', async () => {
      (window as any).cartaeBrowserStorage = undefined;

      const strategy = new IFrameRefreshStrategy();

      await expect(strategy.refresh('owa', 'refresh-token')).rejects.toThrow(
        'Extension Office365 non disponible'
      );
    });

    it('doit throw si aucun token capturé après refresh', async () => {
      mockBrowserStorage.get
        .mockResolvedValueOnce({
          // Avant refresh
          'cartae-o365-token-owa': 'old-token',
        })
        .mockResolvedValueOnce({
          // Après refresh - AUCUN token
          'cartae-o365-token-owa': null,
        });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');
      vi.advanceTimersByTime(5000);

      await expect(refreshPromise).rejects.toThrow('Aucun token owa capturé après refresh');

      vi.useRealTimers();
    });

    it('doit logger un warning si token inchangé après refresh', async () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      mockBrowserStorage.get.mockResolvedValue({
        'cartae-o365-token-owa': 'same-token',
        'cartae-o365-token-owa-refresh': 'refresh-token',
        'cartae-o365-token-owa-expires-in': 3599,
        'cartae-o365-token-owa-captured-at': new Date().toISOString(),
      });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');
      vi.advanceTimersByTime(5000);

      await refreshPromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token owa inchangé après refresh')
      );

      vi.useRealTimers();
    });

    it('doit fonctionner pour Graph token', async () => {
      const capturedAt = new Date().toISOString();
      mockBrowserStorage.get
        .mockResolvedValueOnce({
          'cartae-o365-token-graph': 'old-graph-token',
        })
        .mockResolvedValueOnce({
          'cartae-o365-token-graph': 'new-graph-token',
          'cartae-o365-token-graph-refresh': null,
          'cartae-o365-token-graph-expires-in': 3599,
          'cartae-o365-token-graph-captured-at': capturedAt,
        });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('graph', null);
      vi.advanceTimersByTime(5000);

      const result = await refreshPromise;

      expect(result.accessToken).toBe('new-graph-token');

      vi.useRealTimers();
    });

    it('doit gérer les erreurs de lecture storage', async () => {
      mockBrowserStorage.get.mockRejectedValue(new Error('Storage read failed'));

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');
      vi.advanceTimersByTime(5000);

      await expect(refreshPromise).rejects.toThrow('Storage read failed');

      vi.useRealTimers();
    });

    it('doit utiliser valeurs par défaut si expiresIn/capturedAt absents', async () => {
      mockBrowserStorage.get
        .mockResolvedValueOnce({
          'cartae-o365-token-owa': 'old-token',
        })
        .mockResolvedValueOnce({
          'cartae-o365-token-owa': 'new-token',
          // Pas de refresh, expiresIn, capturedAt
        });

      const strategy = new IFrameRefreshStrategy();

      vi.useFakeTimers();
      const refreshPromise = strategy.refresh('owa', 'refresh-token');
      vi.advanceTimersByTime(5000);

      const result = await refreshPromise;

      expect(result.refreshToken).toBeNull();
      expect(result.expiresIn).toBe(3599);
      expect(result.capturedAt).toBeDefined();

      vi.useRealTimers();
    });
  });
});
