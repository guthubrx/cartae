# 🗃️ Marketplace Cache System

Système de cache intelligent pour le Marketplace de plugins Cartae.

## 📋 Vue d'Ensemble

Le système de cache Marketplace offre :

- ✅ **Cache en mémoire** avec TTL configurable
- ✅ **Stale-while-revalidate** pour UX fluide
- ✅ **Préfetching intelligent** basé sur l'usage
- ✅ **Invalidation sélective** par tags
- ✅ **Persistance IndexedDB** (TODO)
- ✅ **Analytics de performance** (hit rate, stats)
- ✅ **Configuration granulaire** par type de données

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│      Application Components             │
│  (RemotePluginMarketplace, etc.)        │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      MarketplaceAPI (Wrapper)           │
│  - fetchPluginList()                    │
│  - fetchPluginDetail()                  │
│  - fetchFeatured()                      │
│  - searchPlugins()                      │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   MarketplaceCacheService               │
│  - Cache Layer avec TTL                 │
│  - Stale-while-revalidate               │
│  - Préfetching Queue                    │
│  - Stats & Analytics                    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      CacheManager (Core)                │
│  - Map<string, CacheEntry>              │
│  - Tag-based invalidation               │
└─────────────────────────────────────────┘
```

## 🚀 Usage

### Installation

Le service est un singleton, pas besoin d'installation :

```typescript
import { marketplaceCacheService } from './MarketplaceCacheService';
```

### Utilisation Basique

```typescript
import { fetchPluginList } from './MarketplaceAPI.example';

// Le cache est géré automatiquement
const plugins = await fetchPluginList({ page: 1, limit: 20 });

// Première requête : MISS → fetch API → cache
// Deuxième requête : HIT → retour immédiat depuis cache
const pluginsCached = await fetchPluginList({ page: 1, limit: 20 });
```

### Hook React

```typescript
import { useMarketplaceCache } from './MarketplaceCacheService';

function MyComponent() {
  const cache = useMarketplaceCache();

  useEffect(() => {
    async function loadData() {
      // Essayer le cache
      const cached = await cache.getPluginList('key');

      if (!cached) {
        // Fetch et cache
        const data = await fetchFromAPI();
        await cache.cachePluginList('key', data);
      }
    }

    loadData();
  }, []);
}
```

### Configuration

```typescript
import { MarketplaceCacheService } from './MarketplaceCacheService';

const customCache = new MarketplaceCacheService({
  pluginListTTL: 10 * 60 * 1000, // 10 minutes
  staleWhileRevalidate: 60 * 1000, // 1 minute
  prefetchEnabled: true,
  persistToIndexedDB: true,
});
```

## 📊 Analytics

### Récupérer les Stats

```typescript
const stats = marketplaceCacheService.getStats();

console.log(stats);
// {
//   hits: 42,
//   misses: 8,
//   hitRate: 84,
//   totalRequests: 50,
//   cacheSize: 15,
//   lastCleared: 1738368000000
// }
```

### Reset les Stats

```typescript
marketplaceCacheService.resetStats();
```

## 🔄 Stale-While-Revalidate

Le cache utilise la stratégie **stale-while-revalidate** :

1. **Fresh** (age < maxAge) : Retour immédiat
2. **Stale** (age > maxAge mais < maxAge + swr) :
   - Retour immédiat des données stale
   - Revalidation en arrière-plan
3. **Expired** (age > maxAge + swr) : Fetch obligatoire

```typescript
// Configuration SWR
cachePluginList(key, data, {
  maxAge: 5 * 60 * 1000, // 5 minutes fresh
  staleWhileRevalidate: 30 * 1000, // 30 secondes stale
});

// Timeline:
// 0s-5m      : Fresh (cache hit)
// 5m-5m30s   : Stale (cache hit + background refresh)
// >5m30s     : Expired (cache miss)
```

## 🚀 Préfetching Intelligent

Le système préfetch automatiquement les plugins populaires :

### Stratégie

1. **Track Views** : Chaque vue de plugin incrémente un compteur
2. **Threshold** : Après N vues (default: 3), le plugin entre en queue
3. **Background Prefetch** : Les détails sont fetchés en arrière-plan
4. **Batch Processing** : Préfetch par lots de 5 pour éviter la surcharge

### Exemple

```typescript
// 1. User consulte la liste des plugins
const list = await fetchPluginList({ page: 1 });
// → Le cache détecte les 5 premiers plugins et les ajoute à la queue

// 2. User clique sur un plugin populaire (3e fois)
await fetchPluginDetail('plugin-id');
// → Le compteur atteint le seuil, le plugin entre en queue de préfetch

