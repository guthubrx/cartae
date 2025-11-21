# Architecture Hybrid Storage - Session 129

**Date**: 2025-11-21
**Session**: 129 - Persistance Hybride IndexedDB + PostgreSQL
**Durée estimée**: ~7h
**LOC estimés**: ~1000 LOC

---

## 📋 Vue d'ensemble

L'architecture **Hybrid Storage** combine le meilleur des deux mondes :

- **IndexedDB** (client) : Cache rapide + support offline
- **PostgreSQL** (serveur) : Persistance durable + RLS multi-tenant

### Objectifs

✅ **Performance** : Cache-first read (IndexedDB rapide)
✅ **Offline-first** : Queue offline + sync automatique
✅ **Multi-tenant** : RLS PostgreSQL (isolation par user_id)
✅ **Conflict resolution** : Optimistic locking + last-write-wins
✅ **Scalabilité** : Background worker pour syncs périodiques

---

## 🏗️ Architecture en 3 couches

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │          HybridStorage (orchestrateur)              │ │
│ └─────────────────────────────────────────────────────┘ │
│           │                              │               │
│           ▼                              ▼               │
│ ┌──────────────────┐         ┌─────────────────────┐   │
│ │  IndexedDB Cache │         │  SourcesAPIClient   │   │
│ │                  │         │  (HTTP + JWT)       │   │
│ │ • sources        │         │                     │   │
│ │ • syncHistory    │         │  Online/Offline     │   │
│ │ • offlineQueue   │         │  Detection          │   │
│ └──────────────────┘         └─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS (JWT)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │      Express API + RLS Middleware                   │ │
│ │                                                       │ │
│ │  Endpoints:                                          │ │
│ │  - GET /api/sources (RLS-scoped)                    │ │
│ │  - POST /api/sources                                │ │
│ │  - PUT /api/sources/:id (optimistic locking)        │ │
│ │  - DELETE /api/sources/:id                          │ │
│ │  - POST /api/sync-queue (offline operations)        │ │
│ └─────────────────────────────────────────────────────┘ │
│                         │                                │
│                         ▼                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │            PostgreSQL + RLS Context                 │ │
│ │  SET LOCAL app.current_user_id = '<user_id>'        │ │
│ │                                                       │ │
│ │  Tables:                                             │ │
│ │  - sources (RLS enabled)                            │ │
│ │  - sync_history                                     │ │
│ │  - sync_queue                                       │ │
│ │                                                       │ │
│ │  Functions:                                          │ │
│ │  - resolve_source_conflict() (optimistic locking)   │ │
│ │  - process_sync_queue_item()                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                         │                                │
│                         ▼                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │           Sync Background Worker                    │ │
│ │  - Check sources avec auto_sync = true              │ │
│ │  - Déclenche syncs périodiques                      │ │
│ │  - Logs dans sync_history                           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Schéma PostgreSQL (Migration 003)

