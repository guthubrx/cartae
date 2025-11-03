# Session 46 : Semantic Search + Embeddings 🔍

**Date :** 3 Novembre 2025
**Durée estimée :** ~11h (1-1.5 sessions)
**LOC estimé :** ~1,100 LOC
**Status :** 🚧 EN COURS

---

## 📊 Vue d'ensemble

Session majeure ajoutant recherche sémantique intelligente via embeddings et vector store. Extension naturelle de Session 45 (LLM Service) avec utilisation de embeddings pour compréhension sémantique vs TF-IDF basique.

**Killer feature :** Recherche contextuelle "Trouver les items parlant de X" au lieu de juste "contient le mot X"

---

## 🎯 Objectifs Accomplis / À Faire

### ✅ 1. Architecture & Planning (COMPLÉTÉ)

**Décisions clés prises :**

- ✅ Embedding model : OpenAI ada-3 (1536 dimensions)
- ✅ Vector store : Qdrant (self-hosted, performant)
- ✅ Caching : Hybrid (IndexedDB local + Qdrant server)
- ✅ Integration : Via LLM Service (Session 45)
- ✅ Fallback : TF-IDF si Qdrant down

**Architecture finale :**

```
CartaeItem
   ↓ (content extraction)
EmbeddingService (via LLM Service)
   ↓ (text → 1536-dim vector)
Qdrant Vector Store
   ↓ (cosine similarity search)
SemanticSearchPlugin (AIPlugin)
   ↓ (similarity ranking)
UI Results (ranked by relevance)
```

---

### 📦 2. Packages À Créer

| Package                          | Type    | LOC        | Description                      |
| -------------------------------- | ------- | ---------- | -------------------------------- |
| `@cartae/embedding-service`      | CORE    | ~200       | EmbeddingService (text → vector) |
| `@cartae/vector-store`           | CORE    | ~100       | VectorStore interface (abstract) |
| `@cartae/qdrant-store`           | CORE    | ~300       | QdrantVectorStore implementation |
| `@cartae/semantic-search-plugin` | AI      | ~350       | SemanticSearchPlugin (AIPlugin)  |
| UI Components                    | PRIVATE | ~150       | Search UI + results display      |
| **TOTAL**                        |         | **~1,100** |                                  |

---

### 🏗️ Architecture Détaillée

#### 1. **EmbeddingService** (~200 LOC)

```typescript
interface EmbeddingService {
  // Génère embedding pour text
  embed(text: string, options?: EmbedOptions): Promise<number[]>;

  // Génère embeddings en batch (plus efficace)
  embedBatch(texts: string[]): Promise<number[][]>;

  // Obtient stats cache
  getCacheStats(): { hits: number; misses: number };

  // Vide le cache
  clearCache(): void;
}
```

**Features :**

- ✅ Utilise LLM Service pour API calls
- ✅ Cache local (avoids duplicate API calls)
- ✅ Batch processing (plus rapide)
- ✅ Fallback si API down (cache embeddings)
- ✅ Rate limiting intégré

**Location :** `packages/embedding-service/src/`

---

#### 2. **VectorStore Interface** (~100 LOC)

```typescript
interface VectorStore {
  // Ajoute item avec embedding et metadata
  add(id: string, vector: number[], metadata: CartaeItemMetadata): Promise<void>;

  // Recherche items similaires
  search(query: string | number[], topK: number, filter?: FilterCondition): Promise<SearchResult[]>;

  // Supprime item
  delete(id: string): Promise<void>;

  // Met à jour metadata (vecteur reste)
  updateMetadata(id: string, metadata: Partial<CartaeItemMetadata>): Promise<void>;

  // Stats (nombre items, collections, etc)
  getStats(): Promise<VectorStoreStats>;
}

interface SearchResult {
  id: string;
  similarity: number; // 0-1, cosine similarity
  metadata: CartaeItemMetadata;
}
```

**Location :** `packages/vector-store/src/`

---

#### 3. **QdrantVectorStore** (~300 LOC)

Implementation concrète utilisant Qdrant API.

```typescript
class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;
  private collectionName: string;

  constructor(qdrantUrl: string, collectionName: string) {
    // Initialise client Qdrant
    // Crée collection si n'existe pas
  }

  async add(id, vector, metadata) {
    // Insert point avec embedding + payload
  }

  async search(query, topK, filter) {
    // Similarity search (cosine distance)
    // Apply filters si fournis
  }

  // ... autres méthodes
}
```

**Features :**

- ✅ Connection pooling à Qdrant
- ✅ Collection management
- ✅ Hybrid search (vectors + metadata filters)
- ✅ Batch operations (performance)
- ✅ Graceful degradation si Qdrant down

