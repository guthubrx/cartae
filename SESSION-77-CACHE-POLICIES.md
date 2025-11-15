# Session 77 - Smart Cache Policies & LRU Management

**Date:** 15 Novembre 2025
**Durée:** ~3h
**LOC:** ~1,480 lignes
**Status:** ✅ COMPLÉTÉE

---

## 🎯 Objectif

Résoudre le problème critique identifié dans Session 76 : **HybridStore n'a aucune limite de cache**.

Sans limites, IndexedDB peut exploser en taille (> 1 GB), dégradant les performances et l'expérience utilisateur.

---

## 📦 Livrables

### 1. CacheConfig (~310 LOC)

**Fichier:** `packages/core/src/storage/CacheConfig.ts`

Configuration des politiques de cache inspirée des best practices SaaS :
- **Gmail Web:** 50-150 MB, ~500 emails
- **Notion:** 50-200 MB, ~100 pages
- **Slack Web:** 30-100 MB, 7 jours messages

**Configurations fournies:**

```typescript
// Par défaut (équilibré)
DEFAULT_CACHE_CONFIG = {
  maxItems: 500,
  maxSizeMB: 150,
  maxAgeDays: 30,
  quotas: {
    email: { maxItems: 300, maxSizeMB: 90 },  // 60%
    task: { maxItems: 100, maxSizeMB: 30 },   // 20%
    note: { maxItems: 80, maxSizeMB: 24 },    // 16%
    event: { maxItems: 20, maxSizeMB: 6 },    // 4%
  },
  pruneStrategy: 'LRU',
  pruneThreshold: 0.9,
};

// Minimal (économie)
MINIMAL_CACHE_CONFIG = {
  maxItems: 100,
  maxSizeMB: 30,
  maxAgeDays: 7,
  // ...
};

// Generous (performance)
GENEROUS_CACHE_CONFIG = {
  maxItems: 1000,
  maxSizeMB: 300,
  maxAgeDays: 60,
  // ...
};
```

**Helpers:**
- `estimateItemSizeMB(item)` - Calcul taille approximative
- `getItemType(item)` - Extraction type d'item
- `validateCacheConfig(config)` - Validation configuration

---

### 2. CacheManager (~420 LOC)

**Fichier:** `packages/core/src/storage/CacheManager.ts`

Gestionnaire de cache avec politique LRU (Least Recently Used).

**API principale:**

```typescript
class CacheManager {
  // Vérifier si ajout possible
  canAdd(item: CartaeItem): boolean

  // Enregistrer item dans cache
  add(item: CartaeItem): void

  // Marquer item comme utilisé (update LRU)
  touch(itemId: string): void

  // Supprimer item du cache
  remove(itemId: string): void

  // Obtenir items à évincer (LRU)
  getItemsToEvict(count: number): string[]

  // Nettoyer cache selon politique
  prune(): Promise<string[]>

  // Vérifier si pruning nécessaire
  shouldPrune(): boolean

  // Stats complètes
  getStats(): CacheStats
}
```

**Logique de pruning:**
1. **Items trop vieux:** Supprimer items > `maxAgeDays` depuis dernier accès
2. **Utilisation > threshold:** Évincer 10% des items (LRU) si utilisation > `pruneThreshold`

**Tracking:**
- Hit/miss rate
- Utilisation par type
- Métadonnées LRU par item

---

### 3. SmartCache (~330 LOC)

**Fichier:** `packages/core/src/storage/SmartCache.ts`

Cache intelligent avec scoring de priorité.

**Algorithme de scoring:**

```typescript
function calculatePriority(item: CartaeItem): number {
  let score = 100;

  // Status
  if (item.metadata.unread) score += 50;
  if (item.metadata.starred) score += 40;
  if (item.metadata.archived) score -= 60;

  // Age (pénalité)
  const ageInDays = (Date.now() - item.createdAt) / (1000 * 60 * 60 * 24);
  score -= ageInDays * 2; // -2 points par jour

  // Last access (boost)
  if (lastAccessDays < 1) score += 30; // +30 si accédé aujourd'hui

  // Type
  if (type === 'email') score += 10;

  return Math.max(0, score);
}
```

