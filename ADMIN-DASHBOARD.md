# 🎛️ Cartae - Admin Dashboard (Interface Unifiée)

**Objectif :** Une interface web unique pour superviser **tous** les composants du système : services, credentials, plugins, logs, métriques.

---

## 🎯 Pourquoi un Dashboard Admin ?

**Problème actuel :**
- Vault UI (http://localhost:8000) - Secrets
- pgAdmin (http://localhost:5050) - PostgreSQL
- Pas de vue d'ensemble du système
- Pas de centralisation des credentials
- Pas de monitoring temps réel

**Solution : Dashboard Admin Cartae**
- **Une seule URL** : http://localhost:3002/admin
- **Authentification unique** (JWT + RBAC)
- **Vue unifiée** de tous les services
- **Gestion centralisée** des plugins, secrets, users
- **Monitoring temps réel** (métriques, logs, alertes)

---

## 📐 Architecture du Dashboard

```
┌───────────────────────────────────────────────────────────┐
│              CARTAE ADMIN DASHBOARD                       │
│                 (React + TypeScript)                      │
│                http://localhost:3002                      │
└───────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Services    │  │   Secrets    │  │   Plugins    │
│  Status      │  │  (Vault)     │  │   Registry   │
│              │  │              │  │              │
│ • PostgreSQL │  │ • Read       │  │ • Install    │
│ • Vault      │  │ • Write      │  │ • Configure  │
│ • Redis      │  │ • Delete     │  │ • Enable     │
│ • API        │  │ • Rotate     │  │ • Disable    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Users &    │  │  Audit Logs  │  │  Monitoring  │
│    RBAC      │  │              │  │              │
│              │  │ • Auth       │  │ • Metrics    │
│ • List       │  │ • Plugins    │  │ • Alerts     │
│ • Create     │  │ • Secrets    │  │ • Health     │
│ • Roles      │  │ • Errors     │  │ • Graphs     │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🎨 Maquette de l'Interface

### **Page 1 : Dashboard Overview (Vue d'Ensemble)**

```
╔═══════════════════════════════════════════════════════════════╗
║  🎛️ CARTAE ADMIN DASHBOARD                      👤 Admin ▼   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📊 SYSTÈME STATUS                   Last updated: 2s ago    ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  ✅ PostgreSQL     Healthy  │  ✅ Vault      Unsealed   │ ║
║  │  ✅ Redis          Running  │  ✅ API        Healthy    │ ║
║  │  ⚠️  Frontend       Slow     │  ✅ EventBus   Running   │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🔐 SECRETS (VAULT)                          [View All →]    ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Path: cartae/postgres              Updated: 2h ago     │ ║
║  │  Path: plugins/gmail/oauth          Updated: 1d ago     │ ║
║  │  Path: plugins/office365/token      Updated: 3h ago     │ ║
║  │  + Add Secret                                            │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🔌 PLUGINS                              [Marketplace →]     ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Gmail Connector       ✅ Active    │  1.2.0  │ [Config] │ ║
║  │  Office365 Connector   ✅ Active    │  1.0.1  │ [Config] │ ║
║  │  Obsidian Sync         ⚠️  Warning  │  0.9.0  │ [Logs]   │ ║
║  │  + Install Plugin                                        │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  📈 MÉTRIQUES (24H)                                           ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Requests:  12,543  │  Errors:     23  │  Avg: 45ms     │ ║
║  │  Users:         42  │  Plugins:     8  │  Secrets: 156  │ ║
║  │  [Graph: Request Rate Last 24h]    📊                    │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🚨 ALERTES RÉCENTES                          [View All →]   ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  ⚠️  High CPU on PostgreSQL (85%)      3 minutes ago    │ ║
║  │  🔴 Failed login attempts (15)          1 hour ago      │ ║
║  │  ⚠️  Plugin quota exceeded (gmail)      2 hours ago     │ ║
║  └─────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### **Page 2 : Secrets Manager (Gestion Vault)**

```
╔═══════════════════════════════════════════════════════════════╗
║  🔐 SECRETS MANAGER (VAULT)                                   ║
╠═══════════════════════════════════════════════════════════════╣
║  📁 Path: /secret/data/                                       ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  📁 cartae/                                              │ ║
║  │      📄 postgres                 [View] [Edit] [Delete]  │ ║
║  │      📄 redis                    [View] [Edit] [Delete]  │ ║
║  │  📁 plugins/                                             │ ║
║  │      📁 gmail/                                           │ ║
║  │          📄 oauth                [View] [Edit] [Delete]  │ ║
║  │          📄 tokens               [View] [Edit] [Delete]  │ ║
║  │      📁 office365/                                       │ ║
║  │          📄 oauth                [View] [Edit] [Delete]  │ ║
║  │  + Create New Secret                                     │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🔍 VIEWING: secret/data/cartae/postgres                     ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Key: host          Value: localhost                     │ ║
║  │  Key: port          Value: 5432                          │ ║
║  │  Key: database      Value: cartae                        │ ║
║  │  Key: username      Value: cartae                        │ ║
║  │  Key: password      Value: ••••••••••••••  [Show]        │ ║
║  │                                                           │ ║
║  │  Created:  2025-11-15 14:30:00                           │ ║
║  │  Updated:  2025-11-15 15:11:59                           │ ║
║  │  Version:  1                                             │ ║
║  │                                                           │ ║
║  │  [Edit Secret]  [Delete Secret]  [Rotate Password]       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### **Page 3 : Plugin Manager**

```
╔═══════════════════════════════════════════════════════════════╗
║  🔌 PLUGIN MANAGER                                            ║
╠═══════════════════════════════════════════════════════════════╣
║  🔍 Search: [____________]  Filter: [All ▼]  Sort: [Name ▼]  ║
║                                                               ║
║  📦 INSTALLED PLUGINS (8)                                     ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Gmail Connector                          v1.2.0  ✅      │ ║
║  │  Sync emails from Gmail using OAuth2                     │ ║
║  │  Status: Active  │  Requests: 1,234  │  Errors: 0       │ ║
║  │  [Configure]  [Disable]  [Logs]  [Uninstall]            │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  Office365 Connector                      v1.0.1  ✅      │ ║
║  │  Sync emails & calendar from Office365                   │ ║
║  │  Status: Active  │  Requests: 567  │  Errors: 2         │ ║
║  │  [Configure]  [Disable]  [Logs]  [Uninstall]            │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  Obsidian Sync                            v0.9.0  ⚠️       │ ║
║  │  Sync Obsidian vault with Cartae                         │ ║
║  │  Status: Warning (quota exceeded)                        │ ║
║  │  Quota: 95/100 MB  │  Requests: 2,345  │  Errors: 12    │ ║
║  │  [Configure]  [Disable]  [Logs]  [Uninstall]            │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🛍️ MARKETPLACE (Install New Plugins)                        ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  [🔌 Notion Connector]     [🔌 Slack Connector]          │ ║
║  │  [🔌 Todoist Connector]    [🔌 GitHub Connector]         │ ║
║  │  [🔌 Trello Connector]     [🔌 ... Browse More]          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### **Page 4 : Audit Logs**

```
╔═══════════════════════════════════════════════════════════════╗
║  📋 AUDIT LOGS                                                ║
╠═══════════════════════════════════════════════════════════════╣
║  Filter: [Last 24h ▼]  Type: [All ▼]  User: [All ▼]         ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  2025-11-15 15:30:42  │  auth.login        │  admin      │ ║
║  │  IP: 192.168.1.100    │  Success           │  [Details]  │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  2025-11-15 15:28:15  │  secret.read       │  admin      │ ║
║  │  Path: cartae/postgres│  Success           │  [Details]  │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  2025-11-15 15:25:03  │  plugin.execute    │  user123    │ ║
║  │  Plugin: gmail        │  Success           │  [Details]  │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  2025-11-15 15:20:00  │  auth.failed       │  unknown    │ ║
║  │  IP: 203.0.113.42     │  Failed (3 times)  │  🔴 Alert   │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │  2025-11-15 15:15:30  │  secret.write      │  admin      │ ║
║  │  Path: plugins/gmail  │  Success           │  [Details]  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [Export CSV]  [Export JSON]  [Configure Alerts]             ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🛠️ Stack Technique du Dashboard

```typescript
// Frontend (apps/admin-dashboard)
{
  "framework": "React 18 + TypeScript",
  "ui": "shadcn/ui + Tailwind CSS",
  "charts": "recharts (métriques temps réel)",
  "state": "Zustand (lightweight state management)",
  "routing": "React Router v6",
  "auth": "JWT + Protected Routes"
}

// Backend API (packages/admin-api)
{
  "framework": "Express + TypeScript",
  "port": 3002,
  "endpoints": {
    "/api/services/status": "Health check tous services",
    "/api/vault/*": "Proxy vers Vault (CRUD secrets)",
    "/api/plugins/*": "Plugin management (install, config, logs)",
    "/api/users/*": "User management (RBAC)",
    "/api/audit/*": "Audit logs (filtres, export)",
    "/api/metrics/*": "Métriques temps réel (Prometheus)"
  }
}
```

---

## 🚀 Roadmap Implémentation

### **Phase 1 : MVP (2-3 semaines)**
- [ ] Setup projet `apps/admin-dashboard` (React + shadcn/ui)
- [ ] Setup API `packages/admin-api` (Express)
- [ ] Page Overview (services status + alertes)
- [ ] Authentification JWT (login, logout, protected routes)
- [ ] Secrets Manager (read-only, integration Vault)

### **Phase 2 : CRUD Complet (2-3 semaines)**
- [ ] Secrets Manager (create, update, delete, rotate)
- [ ] Plugin Manager (install, configure, enable/disable)
- [ ] User Management (RBAC, rôles, permissions)
- [ ] Audit Logs (filtres, pagination, export CSV/JSON)

### **Phase 3 : Monitoring Avancé (2-3 semaines)**
- [ ] Métriques temps réel (Prometheus + Grafana)
- [ ] Graphs interactifs (recharts)
- [ ] Alerting automatique (Slack, Email, Webhook)
- [ ] Health checks automatiques (toutes les 10s)

### **Phase 4 : UX/UI Polish (1-2 semaines)**
- [ ] Dark mode
- [ ] Responsive mobile
- [ ] Notifications toast
- [ ] Keyboard shortcuts
- [ ] Documentation inline (tooltips)

---

## 📝 Exemple d'Utilisation

### **Scénario 1 : Ajouter un nouveau secret pour un plugin**

1. Aller sur http://localhost:3002/admin/secrets
2. Cliquer "+ Create New Secret"
3. Remplir le formulaire :
   - Path: `plugins/notion/oauth`
   - Key 1: `clientId` → `abc123`
   - Key 2: `clientSecret` → `xyz789`
4. Cliquer "Save"
5. Le secret est créé dans Vault (`secret/data/plugins/notion/oauth`)
6. Le plugin Notion peut maintenant y accéder via VaultProxy

---

### **Scénario 2 : Installer un nouveau plugin**

1. Aller sur http://localhost:3002/admin/plugins
2. Cliquer "Marketplace"
3. Chercher "Notion Connector"
4. Cliquer "Install"
5. Le manifest du plugin est validé (permissions, quotas)
6. Configurer les credentials OAuth
7. Le plugin est activé et visible dans la liste

---

### **Scénario 3 : Débugger une erreur de plugin**

1. Aller sur http://localhost:3002/admin/plugins
2. Cliquer sur "Gmail Connector"
3. Onglet "Logs"
4. Filtrer par "Errors" (dernières 24h)
5. Voir le stack trace complet
6. Exporter les logs en JSON pour analyse

---

## 🔒 Sécurité du Dashboard

### **Authentification**
```typescript
// JWT avec rôle admin requis
POST /api/auth/login
{
  "email": "admin@cartae.dev",
  "password": "super-secure-password"
}

// Réponse
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "admin@cartae.dev",
    "role": "admin"
  }
}
```

### **Autorisation (RBAC)**
```typescript
// Middleware de vérification
async function requireAdmin(req, res, next) {
  const user = await verifyJWT(req.headers.authorization);

  if (user.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Toutes les routes du dashboard sont protégées
app.use('/api/admin/*', requireAdmin);
```

### **Audit Logging**
Toutes les opérations du dashboard sont loggées :
- Login/logout admin
- Création/modification/suppression de secrets
- Installation/désinstallation de plugins
- Modification de permissions utilisateurs

---

## 🎯 Résumé

**Dashboard Admin Cartae = Interface Unifiée pour :**
- ✅ Voir l'état de **tous** les services (PostgreSQL, Vault, Redis, API)
- ✅ Gérer **tous** les secrets (Vault) sans passer par Vault UI
- ✅ Installer/configurer **tous** les plugins (Marketplace intégré)
- ✅ Voir **tous** les logs d'audit (auth, plugins, secrets)
- ✅ Monitorer **toutes** les métriques (requests, errors, latency)
- ✅ Une seule URL, une seule authentification

**Accès :** http://localhost:3002/admin
**Credentials :** `admin@cartae.dev` / `admin` (dev)