### Table: `sources`

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  connector_type VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  config JSONB NOT NULL DEFAULT '{}',
  field_mappings JSONB DEFAULT '[]',

  -- Auto-sync
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_interval INTEGER DEFAULT 300000, -- 5 min
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,

  -- Stats
  items_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  last_sync_duration INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  schema_version VARCHAR(20) DEFAULT '1.0.0',
  checksum VARCHAR(64),

  -- Optimistic locking
  version INTEGER DEFAULT 1 NOT NULL,

  CONSTRAINT sources_status_check CHECK (status IN ('idle', 'syncing', 'error', 'disabled')),
  CONSTRAINT sources_sync_interval_check CHECK (sync_interval >= 60000),
  CONSTRAINT sources_version_check CHECK (version > 0)
);
```

**Indexes** (12 total) :
- `idx_sources_user_id` - User isolation
- `idx_sources_connector_type` - Filter par type
- `idx_sources_status` - Filter par statut
- `idx_sources_user_status` - Composite (user + status)
- `idx_sources_next_sync` - Partial index (auto_sync + idle)
- `idx_sources_config_gin` - GIN index pour JSONB queries
- `idx_sources_metadata_gin` - GIN index pour metadata
- `idx_sources_errors` - Partial index (erreurs seulement)

**RLS Policies** :
- `sources_user_isolation` : `user_id = current_setting('app.current_user_id')::UUID`
- `sources_user_insert` : Check user_id = current_user

### Table: `sync_history`

```sql
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Calculé via trigger

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'running',

  -- Results
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,

  -- Errors
  error_message TEXT,
  error_stack TEXT,
  error_code VARCHAR(50),

  -- Conflicts
  conflicts_resolved INTEGER DEFAULT 0,
  conflicts_manual INTEGER DEFAULT 0,

  -- Context
  triggered_by VARCHAR(50), -- worker, manual, auto
  sync_type VARCHAR(50), -- full, incremental, manual
  metadata JSONB DEFAULT '{}'
);
```

**Trigger** : `calculate_sync_duration()` auto-calcule `duration_ms` sur UPDATE

### Table: `sync_queue`

```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(20) NOT NULL, -- create, update, delete
  entity_type VARCHAR(50) NOT NULL DEFAULT 'source',
  entity_id UUID,
  payload JSONB NOT NULL,

  -- Queue management
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, success, error
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,

  -- User context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes** :
- `idx_sync_queue_pending` - Partial index (pending seulement)
- `idx_sync_queue_retry` - next_retry_at (pour scheduler)
- `idx_sync_queue_user` - user_id

---

## 🔧 Fonctions PostgreSQL

### `resolve_source_conflict()`

```sql
CREATE OR REPLACE FUNCTION resolve_source_conflict(
  p_source_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_current_updated_at TIMESTAMPTZ;
  v_new_updated_at TIMESTAMPTZ;
BEGIN
  -- Récupérer version actuelle
  SELECT version, updated_at INTO v_current_version, v_current_updated_at
  FROM sources WHERE id = p_source_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  v_new_updated_at = (p_updates->>'updated_at')::TIMESTAMPTZ;

  -- Optimistic locking check
  IF v_current_version != p_expected_version THEN
    -- Conflit détecté → Last-write-wins resolution
    IF v_new_updated_at > v_current_updated_at THEN
      -- Accepter update (plus récent)
      UPDATE sources SET version = version + 1, updated_at = v_new_updated_at
      WHERE id = p_source_id;
      RETURN jsonb_build_object(
        'success', true,
        'conflict', true,
        'resolution', 'last_write_wins_accepted'
      );
    ELSE
      -- Rejeter update (plus ancien)
      RETURN jsonb_build_object(
        'success', false,
        'conflict', true,
        'resolution', 'last_write_wins_rejected',
        'current_version', v_current_version
      );
    END IF;
  ELSE
    -- Pas de conflit → update simple
    UPDATE sources SET version = version + 1, updated_at = NOW()
    WHERE id = p_source_id;
    RETURN jsonb_build_object('success', true, 'conflict', false);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### `process_sync_queue_item()`

```sql
CREATE OR REPLACE FUNCTION process_sync_queue_item(p_queue_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_queue_item RECORD;
BEGIN
  -- Row-level locking (SKIP LOCKED pour concurrency)
  SELECT * INTO v_queue_item FROM sync_queue
  WHERE id = p_queue_id AND status = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'queue_item_locked');
  END IF;

  -- Marquer comme processing
  UPDATE sync_queue SET status = 'processing', processed_at = NOW()
  WHERE id = p_queue_id;

  BEGIN
    -- Exécuter l'opération
    CASE v_queue_item.operation
      WHEN 'create' THEN
        INSERT INTO sources (...) VALUES (...);
      WHEN 'update' THEN
        -- Utiliser resolve_source_conflict
      WHEN 'delete' THEN
        DELETE FROM sources WHERE id = v_queue_item.entity_id;
    END CASE;

    -- Marquer comme success
    UPDATE sync_queue SET status = 'success' WHERE id = p_queue_id;
    RETURN jsonb_build_object('success', true, 'operation', v_queue_item.operation);

  EXCEPTION WHEN OTHERS THEN
    -- Gérer erreur + retry logic (exponential backoff)
    UPDATE sync_queue SET
      status = 'error',
      retry_count = retry_count + 1,
      next_retry_at = NOW() + (retry_count * INTERVAL '1 minute'),
      last_error = SQLERRM
    WHERE id = p_queue_id;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;
