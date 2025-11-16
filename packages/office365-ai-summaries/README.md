# @cartae/office365-ai-summaries

Génération automatique de résumés pour emails et threads Office365.

## 🎯 Fonctionnalités

- **Résumés extractifs** - Extraction des phrases clés du texte original
- **Résumés de threads** - Résumés de conversations complètes
- **Points clés** - Extraction automatique des informations importantes
- **Topics** - Détection des sujets principaux
- **Action items** - Extraction des actions à faire
- **Support multi-longueurs** - Short, medium, long

## 📦 Installation

```bash
pnpm add @cartae/office365-ai-summaries
```

## 🚀 Usage

### Résumé simple

```typescript
import { SummaryGenerator } from '@cartae/office365-ai-summaries';

const generator = new SummaryGenerator();

const result = await generator.generateSummary(emailItem, {
  length: 'medium',
  method: 'extractive',
  maxKeyPoints: 5,
});

console.log(result.summary.text);
console.log(result.summary.keyPoints);
```

### Résumé de thread

```typescript
import { ThreadSummarizer } from '@cartae/office365-ai-summaries';

const summarizer = new ThreadSummarizer();

const result = await summarizer.generateThreadSummary(threadItems, 'thread-id-123', {
  includeParticipants: true,
  includeTimeline: true,
});

console.log(result.summary.text);
console.log(result.summary.participants);
```

## 📊 Types de résumés

- `extractive` - Extrait phrases importantes
- `abstractive` - Génère nouveau texte (LLM, future)
- `thread` - Résumé de conversation
- `bullet_points` - Liste à puces

## 🔧 Options

- `length` - 'short' | 'medium' | 'long'
- `method` - 'extractive' | 'llm' | 'hybrid'
- `maxKeyPoints` - Nombre max de points clés
- `extractActionItems` - Extraire les actions
- `detectTopics` - Détecter les topics

---

**Status:** ✅ Complété
**Version:** 1.0.0
