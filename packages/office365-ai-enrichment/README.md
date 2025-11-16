# @cartae/office365-ai-enrichment

Plugin d'enrichissement IA pour emails Office365.

## 🎯 Fonctionnalités

Ce package fournit une analyse automatique des emails Office365 avec :

### 1. **Analyse de Sentiment** (`SentimentAnalyzer`)

- Détecte le sentiment (positif, négatif, neutre)
- Score de confiance (0-1)
- Identifie les mots-clés qui influencent le sentiment
- Support français + anglais

### 2. **Scoring de Priorité** (`PriorityAnalyzer`)

- Score de priorité (0-100)
- 3 facteurs analysés :
  - Mots-clés urgents (max 40 points)
  - Importance de l'émetteur (max 30 points)
  - Complexité du contenu (max 30 points)
- Explication textuelle du score

### 3. **Extraction de Deadlines** (`DeadlineExtractor`)

- Détecte les dates limites dans le texte
- Support pour :
  - Dates explicites ("Deadline: 25 décembre")
  - Dates relatives ("tomorrow", "next week", "demain")
- Score de confiance basé sur la précision de la date

### 4. **Extraction d'Action Items** (`ActionItemExtractor`)

- Extrait les tâches à faire depuis :
  - Listes à puces (-, \*, 1., [ ])
  - TODOs explicites
  - Phrases impératives ("Envoyer le rapport")
  - Requêtes en anglais ("Please review...")
- Déduplique les items similaires

## 📦 Installation

```bash
pnpm add @cartae/office365-ai-enrichment
```

## 🚀 Usage

### Service d'Enrichissement (Standalone)

```typescript
import { EnrichmentService } from '@cartae/office365-ai-enrichment';

// Créer le service
const service = new EnrichmentService({
  enableSentiment: true,
  enablePriority: true,
  enableDeadline: true,
  enableActionItems: true,
  urgentKeywords: ['hot', 'fire'], // Mots-clés urgents personnalisés
  importantSenders: ['ceo@company.com'], // Émetteurs importants
});

// Enrichir un email
const enrichment = await service.enrichEmail(
  'URGENT: Projet à livrer',
  'Voici les tâches urgentes...',
  'manager@company.com'
);

console.log(enrichment);
// {
//   sentiment: { sentiment: 'neutral', confidence: 0.3, keywords: [...] },
//   priority: { score: 75, factors: {...}, reasoning: '...' },
//   deadline: { deadline: Date(...), confidence: 0.9, extractedText: '...' },
//   actionItems: [{ text: '...', confidence: 0.9, context: '...' }],
//   enrichedAt: Date(...)
// }
```

### Plugin Cartae (Intégration EventBus)

```typescript
import { Office365AIEnrichmentPlugin } from '@cartae/office365-ai-enrichment';

// Créer le plugin
const plugin = new Office365AIEnrichmentPlugin({
  enableSentiment: true,
  enablePriority: true,
  enableDeadline: true,
  enableActionItems: true,
});

// Activer le plugin
await plugin.activate(context);

// Le plugin écoute automatiquement les événements:
// - item:created
// - item:updated
//
// Et enrichit automatiquement les emails Office365
```

### Analyzers Individuels

```typescript
import {
  SentimentAnalyzer,
  PriorityAnalyzer,
  DeadlineExtractor,
  ActionItemExtractor,
} from '@cartae/office365-ai-enrichment';

// Sentiment
const sentimentAnalyzer = new SentimentAnalyzer();
const sentiment = sentimentAnalyzer.analyze('Excellent travail!');
// { sentiment: 'positive', confidence: 0.6, keywords: ['excellent', 'travail'] }

// Priority
const priorityAnalyzer = new PriorityAnalyzer();
const priority = priorityAnalyzer.analyze(
  'URGENT: Réponse requise',
  "Besoin d'une réponse immédiate",
  'ceo@company.com'
);
// { score: 85, factors: {...}, reasoning: '...' }

// Deadline
const deadlineExtractor = new DeadlineExtractor();
const deadline = deadlineExtractor.extract('Projet', 'Deadline: demain 17h');
// { deadline: Date(...), confidence: 0.9, extractedText: 'demain 17h' }

// Action Items
const actionExtractor = new ActionItemExtractor();
const actions = actionExtractor.extract('Tasks', '- Envoyer le rapport\n- Valider les données');
// [
//   { text: 'Envoyer le rapport', confidence: 0.9, context: '...' },
//   { text: 'Valider les données', confidence: 0.9, context: '...' }
// ]
```

## ⚙️ Configuration

### EnrichmentService

```typescript
const service = new EnrichmentService({
  // Activer/désactiver les analyses
  enableSentiment: true,
  enablePriority: true,
  enableDeadline: true,
  enableActionItems: true,

  // Mots-clés urgents personnalisés
  urgentKeywords: ['hot', 'fire', 'asap'],

  // Émetteurs importants (email complets)
  importantSenders: ['ceo@company.com', 'cto@company.com'],
});

// Mise à jour dynamique de la config
service.updateConfig({
  enableSentiment: false,
  urgentKeywords: ['critical', 'emergency'],
});
```

### Personnalisation des Analyzers

```typescript
// Ajouter des mots-clés de sentiment
service.addPositiveSentimentKeyword('awesome');
service.addNegativeSentimentKeyword('disaster');

// Ajouter des verbes d'action
service.addActionVerb('implement');

// Accès direct aux analyzers
const priorityAnalyzer = new PriorityAnalyzer();
priorityAnalyzer.addUrgentKeyword('hot');
priorityAnalyzer.addImportantSender('vip@company.com');
```

## 🧪 Tests

```bash
# Exécuter les tests
pnpm test

# Avec coverage
pnpm test --coverage
```

## 📊 Résultats des Analyses

### SentimentResult

```typescript
{
  sentiment: 'positive' | 'negative' | 'neutral',
  confidence: number, // 0-1
  keywords: string[] // Mots-clés trouvés
}
```

### PriorityResult

```typescript
{
  score: number, // 0-100
  factors: {
    urgentKeywords: number, // 0-40
    senderImportance: number, // 0-30
    contentComplexity: number // 0-30
  },
  reasoning: string // Explication textuelle
}
```

### DeadlineResult

```typescript
{
  deadline: Date | null,
  confidence: number, // 0-1
  extractedText: string // Texte original parsé
}
```

### ActionItem

```typescript
{
  text: string, // Texte de l'action
  confidence: number, // 0-1
  context: string // Contexte autour de l'action
}
```

## 🌍 Support Multilingue

- **Français** : Support complet (mots-clés, patterns, dates)
- **Anglais** : Support complet (keywords, patterns, dates)

## 🔧 Dépendances

- `chrono-node` : Parsing de dates en langage naturel
- `@cartae/core` : Types Cartae (CartaeItem)
- `@cartae/office365-plugin` : Interfaces plugin

## 📝 Licence

Propriétaire - Cartae Team

## 🤝 Contribuer

Pour contribuer à ce package, voir le guide de contribution principal de Cartae.

---

**Session 71** - Office365 AI Enrichment Plugin
Generated with Claude Code (16 Nov 2025)
