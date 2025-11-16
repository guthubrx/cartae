# Office365 AI Components

Composants React pour visualiser les métadonnées IA enrichies des emails Office365.

## 🎯 Composants

### PriorityTimeline

Timeline chronologique avec coloration par priorité.

```tsx
import { PriorityTimeline } from '@cartae/ui/office365';

<PriorityTimeline
  items={emails}
  onItemClick={item => console.log('Clicked:', item)}
  showLegend={true}
  showDateLabels={true}
/>;
```

**Props:**

- `items: EnrichedOffice365Item[]` - Items à afficher
- `onItemClick?: (item) => void` - Callback au clic
- `showDateLabels?: boolean` - Afficher dates (défaut: true)
- `showLegend?: boolean` - Afficher légende priorités (défaut: true)
- `itemHeight?: number` - Hauteur item en px (défaut: 60)
- `itemSpacing?: number` - Espacement entre items (défaut: 8)

**Couleurs priorités:**

- 🔴 **Critique** (#EF4444) - Urgent, action immédiate requise
- 🟠 **Haute** (#F97316) - Important, traiter rapidement
- 🟡 **Moyenne** (#EAB308) - Normal, traiter dans les délais
- 🟢 **Basse** (#22C55E) - FYI, pas urgent

---

### AIMetadataFiltersPanel

Panneau de filtres interactif pour métadonnées IA.

```tsx
import { AIMetadataFiltersPanel } from '@cartae/ui/office365';

const [filters, setFilters] = useState<AIMetadataFilters>({
  priorities: [],
  sentiments: [],
});

<AIMetadataFiltersPanel
  filters={filters}
  onFiltersChange={setFilters}
  showCount={true}
  matchingCount={42}
/>;
```

**Props:**

- `filters: AIMetadataFilters` - Filtres actuels
- `onFiltersChange: (filters) => void` - Callback changement
- `compact?: boolean` - Mode compact (sidebar)
- `showCount?: boolean` - Afficher count résultats
- `matchingCount?: number` - Nombre résultats matchant

**Filtres disponibles:**

- ✅ **Priorité** - Critical, High, Medium, Low
- 😄 **Sentiment** - Very Positive, Positive, Neutral, Negative, Very Negative
- ✓ **Action Items** - Emails avec actions à faire
- ⏰ **Deadline** - Emails avec deadline
- 🔗 **Connexions** - Emails avec liens sémantiques
- 📅 **Plage de dates** - Filtrer par période

---

### ConnectionsGraph

Visualisation interactive des connexions sémantiques (force-directed graph).

```tsx
import { ConnectionsGraph } from '@cartae/ui/office365';

<ConnectionsGraph
  centerItem={selectedEmail}
  connectedItems={relatedEmails}
  connections={semanticLinks}
  onNodeClick={item => navigate(`/email/${item.id}`)}
  width={800}
  height={600}
/>;
```

**Props:**

- `centerItem: EnrichedOffice365Item` - Item central (focus)
- `connectedItems: EnrichedOffice365Item[]` - Items liés
- `connections: Connection[]` - Edges (liens)
- `onNodeClick?: (item) => void` - Callback clic node
- `width?: number` - Largeur canvas (défaut: 800)
- `height?: number` - Hauteur canvas (défaut: 600)
- `showLabels?: boolean` - Afficher labels (défaut: true)
- `showScores?: boolean` - Afficher scores (défaut: true)

**Connection interface:**

```ts
interface Connection {
  sourceId: string;
  targetId: string;
  score: number; // 0-1, force du lien
  reason?: string; // Explication du lien
}
```

**Interactions:**

- 🖱️ **Hover** - Highlight node + affiche détails
- 🖱️ **Click** - Callback onNodeClick
- 🎨 **Couleurs** - Nodes colorés par priorité
- 📏 **Épaisseur liens** - Proportionnelle au score

---

### AIMetadataBadges

Badges compacts pour métadonnées IA.

```tsx
import { AIMetadataBadges } from '@cartae/ui/office365';

<AIMetadataBadges
  item={email}
  compact={false}
  show={{
    priority: true,
    sentiment: true,
    actionItems: true,
    deadline: true,
  }}
/>;
```

**Props:**

- `item: EnrichedOffice365Item` - Item à badger
- `compact?: boolean` - Mode icônes seulement
- `show?: object` - Quels badges afficher (défaut: tous)

**Badges disponibles:**

- ⚡ **Priorité** - Niveau + couleur
- 😄 **Sentiment** - Emoji + label
- ✓ **Actions** - Nombre d'actions
- ⏰ **Deadline** - Date + animation si urgent
- 🔗 **Connexions** - Nombre de liens
- 📝 **Résumé** - Résumé IA dispo

---

### PriorityIndicator & SentimentIndicator

Indicateurs standalone (gros badges).

```tsx
import { PriorityIndicator, SentimentIndicator } from '@cartae/ui/office365';

<PriorityIndicator level="critical" score={0.95} />
<SentimentIndicator type="positive" score={0.78} />
```

---

## 🎨 Types

### EnrichedOffice365Item

```ts
interface EnrichedOffice365Item extends CartaeItem {
  aiViz?: AIVisualizationData;
}

interface AIVisualizationData {
  priority?: {
    level: PriorityLevel;
    score: number;
    color: string;
  };
  sentiment?: {
    type: SentimentType;
    score: number;
    color: string;
  };
  hasActionItems?: boolean;
  actionItemCount?: number;
  hasDeadline?: boolean;
  deadlineDate?: Date;
  hasConnections?: boolean;
  connectionCount?: number;
  hasSummary?: boolean;
}
```

### AIMetadataFilters

```ts
interface AIMetadataFilters {
  priorities: PriorityLevel[];
  sentiments: SentimentType[];
  hasActionItems?: boolean;
  hasDeadline?: boolean;
  hasConnections?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
```

---

## 🎨 Palettes de couleurs

### Priorités

```ts
const PRIORITY_COLORS = {
  critical: '#EF4444', // Rouge
  high: '#F97316', // Orange
  medium: '#EAB308', // Jaune
  low: '#22C55E', // Vert
  none: '#94A3B8', // Gris
};
```

### Sentiments

```ts
const SENTIMENT_COLORS = {
  very_positive: '#10B981', // Vert vif
  positive: '#84CC16', // Lime
  neutral: '#94A3B8', // Gris
  negative: '#F59E0B', // Orange
  very_negative: '#EF4444', // Rouge
};
```

---

## 📦 Installation

```bash
pnpm add @cartae/ui
```

```tsx
import {
  PriorityTimeline,
  AIMetadataFiltersPanel,
  ConnectionsGraph,
  AIMetadataBadges,
} from '@cartae/ui/office365';
```

---

## 🧪 Tests

Tests unitaires avec Vitest + React Testing Library.

```bash
pnpm test packages/ui/src/components/office365
```

**Coverage:**

- ✅ PriorityTimeline - Rendu, tri, groupage, clicks
- ✅ AIMetadataFiltersPanel - Tous filtres, reset, collapse
- ✅ AIMetadataBadges - Tous badges, compact, urgence
- ✅ ConnectionsGraph - Canvas, physics, interactions

---

## 🎯 Exemples d'utilisation

### Dashboard complet

```tsx
function EmailDashboard() {
  const [emails, setEmails] = useState<EnrichedOffice365Item[]>([]);
  const [filters, setFilters] = useState<AIMetadataFilters>({
    priorities: [],
    sentiments: [],
  });

  // Filtrer emails
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      if (filters.priorities.length > 0) {
        if (!filters.priorities.includes(email.aiViz?.priority?.level || 'none')) {
          return false;
        }
      }
      // ... autres filtres
      return true;
    });
  }, [emails, filters]);

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* Sidebar filtres */}
      <aside style={{ width: '300px' }}>
        <AIMetadataFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          showCount={true}
          matchingCount={filteredEmails.length}
        />
      </aside>

      {/* Timeline principale */}
      <main style={{ flex: 1 }}>
        <PriorityTimeline
          items={filteredEmails}
          onItemClick={item => navigate(`/email/${item.id}`)}
        />
      </main>
    </div>
  );
}
```

### Vue détail email

```tsx
function EmailDetail({ email }: { email: EnrichedOffice365Item }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [relatedEmails, setRelatedEmails] = useState<EnrichedOffice365Item[]>([]);

  return (
    <div>
      {/* Header avec badges */}
      <header>
        <h1>{email.title}</h1>
        <AIMetadataBadges item={email} />
      </header>

      {/* Contenu email */}
      <article>{email.content}</article>

      {/* Graph connexions */}
      {connections.length > 0 && (
        <section>
          <h2>Emails liés</h2>
          <ConnectionsGraph
            centerItem={email}
            connectedItems={relatedEmails}
            connections={connections}
            onNodeClick={item => navigate(`/email/${item.id}`)}
          />
        </section>
      )}
    </div>
  );
}
```

---

## 🚀 Performance

- ⚡ **Timeline virtualisée** - Pas encore implémenté (TODO si >1000 items)
- 🎨 **Canvas rendering** - Graph utilise Canvas pour performance
- 🧠 **Memoization** - useMemo pour filtres et tri
- 📦 **Code splitting** - Lazy load graph si non utilisé

---

## 📝 TODO / Améliorations futures

- [ ] Virtualisation timeline pour >1000 items
- [ ] Export graph en PNG/SVG
- [ ] Dark mode support
- [ ] Animations transitions (Framer Motion)
- [ ] Accessibilité (ARIA labels, keyboard nav)
- [ ] Touch gestures (pan/zoom graph sur mobile)
- [ ] Storybook stories
- [ ] E2E tests (Playwright)

---

**Status:** ✅ Complété
**Version:** 1.0.0
**Session:** 74 (Office365 AI Viz Enrichie)
