# Session 46 : Semantic Search + Embeddings 🔍

**Status:** ⏳ PLANIFIÉE
**Durée estimée:** 8-10h
**LOC estimées:** ~1,100
**Dépend de:** Session 45 ✅

---

## 📊 Vue d'ensemble

Implémentation d'un système de recherche sémantique basé sur embeddings vectoriels. Permet aux utilisateurs de trouver des items similaires même sans correspondance exacte sur les mots-clés.

**Exemples de cas d'usage :**
- Utilisateur cherche "budget" → trouve aussi "finances", "allocations", "dépenses"
- Utilisateur cherche "réunion client" → trouve "appel sales", "meeting prospect", "discussion account"
- Utilisateur cherche "blocker" → trouve "urgent", "bloquant", "dépendance critique"

---

## 🎯 Objectifs

1. ✅ Créer abstraction Vector Store (stockage embeddings)
2. ✅ Implémenter Embeddings Generator (génération embeddings)
3. ✅ Créer Semantic Search Plugin (plugin AI)
4. ✅ Tester bout-à-bout avec exemples
5. ✅ Documenter architecture et usage

---

## 📦 Packages à Créer

### 1. `@cartae/vector-store` (~400 LOC)

**Purpose:** Abstraction pour stockage/recherche vectorielles

**Files:**
```
packages/ai-plugins/vector-store/
├── src/
│   ├── VectorStore.ts           # Interface de base
│   ├── providers/
│   │   ├── index.ts
│   │   └── MockProvider.ts      # In-memory implementation
│   ├── types.ts                 # Types Vector, SearchResult
│   ├── utils.ts                 # Similarité cosinus, etc.
│   └── index.ts                 # Exports
├── package.json
├── tsconfig.json
└── README.md
```

**Key Classes/Interfaces:**

```typescript
// VectorStore.ts
export interface VectorStoreConfig {
  provider: 'mock' | 'chromadb' | 'pinecone' | 'weaviate';
  [key: string]: unknown;
}

export interface Vector {
  id: string;
  values: number[];           // Embedding vector
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;              // Cosine similarity (0-1)
  metadata?: Record<string, unknown>;
}

export interface IVectorStore {
  // Core operations
  addVector(vector: Vector): Promise<void>;
  addVectors(vectors: Vector[]): Promise<void>;
  search(queryVector: number[], limit?: number): Promise<SearchResult[]>;
  deleteVector(id: string): Promise<void>;

  // Metadata
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
}

// Implementation
export class VectorStore implements IVectorStore {
  private provider: IVectorStore;

  constructor(config: VectorStoreConfig);
  // ... implement interface
}
```

**Provider Mock (in-memory):**
- Stockage simple Map<id, Vector>
- Recherche naïve (boucle + comparaison cosinus)
- Parfait pour tests/MVP

---

### 2. `@cartae/embeddings-generator` (~300 LOC)

**Purpose:** Génère embeddings de CartaeItems

**Files:**
```
packages/ai-plugins/embeddings-generator/
├── src/
│   ├── EmbeddingsGenerator.ts   # Classe principale
│   ├── TextSplitter.ts          # Découpe texte long
│   ├── CacheManager.ts          # Cache LRU des embeddings
│   ├── types.ts                 # Types Embedding
│   └── index.ts                 # Exports
├── package.json
├── tsconfig.json
└── README.md
```

**Key Classes:**

```typescript
// EmbeddingsGenerator.ts
export interface EmbeddingResult {
  itemId: string;
  text: string;
  vector: number[];              // Embedding vector
  chunkIndex?: number;            // Si texte splitté
}

export interface EmbeddingsGeneratorConfig {
  llmService: ILLMService;
  enableCache?: boolean;
  cacheTTL?: number;
  batchSize?: number;             // Nombre d'items à traiter en parallèle
  model?: string;                 // Model pour embeddings
}

export class EmbeddingsGenerator {
  private llmService: ILLMService;
  private cache: CacheManager;

  constructor(config: EmbeddingsGeneratorConfig);

  /**
   * Génère embedding pour un CartaeItem
   */
  async generateForItem(item: CartaeItem): Promise<EmbeddingResult>;

  /**
   * Génère embeddings pour plusieurs items (parallèle)
   */
  async generateForItems(items: CartaeItem[]): Promise<EmbeddingResult[]>;

  /**
   * Combine titre + contenu + tags en texte
   */
  private prepareText(item: CartaeItem): string;

  /**
   * Récupère embedding via LLM (avec cache)
   */
  private getEmbeddingVector(text: string): Promise<number[]>;
}

// CacheManager.ts
export class CacheManager {
  private cache: Map<string, { vector: number[], timestamp: number }>;
  private ttl: number;

  constructor(ttl?: number);
  get(key: string): number[] | null;
  set(key: string, vector: number[]): void;
  clear(): void;
}
```

---

### 3. `@cartae/semantic-search-plugin` (~400 LOC)

**Purpose:** Plugin AI pour recherche sémantique

**Files:**
```
packages/ai-plugins/semantic-search/
├── src/
│   ├── SemanticSearchPlugin.ts   # Plugin principal
│   ├── QueryExpander.ts          # Expansion requête
│   ├── ResultRanker.ts           # Re-ranking résultats
│   ├── types.ts                  # Types SearchQuery, SearchResult
│   └── index.ts                  # Exports
├── package.json
├── tsconfig.json
└── README.md
```

