# 🔐 Cartae - Security-Driven + Plugin-First Architecture

**Philosophie :** La sécurité n'est pas une couche ajoutée après coup, c'est le **fondement** de l'architecture. Les plugins sont des citoyens de première classe, mais **sandboxés** et **audités**.

---

## 📐 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                         │
│              (Frontend React + TypeScript)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY GATEWAY                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication (JWT, OAuth2, API Keys)              │  │
│  │  Authorization (RBAC - Role-Based Access Control)    │  │
│  │  Rate Limiting (par user, par plugin, par endpoint)  │  │
│  │  Audit Logging (toutes les opérations critiques)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     PLUGIN RUNTIME                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Plugin Loader (charge plugins avec permissions)     │  │
│  │  Plugin Sandbox (isolation, quotas, timeouts)        │  │
│  │  Plugin Registry (manifests, versions, deps)         │  │
│  │  Inter-Plugin Communication (via EventBus sécurisé)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────┐    ┌──────────────────────┐
│   CORE SERVICES      │    │    PLUGINS           │
│                      │    │                      │
│  • Storage Layer     │    │  • Gmail Plugin      │
│  • Cache Manager     │    │  • Office365 Plugin  │
│  • Search Engine     │    │  • Obsidian Plugin   │
│  • EventBus          │    │  • ... (extensible)  │
│  • Crypto Service    │    │                      │
└──────────────────────┘    └──────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │ HashiCorp    │  │   Redis      │     │
│  │  + pgvector  │  │   Vault      │  │  (Cache)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Layers (Couches de Sécurité)

### 1. **Authentication Layer (Couche d'Authentification)**

**Responsabilité :** Vérifier l'identité de l'utilisateur

**Méthodes supportées :**
```typescript
interface AuthenticationLayer {
  // JWT (JSON Web Token) - Pour API calls
  authenticateJWT(token: string): Promise<User>;

  // OAuth2 (Google, Microsoft, GitHub)
  authenticateOAuth(provider: string, code: string): Promise<User>;

  // API Key (pour plugins tiers)
  authenticateAPIKey(apiKey: string): Promise<User>;

  // Session Cookie (pour frontend web)
  authenticateSession(sessionId: string): Promise<User>;
}
```

**Stockage sécurisé :**
- **Tokens JWT** : Signés avec clé privée RSA (stockée dans Vault)
- **Refresh tokens** : Chiffrés AES-256, stockés dans Redis avec TTL
- **API Keys** : Hashés avec bcrypt avant stockage (jamais en clair)
- **Sessions** : Stockées dans Redis avec TTL court (15 min)

---

### 2. **Authorization Layer (Couche d'Autorisation)**

**Responsabilité :** Vérifier les permissions de l'utilisateur

**Modèle RBAC (Role-Based Access Control) :**

```typescript
// Rôles hiérarchiques
enum Role {
  ADMIN = 'admin',       // Tous les droits (gestion users, plugins, secrets)
  POWER_USER = 'power',  // Peut créer/modifier/supprimer ses propres items
  USER = 'user',         // Lecture/écriture limitée (ses propres items)
  GUEST = 'guest',       // Lecture seule (items publics seulement)
}

// Permissions granulaires
enum Permission {
  // Items
  ITEM_CREATE = 'item:create',
  ITEM_READ = 'item:read',
  ITEM_UPDATE = 'item:update',
  ITEM_DELETE = 'item:delete',

  // Plugins
  PLUGIN_INSTALL = 'plugin:install',
  PLUGIN_CONFIGURE = 'plugin:configure',
  PLUGIN_EXECUTE = 'plugin:execute',

  // Secrets (Vault)
  SECRET_READ = 'secret:read',
  SECRET_WRITE = 'secret:write',
  SECRET_DELETE = 'secret:delete',

  // Admin
  USER_MANAGE = 'user:manage',
  AUDIT_VIEW = 'audit:view',
}

// Matrice permissions → rôles
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [/* tous */],
  [Role.POWER_USER]: [
    Permission.ITEM_CREATE,
    Permission.ITEM_READ,
    Permission.ITEM_UPDATE,
    Permission.ITEM_DELETE,
    Permission.PLUGIN_EXECUTE,
    Permission.SECRET_READ, // Peut lire ses propres secrets
  ],
  [Role.USER]: [
    Permission.ITEM_CREATE,
    Permission.ITEM_READ,
    Permission.ITEM_UPDATE,
    Permission.PLUGIN_EXECUTE,
  ],
  [Role.GUEST]: [
    Permission.ITEM_READ, // Items publics seulement
  ],
};
```

