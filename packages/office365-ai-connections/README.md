# @cartae/office365-ai-connections

Détection automatique de connexions sémantiques entre items Office365 en utilisant la similarité vectorielle et des critères multiples.

## 🎯 Objectif

Ce package détecte automatiquement les relations entre emails, tâches, documents et autres items Office365 en analysant :

- **Similarité sémantique** (embeddings vectoriels via pgvector)
- **Proximité temporelle** (items proches dans le temps)
- **Concordance de sentiment** (même tonalité émotionnelle)
- **Concordance de priorité** (même niveau d'urgence)
- **Participants communs** (personnes partagées)
- **Tags communs** (catégories partagées)

## 🚀 Fonctionnalités

### 1. **ConnectionDetector**

Détecte les connexions sémantiques entre items en utilisant :

- Recherche vectorielle (cosine similarity via pgvector HNSW)
- Analyse multi-critères avec poids configurables
- Génération automatique de `CartaeRelationship`

### 2. **RelationshipScorer**

Calcule un score composite de connexion basé sur :

```typescript
score =
  (0.4 × vectorSimilarity) +
  (0.15 × temporalSimilarity) +
  (0.1 × sentimentAlignment) +
  (0.1 × priorityAlignment) +
  (0.15 × sharedParticipants) +
  (0.1 × sharedTags)
```

Les poids sont configurables selon le use case.

### 3. **Persistance PostgreSQL**

Stockage des connexions détectées dans une table `connections` optimisée :

- Index sur `source_id` et `target_id`
- Recherche rapide des connexions d'un item
- Historique des connexions avec timestamps

## 📦 Installation

```bash
pnpm add @cartae/office365-ai-connections
```

## 🔧 Usage

### Détection basique

```typescript
import { ConnectionDetector } from '@cartae/office365-ai-connections';
import { DatabaseClient } from '@cartae/database-api';

const dbClient = new DatabaseClient({ baseUrl: 'http://localhost:3001' });
const detector = new ConnectionDetector(dbClient);

// Détecter connexions pour un item
const result = await detector.detectConnections(emailItem, {
  minScore: 0.6, // Seuil minimum
  maxConnections: 10, // Max 10 connexions
  temporalWindowDays: 30, // Dernier mois uniquement
});

console.log(`${result.connections.length} connexions trouvées`);
result.connections.forEach(conn => {
  console.log(`→ ${conn.targetItem.title} (score: ${conn.overallScore.toFixed(2)})`);
  console.log(`  Raison: ${conn.reason}`);
});
```

### Configuration avancée

```typescript
const result = await detector.detectConnections(item, {
  minScore: 0.7,
  maxConnections: 5,

  // Poids personnalisés (favoriser similarité sémantique)
  weights: {
    vectorSimilarity: 0.6,
    temporalSimilarity: 0.1,
    sentimentAlignment: 0.05,
    priorityAlignment: 0.05,
    sharedParticipants: 0.15,
    sharedTags: 0.05,
  },

  // Filtrer types
  itemTypes: ['email', 'task'],
});
```

### Détection batch

```typescript
// Détecter connexions pour plusieurs items
const items = await dbClient.search('projet X', 50);
const results = await Promise.all(
  items.results.map(({ item }) => detector.detectConnections(item))
);

console.log(`Total: ${results.reduce((sum, r) => sum + r.totalFound, 0)} connexions`);
```

### Persistance des connexions

```typescript
// Ajouter connexions détectées à l'item source
for (const connection of result.connections) {
  emailItem.relationships = emailItem.relationships || [];
  emailItem.relationships.push(connection.relationship);
}

// Sauvegarder dans PostgreSQL
await dbClient.parse(emailItem);
```

## 🏗️ Architecture

```
@cartae/office365-ai-connections/
├── src/
│   ├── types.ts                    # Types TypeScript
│   ├── ConnectionDetector.ts       # Détection connexions (vectoriel)
│   ├── RelationshipScorer.ts       # Scoring multi-critères
│   ├── Office365AIConnectionsPlugin.ts # Plugin principal
│   └── __tests__/
│       ├── ConnectionDetector.test.ts
│       └── RelationshipScorer.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 📊 Critères de Scoring

### 1. **Similarité Vectorielle** (poids: 0.4)

- Cosine similarity entre embeddings
- Utilise index HNSW pgvector (< 20ms sur 100k items)
- Range: 0-1 (1 = sémantiquement identiques)

### 2. **Similarité Temporelle** (poids: 0.15)

- Proximité dans le temps
- Formule: `1 - (diff_days / temporal_window)`
- Items du même jour = score 1.0

### 3. **Concordance de Sentiment** (poids: 0.1)

- Même sentiment (positive/neutral/negative)
- Items avec sentiment identique = score 1.0
- Sentiments opposés = score 0.0

### 4. **Concordance de Priorité** (poids: 0.1)

- Même niveau de priorité (low/medium/high/critical)
- Même priorité = score 1.0
- Écart 1 niveau = 0.66, 2 niveaux = 0.33, 3+ = 0.0

### 5. **Participants Communs** (poids: 0.15)

- Ratio de participants partagés
- Formule: `shared / min(participants_A, participants_B)`
- Tous participants identiques = score 1.0

### 6. **Tags Communs** (poids: 0.1)

- Ratio de tags partagés
- Formule: `shared / min(tags_A, tags_B)`
- Tous tags identiques = score 1.0

## 🧪 Tests

```bash
# Tests unitaires
pnpm test

# Tests avec coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

## 🔗 Dépendances

- `@cartae/core` - Types CartaeItem, CartaeRelationship
- `@cartae/database-api` - Client PostgreSQL + pgvector
- `@cartae/office365-connector-core` - Types Office365
- `@cartae/office365-ai-enrichment` - Enrichissement IA (priorité, sentiment)

## 📚 Documentation

- [Architecture complète](../../docs/architecture/ai-connections.md)
- [Guide développeur](../../docs/guides/ai-connections-dev.md)
- [API Reference](../../docs/api/office365-ai-connections.md)

## 🛠️ Roadmap

- [x] Architecture base + types
- [ ] ConnectionDetector (Session 72.2)
- [ ] RelationshipScorer (Session 72.3)
- [ ] Persistance PostgreSQL (Session 72.4)
- [ ] API endpoints + Tests (Session 72.5)
- [ ] Viz connexions (Session 74.3)

---

**Session:** 72 - Office365 AI Connections
**Status:** 🚧 En cours
**Version:** 1.0.0-alpha
