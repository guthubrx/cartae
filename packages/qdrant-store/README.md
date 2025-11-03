# @cartae/qdrant-store

Implémentation VectorStore via Qdrant, une base de données vectorielle open-source, self-hosted et performante.

## Fonctionnalités

- **Recherche vectorielle** : Cosine similarity, dot product, euclidean distance
- **Filtres avancés** : Filtrage sur metadata (type, tags, dates, etc.)
- **Batch operations** : Ajout/suppression multiple pour performances optimales
- **HNSW indexing** : Recherche rapide même sur millions de points
- **Snapshots** : Backup et restauration
- **Scalabilité** : Support clustering et sharding

## Prérequis

**Qdrant doit être installé et lancé :**

### Via Docker (recommandé)

```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

### Via Homebrew (macOS)

```bash
brew install qdrant
qdrant
```

### Via Binary

Télécharger depuis [qdrant.tech](https://qdrant.tech/documentation/quick-start/)

## Installation

```bash
pnpm add @cartae/qdrant-store
```

## Usage

### Initialisation

```typescript
import { QdrantVectorStore } from '@cartae/qdrant-store';
import { EmbeddingService } from '@cartae/embedding-service';
import { LLMService } from '@cartae/llm-service';

// Initialiser services
const llmService = new LLMService({ apiKey: process.env.OPENAI_API_KEY });
const embeddingService = new EmbeddingService(llmService);

// Initialiser Qdrant store
const store = new QdrantVectorStore(
  {
    url: 'http://localhost:6333',
    collectionName: 'cartae-items',
    vectorSize: 1536,
    distance: 'cosine',
  },
  embeddingService // Optionnel, pour recherche par texte
);

// Créer collection si n'existe pas
await store.initialize();
```

### Ajouter des items

```typescript
// Single item
const embedding = await embeddingService.embed('Réunion demain 14h');
await store.add('email-123', embedding, {
  id: 'email-123',
  title: 'Réunion demain',
  type: 'email',
  tags: ['urgent', 'meeting'],
  updatedAt: Date.now(),
});

// Batch (plus efficace)
const texts = ['Email 1', 'Email 2', 'Email 3'];
const embeddings = await embeddingService.embedBatch(texts);

await store.addBatch(
  embeddings.map((embedding, i) => ({
    id: `email-${i}`,
    vector: embedding,
    metadata: {
      id: `email-${i}`,
      title: texts[i],
      type: 'email',
      updatedAt: Date.now(),
    },
  }))
);
```

### Rechercher

```typescript
// Recherche par texte (nécessite EmbeddingService)
const results = await store.search('projets urgents', {
  topK: 10,
  minSimilarity: 0.7,
});

// Recherche par vecteur + filtres
const results = await store.search(embedding, {
  topK: 5,
  filter: [
    { field: 'type', operator: 'eq', value: 'email' },
    { field: 'tags', operator: 'contains', value: 'urgent' },
  ],
});

// Afficher résultats
results.forEach(result => {
  console.log(`${result.metadata.title} (similarity: ${result.similarity})`);
});
```

### CRUD Operations

```typescript
// Récupérer un item
const item = await store.get('email-123');

// Mettre à jour metadata
await store.updateMetadata('email-123', {
  tags: ['urgent', 'meeting', 'AI'],
});

// Supprimer un item
await store.delete('email-123');

// Supprimer en batch
await store.deleteBatch(['email-1', 'email-2', 'email-3']);
```

### Monitoring

```typescript
// Statistiques
const stats = await store.getStats();
console.log(`Points indexés: ${stats.totalPoints}`);
console.log(`Dimension: ${stats.vectorDimension}`);

// Health check
const isHealthy = await store.health();
console.log(`Qdrant accessible: ${isHealthy}`);
```

### Backup

```typescript
// Créer snapshot
const snapshotId = await store.snapshot();
console.log(`Snapshot créé: ${snapshotId}`);

// Restaurer (nécessite accès filesystem Qdrant)
await store.restore(snapshotId);
```

## Architecture Qdrant

```
Qdrant Server (localhost:6333)
├── Collection: cartae-items
│   ├── Points (vecteurs + metadata)
│   │   ├── Point 1: {id, vector, payload}
│   │   ├── Point 2: {id, vector, payload}
│   │   └── ...
│   ├── Index HNSW (recherche rapide)
│   └── Payloads (metadata indexée)
```

## Performance

**Benchmarks (10k points, 1536 dimensions) :**

- **Insertion single** : ~5-10ms/point
- **Insertion batch (100)** : ~50-100ms (0.5-1ms/point)
- **Search (top 10)** : ~10-30ms
- **Search + filtres** : ~20-50ms

**Scalabilité :**

- 1M points : ~100-200ms search
- 10M points : ~200-500ms search (avec HNSW optimisé)

## Comparaison avec autres vector stores

| Feature         | Qdrant  | Pinecone    | Milvus     | ChromaDB    |
| --------------- | ------- | ----------- | ---------- | ----------- |
| Open-source     | ✅      | ❌          | ✅         | ✅          |
| Self-hosted     | ✅      | ❌          | ✅         | ✅          |
| Filtres avancés | ✅      | ✅          | ✅         | ❌          |
| Scalabilité     | Moyenne | Haute       | Très haute | Faible      |
| Setup           | Facile  | Très facile | Moyen      | Très facile |
| Coût            | Gratuit | $70+/mois   | Gratuit    | Gratuit     |

## Troubleshooting

### "Connection refused"

→ Vérifier que Qdrant tourne : `curl http://localhost:6333/collections`

### "Collection not found"

→ Appeler `await store.initialize()` avant usage

### Performance lente

→ Optimiser HNSW config : augmenter `m` et `ef_construct` lors de `createCollection`

## Ressources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [API Reference](https://qdrant.tech/documentation/api-reference/)
- [Performance Tuning](https://qdrant.tech/documentation/guides/optimization/)