**Location :** `packages/qdrant-store/src/`

---

#### 4. **SemanticSearchPlugin** (~350 LOC)

AIPlugin implémentant recherche sémantique.

```typescript
interface SemanticSearchPlugin extends AIPlugin {
  type: 'semantic-search';

  // Analyse item : extrait contenu, génère embedding, stocke
  analyze(item: CartaeItem): Promise<CartaeItem>;

  // Trouve items similaires
  findConnections(item: CartaeItem, topK?: number): Promise<SearchResult[]>;

  // Agrège insights depuis toute collection
  generateInsights(items: CartaeItem[]): Promise<Insight[]>;
}
```

**Features :**

- ✅ Embed items on create/update
- ✅ Cache embeddings aggressively
- ✅ Batch embedding au lieu de 1 par 1
- ✅ Background indexing (async, non-blocking)
- ✅ Fallback to TF-IDF si Qdrant down
- ✅ Insights : "Top clusters", "Outliers", "Connections"

**Location :** `packages/ai-plugins/semantic-search/src/`

---

### 🔌 Integration avec Session 45

**Extensions à LLMService :**

```typescript
// Dans LLMService, ajouter :
async embedText(
  text: string,
  model: 'text-embedding-3-small' | 'text-embedding-3-large' = 'text-embedding-3-small'
): Promise<number[]> {
  // Délègue au provider (OpenAI, Ollama, local)
  // Utilise cache LRU existant
  // Retourne vector (1536 dimensions)
}

// + batch version
async embedBatch(texts: string[]): Promise<number[][]>
```

**Rate limiting :**

- Embeddings relativement cheap
- Tokens = (input tokens / 4) pour embeddings
- Cache TTL : infini (embeddings changent pas)

---

### 💾 Storage Strategy

**IndexedDB (client-side cache) :**

```typescript
// Store embeddings locally
{
  id: 'item-123',
  embedding: [0.12, 0.45, ...],  // 1536 floats
  metadata: { title, type, tags },
  timestamp: Date.now()
}
```

**Qdrant (server of truth) :**

```
Collection: 'cartae_items'
Vectors: 1536 dimensions (ada-3)
Payload: { id, title, type, tags, sourceId, updatedAt }
```

---

### 📈 Performance Targets

| Metric            | Target          | Rationale                    |
| ----------------- | --------------- | ---------------------------- |
| Embed 1 item      | <1s             | API call + cache hit         |
| Search 1000 items | <100ms          | Qdrant optimized             |
| Memory IndexedDB  | <50MB           | 1000 items × ~50KB           |
| Qdrant storage    | < 1GB/10k items | Vector: 1536 × 4 bytes = 6KB |

---

### 🧪 Testing Strategy

**Unit Tests :**

- Mock VectorStore
- Test EmbeddingService cache
- Test SemanticSearchPlugin logic

**Integration Tests :**

- Docker Qdrant container
- End-to-end search pipeline
- Fallback to TF-IDF

**Performance Tests :**

- Benchmark embedding time
- Benchmark search latency
- Memory usage monitoring

---

### 📋 Definition of Done

- [ ] EmbeddingService implemented + cached
- [ ] VectorStore interface defined
- [ ] QdrantVectorStore fully functional
- [ ] SemanticSearchPlugin integrated with Registry
- [ ] LLM Service extended with embed() methods
- [ ] UI: Search bar with semantic toggle
- [ ] Results display with similarity scores
- [ ] Graceful fallback if Qdrant down
- [ ] Typecheck: 0 errors
- [ ] Tests: unit + integration
- [ ] Documentation: API docs + architecture
- [ ] Performance: <100ms search latency

---

### 🎓 Key Learnings Expected

1. **Vector embeddings** : Understanding dense representations
2. **Similarity search** : Cosine distance, vector databases
3. **Caching strategy** : When/how to cache expensive operations
4. **Async pipeline** : Background processing without blocking UI
5. **Graceful degradation** : Fallback strategies for robustness

---

### ⏭️ Prochaines Étapes

**Session 46 (maintenant) :**

- ✅ Architecture planning (DONE)
- 🚧 Setup + core implementations (IN PROGRESS)

**Session 47 : Smart Recommendations**

- Utilise embeddings de Session 46
- ML-based recommendations engine
- Pattern detection et clustering

**Sessions 48-49 :** Auto-Tagging, AI Dashboard

---

**Prochaine action:** Créer packages et implémenter EmbeddingService
**Progression:** Session 46/49 (1/4 AI plugins)
**Branche Git:** `session-46-semantic-search`

---

_Documentation Session 46_
_Date : 3 Novembre 2025_