**Implémentation :**
```typescript
class AuthorizationService {
  async checkPermission(user: User, permission: Permission): Promise<boolean> {
    const userPermissions = ROLE_PERMISSIONS[user.role];
    return userPermissions.includes(permission);
  }

  async enforce(user: User, permission: Permission): Promise<void> {
    const allowed = await this.checkPermission(user, permission);
    if (!allowed) {
      throw new UnauthorizedError(`User ${user.id} lacks permission: ${permission}`);
    }
  }
}
```

---

### 3. **Plugin Sandbox (Isolation des Plugins)**

**Responsabilité :** Isoler les plugins pour éviter qu'un plugin malveillant ne compromette le système

**Mécanismes d'isolation :**

#### a) **Permission Model (Modèle de Permissions)**

Chaque plugin déclare ses besoins dans un **manifest** :

```json
{
  "name": "gmail-plugin",
  "version": "1.0.0",
  "permissions": [
    "network:https://gmail.googleapis.com/*",
    "vault:read:gmail/*",
    "storage:write:emails",
    "events:emit:email.received"
  ],
  "quotas": {
    "maxRequests": 1000,        // Max 1000 API calls / heure
    "maxStorage": 104857600,    // Max 100 MB stockés
    "maxMemory": 52428800,      // Max 50 MB RAM
    "timeout": 30000            // Timeout 30s par opération
  }
}
```

**Validation stricte :**
```typescript
class PluginSandbox {
  async executePlugin(plugin: Plugin, operation: string, args: any): Promise<any> {
    // 1. Vérifier permissions
    await this.checkPermissions(plugin, operation);

    // 2. Vérifier quotas (rate limiting)
    await this.checkQuotas(plugin);

    // 3. Créer contexte isolé (pas d'accès direct au filesystem, network, etc.)
    const isolatedContext = this.createIsolatedContext(plugin);

    // 4. Exécuter avec timeout
    const result = await this.executeWithTimeout(
      () => plugin[operation](args, isolatedContext),
      plugin.manifest.quotas.timeout
    );

    // 5. Audit log
    await this.auditLog({
      pluginId: plugin.id,
      operation,
      args: this.sanitize(args), // Nettoyer secrets avant log
      result: result.success,
      timestamp: new Date(),
    });

    return result;
  }
}
```

#### b) **Network Isolation (Isolation Réseau)**

Les plugins ne peuvent PAS faire de requêtes HTTP directes. Tout passe par un **NetworkProxy** :

```typescript
class NetworkProxy {
  async fetch(plugin: Plugin, url: string, options: RequestInit): Promise<Response> {
    // 1. Vérifier que l'URL est dans les permissions du plugin
    const allowed = plugin.manifest.permissions.some(p =>
      p.startsWith('network:') && this.matchesPattern(url, p.replace('network:', ''))
    );

    if (!allowed) {
      throw new PermissionError(`Plugin ${plugin.id} not allowed to access ${url}`);
    }

    // 2. Injecter headers de sécurité
    const secureHeaders = {
      ...options.headers,
      'X-Plugin-ID': plugin.id,
      'X-Request-ID': generateUUID(),
      'User-Agent': `Cartae-Plugin/${plugin.version}`,
    };

    // 3. Appliquer rate limiting (éviter DDOS)
    await this.rateLimiter.consume(plugin.id);

    // 4. Faire la requête (avec timeout)
    return await fetchWithTimeout(url, {
      ...options,
      headers: secureHeaders,
    }, 30000);
  }
}
```

#### c) **Secret Access (Accès aux Secrets)**

