# Plugin Admin - Cartae

Plugin d'administration pour contrôler et monitorer le système Cartae.

## 🎯 Fonctionnalités

### Contrôle du Marketplace
- **Bascule de source** : Git ↔️ Cloudflare CDN ↔️ Hybride
- **Test de connectivité** : Vérifier la santé des sources avant de basculer
- **Configuration d'URLs** : Personnaliser les URLs Git et CDN
- **Effet immédiat** : Toutes les apps basculent sans rebuild

### Monitoring
- **Health Checks** : État de santé en temps réel de chaque source
- **Statistiques** : Requests, fallbacks, erreurs, temps de réponse
- **Graphiques** : Visualisation de la distribution des requêtes
- **Rafraîchissement auto** : Mise à jour toutes les 10-30 secondes

### Historique
- **Audit Trail** : Qui a changé quoi et quand
- **Détails complets** : Config exacte de chaque changement
- **Timeline** : Vue chronologique inversée (plus récent en premier)

## 📦 Installation

### Prérequis

1. **Migration Supabase appliquée** :
   ```bash
   psql -h YOUR_SUPABASE_HOST -U postgres -d postgres \
     -f supabase/migrations/20251031_app_config_marketplace.sql
   ```

2. **Permissions admin** :
   - Votre user doit être dans la table `admin_users`
   - `is_active = true`

### Installation du Plugin

```bash
# Depuis la racine du monorepo
cd packages/plugin-admin

# Installer les dépendances
pnpm install

# Build le plugin
pnpm build
```

### Activation dans l'App

```typescript
// Dans votre app Cartae
import { pluginSystem } from '@cartae/plugin-system';
import AdminPlugin from '@cartae/plugin-admin';

// Activer le plugin
await pluginSystem.register(AdminPlugin);
```

## 🚀 Utilisation

### Accéder au Panel Admin

1. Ouvrir votre app Cartae
2. Sidebar → Cliquer sur "Admin Panel" (🛡️ icône shield)

### Basculer vers Cloudflare CDN

1. **Onglet "Marketplace"**
2. Entrer l'URL CDN dans "Cloudflare CDN URL" (ex: `https://marketplace.cartae.com`)
3. Cliquer **"Tester"** → Vérifier ✅ OK
4. Cliquer **"☁️ Cloudflare CDN"**
5. Confirmer

**Résultat** : Toutes les apps (anciennes et nouvelles) basculent immédiatement vers le CDN.

### Surveiller la Santé des Sources

1. **Onglet "Monitoring"**
2. Section **"État de Santé des Sources"**
   - ✅ Opérationnel : Source fonctionne
   - ❌ Indisponible : Source down ou erreur
   - ⏱️ Temps de réponse : Latency en ms
   - 🕐 Dernier check : Timestamp du dernier health check

3. Cliquer **"🔄 Rafraîchir"** pour forcer un nouveau check

### Consulter les Statistiques