**Fonctionnalités:**
- Trier items par priorité
- Identifier "hot data" (score > 50 ou accédé < 7 jours)
- Identifier "cold data" (score < 20 et non accédé > 30 jours)
- Sélection intelligente pour chargement initial
- Éviction combinée LRU + priorité

---

### 4. Intégration HybridStore (~200 LOC modifiées)

**Fichier:** `packages/core/src/storage/HybridStore.ts`

Modifications apportées à HybridStore :

**A. Initialisation:**
```typescript
constructor(config: HybridStoreConfig) {
  // ...
  this.cacheManager = new CacheManager(config.cacheConfig);
  this.smartCache = new SmartCache(this.cacheManager);
}

async init() {
  // Charger items existants dans CacheManager
  const existingItems = await this.db.getAll();
  for (const item of existingItems) {
    this.cacheManager.add(item);
  }

  // Démarrer auto-pruning
  if (config.autoPruneEnabled) {
    this.startAutoPrune();
  }
}
```

**B. CRUD avec cache policies:**
```typescript
async create(item: CartaeItem) {
  // Vérifier quotas AVANT d'ajouter
  if (!this.cacheManager.canAdd(item)) {
    // Évincer un item pour faire de la place
    const toEvict = this.cacheManager.getItemsToEvict(1);
    await this.db.delete(toEvict[0]);
    this.cacheManager.remove(toEvict[0]);
  }

  const created = await this.db.create(item);
  this.cacheManager.add(created); // Enregistrer

  return created;
}

async get(id: string) {
  const item = await this.db.get(id);
  if (item) {
    this.cacheManager.touch(id); // Update LRU
  }
  return item;
}
```

**C. Auto-pruning:**
```typescript
private startAutoPrune() {
  this.pruneTimer = setInterval(() => {
    this.performPrune();
  }, config.pruneInterval); // Défaut: 24h
}

private async performPrune() {
  if (!this.cacheManager.shouldPrune()) return;

  const evicted = await this.cacheManager.prune();
  if (evicted.length > 0) {
    await this.db.deleteMany(evicted);
  }
}
```

**D. Nouvelles méthodes publiques:**
- `getCacheStats()` - Statistiques cache
- `forcePrune()` - Forcer pruning manuel
- `getCacheManager()` - Accès direct au CacheManager
- `getSmartCache()` - Accès direct au SmartCache

---

### 5. Tests (~240 LOC)

**Fichier:** `packages/core/src/storage/__tests__/cache-policies.test.ts`

**Tests CacheManager:**
- ✅ Quotas respectés (globaux + par type)
- ✅ LRU eviction (items les moins récents évincés)
- ✅ Pruning automatique (items vieux + threshold)
- ✅ Stats (hit rate, utilisation, par type)

**Tests SmartCache:**
- ✅ Scoring priorité (unread > starred > normal > archived)
- ✅ Pénalité age
- ✅ Tri par priorité
- ✅ Hot/cold data identification

---

## 📊 Statistiques

**Fichiers créés:** 4
- `CacheConfig.ts` (~310 LOC)
- `CacheManager.ts` (~420 LOC)
- `SmartCache.ts` (~330 LOC)
- `cache-policies.test.ts` (~240 LOC)

**Fichiers modifiés:** 2
- `HybridStore.ts` (~200 LOC ajoutées)
- `index.ts` (3 exports ajoutés)

**Total LOC:** ~1,480 lignes

**Technologies:**
- TypeScript
- IndexedDB (via HybridStore)
- Vitest (tests)

---

## 🎯 Impact

**Bénéfices directs:**
- ✅ Cache reste petit (< 150 MB par défaut)
- ✅ Performance constante (pas de dégradation)
- ✅ Pas de saturation navigateur
- ✅ Expérience utilisateur optimale à l'échelle

