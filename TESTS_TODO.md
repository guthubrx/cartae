# Tests Session 129 - Hybrid Storage

**Issue pour tracking Phase 5 (3% restant)**

## 📋 Contexte

Session 129 implémente l'architecture Hybrid Storage (IndexedDB + PostgreSQL) avec 2648 LOC sur 5 phases :

- ✅ Phase 1-4 : Complètes (97%)
- ❌ Phase 5 : Tests unitaires (3% restant, ~200 LOC)

**Commit principal :** `5c99d74` - feat(sources): Session 129 - Hybrid Storage IndexedDB + PostgreSQL

---

## ❌ Tests Manquants

### 1. HybridStorage.ts Tests (~80 LOC)

**Fichier :** `packages/core/src/sources/storage/__tests__/HybridStorage.test.ts`

**À tester :**
- ✅ Cache-first read strategy (IndexedDB → PostgreSQL fallback)
- ✅ Double-write (IndexedDB + PostgreSQL simultané)
- ✅ Offline queue (enqueue quand offline, process quand online)
- ✅ Optimistic locking (version mismatch → conflict)
- ✅ Conflict resolution (last-write-wins accepted/rejected)
- ✅ Connectivity listeners (online/offline events)
- ✅ Timer sync automatique (processPendingQueue toutes les 30s)
- ✅ Retry logic (max 3 retries sur erreur)

**Exemple test :**
```typescript
describe('HybridStorage', () => {
  it('should read from cache first', async () => {
    const mockIndexedDB = { getSource: vi.fn().mockResolvedValue(mockSource) };
    const mockAPIClient = { getSource: vi.fn() };

    const storage = new HybridStorage({ apiClient: mockAPIClient });
    storage['indexedDB'] = mockIndexedDB;

    const result = await storage.getSource('source-123');

    expect(mockIndexedDB.getSource).toHaveBeenCalledWith('source-123');
    expect(mockAPIClient.getSource).toHaveBeenCalled(); // Fetch server anyway
    expect(result).toEqual(mockSource);
  });

  it('should enqueue operations when offline', async () => {
    const storage = new HybridStorage({ apiClient: mockAPIClient, forceOffline: true });

    await storage.saveSource(mockSource);

    const queueStatus = storage.getQueueStatus();
    expect(queueStatus.pending).toBe(1);
  });
});
```

---

### 2. SourcesAPIClient.ts Tests (~60 LOC)

**Fichier :** `packages/core/src/sources/storage/__tests__/SourcesAPIClient.test.ts`

**À tester :**
- ✅ CRUD sources (GET, POST, PUT, DELETE)
- ✅ JWT authentication header
- ✅ Timeout handling (AbortController)
- ✅ HTTP error handling (404, 409, 500)
- ✅ Optimistic locking conflict (409 response)
- ✅ Sync history endpoints
- ✅ Queue endpoints

**Exemple test :**
```typescript
describe('SourcesAPIClient', () => {
  it('should handle 409 conflict on update', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Conflict detected',
        conflict: {
          detected: true,
          resolution: 'last_write_wins_rejected',
          currentVersion: 5,
          serverData: { ...mockSource, version: 5 },
        },
      }),
    });

    global.fetch = mockFetch;

    const client = new SourcesAPIClient({ baseUrl: 'http://localhost', getAuthToken: async () => 'token' });
    const result = await client.updateSource(mockSource, 4);

    expect(result.success).toBe(false);
    expect(result.conflict?.detected).toBe(true);
    expect(result.conflict?.currentVersion).toBe(5);
  });
});
```

---

### 3. Backend Routes Tests (~40 LOC)

**Fichier :** `packages/database-api/src/api/routes/__tests__/sources.test.ts`

**À tester :**
- ✅ GET /api/sources (RLS isolation)
- ✅ POST /api/sources (création)
- ✅ PUT /api/sources/:id (optimistic locking)
- ✅ DELETE /api/sources/:id
- ✅ GET /api/sync-queue?status=pending
- ✅ POST /api/sync-queue/:id/process
- ✅ RLS middleware (user_id filtering)

**Exemple test :**
```typescript
describe('Sources Routes', () => {
  it('should return only user-owned sources', async () => {
    const response = await request(app)
      .get('/api/sources')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(200);
    expect(response.body.sources).toHaveLength(2);
    expect(response.body.sources.every(s => s.userId === 'user-id')).toBe(true);
  });
});
```

---

### 4. Sync Worker Tests (~20 LOC)

**Fichier :** `packages/database-api/src/workers/__tests__/syncWorker.test.ts`

**À tester :**
- ✅ Timer périodique (checkAndSyncSources toutes les 60s)
- ✅ Concurrence limitée (max 5 syncs simultanés)
- ✅ Query sources avec `auto_sync = TRUE` et `next_sync_at <= NOW()`
- ✅ Error handling (retry logic)

**Exemple test :**
```typescript
describe('SyncWorker', () => {
  it('should limit concurrent syncs to maxConcurrentSyncs', async () => {
    const worker = new SyncWorker({ maxConcurrentSyncs: 2 });

    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: Array(5).fill(mockSource), // 5 sources à sync
      }),
    };

    await worker['checkAndSyncSources']();

    expect(worker['activeSyncs'].size).toBe(2); // Seulement 2 lancés
  });
});
```

---

## 🛠️ Setup Tests

### Installation dépendances

```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

### Configuration vitest

`packages/core/vitest.config.ts` :
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/sources/storage/__tests__/setup.ts'],
  },
});
```

---

## 📊 Checklist Completion

- [ ] HybridStorage.test.ts (~80 LOC)
  - [ ] Cache-first read
  - [ ] Double-write
  - [ ] Offline queue
  - [ ] Optimistic locking
  - [ ] Conflict resolution
  - [ ] Connectivity listeners
  - [ ] Timer sync
  - [ ] Retry logic

- [ ] SourcesAPIClient.test.ts (~60 LOC)
  - [ ] CRUD endpoints
  - [ ] JWT auth
  - [ ] Timeout handling
  - [ ] HTTP errors
  - [ ] Conflict handling

- [ ] sources.test.ts (backend) (~40 LOC)
  - [ ] RLS isolation
  - [ ] CRUD routes
  - [ ] Queue endpoints

- [ ] syncWorker.test.ts (~20 LOC)
  - [ ] Timer périodique
  - [ ] Concurrence limitée

---

## 🎯 Estimation

- **Durée :** ~1-2h
- **LOC :** ~200 LOC
- **Priorité :** Moyenne (fonctionnalités testées manuellement)

---

## 📝 Notes

- Tests non-critiques pour merge (architecture testée manuellement)
- Peut être fait en parallèle du développement suivant
- Consider TDD pour futures sessions similaires
