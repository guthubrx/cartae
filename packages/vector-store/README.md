# @cartae/vector-store

Interfaces abstraites pour stockage vectoriel. Permet de changer d'implémentation (Qdrant, Pinecone, Milvus, etc.) sans toucher le code métier.

## Concept

Ce package définit **uniquement les interfaces** pour un vector store. Les implémentations concrètes sont dans des packages séparés :

- `@cartae/qdrant-store` : Implémentation Qdrant (open-source, self-hosted)
- `@cartae/pinecone-store` : Implémentation Pinecone (cloud, managed)
- `@cartae/milvus-store` : Implémentation Milvus (open-source, scalable)

## Installation

```bash
pnpm add @cartae/vector-store
```

## Interfaces principales

### VectorStore

Interface principale pour un vector store :

```typescript
interface VectorStore {
  // CRUD operations
  add(id: string, vector: number[], metadata: CartaeItemMetadata): Promise<void>;
  addBatch(items: Array<{...}>): Promise<void>;
  get(id: string): Promise<SearchResult | null>;
  delete(id: string): Promise<void>;
  deleteBatch(ids: string[]): Promise<void>;

  // Search
  search(query: string | number[], options: SearchOptions): Promise<SearchResult[]>;

  // Metadata
  updateMetadata(id: string, metadata: Partial<CartaeItemMetadata>): Promise<void>;

  // Monitoring
  getStats(): Promise<VectorStoreStats>;
  health(): Promise<boolean>;

  // Maintenance
  clear(): Promise<void>;
  snapshot?(): Promise<string>;
  restore?(snapshotId: string): Promise<void>;
}
```

### CartaeItemMetadata

Metadata attachée à chaque item :

```typescript
interface CartaeItemMetadata {
  id: string;
  title: string;
  type: 'email' | 'note' | 'task' | 'event' | 'message' | string;
  tags?: string[];
  sourceId?: string;
  updatedAt: number;
  [key: string]: any; // Champs additionnels
}
```

### SearchOptions

Options pour la recherche vectorielle :

```typescript
interface SearchOptions {
  topK: number; // Nombre de résultats
  filter?: FilterCondition[]; // Filtres (AND logique)
  minSimilarity?: number; // Score minimum (0-1)
}
```

### FilterCondition

Filtrage sur metadata :

```typescript
interface FilterCondition {
  field: string; // ex: "type", "tags"
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}
```

## Usage (avec implémentation)

```typescript
import type { VectorStore } from '@cartae/vector-store';
import { QdrantVectorStore } from '@cartae/qdrant-store';

// Initialiser store (injection de dépendance)
const store: VectorStore = new QdrantVectorStore({
  url: 'http://localhost:6333',
  collectionName: 'cartae-items',
});

// Ajouter un item
await store.add('email-123', embedding, {
  id: 'email-123',
  title: 'Réunion demain',
  type: 'email',
  tags: ['urgent'],
  updatedAt: Date.now(),
});

// Rechercher items similaires
const results = await store.search('projets urgents', {
  topK: 10,
  filter: [
    { field: 'type', operator: 'eq', value: 'email' },
    { field: 'tags', operator: 'contains', value: 'urgent' },
  ],
  minSimilarity: 0.7,
});

// Afficher résultats
results.forEach(result => {
  console.log(`${result.metadata.title} (${result.similarity})`);
});
```

## Pattern de conception

**Repository Pattern + Adapter Pattern**

- **Repository** : Abstraction du stockage (interface VectorStore)
- **Adapter** : Implémentations concrètes (QdrantStore, PineconeStore, etc.)

Avantages :

- ✅ Changement d'implémentation sans toucher le code métier
- ✅ Facilite les tests (mock du VectorStore)
- ✅ Permet comparaison de performances entre implémentations
- ✅ Permet migration progressive (Qdrant → Pinecone)

## Choix d'implémentation

| Implémentation | Open-source | Self-hosted | Scalabilité | Complexité  | Coût      |
| -------------- | ----------- | ----------- | ----------- | ----------- | --------- |
| Qdrant         | ✅          | ✅          | Moyenne     | Faible      | Gratuit   |
| Pinecone       | ❌          | ❌          | Haute       | Très faible | $70+/mois |
| Milvus         | ✅          | ✅          | Très haute  | Moyenne     | Gratuit   |
| ChromaDB       | ✅          | ✅          | Faible      | Très faible | Gratuit   |

**Recommandation Cartae :**

- **Dev/MVP** : ChromaDB (embedded, simple)
- **Production small** : Qdrant (self-hosted, performant)
- **Production large** : Milvus ou Pinecone (scalabilité)