**Key Classes:**

```typescript
// SemanticSearchPlugin.ts
export interface SemanticSearchConfig {
  vectorStore: IVectorStore;
  embeddingsGenerator: EmbeddingsGenerator;
  threshold?: number;             // Score minimum (default 0.3)
  topK?: number;                  // Nombre de résultats (default 10)
  expandQuery?: boolean;          // Expansion requête (default true)
  rerank?: boolean;               // Re-ranking (default true)
}

export interface SemanticSearchResult {
  item: CartaeItem;
  score: number;                  // Similarité (0-1)
  reason?: string;                // Pourquoi ce résultat
}

export class SemanticSearchPlugin implements AIPlugin {
  id: string = '@cartae/semantic-search';
  name: string = 'Semantic Search';
  type: 'analyzer' = 'analyzer';
  version: string = '1.0.0';

  private vectorStore: IVectorStore;
  private embeddingsGenerator: EmbeddingsGenerator;
  private queryExpander: QueryExpander;
  private resultRanker: ResultRanker;

  constructor(config: SemanticSearchConfig);

  /**
   * Implémente AIPlugin.analyze()
   * Enrichit item avec connexions sémantiques
   */
  async analyze(item: CartaeItem): Promise<CartaeItem>;

  /**
   * Recherche items similaires à une requête
   */
  async search(
    query: string,
    allItems: CartaeItem[],
    options?: { topK?: number, threshold?: number }
  ): Promise<SemanticSearchResult[]>;

  /**
   * Index tous les items
   */
  async indexItems(items: CartaeItem[]): Promise<void>;

  /**
   * Implémente AIPlugin.findConnections()
   */
  async findConnections(
    item: CartaeItem,
    allItems: CartaeItem[]
  ): Promise<string[]>;
}

// QueryExpander.ts
export class QueryExpander {
  /**
   * Expand "budget" → ["budget", "finances", "money", "spending"]
   */
  expand(query: string, context?: CartaeItem[]): string[];
}

// ResultRanker.ts
export class ResultRanker {
  /**
   * Re-rank résultats basé sur heuristiques
   * (popularité, récence, relevance)
   */
  rank(
    results: SearchResult[],
    query: string,
    context?: CartaeItem[]
  ): SearchResult[];
}
```

---

## 🔄 Flux d'Implémentation

### Phase 1 : Vector Store (2-3h)
1. Créer package structure
2. Implémenter interface VectorStore
3. Implémenter MockProvider
4. Écrire tests unitaires

### Phase 2 : Embeddings Generator (2-3h)
1. Créer package structure
2. Implémenter EmbeddingsGenerator
3. Implémenter CacheManager
4. Intégrer avec LLMService existant
5. Écrire tests

### Phase 3 : Semantic Search Plugin (2-3h)
1. Créer package structure
2. Implémenter SemanticSearchPlugin
3. Implémenter QueryExpander + ResultRanker
4. Intégrer VectorStore + EmbeddingsGenerator
5. Tests bout-à-bout

### Phase 4 : Documentation & Polish (1-2h)
1. Écrire README pour chaque package
2. Ajouter exemples d'usage
3. Documenter architecture
4. Code review & cleanup

---

## 📊 Architecture Finale

```
User Query: "budget"
       ↓
  QueryExpander
  ("budget" → ["budget", "finance", "money"])
       ↓
 EmbeddingsGenerator.generateForItems()
  (["budget", "finance", "money"] → vectors)
       ↓
  VectorStore.search(vectors)
  (recherche similarité cosinus dans index)
       ↓
   ResultRanker
  (tri et filtre par heuristiques)
       ↓
CartaeItems triage par score (0.9, 0.8, 0.7...)
       ↓
   UI : Affiche résultats
```

---

## ✅ Checklist d'Implémentation

**Vector Store:**
- [ ] Interface IVectorStore
- [ ] MockProvider implementation
- [ ] Cosine similarity utilities
- [ ] Tests unitaires
- [ ] Documentation

**Embeddings Generator:**
- [ ] EmbeddingsGenerator class
- [ ] TextSplitter (découpe long texts)
- [ ] CacheManager (LRU cache)
- [ ] Intégration LLMService
- [ ] Tests avec mock LLM

**Semantic Search Plugin:**
- [ ] SemanticSearchPlugin class
- [ ] QueryExpander implementation
- [ ] ResultRanker implementation
- [ ] Integration tests
- [ ] Documentation

**Overall:**
- [ ] Tous packages compilent
- [ ] Tous tests passent
- [ ] Zéro TS errors
- [ ] Documentation complète
- [ ] Ready to merge

---

## 🚀 Résultat Attendu

À la fin de Session 46 :

- ✅ Moteur de recherche sémantique fonctionnel
- ✅ ~1,100 LOC nouveau code
- ✅ 3 nouveaux packages AI
- ✅ Tests et documentation
- ✅ Prêt pour Session 47 (Smart Recommendations)

Progression Sessions 45-49 : **2/5 (40%)**

---

**Prêt à démarrer ? Y/N**
