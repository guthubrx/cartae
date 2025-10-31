# 🌐 Cartae Marketplace API - Cloudflare Worker

API REST complète pour le marketplace de plugins Cartae/BigMind, déployée sur Cloudflare Workers avec stockage R2 et KV.

## 📋 Fonctionnalités

### Endpoints Disponibles

#### Plugins

- `GET /api/plugins` - Liste paginée avec filtres et tri
- `GET /api/plugins/:id` - Détails d'un plugin
- `GET /api/plugins/:id/download` - Télécharger le ZIP
- `GET /api/plugins/featured` - Plugins en vedette
- `GET /api/plugins/trending` - Plugins tendance (par downloads)
- `GET /api/plugins/categories/:category` - Filtrer par catégorie

#### Analytics

- `POST /api/plugins/:id/track-install` - Track une installation

#### Recherche

- `GET /api/search?q=query` - Recherche avancée

#### Monitoring

- `GET /api/health` - Health check

### Fonctionnalités

✅ **Pagination** : Support complet avec `page` et `limit`
✅ **Filtrage** : Par catégorie, source, pricing, featured
✅ **Tri** : Par nom, downloads, rating, date de mise à jour
✅ **Recherche** : Full-text sur nom, description, tags
✅ **Cache** : Multi-layer (R2 + KV + CDN)
✅ **Analytics** : Track installations via KV
✅ **CORS** : Headers configurés pour toutes les origines
✅ **Error Handling** : Réponses standardisées

## 🚀 Déploiement

### Prérequis

1. Compte Cloudflare
2. Wrangler CLI installé
3. R2 Bucket créé
4. KV Namespace créé (optionnel pour analytics)

### Installation Wrangler

```bash
npm install -g wrangler
```

### Authentification

```bash
wrangler login
```

### Créer les Ressources Cloudflare

#### 1. Créer le R2 Bucket

```bash
wrangler r2 bucket create cartae-plugins
wrangler r2 bucket create cartae-plugins-preview  # Pour le dev
```

#### 2. Créer le KV Namespace (optionnel)

```bash
# Production
wrangler kv:namespace create "KV_STORE"
# Note: Copy the ID and paste in wrangler.toml

# Preview/Development
wrangler kv:namespace create "KV_STORE" --preview
# Note: Copy the preview_id and paste in wrangler.toml
```

### Configuration

Éditer `wrangler.toml` et remplir les IDs :

```toml
[[kv_namespaces]]
binding = "KV_STORE"
id = "YOUR_KV_NAMESPACE_ID"          # Copier depuis la commande ci-dessus
preview_id = "YOUR_PREVIEW_KV_ID"    # Copier depuis la commande ci-dessus
```

### Uploader le Registry Initia

Créer `registry.json` :

```json
{
  "version": "1.0.0",
  "plugins": [],
  "updatedAt": "2025-01-31T00:00:00.000Z"
}
```

Upload vers R2 :

```bash
wrangler r2 object put cartae-plugins/registry.json --file=registry.json
```

### Déployer le Worker

#### Mode Development

```bash
cd infrastructure/cloudflare-worker
wrangler deploy --env development
```

#### Mode Production

```bash
wrangler deploy --env production
```

## 🧪 Tester l'API

### Health Check

```bash
curl https://YOUR_WORKER.workers.dev/api/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "service": "cartae-marketplace-api",
  "timestamp": "2025-01-31T...",
  "components": {
    "r2": "ok",
    "kv": "ok"
  }
}
```

### Liste des Plugins

```bash
# Simple
curl https://YOUR_WORKER.workers.dev/api/plugins

# Avec pagination
curl "https://YOUR_WORKER.workers.dev/api/plugins?page=2&limit=10"

# Avec filtres
curl "https://YOUR_WORKER.workers.dev/api/plugins?category=theme&source=official"

# Avec tri
curl "https://YOUR_WORKER.workers.dev/api/plugins?sort=downloads"

# Recherche
curl "https://YOUR_WORKER.workers.dev/api/plugins?q=palette"
```

### Plugin Spécifique

```bash
curl https://YOUR_WORKER.workers.dev/api/plugins/com.cartae.palette-manager
```

### Téléchargement

```bash
curl -O https://YOUR_WORKER.workers.dev/api/plugins/com.cartae.palette-manager/download?version=latest
```

### Featured et Trending

```bash
curl https://YOUR_WORKER.workers.dev/api/plugins/featured
curl https://YOUR_WORKER.workers.dev/api/plugins/trending
```

### Track Installation

```bash
curl -X POST https://YOUR_WORKER.workers.dev/api/plugins/com.cartae.palette-manager/track-install \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0.0"}'
```

### Recherche

```bash
curl "https://YOUR_WORKER.workers.dev/api/search?q=color"
```

## 📦 Ajouter des Plugins au Registry

### 1. Préparer le Plugin

Structure du plugin :

```
my-plugin/
├── manifest.json
├── index.js
└── ... autres fichiers
```