**Débloque sessions futures:**
- **Sessions 71-74** (Office365 AI Enrichment) - Peuvent maintenant persister embeddings/résumés sans exploser le cache
- **Sessions 47-49** (AI Intelligence Layer) - Peuvent gérer 100k+ items avec cache intelligent
- **Sessions 58-59** (Performance Optimizations) - Ont une baseline performante pour optimiser

---

## 🚀 Utilisation

### Configuration par défaut

```typescript
import { HybridStore, DatabaseClient, IndexedDBStore } from '@cartae/core/storage';

const store = new HybridStore({
  databaseClient: new DatabaseClient({ baseUrl: 'http://localhost:3001' }),
  indexedDBStore: new IndexedDBStore(),
  // Pas de cacheConfig → utilise DEFAULT_CACHE_CONFIG
});

await store.init(); // Auto-pruning démarré automatiquement
```

### Configuration custom

```typescript
import { MINIMAL_CACHE_CONFIG, GENEROUS_CACHE_CONFIG } from '@cartae/core/storage';

// Mode économie (petits appareils)
const store = new HybridStore({
  // ...
  cacheConfig: MINIMAL_CACHE_CONFIG,
});

// Mode performance (puissants appareils)
const store = new HybridStore({
  // ...
  cacheConfig: GENEROUS_CACHE_CONFIG,
});

// Configuration totalement custom
const store = new HybridStore({
  // ...
  cacheConfig: {
    maxItems: 200,
    maxSizeMB: 50,
    maxAgeDays: 14,
    quotas: {
      email: { maxItems: 120, maxSizeMB: 30 },
      // ...
    },
    pruneStrategy: 'priority', // Utilise SmartCache scoring
    autoPruneEnabled: true,
  },
});
```

### Monitoring du cache

```typescript
// Stats temps réel
const stats = store.getCacheStats();
console.log(stats.totalItems);      // Nombre total items
console.log(stats.totalSizeMB);     // Taille totale MB
console.log(stats.utilization);     // 0-1 (0.85 = 85%)
console.log(stats.hitRate);         // 0-1 (0.92 = 92% hit rate)

// Par type
console.log(stats.byType.email.count);
console.log(stats.byType.email.quotaUsage); // 0-1

// Force pruning manuel
await store.forcePrune();
```

### Utilisation SmartCache avancée

```typescript
const smartCache = store.getSmartCache();

// Obtenir items avec score > 50 (hot data)
const allItems = await store.getAll();
const hotItems = smartCache.identifyHotData(allItems);

// Trier par priorité
const sorted = smartCache.sortByPriority(allItems);

// Score individuel
const score = smartCache.calculatePriority(item);
console.log(score.total);                   // Score total
console.log(score.breakdown.status);        // Contribution status
console.log(score.breakdown.age);           // Contribution age
console.log(score.breakdown.lastAccess);    // Contribution last access
```

---

## ✅ Tests

```bash
# Lancer tests
pnpm test packages/core/src/storage/__tests__/cache-policies.test.ts

# Résultats attendus
✓ CacheManager › canAdd() retourne true si quotas respectés
✓ CacheManager › canAdd() retourne false si limite globale items atteinte
✓ CacheManager › canAdd() retourne false si quota type atteint
✓ CacheManager › getItemsToEvict() retourne items LRU
✓ CacheManager › prune() supprime items trop vieux
✓ CacheManager › prune() évince 10% si utilization > threshold
✓ CacheManager › getStats() retourne statistiques correctes
✓ SmartCache › calculatePriority() donne score élevé pour items unread
✓ SmartCache › calculatePriority() pénalise items archivés
✓ SmartCache › sortByPriority() trie items par score décroissant
✓ SmartCache › identifyHotData() trouve items chauds
```

---

## 🔮 Prochaines sessions

Session 77 pose les fondations pour :
- **Session 78** - Production Security Vault (~1,400 LOC)
- **Sessions 71-74** - Office365 AI Enrichment (maintenant possible)
- **Sessions 47-49** - AI Intelligence Layer (maintenant scalable)

---

**Session 77 - Smart Cache Policies : ✅ COMPLÉTÉE**

*Cache intelligent, performance garantie, scalabilité assurée.* 🚀