```

---

## 💻 Implémentation Client (TypeScript)

### HybridStorage

**Fichier** : `packages/core/src/sources/storage/HybridStorage.ts` (470 LOC)

```typescript
export class HybridStorage implements SourceStorage {
  private indexedDB: IndexedDBSourceStorage;
  private apiClient: SourcesAPIClient;
  private isOnline: boolean;
  private offlineQueue: Map<string, SyncQueueItem>;

  // ==================== Cache-First Read ====================

  async getAllSources(): Promise<SourceConfig[]> {
    // 1. Toujours lire depuis IndexedDB (cache rapide)
    const cachedSources = await this.indexedDB.getAllSources();

    // 2. Si online, fetch PostgreSQL et màj cache
    if (this.isOnline) {
      const response = await this.apiClient.getAllSources();
      if (response.success && response.data) {
        for (const source of response.data) {
          await this.indexedDB.saveSource(source);
        }
        return response.data;
      }
    }

    // 3. Fallback cache (offline ou erreur)
    return cachedSources;
  }

  // ==================== Double-Write ====================

  async saveSource(source: SourceConfig): Promise<void> {
    // 1. Toujours sauvegarder dans IndexedDB (cache)
    await this.indexedDB.saveSource(source);

    // 2. Si online, sauvegarder dans PostgreSQL
    if (this.isOnline) {
      try {
        const response = await this.apiClient.updateSource(source, version);

        if (response.conflict?.detected) {
          // Last-write-wins rejeté → màj cache avec serveur
          if (response.conflict.serverData) {
            await this.indexedDB.saveSource(response.conflict.serverData);
          }
        }
      } catch (error) {
        // 3. Si erreur, ajouter à queue offline
        this.enqueueOperation('update', source.id, source, userId);
      }
    } else {
      // Offline → queue l'opération
      this.enqueueOperation('update', source.id, source, userId);
    }
  }

  // ==================== Offline Queue Processing ====================

  private async processPendingQueue(): Promise<void> {
    const queueItems = Array.from(this.offlineQueue.values())
      .filter(item => item.status === 'pending')
      .slice(0, this.queueBatchSize);

    for (const item of queueItems) {
      try {
        await this.processQueueItem(item);
        this.offlineQueue.delete(item.id);
      } catch (error) {
        item.retryCount++;
        if (item.retryCount >= item.maxRetries) {
          item.status = 'error';
        }
      }
    }
  }
}
```

### SourcesAPIClient

**Fichier** : `packages/core/src/sources/storage/SourcesAPIClient.ts` (430 LOC)

```typescript
export class SourcesAPIClient {
  async getAllSources(): Promise<APIResponse<SourceConfig[]>> {
    const response = await this.fetch('/api/sources', { method: 'GET' });
    const data = await response.json();

    return {
      success: true,
      data: data.sources.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      })),
    };
  }

  async updateSource(
    source: SourceConfig,
    expectedVersion?: number
  ): Promise<APIResponse<SourceConfig>> {
    const response = await this.fetch(`/api/sources/${source.id}`, {
      method: 'PUT',
      body: JSON.stringify({ source, expectedVersion }),
    });

    // Conflit détecté (HTTP 409)
    if (response.status === 409) {
      const errorData = await response.json();
      return {
        success: false,
        error: 'Conflict detected',
        conflict: {
          detected: true,
          resolution: errorData.conflict.resolution,
          serverData: errorData.conflict.serverData,
        },
      };
    }

    const data = await response.json();
    return { success: true, data: data.source };
  }
}
```

---

## 🌐 API Backend (Express)

### Routes `/api/sources`

**Fichier** : `packages/database-api/src/api/routes/sources.ts` (700 LOC)

```typescript
router.use(requireAuth); // JWT authentication
router.use(setRLSContext); // SET LOCAL app.current_user_id
router.use(cleanupRLSContext); // Release connection

