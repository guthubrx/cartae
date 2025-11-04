# @cartae/embeddings-generator

Génération d'embeddings (embeddings vectoriels) pour CartaeItems.

## Description

Crée des vecteurs d'embeddings à partir de CartaeItems (titre + contenu + tags).

**MVP (Mock Mode):** Utilise des embeddings déterministes pour tests et development.
**Production (Future):** Intégration avec LLMService pour vrais embeddings (OpenAI, Anthropic, etc.)

Inclut un système de cache LRU avec TTL pour optimiser les performances.

## Installation

```bash
pnpm add @cartae/embeddings-generator
```

## Usage

### Créer un générateur

```typescript
import { EmbeddingsGenerator } from '@cartae/embeddings-generator';

// Mode mock (défaut)
const generator = new EmbeddingsGenerator({
  dimension: 1536,           // Dimension des embeddings
  enableCache: true,         // Activer le cache
  cacheTTL: 3600,            // TTL cache en secondes
  mockMode: true             // Mode mock (défaut)
});

// Future : Mode réel avec LLMService
// const generator = new EmbeddingsGenerator({
//   dimension: 1536,
//   mockMode: false,
//   llmService: llmService   // À implémenter
// });
```

### Générer des embeddings

```typescript
import type { CartaeItem } from '@cartae/ai-types';

// Générer embedding pour un item
const item: CartaeItem = {
  id: 'item-1',
  title: 'Mon Document',
  content: 'Contenu du document...',
  tags: ['important', 'work']
};

const result = await generator.generateForItem(item);
console.log({
  itemId: result.itemId,         // 'item-1'
  vector: result.vector,          // [0.1, 0.2, -0.3, ...]
  text: result.text               // "Title: Mon Document\nContent: ..."
});

// Générer pour plusieurs items (parallèle)
const items: CartaeItem[] = [...];
const results = await generator.generateForItems(items);
// results: EmbeddingResult[]

// Générer embedding pour texte arbitraire
const vector = await generator.generateForText('Rechercher des documents');
// vector: number[] (1536 dimensions)
```

## Architecture

### Composants

#### 1. EmbeddingsGenerator
Classe principale pour génération d'embeddings.

```typescript
interface EmbeddingResult {
  itemId: string;              // ID de l'item source
  text: string;                // Texte utilisé pour embedding
  vector: number[];            // Vecteur d'embedding (1536 dims par défaut)
  chunkIndex?: number;         // Index si texte splitté
  chunkCount?: number;         // Nombre total de chunks
}
```

#### 2. CacheManager
Cache LRU avec TTL pour éviter recalculs.

```typescript
const cache = new CacheManager(ttl = 3600, maxSize = 10000);

// Statistiques
const stats = cache.getStats();
// {
//   size: 1234,
//   hits: 5000,
//   misses: 2000,
//   total: 7000,
//   hitRate: '71.43%'
// }
```

**Stratégie LRU :**
- Quand `size >= maxSize`, supprime l'entrée la moins utilisée
- Basé sur `hits` (nombre d'accès) et `timestamp` (date d'accès)

#### 3. TextSplitter
Découpe les longs textes en chunks.

```typescript
const splitter = new TextSplitter({
  chunkSize: 1000,      // Chars max par chunk
  chunkOverlap: 200,    // Chevauchement entre chunks
  separators: [
    '\n\n',             // Paragraphes
    '\n',               // Lignes
    '. ',               // Phrases
    ' ',                // Mots
    ''                  // Caractères
  ]
});

const chunks = splitter.split('Very long text...');
// chunks: string[]
```

## Performance

### Mock Mode (MVP)
- **Génération:** Déterministe, très rapide (~1ms par item)
- **Consistance:** Même texte = même embedding (via seeded random)
- **Espace:** ~12KB par embedding (1536 × 8 bytes)

### Production Mode (Future)
- **Génération:** Via LLM API (~100ms avec cache, ~1-2s sans)
- **Cache hit rate:** Typiquement 80-90% en usage réel
- **Économies:** Réduit coûts API de ~80-90%

## Cas d'Usage

### 1. Indexation des CartaeItems

```typescript
import { VectorStore } from '@cartae/vector-store';

const store = new VectorStore({ provider: 'mock' });
const generator = new EmbeddingsGenerator({ mockMode: true });

async function indexItems(items: CartaeItem[]) {
  const results = await generator.generateForItems(items);

  const vectors = results.map(result => ({
    id: result.itemId,
    values: result.vector,
    metadata: { title: result.text.split('\n')[0] }
  }));

  await store.addVectors(vectors);
}
```

### 2. Recherche Sémantique

```typescript
async function semanticSearch(query: string, items: CartaeItem[]) {
  // Générer embedding pour requête
  const queryVector = await generator.generateForText(query);

  // Rechercher dans vector store
  const results = await store.search(queryVector, 10);

  // Mapper vers CartaeItems
  return results.map(result =>
    items.find(item => item.id === result.id)
  );
}
```

### 3. Clustering

```typescript
async function clusterItems(items: CartaeItem[], clusters: number) {
  // Générer embeddings
  const embeddings = await generator.generateForItems(items);

  // K-means clustering (simple implémentation)
  // ...clustering logic...
}
```

## Integration Futures

### Mode Réel (LLMService)

```typescript
import { createLLMService } from '@cartae/llm-service';

const llmService = createLLMService({
  primary: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small'
  }
});

// À implémenter dans Session suivante
const generator = new EmbeddingsGenerator({
  mockMode: false,
  llmService: llmService,
  dimension: 1536
});
```

## Tests

```bash
# Lancer les tests
pnpm test

# Tests inclus:
# - CacheManager (LRU logic, TTL)
# - TextSplitter (chunking logic)
# - EmbeddingsGenerator (generation, mock mode)
```

## Statistiques

Consulter les stats de génération:

```typescript
const stats = generator.getStats();
console.log(stats);
// {
//   totalGenerated: 1000,
//   totalCached: 5000,
//   cacheStats: {
//     size: 1023,
//     hits: 5000,
//     misses: 1000,
//     total: 6000,
//     hitRate: '83.33%'
//   },
//   mockMode: true
// }
```

## Configuration Recommandée

### MVP (Tests/Development)
```typescript
new EmbeddingsGenerator({
  dimension: 1536,
  enableCache: true,
  cacheTTL: 300,        // 5 min (courte durée pour dev)
  mockMode: true
})
```

### Production (Futur)
```typescript
new EmbeddingsGenerator({
  dimension: 1536,
  enableCache: true,
  cacheTTL: 86400,      // 1 jour
  maxCacheSize: 100000,
  mockMode: false,
  llmService: productionLLM
})
```

## Limitations (MVP)

- ✅ Mock embeddings déterministes
- ❌ Pas de vrais embeddings (nécessite LLMService)
- ❌ Pas de batch API (un texte à la fois)
- ❌ Cache résiduel au runtime (pas de persistence)

## Related Packages

- `@cartae/vector-store` - Stockage vectoriel
- `@cartae/semantic-search-plugin` - Plugin search
- `@cartae/llm-service` - Service LLM (future integration)
- `@cartae/ai-types` - Types partagés

## Licence

MIT
