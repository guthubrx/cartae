# @cartae/database-api

API REST pour persistence PostgreSQL + pgvector des CartaeItems.

## 🚀 Quick Start

```bash
# 1. Install dependencies (depuis la racine du monorepo)
pnpm install

# 2. Démarrer PostgreSQL + pgvector
cd ../../infrastructure/database
docker-compose up -d

# 3. Créer .env
cp .env.example .env
# Éditer DATABASE_URL si besoin

# 4. Démarrer l'API en dev mode
pnpm dev

# 5. Tester le health check
curl http://localhost:3001/health
```

## 📡 API Endpoints

### POST /api/parse

Parse et stocke un CartaeItem. Évite les duplications (vérifie `source.connector` + `source.originalId`).

```bash
curl -X POST http://localhost:3001/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "email",
    "title": "Réunion client A",
    "content": "Discussion budget Q1...",
    "metadata": {},
    "tags": ["urgent", "client-a"],
    "source": {
      "connector": "office365",
      "originalId": "AAMkAGI2...",
      "lastSync": "2025-11-10T10:00:00Z"
    }
  }'
```

**Response:**

```json
{
  "status": "created",
  "item": { ... },
  "message": "Item created successfully"
}
```

### GET /api/search?q=query&limit=20

Recherche full-text PostgreSQL (index GIN sur `title_tsv` + `content_tsv`).

```bash
curl "http://localhost:3001/api/search?q=urgent%20task&limit=10"
```

**Response:**

```json
{
  "query": { "text": "urgent task" },
  "count": 5,
  "results": [
    {
      "item": { ... },
      "score": 0.87,
      "textScore": 0.87
    }
  ]
}
```

### POST /api/semantic

Recherche vectorielle par similarité cosinus (index HNSW pgvector).

```bash
curl -X POST http://localhost:3001/api/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, ...], // 1536 floats
    "limit": 10,
    "minSimilarity": 0.75
  }'
```

**Response:**

```json
{
  "query": {
    "embeddingDimension": 1536,
    "limit": 10,
    "minSimilarity": 0.75
  },
  "count": 8,
  "results": [
    {
      "item": { ... },
      "score": 0.92,
      "vectorScore": 0.92
    }
  ]
}
```

### POST /api/hybrid

Recherche hybride (full-text + vectorielle) avec pondération ajustable.

```bash
curl -X POST http://localhost:3001/api/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "text": "urgent task deadline",
    "embedding": [0.1, 0.2, ...],
    "textWeight": 0.3,
    "vectorWeight": 0.7,
    "limit": 20
  }'
```

**Response:**

```json
{
  "query": {
    "text": "urgent task deadline",
    "embeddingDimension": 1536,
    "weights": { "text": 0.3, "vector": 0.7 },
    "limit": 20
  },
  "count": 15,
  "results": [
    {
      "item": { ... },
      "score": 0.89,
      "textScore": 0.65,
      "vectorScore": 0.95
    }
  ]
}
```

### GET /api/search/stats

Statistiques DB (nombre d'items, types, embeddings).

```bash
curl http://localhost:3001/api/search/stats
```

**Response:**

```json
{
  "total": 42531,
  "byType": [
    { "type": "email", "count": 15230 },
    { "type": "task", "count": 12450 },
    { "type": "document", "count": 8920 }
  ],
  "withEmbeddings": 38200,
  "withoutEmbeddings": 4331
}
```

## 🧪 Tests

```bash
# Tests unitaires
pnpm test

# Tests en watch mode
pnpm test:watch

# Tests de performance (100k items)
pnpm test:perf
```

## 🏗️ Architecture

```
src/
├── index.ts                    # Serveur Express principal
├── db/
│   ├── client.ts               # Pool connexions PostgreSQL
│   ├── queries/
│   │   ├── items.ts            # CRUD CartaeItems
│   │   └── search.ts           # Recherches (full-text/vector/hybrid)
│   └── migrations/
├── api/
│   ├── routes/
│   │   ├── parse.ts            # POST /api/parse
│   │   ├── search.ts           # GET /api/search
│   │   ├── semantic.ts         # POST /api/semantic
│   │   └── hybrid.ts           # POST /api/hybrid
│   └── middlewares/
│       ├── validation.ts       # Validation Zod
│       └── errorHandler.ts     # Gestion erreurs
└── tests/
    └── performance/
        └── 100k-items.test.ts
```

## 🔧 Configuration

Fichier `.env`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://cartae:password@localhost:5432/cartae
DB_POOL_MIN=2
DB_POOL_MAX=10

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Performance

Configuration optimisée pour **100k+ items**:

- **HNSW index** sur embeddings (recherche < 10ms)
- **GIN index** sur full-text (recherche < 50ms)
- **Connection pool** (2-10 connexions réutilisables)
- **Compression gzip** des responses
- **Rate limiting** (100 req/min par IP)

## 📚 Dépendances

- `express` - Framework HTTP
- `pg` + `pgvector` - Client PostgreSQL + vecteurs
- `zod` - Validation runtime
- `helmet` + `cors` - Sécurité
- `express-rate-limit` - Protection DDoS

## 🔐 Sécurité

- ✅ Helmet (headers HTTP sécurisés)
- ✅ CORS configuré
- ✅ Rate limiting
- ✅ Parameterized queries (protection SQL injection)
- ✅ Validation Zod stricte
- ✅ Compression (réduit bande passante)

## 🐛 Debug

```bash
# Logs PostgreSQL
docker-compose -f ../../infrastructure/database/docker-compose.yml logs -f postgres

# Se connecter à PostgreSQL
docker exec -it cartae-db psql -U cartae -d cartae

# Vérifier indexes
\d+ cartae_items

# Stats table
SELECT pg_size_pretty(pg_total_relation_size('cartae_items'));
```
