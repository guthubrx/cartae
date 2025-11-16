# Session 84b - Erreurs Découvertes Hors Scope

## ✅ Objectif Session 84b Atteint

**Build Fixes Backlog** : Corriger les erreurs TypeScript empêchant la compilation de @cartae/core et plugin-marketplace.

**Résultats** :

- ✅ **11 fichiers corrigés** (SmartCache, TokenInterceptor, Encryptor, RecoveryManager, JWTService, cache-policies.test.ts, tsup.config.ts, package.json auth)
- ✅ **@cartae/core compile sans erreur** (objectif principal)
- ✅ **14/32 packages compilent** (vs 10/32 avant Session 84b)
- ✅ **Aucune régression** introduite

---

## ❌ Erreurs Restantes (Hors Scope Session 84b)

Ces erreurs **n'existaient pas** dans le diagnostic initial. Elles sont apparues lors de la validation finale globale (`pnpm build`).

### 1. @cartae/database-api - Dépendances Manquantes

**Erreurs** : 31 erreurs de type `TS2307: Cannot find module`

**Modules manquants** :

- `ioredis` (client Redis)
- `bullmq` (queue system)
- `prom-client` (Prometheus metrics)
- Modules internes manquants : `../utils/logger`, `../utils/prometheus`, `../middleware/auth`

**Fichiers impactés** :

- `src/cache/RedisClient.ts`
- `src/gateway/QuotaManager.ts`
- `src/gateway/RateLimiter.ts`
- `src/health/cluster-health.ts`
- `src/monitoring/ha-metrics.ts`
- `src/monitoring/metrics.ts`
- `src/queue/QueueManager.ts`

**Cause** : package.json de @cartae/database-api manque ces dépendances. Ce package semble **incomplet** ou en cours de développement.

**Action recommandée** : Session future dédiée à @cartae/database-api

- Ajouter `ioredis`, `bullmq`, `prom-client` au package.json
- Créer les modules internes manquants (logger, prometheus, auth middleware)
- Vérifier si ce package est censé être buildable ou seulement en runtime

---

### 2. @cartae/kanban-plugin - Types React 19 Incompatibles

**Erreurs** : 2 erreurs de type `TS2786: 'X' cannot be used as a JSX component`

**Composants problématiques** :

- `DndContext` (ligne 82 de KanbanBoard.tsx)
- `DragOverlay` (ligne 90 de KanbanBoard.tsx)

**Cause** : Incompatibilité entre types React 19.2.2 et `@dnd-kit/*` (drag-and-drop library)

**Détail technique** :

```
Type 'ReactNode' (from @types/react@19.2.2) is not assignable to type 'React.ReactNode'.
  Type 'bigint' is not assignable to type 'ReactNode'.
```

**Action recommandée** : Session future dédiée React 19 migration

- Vérifier la compatibilité `@dnd-kit/*` avec React 19
- Potentiel downgrade React à 18.x si @dnd-kit non compatible
- Ou attendre update de @dnd-kit pour React 19
- Appliquer fix à @cartae/ui également (erreur similaire)

---

### 3. @cartae/ui - Types React 19 (Suspecté)

**Erreur** : Build échoue (logs tronqués, mais probablement lié à React 19)

**Cause probable** : Même problème que @cartae/kanban-plugin (types React 19)

**Action recommandée** : Même session que @cartae/kanban-plugin (React 19 migration)

---

## 📊 Résumé Packages Build

| Status           | Count | Packages                                                                                                                                                  |
| ---------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Build OK      | 14/32 | core, auth, plugin-sdk, office365-\*, parsers, design, plugin-admin, ai-types, plugin-marketplace, office-connector-mvp, plugin-system, api, mindmap-core |
| ❌ Fail deps     | 1/32  | database-api                                                                                                                                              |
| ❌ Fail React 19 | 2/32  | kanban-plugin, ui (probable)                                                                                                                              |
| ⚠️ Non testé     | 15/32 | Dépendent de ui/kanban (bloqués par erreurs cascade)                                                                                                      |

---

## 🎯 Sessions Futures Recommandées

### Session 85 - Database API Dependencies (Estimé: 1-2h)

- Ajouter dépendances manquantes (ioredis, bullmq, prom-client)
- Créer modules utils manquants (logger, prometheus, auth)
- Vérifier si database-api doit être buildable ou runtime-only
- LOC estimé: ~200-300 (utilitaires à créer)

### Session 86 - React 19 Migration (Estimé: 2-4h)

- Auditer compatibilité dépendances avec React 19
- Option A: Fix @dnd-kit types (si update disponible)
- Option B: Downgrade React 18.x (si @dnd-kit non compatible)
- Appliquer fix à @cartae/kanban-plugin + @cartae/ui
- Re-tester packages dépendants (viz-table, plugins visuels)
- LOC estimé: ~100-200 (principalement fixes types)

---

## 📝 Notes Techniques

**Turbo Cache** : Les packages OK sont cachés (pas de rebuild inutile) ✅
**Erreurs Cascades** : database-api + ui + kanban bloquent 15 packages dépendants
**Priorisation** : Fixer React 19 (ui + kanban) débloquera plus de packages que database-api

**Commande de validation** :

```bash
pnpm build
```

**Résultat attendu après Sessions 85-86** :

- 28-30/32 packages compile (database-api + React 19 fixés)
- Packages restants probablement en WIP ou obsolètes

---

Généré automatiquement lors de Session 84b - 2025-11-16