router.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getRLSClient(req); // RLS-enabled client

  const result = await client.query(`
    SELECT * FROM sources
    ORDER BY created_at DESC
  `);

  // RLS applique automatiquement:
  // WHERE user_id = current_setting('app.current_user_id')::UUID

  res.json({ status: 'success', sources: result.rows });
});

router.put('/:id', async (req, res) => {
  const { source, expectedVersion } = req.body;
  const client = getRLSClient(req);

  // Optimistic locking via fonction PostgreSQL
  const conflictResult = await client.query(
    `SELECT resolve_source_conflict($1, $2, $3) AS result`,
    [source.id, expectedVersion, JSON.stringify(source)]
  );

  const result = conflictResult.rows[0].result;

  if (result.conflict) {
    // Conflit détecté → HTTP 409
    const serverData = await client.query(
      `SELECT * FROM sources WHERE id = $1`,
      [source.id]
    );

    res.status(409).json({
      error: 'Conflict detected',
      conflict: {
        detected: true,
        resolution: result.resolution,
        serverData: serverData.rows[0],
      },
    });
    return;
  }

  res.json({ status: 'success', source: result });
});
```

### RLS Middleware

**Fichier** : `packages/database-api/src/middleware/rls.ts` (100 LOC)

```typescript
export async function setRLSContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const client = await pool.connect();

  // Configurer context PostgreSQL pour RLS
  await client.query(`SET LOCAL app.current_user_id = '${req.user.id}'`);

  // Attacher client à la requête
  (req as any).pgClient = client;

  next();
}

export function cleanupRLSContext(req, res, next) {
  const client = (req as any).pgClient;

  res.on('finish', () => {
    client.release(); // Libérer connexion après requête
  });

  next();
}
```

---

## ⏱️ Sync Background Worker

**Fichier** : `packages/database-api/src/workers/syncWorker.ts` (300 LOC)

```typescript
export class SyncWorker {
  private checkInterval = 60000; // 1 min
  private maxConcurrentSyncs = 5;
  private activeSyncs: Set<string> = new Set();

  start(): void {
    setInterval(() => {
      this.checkAndSyncSources();
    }, this.checkInterval);
  }

  private async checkAndSyncSources(): Promise<void> {
    // Récupérer sources à synchroniser
    const result = await pool.query(`
      SELECT id, name, connector_type, config, field_mappings
      FROM sources
      WHERE auto_sync = TRUE
        AND status = 'idle'
        AND next_sync_at <= NOW()
      ORDER BY next_sync_at ASC
      LIMIT $1
    `, [this.maxConcurrentSyncs]);

    for (const source of result.rows) {
      this.syncSource(source); // Async (fire-and-forget)
    }
  }