1. **Onglet "Monitoring"**
2. Section **"Statistiques d'Utilisation"**
   - 📊 Total Requêtes
   - 📦 Requêtes Git (+ %)
   - ☁️ Requêtes CDN (+ %)
   - ⏱️ Temps Moyen de résolution
   - 🔄 Fallbacks (combien de fois le fallback a été utilisé)
   - ❌ Erreurs (+ taux d'erreur)

3. **Graphique de distribution** : Barre colorée montrant la répartition Git vs CDN

4. Cliquer **"🔄 Réinitialiser"** pour reset les stats (utile après debug)

### Voir l'Historique

1. **Onglet "Historique"**
2. Liste chronologique des changements (plus récent en haut)
3. Pour chaque entrée :
   - Badge de type (Git / CDN / Hybride)
   - Date et heure exactes
   - Détails de la config (URLs, priorité, health checks)
   - Qui a fait le changement (email + nom)

## 🎛️ Modes de Fonctionnement

### Mode Git (par défaut)
```json
{
  "type": "git",
  "priority": ["git"],
  "gitUrl": "https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json"
}
```

**Utilisation** :
- 📦 Source gratuite
- ⚠️ Rate-limited (5,000 req/h)
- ✅ Parfait pour < 1,000 users

### Mode Cloudflare CDN
```json
{
  "type": "cloudflare",
  "priority": ["cloudflare"],
  "cloudflareUrl": "https://marketplace.cartae.com"
}
```

**Utilisation** :
- ☁️ Rapide et scalable
- 💰 Nécessite déploiement Cloudflare Worker
- ✅ Parfait pour > 10,000 users

### Mode Hybride (CDN prioritaire)
```json
{
  "type": "both",
  "priority": ["cloudflare", "git"],
  "gitUrl": "...",
  "cloudflareUrl": "..."
}
```

**Utilisation** :
- 🔄 Essaye CDN d'abord, fallback sur Git si erreur
- ✅ Migration progressive (canary)
- ✅ Résilience maximale

### Mode Hybride (Git prioritaire)
```json
{
  "type": "both",
  "priority": ["git", "cloudflare"]
}
```

**Utilisation** :
- 🔄 Essaye Git d'abord, fallback sur CDN si rate-limit
- ✅ Économiser les coûts Cloudflare
- ✅ Utiliser CDN uniquement en backup

## 🔧 Configuration

### Variables d'Environnement

Aucune ! Le plugin lit tout depuis Supabase.

### Permissions Requises

Pour utiliser le plugin admin, votre user Supabase doit :
1. Être dans `admin_users` table
2. `is_active = true`

**Vérifier** :
```sql
SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_UUID';
```

**Ajouter un admin** :
```sql
INSERT INTO admin_users (user_id, is_active)
VALUES ('YOUR_USER_UUID', true);
```

### Settings du Plugin

Le plugin a 2 settings configurables :

- **Enable Monitoring** (boolean, default: `true`)
  - Active/désactive le monitoring automatique

- **Refresh Interval** (number, default: `30`)
  - Intervalle de rafraîchissement des stats (en secondes)

## 🧩 API

### Services

#### MarketplaceConfigService

```typescript
import {
  getCurrentConfig,
  switchToGit,
  switchToCloudflare,
  switchToBoth,
  testSourceConnectivity,
  getConfigHistory,
} from '@cartae/plugin-admin/services/MarketplaceConfigService';

// Obtenir la config actuelle
const config = await getCurrentConfig();

// Basculer vers Git
const success = await switchToGit();

// Basculer vers Cloudflare
await switchToCloudflare('https://marketplace.cartae.com');

// Mode hybride
await switchToBoth(['cloudflare', 'git'], {
  cloudflareUrl: 'https://marketplace.cartae.com',
  gitUrl: 'https://raw.githubusercontent.com/...',
});

// Tester une source
const result = await testSourceConnectivity('git', 'https://...');
// → { success: true, responseTime: 234 }

// Historique
const history = await getConfigHistory();
```

### Composants React

```typescript
import {
  AdminPanel,
  MarketplaceSourceControl,
  SourceHealthMonitor,
  UsageStatsPanel,
  ConfigHistoryPanel,
} from '@cartae/plugin-admin/components';

// Utiliser dans votre app
<AdminPanel />
```

## 📊 Monitoring Best Practices

### Quand Basculer vers Cloudflare ?

**Indicateurs** :
- Requests Git > 4,000/heure (80% du rate-limit)
- Erreurs 429 (rate-limit) > 5%
- Temps de réponse Git > 2 secondes

**Action** :
1. Déployer Cloudflare Worker
2. Tester la connectivité dans Plugin Admin
3. Basculer vers Hybride (CDN prioritaire) pendant 24h
4. Si stats OK, basculer vers 100% CDN

### Alertes à Configurer

**Recommandé** (via monitoring externe ou Supabase Functions) :
- Alerte si `errorRate > 10%`
- Alerte si `fallbackRate > 50%` (indique que source primaire down)
- Alerte si `avgResponseTime > 5000ms`
- Alerte si health check échoue 3 fois de suite

## 🐛 Troubleshooting

### "Unauthorized: Only admins can update app config"

**Cause** : Votre user n'est pas admin

**Solution** :
```sql
-- Vérifier votre user_id
SELECT auth.uid();

-- Ajouter à admin_users
INSERT INTO admin_users (user_id, is_active)
VALUES ('YOUR_USER_UUID', true);
```

### "Failed to fetch config from Supabase"

**Causes possibles** :
1. Migration Supabase pas appliquée
2. RLS bloque la lecture
3. Connexion Supabase down

**Solutions** :
1. Appliquer la migration `20251031_app_config_marketplace.sql`
2. Vérifier la policy `app_config_public_read` existe
3. Check `supabase status` ou dashboard Supabase

### Health Check Toujours Unhealthy

**Causes possibles** :
1. URL incorrecte
2. CORS bloque les requêtes HEAD
3. Source réellement down

**Solutions** :
1. Vérifier l'URL dans Plugin Admin → onglet Marketplace
2. Tester manuellement : `curl -I <URL>`
3. Vérifier les logs du Worker Cloudflare

### Stats Montrent 0 Requêtes

**Cause** : Aucune requête marketplace faite depuis le dernier reset

**Solution** : Utiliser normalement l'app (ouvrir marketplace, chercher plugins), les stats augmenteront

## 🔗 Liens Utiles

- **Documentation complète** : [MIGRATION-STRATEGY.md](../../MIGRATION-STRATEGY.md)
- **MarketplaceSourceResolver** : [apps/web/src/services/MarketplaceSourceResolver.ts](../../apps/web/src/services/MarketplaceSourceResolver.ts)
- **Migration Supabase** : [supabase/migrations/20251031_app_config_marketplace.sql](../../supabase/migrations/20251031_app_config_marketplace.sql)
- **Cloudflare Worker** : [infrastructure/cloudflare-worker/](../../infrastructure/cloudflare-worker/)

## 📝 Roadmap

### v1.1 (À venir)
- [ ] Alertes automatiques (email/webhook)
- [ ] Bascule automatique si rate-limit détecté
- [ ] Export des stats en CSV
- [ ] Graphiques avancés (Chart.js)
- [ ] Support de sources multiples (> 2)

### v1.2 (Futur)
- [ ] Canary deployment configuré via UI (10%, 25%, 50%, 100%)
- [ ] A/B testing (router 50% vers Git, 50% vers CDN)
- [ ] Logs détaillés par request
- [ ] Dashboard temps réel (WebSocket)

## 🤝 Contributing

Contributions bienvenues ! Ouvrir une issue ou PR sur GitHub.

## 📄 License

MIT - Cartae Team

---

**Version** : 1.0.0
**Dernière mise à jour** : 31 octobre 2025
