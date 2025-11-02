# @cartae/core

**Format universel CartaeItem pour l'écosystème Cartae**

Ce package contient le format de données central utilisé par tous les composants Cartae pour représenter n'importe quelle information provenant de sources diverses (emails, tasks, documents, messages, events, notes).

## 🎯 Objectif

Fournir une interface unifiée permettant de :

- Représenter n'importe quelle donnée de manière cohérente
- Être compatible avec les standards W3C (JSON-LD, Activity Streams)
- Permettre l'enrichissement AI (sentiment, priorité, connexions)
- Supporter un graphe de relations entre items
- Être extensible pour des cas d'usage spécifiques

## 📦 Installation

```bash
pnpm add @cartae/core
```

## 🚀 Usage

### Créer un CartaeItem simple

```typescript
import { createCartaeItem } from '@cartae/core';

const item = createCartaeItem({
  type: 'email',
  title: 'Important meeting follow-up',
  content: 'Email body...',
  connector: 'office365',
  originalId: 'AAMkAGI2...',
  tags: ['urgent', 'meeting'],
  metadata: {
    author: 'john@company.com',
    priority: 'high',
  },
});
```

### Créer un email avec helper dédié

```typescript
import { createEmailItem } from '@cartae/core';

const email = createEmailItem({
  title: 'Project update',
  content: 'Here is the status...',
  connector: 'office365',
  originalId: 'msg-123',
  from: 'alice@company.com',
  to: ['bob@company.com'],
  subject: 'Project X - Update Q1',
  tags: ['project-x', 'q1'],
});
```

### Créer une task

```typescript
import { createTaskItem } from '@cartae/core';

const task = createTaskItem({
  title: 'Review budget proposal',
  connector: 'planner',
  originalId: 'task-456',
  status: 'in_progress',
  priority: 'high',
  dueDate: new Date('2025-11-15'),
  assignee: 'bob@company.com',
  tags: ['budget', 'finance'],
});
```

### Valider un CartaeItem

```typescript
import { validateCartaeItem, parseCartaeItem } from '@cartae/core';

// Safe validation (retourne un Result)
const result = validateCartaeItem(someData);
if (result.success) {
  console.log('Valid item:', result.data);
} else {
  console.error('Validation errors:', result.error);
}

// Parse (throw si invalide)
try {
  const item = parseCartaeItem(someData);
  // item est garanti valide ici
} catch (error) {
  console.error('Invalid data:', error);
}
```

### Relations entre items

```typescript
import { createCartaeItem } from '@cartae/core';

const parentItem = createCartaeItem({
  type: 'document',
  title: 'Project charter',
  connector: 'sharepoint',
  originalId: 'doc-789',
  tags: ['project-x'],
});

const childItem = createCartaeItem({
  type: 'task',
  title: 'Review charter section 3',
  connector: 'planner',
  originalId: 'task-101',
  relationships: [
    {
      type: 'parent',
      targetId: parentItem.id,
      metadata: {
        createdBy: 'user',
        createdAt: new Date(),
      },
    },
  ],
  tags: ['project-x', 'review'],
});
```

## 🧩 Structure du CartaeItem

```typescript
interface CartaeItem {
  // Identité
  id: string; // UUID v4
  type: CartaeItemType; // email | task | document | message | event | note

  // Contenu
  title: string;
  content?: string;

  // JSON-LD (W3C)
  '@context'?: string | string[] | Record<string, unknown>;
  '@type'?: string | string[];

  // Métadonnées enrichies
  metadata: CartaeMetadata;

  // Relations & Classification
  relationships?: CartaeRelationship[];
  tags: string[]; // Folksonomy
  categories?: string[]; // Taxonomy (SKOS)

  // Source tracking
  source: {
    connector: string;
    originalId: string;
    url?: string;
    lastSync: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Flags
  archived?: boolean;
  favorite?: boolean;
}
```

## 🤖 Enrichissement AI

CartaeItem supporte l'enrichissement automatique par AI :

```typescript
const item = createCartaeItem({
  type: 'email',
  title: 'URGENT: Budget approval needed',
  content: 'We need your approval ASAP...',
  connector: 'office365',
  originalId: 'msg-999',
  metadata: {
    aiInsights: {
      sentiment: -0.3, // Slightly negative
      priorityScore: 0.95, // Very high priority
      suggestedTags: ['urgent', 'budget', 'approval'],
      connections: ['uuid-of-related-task'],
      confidence: 0.92,
      topics: ['budget-planning', 'approvals'],
    },
  },
});
```

## 📚 API Reference

### Factory Functions

- `createCartaeItem(options)` - Créer un item générique
- `createValidatedCartaeItem(options)` - Créer + valider
- `createEmailItem(options)` - Créer un email
- `createTaskItem(options)` - Créer une task
- `createDocumentItem(options)` - Créer un document
- `createMessageItem(options)` - Créer un message chat
- `createEventItem(options)` - Créer un événement calendrier
- `cloneCartaeItem(item, updates)` - Cloner un item
- `isValidCartaeItem(item)` - Vérifier validité

### Validation Functions

- `validateCartaeItem(data)` - Valider (safe)
- `parseCartaeItem(data)` - Parser (throw si erreur)

### Type Guards

- `isCartaeItem(obj)` - Vérifier type CartaeItem
- `isCartaeMetadata(obj)` - Vérifier type metadata
- `isCartaeRelationship(obj)` - Vérifier type relationship
- `isAIInsights(obj)` - Vérifier type AI insights

### Utility Functions

- `getInverseRelationType(type)` - Obtenir type relation inverse

## 🔗 Standards & Interopérabilité

CartaeItem est compatible avec :

- **JSON-LD** : Contexte sémantique W3C
- **Activity Streams 2.0** : Vocabulaire W3C pour activités sociales
- **SKOS** : Simple Knowledge Organization System (pour catégories)

Export JSON-LD :

```typescript
const item = createEmailItem({ ... });

// Item peut être sérialisé en JSON-LD standard
const jsonLd = {
  '@context': item['@context'],
  '@type': item['@type'],
  '@id': item.id,
  name: item.title,
  content: item.content,
  // ... autres propriétés mappées
};
```

## 🧪 Tests

```bash
# Run tests
pnpm test

# Coverage
pnpm test:coverage
```

## 📖 Documentation

Voir [TRANSFORMATION_PLAN_01_ARCHITECTURE.md](../../TRANSFORMATION_PLAN_01_ARCHITECTURE.md) pour l'architecture complète.

## 📝 License

MIT