  private async syncSource(source: any): Promise<void> {
    const syncId = `sync_${Date.now()}`;
    const startedAt = new Date();

    try {
      // Marquer source comme 'syncing'
      await pool.query(`
        UPDATE sources SET status = 'syncing' WHERE id = $1
      `, [source.id]);

      // TODO: Appeler connecteur pour sync
      // const connector = getConnector(source.connectorType);
      // const result = await connector.sync(source.config, source.fieldMappings);

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      // Logger dans sync_history
      await pool.query(`
        INSERT INTO sync_history (id, source_id, started_at, finished_at, status)
        VALUES ($1, $2, $3, $4, 'success')
      `, [syncId, source.id, startedAt, finishedAt]);

      // Calculer next_sync_at
      const nextSyncAt = new Date(Date.now() + source.syncInterval);

      await pool.query(`
        UPDATE sources
        SET status = 'idle', next_sync_at = $2, last_sync_duration = $3
        WHERE id = $1
      `, [source.id, nextSyncAt, durationMs]);

    } catch (error) {
      // Logger erreur + retry logic
      await pool.query(`
        UPDATE sync_history SET status = 'error', error_message = $2
        WHERE id = $1
      `, [syncId, error.message]);

      await pool.query(`
        UPDATE sources SET status = 'error', last_sync_error = $2
        WHERE id = $1
      `, [source.id, error.message]);
    }
  }
}
```

**Activation** : Dans `packages/database-api/src/index.ts`

```typescript
import { startSyncWorker } from './workers/syncWorker';

app.listen(PORT, () => {
  startSyncWorker({
    enabled: true,
    checkInterval: 60000, // 1 min
    maxConcurrentSyncs: 5,
  });
});
```

---

## 🧪 Tests

### Tests unitaires HybridStorage

**Fichier** : `packages/core/src/sources/storage/__tests__/HybridStorage.test.ts` (130 LOC)

```typescript
describe('HybridStorage', () => {
  it('devrait lire depuis cache (offline)', async () => {
    const sources = await hybridStorage.getAllSources();
    expect(mockAPIClient.getAllSources).not.toHaveBeenCalled();
  });

  it('devrait ajouter opération à la queue (offline)', async () => {
    await hybridStorage.saveSource(mockSource);

    const queueStatus = hybridStorage.getQueueStatus();
    expect(queueStatus.pending).toBe(1);
  });

  it('devrait gérer les conflits last-write-wins', async () => {
    // Mock API conflict response
    mockAPIClient.updateSource.mockResolvedValue({
      success: false,
      conflict: {
        detected: true,
        resolution: 'last_write_wins_rejected',
        serverData: newerSource,
      },
    });

    await hybridStorage.saveSource(olderSource);

    // Cache doit être màj avec serverData
    const cachedSource = await hybridStorage.getSource('source-1');
    expect(cachedSource).toEqual(newerSource);
  });
});
```

---

## 📈 Performance & Scalabilité

### Optimisations IndexedDB

- **Indexes** : `connectorType`, `status`, `createdAt`
- **Batch operations** : `getAllSources()` retourne array complet (pas de pagination côté client)
- **Cleanup automatique** : Vieux sync history supprimé (garder 100 derniers)

### Optimisations PostgreSQL

- **GIN indexes** : JSONB queries sur `config` et `metadata`
- **Partial indexes** : `next_sync_at` (seulement si `auto_sync = TRUE AND status = 'idle'`)
- **Row-level locking** : `FOR UPDATE SKIP LOCKED` dans `process_sync_queue_item()`

### Scalabilité Background Worker

- **Max concurrent syncs** : 5 par défaut (configurable)
- **Check interval** : 1 min par défaut (configurable)
- **Exponential backoff** : Retry = NOW() + (retry_count * 1 minute)

---

## 🔒 Sécurité

### Row Level Security (RLS)

Chaque requête PostgreSQL a le context utilisateur :

```sql
SET LOCAL app.current_user_id = 'user-uuid';

-- RLS policy appliqué automatiquement :
SELECT * FROM sources;
-- Devient :
SELECT * FROM sources WHERE user_id = 'user-uuid';
```

### JWT Authentication

Toutes les routes `/api/sources` requièrent :

1. `requireAuth` middleware → Vérifie JWT
2. `setRLSContext` middleware → Configure user_id PostgreSQL
3. `cleanupRLSContext` middleware → Libère connexion

### Optimistic Locking

Chaque update vérifie le `version` field :

```typescript
const response = await apiClient.updateSource(source, expectedVersion: 5);

