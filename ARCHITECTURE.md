# 🏗️ Cartae - Architecture Complète

Documentation détaillée de l'architecture Cartae.

---

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │   Web App    │  │ Desktop App  │  │   Mobile (Future)      │   │
│  │  (React)     │  │  (Tauri)     │  │   (React Native)       │   │
│  │ localhost:   │  │              │  │                        │   │
│  │   5173       │  │              │  │                        │   │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘   │
└─────────┼──────────────────┼──────────────────────┼────────────────┘
          │                  │                      │
          │   HTTP REST API  │                      │
          └──────────────────┴──────────────────────┘
                             │
        ┌────────────────────┴────────────────────────┐
        │                                             │
        ▼                                             ▼
┌────────────────────┐                    ┌──────────────────────┐
│  Database API      │                    │  Frontend Cache      │
│  (Express + TS)    │                    │  (IndexedDB)         │
│  localhost:3001    │                    │  ┌─────────────────┐ │
│  ┌──────────────┐  │                    │  │ CacheManager    │ │
│  │ /api/parse   │  │                    │  │ - LRU Policy    │ │
│  │ /api/search  │  │                    │  │ - Smart Evict   │ │
│  │ /api/semantic│  │                    │  │ - 150 MB max    │ │
│  │ /api/hybrid  │  │                    │  │ - 500 items max │ │
│  │ /api/vault   │  │                    │  └─────────────────┘ │
│  └──────────────┘  │                    └──────────────────────┘
└──────┬─────────────┘
       │
       ├──────────────────┬───────────────────┬──────────────────┐
       │                  │                   │                  │
       ▼                  ▼                   ▼                  ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌─────────┐
│ PostgreSQL   │  │ HashiCorp Vault │  │ OpenAI API   │  │ Plugins │
│ 16 + pgvector│  │ localhost:8200  │  │ (Embeddings) │  │ System  │
│ localhost:   │  │ ┌─────────────┐ │  │              │  │         │
│   5432       │  │ │ KV v2 Store │ │  │              │  │ Office  │
│              │  │ │ - office365 │ │  │              │  │  365    │
│ ┌──────────┐ │  │ │ - database  │ │  │              │  │ Gmail   │
│ │cartae_   │ │  │ │ - encryption│ │  │              │  │ Tasks   │
│ │  items   │ │  │ └─────────────┘ │  │              │  │ Notes   │
│ │          │ │  │ ┌─────────────┐ │  │              │  │ Events  │
│ │ - HNSW   │ │  │ │ ACL Policies│ │  │              │  └─────────┘
│ │ - GIN FTS│ │  │ │ - app       │ │  │              │
│ │ - B-tree │ │  │ │ - admin     │ │  │              │
│ └──────────┘ │  │ └─────────────┘ │  │              │
└──────────────┘  └─────────────────┘  └──────────────┘
       │                  │
       ▼                  ▼
