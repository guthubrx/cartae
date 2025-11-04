# @cartae/vector-store

Abstraction Vector Store pour stockage et recherche d'embeddings vectoriels dans Cartae.

## Description

Fournit une interface unifiée pour stocker et rechercher des vecteurs (embeddings) indépendamment du backend utilisé. Actuellement implémente un MockProvider pour tests et MVP, extensible pour ChromaDB, Pinecone, Weaviate, etc.

## Installation

```bash
pnpm add @cartae/vector-store
```

## Usage

### Créer un Vector Store (MockProvider)

```typescript
import { VectorStore } from '@cartae/vector-store';

const store = new VectorStore({
  provider: 'mock',
  dimension: 1536, // Dimension des embeddings (défaut: 1536 pour OpenAI)
});
```

### Ajouter des vecteurs

```typescript
import type { Vector } from '@cartae/vector-store';

// Ajouter un vecteur unique
const vector: Vector = {
  id: 'item-123',
  values: [0.1, 0.2, 0.3, ...], // Array de 1536 nombres
  metadata: {
    itemId: 'item-123',
    title: 'Mon Document',
    source: 'email'
  }
};

await store.addVector(vector);

// Ajouter plusieurs vecteurs (batch)
const vectors: Vector[] = [
  { id: 'item-1', values: [...] },
  { id: 'item-2', values: [...] },
  // ...
];

const result = await store.addVectors(vectors);
console.log(`Succès: ${result.success}, Erreurs: ${result.failed}`);
```

### Rechercher des vecteurs

```typescript
// Recherche par similarité cosinus
const queryVector = [0.15, 0.25, 0.35, ...]; // 1536 dimensions
const results = await store.search(queryVector, {
  limit: 10 // Top 10 résultats
});

// Résultats triés par score de similarité (décroissant)
console.log(results);
// [
//   { id: 'item-123', score: 0.95, metadata: {...} },
//   { id: 'item-456', score: 0.87, metadata: {...} },
//   ...
// ]
```

### Autres opérations

```typescript
// Compter les vecteurs
const count = await store.count();

// Vérifier l'existence
const exists = await store.exists('item-123');

// Supprimer un vecteur
await store.deleteVector('item-123');

// Supprimer plusieurs vecteurs (batch)
const result = await store.deleteVectors(['id-1', 'id-2']);

// Vider complètement
await store.clear();
```

## Architecture

### Types Principaux

```typescript
interface Vector {
  id: string;
  values: number[];           // Embedding vector
  metadata?: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  score: number;              // Similarité cosinus (0-1)
  metadata?: Record<string, unknown>;
}

interface BatchResult {
  count: number;
  success: number;
  failed: number;
  errors: string[];
}
```

### Interface Provider

Tous les providers implémentent `IVectorStoreProvider`:

```typescript
interface IVectorStoreProvider {
  addVector(vector: Vector): Promise<void>;
  addVectors(vectors: Vector[]): Promise<BatchResult>;
  search(queryVector: number[], limit?: number): Promise<SearchResult[]>;
  deleteVector(id: string): Promise<void>;
  deleteVectors(ids: string[]): Promise<BatchResult>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  clear(): Promise<void>;
}
```

### Providers Disponibles

#### MockProvider ✅ (implémenté)
- Stockage en mémoire (Map)
- Similarité cosinus pour recherche
- Parfait pour tests et MVP
- Pas de dépendance externe

#### ChromaDB ⏳ (futur)
- Base de données vectorielle open-source
- Support persistance disque
- API REST/gRPC

#### Pinecone ⏳ (futur)
- Service managé d'index vectoriel
- Serverless & scalable
- Haute performance

#### Weaviate ⏳ (futur)
- Base de données vectorielle open-source
- ML-ready, GraphQL API
- Classification intégrée

## Algorithmes

### Similarité Cosinus

Mesure l'angle entre deux vecteurs (0-1):
- `1.0` = Vecteurs identiques
- `0.5` = Angle de 60°
- `0.0` = Vecteurs perpendiculaires

```typescript
// Formule:
similarity = (A · B) / (||A|| × ||B||)

// Où:
// A · B = produit scalaire
// ||A|| = norme du vecteur A
```

### Normalisation

Convertit un vecteur en vecteur unitaire (magnitude = 1):

```typescript
normalized = vector / ||vector||
```

## Tests

```bash
# Lancer les tests
pnpm test

# Tests inclus:
# - Ajout de vecteurs (succès et erreurs)
# - Recherche par similarité
# - Batch operations
# - Gestion d'erreurs
# - Count, exists, delete operations
```

## Dépendances

- `@cartae/ai-types` - Types partagés
- `uuid` - Génération d'IDs (optionnel)

## Performances

### MockProvider
- **Ajout**: O(1) par vecteur
- **Recherche**: O(n × d) où n = nb vecteurs, d = dimension
- **Mémoire**: O(n × d) pour le stockage

Pour MVP/tests jusqu'à ~10,000 vecteurs. Pour plus gros volumes, utiliser ChromaDB/Pinecone.

## Extensibilité

Pour ajouter un nouveau provider:

```typescript
import { IVectorStoreProvider } from '@cartae/vector-store';

export class MyProvider implements IVectorStoreProvider {
  async addVector(vector: Vector): Promise<void> {
    // Implémentation custom
  }

  // ... implémenter autres méthodes
}

// Enregistrer dans VectorStore.ts
case 'my-provider':
  this.provider = new MyProvider(config);
  break;
```

## Exemples d'Usage

### Indexer des CartaeItems

```typescript
import { VectorStore } from '@cartae/vector-store';
import { EmbeddingsGenerator } from '@cartae/embeddings-generator';
import type { CartaeItem } from '@cartae/ai-types';

const store = new VectorStore({ provider: 'mock' });
const embeddings = new EmbeddingsGenerator({ /* config */ });

async function indexItems(items: CartaeItem[]) {
  for (const item of items) {
    const embedding = await embeddings.generateForItem(item);
    await store.addVector({
      id: item.id,
      values: embedding.vector,
      metadata: {
        title: item.title,
        source: item.source?.provider,
      }
    });
  }
}
```

### Recherche Sémantique

```typescript
async function semanticSearch(query: string, items: CartaeItem[]) {
  // 1. Générer embedding pour requête
  const queryEmbedding = await embeddings.generateForText(query);

  // 2. Rechercher dans le store
  const results = await store.search(queryEmbedding.vector, 10);

  // 3. Mapper résultats vers CartaeItems
  return results.map(result =>
    items.find(item => item.id === result.id)
  ).filter(Boolean);
}
```

## Related Packages

- `@cartae/embeddings-generator` - Génération d'embeddings
- `@cartae/semantic-search-plugin` - Plugin AI pour recherche
- `@cartae/ai-types` - Types partagés
- `@cartae/llm-service` - Service LLM (pour embeddings via API)

## Licence

MIT