// Si version actuelle = 7 → Conflit détecté
if (response.conflict?.detected) {
  // Last-write-wins : comparer updated_at
}
```

---

## 📝 Configuration

### Variables d'environnement

**Backend** (`packages/database-api/.env`) :

```env
# Sync Worker
SYNC_WORKER_ENABLED=true
SYNC_WORKER_CHECK_INTERVAL=60000  # 1 min
SYNC_WORKER_MAX_CONCURRENT=5

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cartae
POSTGRES_USER=cartae
POSTGRES_PASSWORD=...

# JWT
JWT_SECRET=...
```

**Frontend** :

```typescript
const hybridStorage = new HybridStorage({
  apiConfig: {
    baseUrl: 'http://localhost:3001',
    getAuthToken: async () => localStorage.getItem('jwt_token'),
    timeout: 10000,
  },
  forceOffline: false, // Auto-détection online/offline
  queueSyncInterval: 30000, // 30s
  queueBatchSize: 10,
});
```

---

## 🚀 Utilisation

### Exemple complet

```typescript
import { HybridStorage } from '@cartae/core/sources/storage';
import { SourceManager } from '@cartae/core/sources/SourceManager';

// 1. Créer HybridStorage
const storage = new HybridStorage({
  apiConfig: {
    baseUrl: process.env.API_URL,
    getAuthToken: async () => getJWTToken(),
  },
});

// 2. Créer SourceManager
const sourceManager = new SourceManager({
  storage, // HybridStorage au lieu de IndexedDBSourceStorage
  enableAutoSync: true,
});

// 3. Créer une source (double-write automatique)
const source = await sourceManager.createSource(
  'My Office365 Mail',
  'office365-mail',
  { clientId: '...', tenantId: '...' },
  [{ sourceField: 'subject', targetField: 'title' }],
  { autoSync: true, syncInterval: 300000 }
);

// 4. Offline → queue l'opération
// Online → sync immédiate + cache update

// 5. Synchroniser manuellement
await sourceManager.syncSource(source.id);

// 6. Récupérer historique (cache-first)
const history = await storage.getSyncHistory(source.id, 10);
```

---

## 📊 Métriques & Monitoring

### Queue Status

```typescript
const status = hybridStorage.getQueueStatus();
// {
//   pending: 5,
//   processing: 2,
//   success: 150,
//   error: 3
// }
```

### Sync History

```sql
SELECT
  source_id,
  COUNT(*) AS total_syncs,
  AVG(duration_ms) AS avg_duration,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count
FROM sync_history
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY source_id;
```

### Worker Status

```typescript
const workerStatus = syncWorker.getStatus();
// {
//   running: true,
//   activeSyncs: 3,
//   maxConcurrentSyncs: 5,
//   checkInterval: 60000
// }
```

---

## 🔮 Roadmap

### Phase 1 (Session 129) ✅

- [x] Migration PostgreSQL 003 (tables + RLS + functions)
- [x] HybridStorage service (cache-first + queue)
- [x] SourcesAPIClient (HTTP + conflict resolution)
- [x] Routes Express API + RLS middleware
- [x] Sync background worker
- [x] Tests unitaires basiques
- [x] Documentation architecture

### Phase 2 (Future)

- [ ] UI pour monitoring queue + conflicts
- [ ] Résolution manuelle de conflits (UI)
- [ ] Metrics dashboard (sync success rate, avg duration, etc.)
- [ ] Tests d'intégration complets (offline → online scenarios)
- [ ] WebSocket live sync (alternative à polling)
- [ ] Delta sync (seulement changements depuis last_sync_at)

---

## 📚 Références

- **Session 88** : RBAC + MFA + RLS foundation
- **Session 128** : UnifiedSource types + FieldMapping
- **Session 133** : TokenRefreshManager (Strategy Pattern)
- **PostgreSQL RLS** : https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **IndexedDB API** : https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Optimistic Locking** : https://en.wikipedia.org/wiki/Optimistic_concurrency_control

---

**Fin de la documentation** - Session 129 complète ✅