Les plugins accèdent aux secrets **uniquement via VaultProxy**, jamais en direct :

```typescript
class VaultProxy {
  async getSecret(plugin: Plugin, path: string): Promise<any> {
    // 1. Vérifier permission vault:read
    const hasPermission = plugin.manifest.permissions.some(p =>
      p.startsWith('vault:read:') && path.startsWith(p.replace('vault:read:', ''))
    );

    if (!hasPermission) {
      throw new PermissionError(`Plugin ${plugin.id} not allowed to read ${path}`);
    }

    // 2. Récupérer depuis Vault avec token applicatif (pas le token root)
    const secret = await this.vault.read(`secret/data/plugins/${plugin.id}/${path}`);

    // 3. Audit log
    await this.auditLog({
      pluginId: plugin.id,
      operation: 'vault:read',
      path,
      timestamp: new Date(),
    });

    return secret.data.data;
  }
}
```

---

### 4. **Audit Trail (Traçabilité)**

**Responsabilité :** Logger toutes les opérations critiques pour détecter anomalies et intrusions

**Événements audités :**
```typescript
enum AuditEventType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_FAILED = 'auth.failed',

  ITEM_CREATE = 'item.create',
  ITEM_UPDATE = 'item.update',
  ITEM_DELETE = 'item.delete',

  PLUGIN_INSTALL = 'plugin.install',
  PLUGIN_EXECUTE = 'plugin.execute',
  PLUGIN_ERROR = 'plugin.error',

  SECRET_READ = 'secret.read',
  SECRET_WRITE = 'secret.write',
  SECRET_DELETE = 'secret.delete',

  PERMISSION_DENIED = 'permission.denied',
}

interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string;
  pluginId?: string;
  resource: string;        // Ex: "item:123", "secret:gmail/token"
  action: string;          // Ex: "read", "write", "delete"
  success: boolean;
  metadata: Record<string, any>; // Données additionnelles (IP, user-agent, etc.)
}
```

**Stockage :**
- **PostgreSQL** : Table `audit_logs` (pour recherche et analytics)
- **Vault Audit Backend** : Logs des accès secrets (immuable)
- **Fichiers rotatifs** : Backup quotidien en JSON (archivage 90 jours)

**Alertes automatiques :**
```typescript
class AuditAlerts {
  async analyze(logs: AuditLog[]): Promise<void> {
    // Détection d'anomalies
    const recentFailures = logs.filter(l =>
      l.eventType === AuditEventType.AUTH_FAILED &&
      Date.now() - l.timestamp.getTime() < 300000 // 5 dernières minutes
    );

    if (recentFailures.length > 10) {
      await this.alert({
        severity: 'HIGH',
        message: 'Possible brute-force attack detected',
        details: { failureCount: recentFailures.length },
      });
    }

    // Accès suspects à des secrets
    const suspiciousSecretAccess = logs.filter(l =>
      l.eventType === AuditEventType.SECRET_READ &&
      l.metadata.accessedAt === 'unusual_time' // Ex: 3h du matin
    );

    if (suspiciousSecretAccess.length > 0) {
      await this.alert({
        severity: 'MEDIUM',
        message: 'Unusual secret access pattern detected',
        details: suspiciousSecretAccess,
      });
    }
  }
}
```

---

## 🔌 Plugin-First Architecture

### Anatomie d'un Plugin Cartae