┌──────────────┐  ┌─────────────────┐
│   pgAdmin    │  │   Vault UI      │
│ localhost:   │  │ localhost:8200  │
│   5050       │  │                 │
│ admin@       │  │ Root token:     │
│  cartae.dev  │  │  hvs.xxx        │
└──────────────┘  └─────────────────┘
```

---

## 🎯 Composants Principaux

### 1. Frontend Layer

**Technologies:**
- React 18 + TypeScript
- TailwindCSS + Radix UI
- Zustand (state management)
- React Query (data fetching)
- Vite (build tool)

**Responsabilités:**
- Interface utilisateur
- Gestion cache local (IndexedDB via CacheManager)
- Plugins UI (Office 365, Gmail, etc.)
- Theme management (clair/sombre)

**Cache Local:**
```typescript
CacheManager {
  maxItems: 500
  maxSizeMB: 150
  strategy: 'LRU'

  quotas: {
    email: { maxItems: 300, maxSizeMB: 90 }
    task:  { maxItems: 100, maxSizeMB: 30 }
    note:  { maxItems: 80,  maxSizeMB: 24 }
    event: { maxItems: 20,  maxSizeMB: 6  }
  }
}
```

---

### 2. Database API Layer

**Technologies:**
- Node.js + Express
- TypeScript
- Zod (validation)
- node-vault (Vault SDK)

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/parse | Stocker un CartaeItem |
| POST | /api/parse/batch | Batch insert (100+ items) |
| GET | /api/search | Full-text search (GIN index) |
| POST | /api/semantic | Vector similarity (HNSW) |
| POST | /api/hybrid | Hybrid text + vector |
| POST | /api/vault/secrets | Store secret |
| GET | /api/vault/secrets/:path | Retrieve secret |
| GET | /health | Health check |

**Architecture Interne:**

```
packages/database-api/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── parse.ts         # POST /api/parse
│   │   │   ├── search.ts        # GET /api/search
│   │   │   ├── semantic.ts      # POST /api/semantic
│   │   │   ├── hybrid.ts        # POST /api/hybrid
│   │   │   └── vault.ts         # Vault CRUD
│   │   └── middlewares/
│   │       ├── errorHandler.ts
│   │       └── rateLimiter.ts
│   ├── db/
│   │   ├── client.ts            # PostgreSQL pool
│   │   ├── clientWithVault.ts   # Pool avec Vault credentials
│   │   └── migrations/
│   └── vault/
│       └── VaultClient.ts       # Wrapper node-vault
└── .env
```

---

### 3. PostgreSQL + pgvector

**Version:** PostgreSQL 16.x
**Extensions:**
- `pgvector` - Recherche vectorielle
- `pg_trgm` - Full-text search amélioré
- `uuid-ossp` - UUID v4 generation

**Schema `cartae_items`:**

```sql
CREATE TABLE cartae_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Source tracking
  connector VARCHAR(100),
  original_id TEXT,
  last_sync TIMESTAMPTZ,

  -- Search
  title_tsv TSVECTOR,     -- Full-text index
  content_tsv TSVECTOR,   -- Full-text index
  embedding VECTOR(1536), -- OpenAI embeddings

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,

  -- Unique constraint (éviter duplications)
  UNIQUE(connector, original_id)
);
```

**Indexes:**

```sql
-- HNSW vector index (recherche sémantique ultra-rapide)
CREATE INDEX idx_embedding_hnsw
  ON cartae_items USING hnsw (embedding vector_cosine_ops);

-- GIN full-text (recherche texte)
CREATE INDEX idx_title_gin
  ON cartae_items USING gin(title_tsv);

CREATE INDEX idx_content_gin
  ON cartae_items USING gin(content_tsv);

-- GIN tags
CREATE INDEX idx_tags_gin
  ON cartae_items USING gin(tags);

-- B-tree composite (requêtes fréquentes)
CREATE INDEX idx_type_archived_created
  ON cartae_items(type, archived, created_at DESC);

-- JSONB metadata
CREATE INDEX idx_metadata_gin
  ON cartae_items USING gin(metadata);
```

**Performance:**
- 100k items: ~5s recherche full-text
- 100k items: ~50ms recherche vectorielle (HNSW)
- Batch insert: 1000 items/s

---

### 4. HashiCorp Vault

**Version:** 1.15+
**Storage:** File backend (dev), Consul (prod)

**Secrets Organization:**

```
secret/ (KV v2)
├── office365/
│   ├── client-id
│   ├── client-secret
│   └── tenant-id
├── gmail/
│   ├── client-id
│   ├── client-secret
│   └── refresh-token
├── database/
│   ├── postgres
│   │   ├── username
│   │   ├── password
│   │   ├── host
│   │   ├── port
│   │   └── database
│   └── mongodb (future)
└── encryption/
    ├── master-key
    └── recovery-key
```

**ACL Policies:**

```hcl
# cartae-app (read-only, pour Database API)
path "secret/data/*" {
  capabilities = ["read"]
}

# cartae-admin (full access, pour ops)
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

---

### 5. Plugin System

**Architecture:**

