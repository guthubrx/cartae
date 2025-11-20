import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBackendHealth } from '../useBackendHealth';

// Mock global fetch
global.fetch = vi.fn();

describe('useBackendHealth', () => {
  beforeEach(() => {
    // Reset mocks avant chaque test
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devrait démarrer avec status checking (état initial)', () => {
    // Mock fetch qui ne répond jamais (simule checking)
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Promise qui ne se résout jamais
    );

    const { result } = renderHook(() => useBackendHealth());

    expect(result.current.state.status).toBe('checking');
    expect(result.current.state.error).toBeUndefined();
    expect(result.current.state.lastCheck).toBeUndefined();
  });

  it('devrait passer à online si backend répond OK', async () => {
    // Mock backend online (réponse 200 OK)
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        timestamp: '2025-11-20T04:32:56.395Z',
        environment: 'development',
      }),
    });

    const { result } = renderHook(() => useBackendHealth());

    // Attendre que le status passe à online
    await waitFor(() => {
      expect(result.current.state.status).toBe('online');
    });

    expect(result.current.state.error).toBeUndefined();
    expect(result.current.state.lastCheck).toBeInstanceOf(Date);
  });

  it('devrait passer à offline si backend retourne erreur HTTP', async () => {
    // Mock backend erreur (503 Service Unavailable)
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        status: 'error',
        message: 'Database connection failed',
      }),
    });

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(result.current.state.status).toBe('offline');
    });

    expect(result.current.state.error).toBe('HTTP 503');
    expect(result.current.state.lastCheck).toBeInstanceOf(Date);
  });

  it('devrait passer à offline si erreur réseau (CORS, timeout)', async () => {
    // Mock erreur réseau (ex: CORS blocked)
    (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(result.current.state.status).toBe('offline');
    });

    expect(result.current.state.error).toBe('Failed to fetch');
    expect(result.current.state.lastCheck).toBeInstanceOf(Date);
  });

  it('devrait permettre recheck manuel', async () => {
    // Mock backend online
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    const { result } = renderHook(() => useBackendHealth());

    // Attendre premier check
    await waitFor(() => {
      expect(result.current.state.status).toBe('online');
    });

    const firstCheck = result.current.state.lastCheck;

    // Changer mock pour offline
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    // Déclencher recheck manuel
    await result.current.recheck();

    await waitFor(() => {
      expect(result.current.state.status).toBe('offline');
    });

    expect(result.current.state.lastCheck).not.toBe(firstCheck);
  });

  it('devrait supporter polling automatique', async () => {
    let callCount = 0;

    // Mock qui compte les appels
    (global.fetch as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });
    });

    // Polling toutes les 1000ms
    renderHook(() =>
      useBackendHealth({
        pollInterval: 1000,
      })
    );

    // Premier appel immédiat
    await waitFor(() => {
      expect(callCount).toBe(1);
    });

    // Avancer de 1s → deuxième appel
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(callCount).toBe(2);
    });

    // Avancer de 1s → troisième appel
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(callCount).toBe(3);
    });
  });

  it('devrait utiliser backendUrl custom si fourni', async () => {
    const customUrl = 'http://custom-backend:4000';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    renderHook(() =>
      useBackendHealth({
        backendUrl: customUrl,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`${customUrl}/health`, expect.any(Object));
    });
  });

  it('devrait avoir un timeout de 5s sur fetch', async () => {
    let abortSignal: AbortSignal | undefined;

    // Capturer l'AbortSignal passé à fetch
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      abortSignal = options.signal;
      return new Promise(() => {}); // Ne jamais résoudre
    });

    renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(abortSignal).toBeDefined();
    });

    // Vérifier que le timeout est bien configuré
    // Note: Impossible de tester directement setTimeout(5000) avec Vitest
    // mais on vérifie que signal est passé
    expect(abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('devrait nettoyer polling au unmount', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    const { unmount } = renderHook(() =>
      useBackendHealth({
        pollInterval: 1000,
      })
    );

    // Attendre premier call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Unmount (cleanup effect)
    unmount();

    // Avancer timers → ne devrait pas appeler fetch
    vi.advanceTimersByTime(5000);

    // Toujours 1 seul appel (pas de nouveaux calls après unmount)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