```typescript
// 1. Plugin Manifest (plugin.json)
{
  "id": "gmail-connector",
  "name": "Gmail Connector",
  "version": "1.0.0",
  "author": "Cartae Team",
  "description": "Synchronize emails from Gmail",

  "permissions": [
    "network:https://gmail.googleapis.com/*",
    "vault:read:gmail/*",
    "vault:write:gmail/*",
    "storage:write:emails",
    "events:emit:email.*"
  ],

  "quotas": {
    "maxRequests": 1000,
    "maxStorage": 104857600,
    "maxMemory": 52428800,
    "timeout": 30000
  },

  "dependencies": {
    "@cartae/core": "^1.0.0",
    "googleapis": "^118.0.0"
  },

  "hooks": {
    "onInstall": "./hooks/install.ts",
    "onConfigure": "./hooks/configure.ts",
    "onSync": "./hooks/sync.ts"
  }
}

// 2. Plugin Implementation (index.ts)
import { Plugin, PluginContext } from '@cartae/plugin-sdk';

export class GmailPlugin implements Plugin {
  async onInstall(ctx: PluginContext): Promise<void> {
    // Demander credentials OAuth2 via Vault
    const { clientId, clientSecret } = await ctx.vault.getSecret('gmail/oauth');

    // Initialiser OAuth flow
    const authUrl = this.generateOAuthUrl(clientId);
    await ctx.ui.showPrompt({
      type: 'oauth',
      url: authUrl,
      message: 'Please authorize Gmail access',
    });
  }

  async onSync(ctx: PluginContext): Promise<void> {
    // 1. Récupérer access token depuis Vault
    const { accessToken } = await ctx.vault.getSecret('gmail/tokens');

    // 2. Fetch emails via API Gmail (via NetworkProxy)
    const response = await ctx.network.fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const emails = await response.json();

    // 3. Parser et stocker dans Cartae
    for (const email of emails.messages) {
      const parsed = await this.parseEmail(email);

      await ctx.storage.save({
        id: email.id,
        type: 'email',
        source: { type: 'gmail', id: email.id },
        title: parsed.subject,
        content: parsed.body,
        metadata: {
          from: parsed.from,
          to: parsed.to,
          date: parsed.date,
        },
      });

      // 4. Émettre événement pour autres plugins
      await ctx.events.emit('email.received', { emailId: email.id });
    }
  }
}
```

---

## 🚀 Implémentation Roadmap

### Phase 1 : Security Foundation (2-3 semaines)
- [ ] Authentication Layer (JWT + OAuth2)
- [ ] Authorization Layer (RBAC)
- [ ] Vault Integration (secrets storage)
- [ ] Audit Logging (PostgreSQL + Vault)

### Phase 2 : Plugin Runtime (2-3 semaines)
- [ ] Plugin Loader + Registry
- [ ] Plugin Sandbox (permissions + quotas)
- [ ] NetworkProxy + VaultProxy
- [ ] Plugin SDK (@cartae/plugin-sdk)

### Phase 3 : Core Plugins (4-5 semaines)
- [ ] Gmail Plugin (avec OAuth2)
- [ ] Office365 Plugin (avec MSAL)
- [ ] Obsidian Plugin (filesystem sync)
- [ ] Generic API Plugin (REST/GraphQL)

### Phase 4 : Monitoring & Alerting (1-2 semaines)
- [ ] Dashboard Admin (voir tous logs, plugins, users)
- [ ] Anomaly Detection (ML-based)
- [ ] Alerting (Slack, Email, Webhook)
- [ ] Health Checks automatiques

---

## 📊 Métriques de Sécurité

**À monitorer en temps réel :**
1. **Taux d'échec d'authentification** (seuil : < 1%)
2. **Accès secrets inhabituels** (alerter admin)
3. **Violations de permissions** (bloquer plugin si > 10)
4. **Dépassements de quotas** (throttle puis bloquer)
5. **Temps de réponse anomal** (possible DDOS)

---

## 🔒 Checklist de Sécurité (Pre-Production)

- [ ] **Secrets** : Aucun secret hardcodé dans le code
- [ ] **TLS** : HTTPS activé partout (Let's Encrypt)
- [ ] **Vault** : Mode production (Shamir seal, 5 clés)
- [ ] **DB** : Connexions chiffrées (SSL/TLS)
- [ ] **Auth** : Rate limiting sur endpoints d'auth
- [ ] **CORS** : Whitelist stricte (pas de `*`)
- [ ] **Headers** : CSP, HSTS, X-Frame-Options configurés
- [ ] **Audit** : Logs persistés et archivés (90 jours min)
- [ ] **Backup** : Chiffrés AES-256 avant S3
- [ ] **Dependencies** : Scan vulnérabilités (npm audit, Snyk)

---

**🎯 Objectif Final :** Cartae doit être **auditable**, **extensible**, et **sécurisé by design**.