```typescript
interface CartaePlugin {
  id: string
  name: string
  version: string

  // Lifecycle
  initialize(): Promise<void>
  activate(): Promise<void>
  deactivate(): Promise<void>

  // Data fetching
  fetchData(): Promise<CartaeItem[]>

  // Auth
  authenticate(): Promise<AuthResult>
  refreshToken(): Promise<string>
}
```

**Plugins Disponibles:**

| Plugin | Description | Status |
|--------|-------------|--------|
| Office 365 | Emails, Calendars, Contacts | ✅ Beta |
| Gmail | Emails, Labels | ✅ Beta |
| Google Tasks | Tasks, Lists | 🚧 WIP |
| Google Keep | Notes | 📋 Planned |
| Notion | Pages, Databases | 📋 Planned |
| Obsidian | Markdown notes | 📋 Planned |

---

## 🔄 Data Flow

### 1. Import Flow (Office 365 → PostgreSQL)

```
┌─────────┐
│  User   │ Click "Connect Office 365"
└────┬────┘
     │
     ▼
┌────────────────┐
│ Office365Plugin│ OAuth2 flow
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Microsoft Graph│ GET /me/messages
│      API       │
└────┬───────────┘
     │ JSON Response
     ▼
┌────────────────┐
│  Parser        │ Parse → CartaeItem[]
└────┬───────────┘
     │
     ├─────────────┬──────────────┐
     │             │              │
     ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌────────────┐
│IndexedDB│  │Database  │  │PostgreSQL  │
│(Cache)  │  │  API     │  │            │
│         │  │POST /api │  │INSERT INTO │
│LRU evict│  │  /parse  │  │cartae_items│
└─────────┘  └──────────┘  └────────────┘
```

### 2. Search Flow (UI → PostgreSQL)

```
┌─────────┐
│  User   │ Tape "urgent task"
└────┬────┘
     │
     ▼
┌────────────────┐
│ Search Bar     │
└────┬───────────┘
     │
     ├─────────────────┬────────────────┐
     │ Cache hit?      │ Cache miss?    │
     ▼ YES             ▼ NO             │
┌─────────┐      ┌──────────┐          │
│IndexedDB│      │Database  │          │
│Filter   │      │  API     │          │
│locally  │      │GET /api  │          │
│         │      │  /search │          │
└────┬────┘      └────┬─────┘          │
     │                │                │
     │                ▼                │
     │          ┌────────────┐         │
     │          │PostgreSQL  │         │
     │          │Full-text   │         │
     │          │GIN index   │         │
     │          └────┬───────┘         │
     │               │                 │
     └───────────────┴─────────────────┘
                     │
                     ▼
              ┌────────────┐
              │   UI       │
              │Display     │
              │results     │
              └────────────┘
```

### 3. Semantic Search Flow

```
┌─────────┐
│  User   │ Search "réunion budget Q1"
└────┬────┘
     │
     ▼
┌────────────────┐
│ Frontend       │
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Generate       │ OpenAI API
│ Embedding      │ text-embedding-3-small
└────┬───────────┘
     │ [0.123, 0.456, ...] (1536 dims)
     ▼
┌────────────────┐
│ Database API   │ POST /api/semantic
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ PostgreSQL     │ SELECT ... ORDER BY
│ pgvector       │   embedding <=> query_embedding
│ HNSW index     │ LIMIT 20
└────┬───────────┘
     │ Top 20 similar items
     ▼
┌────────────────┐
│   UI           │ Display avec similarity score
└────────────────┘
```

---

## 🔐 Sécurité

### Network Segmentation (Zero Trust)