### 2. Créer le ZIP

```bash
cd my-plugin
zip -r ../my-plugin-1.0.0.zip .
```

### 3. Upload vers R2

```bash
wrangler r2 object put cartae-plugins/plugins/com.example.myplugin/com.example.myplugin-1.0.0.zip \
  --file=my-plugin-1.0.0.zip
```

### 4. Mettre à Jour le Registry

Éditer `registry.json` localement :

```json
{
  "version": "1.0.0",
  "plugins": [
    {
      "id": "com.example.myplugin",
      "name": "My Plugin",
      "version": "1.0.0",
      "description": "Description",
      "author": {
        "name": "Author",
        "email": "author@example.com"
      },
      "category": "productivity",
      "source": "community",
      "pricing": "free",
      "featured": false,
      "tags": ["tag1", "tag2"],
      "downloads": 0,
      "rating": 0,
      "updatedAt": "2025-01-31T00:00:00.000Z"
    }
  ],
  "updatedAt": "2025-01-31T00:00:00.000Z"
}
```

Upload :

```bash
wrangler r2 object put cartae-plugins/registry.json --file=registry.json
```

## 📊 Monitoring

### Logs en Temps Réel

```bash
wrangler tail
```

### Métriques

Accéder au dashboard Cloudflare :

- Workers > cartae-marketplace-api > Metrics
- Voir : Requests, Errors, CPU time, etc.

### Analytics (KV)

Voir les installations trackées :

```bash
wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix="install:"
```

## 🔧 Configuration Avancée

### Custom Domain

1. Dans Cloudflare Dashboard : Workers > cartae-marketplace-api > Triggers
2. Ajouter un Custom Domain : `marketplace.cartae.com`
3. Ou ajouter une Route dans `wrangler.toml`

### Rate Limiting

Le worker inclut une configuration de rate limiting (voir `CONFIG` dans worker.js).

Pour activer le vrai rate limiting Cloudflare :

1. Dashboard > Workers > cartae-marketplace-api > Settings
2. Activer "Rate Limiting"
3. Configurer les règles

### Secrets

Pour stocker des secrets (API keys, etc.) :

```bash
wrangler secret put SECRET_NAME
```

Utilisation dans le worker :

```javascript
const apiKey = env.SECRET_NAME;
```

## 🔐 Sécurité

### CORS

CORS est activé pour toutes les origines (`*`). Pour restreindre :

```javascript
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://app.cartae.com',
    // ...
  };
}
```

### Authentication (Future)

Pour ajouter l'authentification :

1. Générer des API keys
2. Stocker dans KV ou Secrets
3. Vérifier dans le middleware

```javascript
async function authenticate(request, env) {
  const apiKey = request.headers.get('Authorization');
  // Valider l'API key
}
```

## 🧹 Maintenance

### Purger le Cache

Le cache CDN de Cloudflare peut être purgé via :

```bash
# Tout purger
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

### Nettoyer le KV

```bash
# Lister toutes les clés
wrangler kv:key list --namespace-id=YOUR_KV_ID

# Supprimer une clé
wrangler kv:key delete --namespace-id=YOUR_KV_ID "key_name"
```

### Backup du Registry

```bash
# Télécharger le registry
wrangler r2 object get cartae-plugins/registry.json --file=registry-backup.json

# Lister tous les plugins
wrangler r2 object list cartae-plugins --prefix="plugins/"
```

## 📝 Développement Local

### Wrangler Dev

```bash
wrangler dev
```

Cela démarre un serveur local sur `http://localhost:8787`.

### Variables d'Environnement

Pour le développement local, créer `.dev.vars` :

```
ENVIRONMENT=development
```

## 🔗 Intégration avec l'App

Dans `apps/web/.env` :

```env
VITE_MARKETPLACE_URL=https://YOUR_WORKER.workers.dev
```

Ou en production :

```env
VITE_MARKETPLACE_URL=https://marketplace.cartae.com
```

## 📚 Ressources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [KV Documentation](https://developers.cloudflare.com/kv/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## ⚠️ Limites

### Free Tier

- **Requests** : 100,000 / jour
- **CPU Time** : 10ms / request
- **R2 Storage** : 10 GB
- **KV Reads** : 100,000 / jour
- **KV Writes** : 1,000 / jour

### Paid Tier

- **Requests** : $0.50 / million
- **R2 Storage** : $0.015 / GB / mois
- **KV Reads** : $0.50 / million
- **KV Writes** : $5.00 / million

## 🐛 Dépannage

### Worker ne démarre pas

```bash
# Vérifier la syntaxe
wrangler dev

# Voir les logs
wrangler tail
```

### R2 Bucket non accessible

Vérifier que le binding est correct dans `wrangler.toml` et que le bucket existe :

```bash
wrangler r2 bucket list
```

### KV non accessible

Vérifier les IDs dans `wrangler.toml` :

```bash
wrangler kv:namespace list
```

---

**Déployé et maintenu avec ❤️ pour Cartae**
