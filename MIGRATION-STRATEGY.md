# Stratégie de Migration Marketplace : Git vers Cloudflare CDN

## 🎯 Objectif

Permettre la bascule dynamique entre Git et Cloudflare CDN pour le marketplace **sans rebuild des applications déjà déployées**, afin d'éviter les problèmes de rate-limiting Git quand la base utilisateurs augmente.

---

## 📋 Table des Matières

1. [Le Problème](#le-problème)
2. [La Solution](#la-solution)
3. [Architecture](#architecture)
4. [Composants Clés](#composants-clés)
5. [Fonctionnement](#fonctionnement)
6. [Guide d'Utilisation](#guide-dutilisation)
7. [Scénarios de Migration](#scénarios-de-migration)
8. [FAQ](#faq)

---

## Le Problème

### Scénario Catastrophe

```
Jour 1  : Déploiement v1.0 avec Git hardcodé
Mois 6  : 10,000 installations actives
Mois 7  : Git rate-limit → tout plante
Mois 8  : Impossible de forcer migration sans rebuild
         → 10,000 utilisateurs coincés avec une app cassée
```

### Pourquoi C'est Critique

- **Git rate-limits** : 5,000 req/heure (60 req/min) pour unauthenticated
- **10,000 users** : Si chaque user fait 1 req/10min → 1,000 req/10min → rate-limit
- **Rebuild impossible** : Les anciennes versions ne peuvent pas être mises à jour automatiquement
- **Urgence** : Il faut anticiper AVANT d'avoir le problème

---

## La Solution

### Principe Fondamental

> **Un "Panneau de Contrôle" distant qui pilote toutes les applications, anciennes et nouvelles**

Au lieu de hardcoder la source dans l'app, on demande à **Supabase** quelle source utiliser à chaque chargement.

### Les 3 Piliers

1. **MarketplaceSourceResolver** : Service qui lit Supabase et choisit la source
2. **Table `app_config`** : Configuration globale stockée dans Supabase
3. **Plugin Admin** : Interface UI pour contrôler la bascule

---

## Architecture

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────┐
│                     Plugin Admin (ton app)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  UI de Contrôle Marketplace                       │  │
│  │  - Bouton "Basculer vers Cloudflare"              │  │
│  │  - Monitoring health checks                       │  │
│  │  - Stats d'utilisation                            │  │
│  └─────────────────┬─────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │
                     ↓ (écrit config)
        ┌────────────────────────────┐
        │   Supabase table           │
        │   app_config               │
        │  ┌──────────────────────┐  │
        │  │ marketplace_source:  │  │
        │  │ { type: "git" }      │  │
        │  └──────────────────────┘  │
        └────────────┬───────────────┘
                     │
                     ↓ (lu par toutes les apps)
     ┌───────────────┼───────────────┐
     │               │               │
     ↓               ↓               ↓
┌─────────┐   ┌─────────┐   ┌─────────┐
│ User 1  │   │ User 2  │   │ User N  │
│ v1.0    │   │ v1.5    │   │ v2.0    │
└─────────┘   └─────────┘   └─────────┘
All use MarketplaceSourceResolver
→ All read from Supabase
→ All switch instantly when config changes
```

### Flow de Résolution

```
App démarre
    ↓
MarketplaceSourceResolver.resolveUrl()
    ↓
Fetch config from Supabase
    ↓
Config dit "cloudflare" ?
    ↓ YES
Return https://marketplace.cartae.com/api/plugins
    ↓ NO (git)
Return https://raw.githubusercontent.com/.../registry.json
```

---

## Composants Clés

### 1. MarketplaceSourceResolver

**Fichier** : `apps/web/src/services/MarketplaceSourceResolver.ts`

**Responsabilités** :
- Lire la config depuis Supabase (avec cache 5 min)
- Résoudre l'URL à utiliser selon la config
- Gérer les health checks automatiques
- Fallback intelligent en cas d'erreur
- Collecter les stats d'utilisation

**API Principale** :
```typescript
// Résoudre une URL
const url = await marketplaceSourceResolver.resolveUrl('api/plugins')
// → https://raw.githubusercontent.com/.../registry.json (si config = git)
// → https://marketplace.cartae.com/api/plugins (si config = cloudflare)

// Force reload de la config
await marketplaceSourceResolver.reloadConfig()

// Obtenir les stats
const stats = marketplaceSourceResolver.getStats()
// → { totalRequests, gitRequests, cloudflareRequests, fallbacks, errors }
```

### 2. Table Supabase `app_config`

**Migration** : `supabase/migrations/20251031_app_config_marketplace.sql`

**Structure** :
```sql
CREATE TABLE app_config (
  id UUID PRIMARY KEY,
  config_key TEXT UNIQUE,
  config_value JSONB,
  updated_at TIMESTAMP,
  updated_by UUID
);
```

**Exemple de config** :
```json
{
  "config_key": "marketplace_source",
  "config_value": {
    "type": "cloudflare",
    "priority": ["cloudflare"],
    "cloudflareUrl": "https://marketplace.cartae.com",
    "healthCheckEnabled": true,
    "fallbackOnError": true
  }
}
```

**RLS** :
- ✅ Lecture publique (toutes les apps peuvent lire)
- 🔒 Écriture réservée aux admins

**Fonctions** :
- `update_app_config()` : Met à jour la config (admin only)
- `get_marketplace_config()` : Récupère la config (public)

### 3. Plugin Admin

**Package** : `packages/plugin-admin/`

**Composants UI** :
- `AdminPanel` : Interface principale avec tabs
- `MarketplaceSourceControl` : Contrôle de la source (boutons de bascule)
- `SourceHealthMonitor` : Health checks en temps réel
- `UsageStatsPanel` : Statistiques d'utilisation (requests, fallbacks, errors)
- `ConfigHistoryPanel` : Historique des changements

**Services** :
- `MarketplaceConfigService` : API pour mettre à jour la config

**Installation** :
```bash
# Le plugin s'installe comme n'importe quel plugin Cartae
# Une fois installé, accessible via "Admin Panel" dans la sidebar
```

---

## Fonctionnement

### Phase 1 : Déploiement Initial (Aujourd'hui)

1. **Déployer la migration Supabase** :
   ```bash
   psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f supabase/migrations/20251031_app_config_marketplace.sql
   ```

2. **Vérifier la config par défaut** :
   - Config créée automatiquement : `type: "git"`
   - Toutes les apps utiliseront Git par défaut

3. **Déployer v1.0 de l'app** :
   - Inclut MarketplaceSourceResolver
   - Lit la config depuis Supabase
   - Utilise Git (config par défaut)

4. **Installer le Plugin Admin** :
   - Dans TON app uniquement (pas pour tous les users)
   - Te donne accès au panneau de contrôle

### Phase 2 : Croissance (Semaines 1-12)

- Les utilisateurs installent l'app
- Tout fonctionne avec Git
- Le resolver collecte des stats
- Tu monitors le rate-limit Git via le Plugin Admin

### Phase 3 : Migration (Quand Git Rate-Limit Approche)

1. **Déployer Cloudflare Worker** :
   ```bash
   cd infrastructure/cloudflare-worker
   wrangler publish
   # Note l'URL: https://marketplace.YOUR-WORKER.workers.dev
   ```

2. **Tester la nouvelle source** :
   - Dans Plugin Admin → onglet "Marketplace"
   - Enter l'URL Cloudflare dans "CDN URL"
   - Cliquer "Tester"
   - Vérifier que ✅ OK

3. **Bascule Progressive** :

   **Option A : Test sur ton app d'abord**
   - Dans Plugin Admin, cliquer "Basculer vers Cloudflare CDN"
   - Tester que tout fonctionne
   - Si OK, laisser actif

   **Option B : Canary Deployment** (plus safe)
   - Basculer vers "Hybride (CDN → Git)"
   - 10% des requests iront sur CDN, 90% sur Git
   - Surveiller les stats et health checks
   - Si OK après 24h, basculer vers 100% CDN

4. **Bascule Complète** :
   - Plugin Admin → "Basculer vers Cloudflare CDN"
   - **Effet immédiat** : Toutes les apps (même v1.0) basculent
   - Surveiller les stats dans l'onglet "Monitoring"

5. **Rollback si Problème** :
   - Plugin Admin → "Basculer vers Git"
   - Toutes les apps reviennent sur Git immédiatement

### Phase 4 : Maintenance

- Monitoring continu via Plugin Admin
- Health checks automatiques toutes les minutes
- Alertes si une source devient unhealthy
- Historique des changements dans l'onglet "Historique"

---

## Guide d'Utilisation

### Pour l'Administrateur

#### Accéder au Plugin Admin

1. Installer le plugin admin dans ton app Cartae
2. Ouvrir la sidebar → "Admin Panel"

#### Basculer vers Cloudflare

1. **Prérequis** :
   - Cloudflare Worker déployé
   - URL CDN connue (ex: `https://marketplace.cartae.com`)

2. **Steps** :
   - Onglet "Marketplace"
   - Entrer l'URL CDN dans "Cloudflare CDN URL"
   - Cliquer "Tester" → Vérifier ✅ OK
   - Cliquer "☁️ Cloudflare CDN"
   - Confirmer

3. **Vérifier** :
   - Onglet "Monitoring"
   - Vérifier que "Cloudflare CDN" est ✅ Opérationnel
   - Stats montrent `cloudflareRequests` qui augmentent

#### Revenir à Git

1. Onglet "Marketplace"
2. Cliquer "📦 Git"
3. Confirmer

#### Mode Hybride

Utilise les deux sources avec priorité configurable :

- **"🔄 Hybride (CDN → Git)"** : Essaye CDN d'abord, fallback sur Git si erreur
- **"🔄 Hybride (Git → CDN)"** : Essaye Git d'abord, fallback sur CDN si erreur

Utile pour :
- Migration progressive (canary)
- Résilience (si une source tombe)
- Tests A/B

#### Monitoring

**Health Checks** :
- Onglet "Monitoring" → Section "État de Santé"
- Affiche :
  - ✅ ou ❌ pour chaque source
  - Temps de réponse
  - Dernier check
  - Erreur si applicable

**Statistiques** :
- Total requêtes
- Répartition Git vs CDN
- Fallbacks (combien de fois le fallback a été utilisé)
- Erreurs
- Temps de réponse moyen

**Historique** :
- Onglet "Historique"
- Liste toutes les modifications de config
- Qui a fait le changement et quand

### Pour les Développeurs

#### Utiliser le Resolver dans le Code

```typescript
import { marketplaceSourceResolver } from '@/services/MarketplaceSourceResolver';

// Dans une fonction API
async function fetchPlugins() {
  // Résoudre l'URL (bascule automatique selon config)
  const url = await marketplaceSourceResolver.resolveUrl('api/plugins');

  // Fetch depuis l'URL résolue
  const response = await fetch(url);
  return response.json();
}
```

#### Forcer Reload de Config

```typescript
// Si tu veux forcer un reload (bypass cache)
await marketplaceSourceResolver.reloadConfig();
```

#### Obtenir les Stats

```typescript
const stats = marketplaceSourceResolver.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Git: ${stats.gitRequests}, CDN: ${stats.cloudflareRequests}`);
console.log(`Errors: ${stats.errors}, Fallbacks: ${stats.fallbacks}`);
```

---

## Scénarios de Migration

### Scénario 1 : Petit Projet (< 1,000 users)

**Recommandation** : Rester sur Git

- Pas de coûts Cloudflare
- Rate-limit Git suffit
- Garder le système en place pour l'avenir

### Scénario 2 : Croissance Moyenne (1,000 - 10,000 users)

**Recommandation** : Préparer Cloudflare, basculer si nécessaire

**Timeline** :
- Mois 1-3 : Git uniquement, monitoring
- Mois 4 : Déployer Cloudflare Worker (pas encore actif)
- Mois 5 : Tester CDN sur ton app
- Mois 6 : Si rate-limit Git > 70%, basculer vers Hybride (CDN prioritaire)
- Mois 7+ : Basculer vers 100% CDN

### Scénario 3 : Forte Croissance (> 10,000 users)

**Recommandation** : Migration immédiate vers Cloudflare

**Timeline** :
- Jour 1 : Déployer Cloudflare Worker
- Jour 2 : Basculer vers Hybride (CDN prioritaire)
- Jour 3 : Surveiller pendant 24h
- Jour 4 : Basculer vers 100% CDN
- Maintenir Git en fallback

### Scénario 4 : Urgence (Rate-Limit Atteint)

**Action Immédiate** :

1. **Vérifier que Cloudflare est déployé** :
   ```bash
   curl -I https://marketplace.YOUR-WORKER.workers.dev/api/plugins
   # Doit retourner 200 OK
   ```

2. **Bascule Immédiate** :
   - Plugin Admin → "Basculer vers Cloudflare CDN"
   - Effet en < 5 minutes (durée du cache config)

3. **Monitoring** :
   - Surveiller les erreurs pendant 1h
   - Si errors > 5%, rollback vers Git
   - Débugger le Worker

4. **Communication** :
   - Annoncer aux users (si problème visible)
   - Expliquer l'amélioration de performance

---

## FAQ

### Q : Combien de temps pour que la bascule prenne effet ?

**R** : Maximum 5 minutes (durée du cache de config dans le resolver). La plupart des apps basculent en < 1 minute.

### Q : Que se passe-t-il si Supabase tombe ?

**R** : Le resolver utilise la dernière config en cache. Si le cache expire et Supabase est down, fallback automatique sur Git (config par défaut).

### Q : Est-ce que ça coûte cher en requests Supabase ?

**R** : Non. Config mise en cache 5 min. Pour 10,000 users :
- 10,000 users × 1 req/5min = 2,000 req/5min = 24,000 req/h = 576,000 req/jour
- Plan gratuit Supabase : 50,000 req/mois
- **Solution** : Augmenter le cache TTL à 30 min → 96,000 req/jour → OK

### Q : Peut-on basculer entre sources automatiquement ?

**R** : Oui ! Le mode "Hybride" avec health checks activés fait exactement ça :
- Essaye la source prioritaire
- Si unhealthy → fallback automatique sur l'autre
- Pas besoin d'intervention manuelle

### Q : Comment tester avant de basculer en production ?

**R** :
1. Déployer Cloudflare Worker sur un environnement staging
2. Dans ton app dev, changer manuellement l'URL dans le resolver (temporaire)
3. Tester toutes les fonctionnalités
4. Si OK, déployer sur prod et utiliser le Plugin Admin pour basculer officiellement

### Q : Peut-on utiliser une autre source que Git ou Cloudflare ?

**R** : Oui ! Le système est générique. Il suffit de :
1. Mettre l'URL de ta source dans `cloudflareUrl` ou `gitUrl`
2. S'assurer que l'API répond au même format que Cloudflare Worker
3. Basculer via Plugin Admin

**Exemples de sources possibles** :
- AWS S3 + CloudFront
- Vercel Edge Functions
- Netlify Functions
- Ton propre serveur Node.js

### Q : Historique des changements = audit trail ?

**R** : Oui ! Chaque changement est logué avec :
- Qui a fait le changement (email + nom de l'admin)
- Quand (timestamp)
- Quelle config exacte
- Vue dans Plugin Admin → Onglet "Historique"

### Q : Peut-on basculer automatiquement si Git rate-limit ?

**R** : Pas encore implémenté, mais possible ! Il faudrait :
1. Monitorer les erreurs 429 (rate-limit) de Git
2. Si errors > seuil pendant X minutes → auto-switch vers CDN
3. Notifier l'admin
4. Log dans l'historique

**TODO** : Créer une GitHub issue pour cette feature.

---

## Résumé : Pourquoi Ce Système Est Génial

✅ **Zero Rebuild** : Anciennes apps basculent sans mise à jour
✅ **Contrôle Total** : Un bouton pour basculer toute la flotte
✅ **Résilience** : Fallback automatique si une source tombe
✅ **Monitoring** : Health checks + stats en temps réel
✅ **Historique** : Audit trail complet
✅ **Coût Optimisé** : Active Cloudflare uniquement quand nécessaire
✅ **Migration Progressive** : Canary deployment possible
✅ **Rollback Instantané** : Un clic pour revenir en arrière
✅ **Extensible** : Fonctionne avec n'importe quelle source HTTP

---

## Liens Utiles

- **MarketplaceSourceResolver** : `apps/web/src/services/MarketplaceSourceResolver.ts`
- **Plugin Admin** : `packages/plugin-admin/`
- **Migration Supabase** : `supabase/migrations/20251031_app_config_marketplace.sql`
- **Cloudflare Worker** : `infrastructure/cloudflare-worker/`
- **Tests E2E** : `tests/marketplace/`

---

**Dernière mise à jour** : 31 octobre 2025
**Version** : 1.0.0
**Auteur** : Cartae Team