```
┌─────────────────────────────────────────────────┐
│ DMZ (172.25.1.0/24)                             │
│ ┌─────────┐  ┌──────────┐                      │
│ │ Traefik │  │ Bastion  │                      │
│ │ Reverse │  │ SSH Jump │                      │
│ │  Proxy  │  │  Server  │                      │
│ └────┬────┘  └────┬─────┘                      │
└──────┼────────────┼────────────────────────────┘
       │ TLS 1.3    │ SSH + 2FA
       ▼            ▼
┌─────────────────────────────────────────────────┐
│ Application Layer (172.25.2.0/24)               │
│ ┌────────────┐  ┌──────────────┐               │
│ │ Frontend   │  │ Database API │               │
│ │ (React)    │  │ (Express)    │               │
│ └────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────┘
       │                 │
       ▼                 ▼
┌─────────────────────────────────────────────────┐
│ Secrets Layer (172.25.3.0/24)                   │
│ ┌──────────────────────────────┐                │
│ │ HashiCorp Vault              │                │
│ │ - TLS 1.3                    │                │
│ │ - ACL Policies               │                │
│ │ - Audit Trail                │                │
│ └──────────────────────────────┘                │
└─────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│ Data Layer (172.25.4.0/24)                      │
│ ┌──────────────────────────────┐                │
│ │ PostgreSQL                   │                │
│ │ - TLS 1.3                    │                │
│ │ - LUKS encryption (optional) │                │
│ │ - Row-level security         │                │
│ └──────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

**Firewall Rules (iptables):**

```bash
# Default: DENY ALL
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow DMZ → App
iptables -A FORWARD -s 172.25.1.0/24 -d 172.25.2.0/24 -j ACCEPT

# Allow App → Secrets
iptables -A FORWARD -s 172.25.2.0/24 -d 172.25.3.0/24 -j ACCEPT

# Allow App → Data
iptables -A FORWARD -s 172.25.2.0/24 -d 172.25.4.0/24 -j ACCEPT

# DENY Secrets → Data (sauf admin)
iptables -A FORWARD -s 172.25.3.0/24 -d 172.25.4.0/24 -j DROP
```

---

## 📊 Performance

### Benchmarks (100k items)

| Operation | Latency | Throughput |
|-----------|---------|------------|
| INSERT single | 5ms | 200 items/s |
| INSERT batch (1000) | 800ms | 1,250 items/s |
| SELECT by ID | 2ms | - |
| Full-text search | 50-500ms | - |
| Vector search (HNSW) | 20-80ms | - |
| Hybrid search | 100-300ms | - |

### Cache Performance (IndexedDB)

| Operation | Latency |
|-----------|---------|
| GET by ID | <1ms |
| Query (filter) | 5-20ms |
| INSERT | 2-5ms |
| Bulk INSERT (100) | 50-100ms |

---

## 🚀 Scaling Strategy

### Horizontal Scaling

```
┌─────────────────┐
│  Load Balancer  │ (Traefik / Nginx)
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ API 1  │ │ API 2  │ │ API 3  │ │ API N  │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │           │          │
     └──────────┴───────────┴──────────┘
                │
                ▼
      ┌──────────────────┐
      │ PostgreSQL       │
      │ (Primary)        │
      └────────┬─────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌────────┐    ┌────────┐
   │Replica │    │Replica │
   │  (RO)  │    │  (RO)  │
   └────────┘    └────────┘
```

### Caching Layers

```
User Request
    │
    ▼
┌─────────────┐
│ CDN Cache   │ (Cloudflare) - Static assets
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐
│ Redis Cache │ (API responses, 5 min TTL)
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐
│ IndexedDB   │ (Local cache, LRU 150 MB)
└──────┬──────┘
       │ MISS
       ▼
┌─────────────┐
│ PostgreSQL  │ (Source of truth)
└─────────────┘
```

---

## 📚 Documentation Complémentaire

- **Setup Utilisateur:** [GETTING-STARTED.md](./GETTING-STARTED.md)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Database Schema:** [infrastructure/database/README.md](./infrastructure/database/README.md)
- **Vault Setup:** [infra/vault/README.md](./infra/vault/README.md)
- **Plugin Development:** [packages/plugin-system/README.md](./packages/plugin-system/README.md)
- **Cache Policies:** [packages/core/src/storage/README.md](./packages/core/src/storage/README.md)

---

**Last Updated:** 15 Novembre 2025 (Session 77 - Cache Policies)