// 3. En arrière-plan, le service préfetch les détails
const queue = marketplaceCacheService.getPrefetchQueue();
await prefetchPluginDetails(queue); // Batch de 5 à la fois
```

### Désactiver le Préfetching

```typescript
marketplaceCacheService.updateConfig({
  prefetchEnabled: false,
});
```

## 🗑️ Invalidation

### Invalider un Plugin Spécifique

```typescript
// Après une mise à jour d'un plugin
await marketplaceCacheService.invalidatePlugin('com.cartae.my-plugin');
```

### Invalider les Listes

```typescript
// Après ajout d'un nouveau plugin
await marketplaceCacheService.invalidatePluginLists();
```

### Invalider les Recherches

```typescript
// Après modification du registry
await marketplaceCacheService.invalidateSearches();
```

### Tout Invalider

```typescript
// Reset complet (rarement nécessaire)
await marketplaceCacheService.invalidateAll();
```

## ⚙️ Configuration Avancée

### Durées de Cache (TTL)

```typescript
const config = {
  pluginListTTL: 5 * 60 * 1000, // Liste: 5 minutes
  pluginDetailTTL: 10 * 60 * 1000, // Détails: 10 minutes
  featuredTTL: 15 * 60 * 1000, // Featured: 15 minutes
  trendingTTL: 5 * 60 * 1000, // Trending: 5 minutes
  searchTTL: 2 * 60 * 1000, // Search: 2 minutes
};
```

### Stale-While-Revalidate

```typescript
const config = {
  staleWhileRevalidate: 30 * 1000, // 30 secondes
};
```

### Préfetching

```typescript
const config = {
  prefetchEnabled: true, // Activer
  prefetchThreshold: 3, // Seuil de vues
};
```

### Persistance IndexedDB

```typescript
const config = {
  persistToIndexedDB: true, // Activer (TODO)
  compressLargePayloads: false, // Compression (TODO)
  compressionThreshold: 100 * 1024, // 100 KB
};
```

## 🧪 Testing

### Tests Unitaires

```typescript
import { MarketplaceCacheService } from './MarketplaceCacheService';

describe('MarketplaceCacheService', () => {
  let cache: MarketplaceCacheService;

  beforeEach(() => {
    cache = new MarketplaceCacheService();
  });

  test('cache miss puis hit', async () => {
    const key = 'test-key';
    const data = { data: [], pagination: {} };

    // MISS
    const cached1 = await cache.getPluginList(key);
    expect(cached1).toBeNull();

    // Cache
    await cache.cachePluginList(key, data);

    // HIT
    const cached2 = await cache.getPluginList(key);
    expect(cached2).toEqual(data);
  });

  test('TTL expiration', async () => {
    const key = 'expiring-key';
    const data = { data: [], pagination: {} };

    // Cache avec TTL court
    await cache.cachePluginList(key, data, { maxAge: 100 });

    // HIT immédiat
    expect(await cache.getPluginList(key)).toEqual(data);

    // Attendre expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    // MISS après expiration
    expect(await cache.getPluginList(key)).toBeNull();
  });

  test('stats tracking', async () => {
    const key = 'stats-key';

    // MISS
    await cache.getPluginList(key);

    const stats = cache.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.totalRequests).toBe(1);
  });
});
```

### Tests d'Intégration

```typescript
import { fetchPluginList } from './MarketplaceAPI.example';
import { marketplaceCacheService } from './MarketplaceCacheService';

test('API avec cache', async () => {
  // Reset stats
  marketplaceCacheService.resetStats();

  // Première requête (MISS)
  await fetchPluginList({ page: 1 });

  let stats = marketplaceCacheService.getStats();
  expect(stats.misses).toBe(1);

  // Deuxième requête (HIT)
  await fetchPluginList({ page: 1 });

  stats = marketplaceCacheService.getStats();
  expect(stats.hits).toBe(1);
  expect(stats.hitRate).toBe(50); // 1 hit / 2 total
});
```

## 🔍 Debugging

### Activer les Logs

```typescript
// Dans MarketplaceCacheService, décommenter les console.log
console.log(`[Cache HIT] ${key}`);
console.log(`[Cache MISS] ${key}`);
console.log(`[Prefetch] ${pluginId}`);
```

### Monitorer les Stats en Temps Réel

```typescript
// Dans un composant React
useEffect(() => {
  const interval = setInterval(() => {
    const stats = marketplaceCacheService.getStats();
    console.table(stats);
  }, 5000); // Toutes les 5 secondes

  return () => clearInterval(interval);
}, []);
```

### Inspecter le Cache

```typescript
// Accéder au cache interne (dev only)
const cacheManager = marketplaceCacheService['cacheManager'];
console.log(cacheManager);
```

## 📈 Performance

### Benchmarks (exemple)

```
Scénario: Charger 20 plugins
- Sans cache:     ~500ms (fetch réseau)
- Avec cache:     ~2ms (lecture mémoire)
- Avec SWR stale: ~2ms + revalidation background

Hit Rate Typique: 70-85%
```

### Optimisations

1. **Préfetch intelligemment** : Ne préfetch que les plugins populaires
2. **TTL adaptatif** : Données featured = TTL long, trending = TTL court
3. **Batch prefetch** : Par lots de 5 pour éviter surcharge
4. **Invalidation ciblée** : Par tags, pas global

## 🚧 TODOs

- [ ] Implémenter persistance IndexedDB
- [ ] Compression des gros payloads
- [ ] Cache warming au démarrage
- [ ] Métriques Prometheus/DataDog
- [ ] Service Worker pour cache offline
- [ ] Adaptive TTL based on usage patterns
- [ ] Cache warming strategies
- [ ] LRU eviction policy

## 📚 Références

- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [React Query - Caching](https://tanstack.com/query/latest/docs/react/guides/caching)

---

**Optimisé pour la performance et l'UX 🚀**
