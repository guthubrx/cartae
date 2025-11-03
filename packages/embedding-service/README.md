# @cartae/embedding-service

Service de génération d'embeddings vectoriels avec cache local pour optimiser les appels API.

## Fonctionnalités

- **Cache local** : Évite les appels API redondants (Map en mémoire)
- **Batch processing** : Génère plusieurs embeddings en une seule requête
- **Statistiques** : Monitoring du hit rate et de la taille du cache
- **Import/Export** : Sauvegarde et restauration du cache
- **Limite mémoire** : Cache limité pour éviter consommation excessive

## Installation

```bash
pnpm add @cartae/embedding-service
```

## Usage

### Initialisation

```typescript
import { EmbeddingService } from '@cartae/embedding-service';
import { LLMService } from '@cartae/llm-service';

const llmService = new LLMService({ apiKey: process.env.OPENAI_API_KEY });
const embeddingService = new EmbeddingService(llmService, 10000); // Cache max: 10000
```

### Générer un embedding

```typescript
const embedding = await embeddingService.embed('Mon texte à indexer');
// embedding = [0.123, -0.456, 0.789, ...] (1536 dimensions par défaut)
```

### Batch processing

```typescript
const embeddings = await embeddingService.embedBatch([
  'Premier texte',
  'Deuxième texte',
  'Troisième texte',
]);
// embeddings[0] correspond à "Premier texte", etc.
```

### Statistiques

```typescript
const stats = embeddingService.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
console.log(`Cache size: ${stats.cacheSize}`);
```

### Sauvegarder le cache

```typescript
// Export
const cacheData = embeddingService.exportCache();
await fs.writeFile('cache.json', JSON.stringify(cacheData));

// Import
const cacheData = JSON.parse(await fs.readFile('cache.json', 'utf-8'));
embeddingService.importCache(cacheData);
```

## Architecture

```
EmbeddingService
├── Cache (Map<string, number[]>)
│   └── Clé: "model:text"
│   └── Valeur: embedding vector
├── Compteurs (hits, misses)
└── LLMService (appels API)
```

## Performance

- **Cache hit** : ~0ms (lecture Map)
- **Cache miss** : ~100-500ms (appel API OpenAI)
- **Batch (10 textes)** : ~200-600ms (vs 1000-5000ms si séquentiel)

## Limites

- Cache en mémoire uniquement (perdu au redémarrage)
- Limite de 10000 embeddings par défaut (configurable)
- Pas de TTL (time to live) sur le cache

## Roadmap

- [ ] Support Redis pour cache persistant
- [ ] TTL configurable par entrée
- [ ] Compression des embeddings (réduire mémoire)
- [ ] Métriques Prometheus
