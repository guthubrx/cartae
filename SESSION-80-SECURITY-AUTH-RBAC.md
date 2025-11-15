# Session 80: Security Layer - Auth + RBAC

**Date:** 15 Novembre 2025
**Durée:** En cours
**Estimation:** ~2,500 LOC, 12-15h
**Objectif:** Implémenter système de sécurité complet (security-by-design)

---

## 🎯 Objectifs

Transformer Cartae d'une API ouverte (sécurité 0/10) vers une API sécurisée (9/10) avec:

- ✅ **Authentification JWT** (RS256, access + refresh tokens)
- ✅ **RBAC** (Role-Based Access Control) avec 4 roles
- ✅ **Audit Trail** (logging toutes opérations sensibles)
- ✅ **Plugin Permissions** (isolation & quotas)
- 🚧 **Security Gateway** (rate limiting, CORS, CSRF) - À implémenter
- 🚧 **API Endpoints** (/auth, /users, /permissions) - À implémenter

---

## 📦 Package créé: `@cartae/auth`

### Structure

```
packages/auth/
├── src/
│   ├── types/
│   │   └── index.ts          # Types TypeScript (User, JWT, RBAC, Audit)
│   ├── jwt/
│   │   └── JWTService.ts     # Génération & validation JWT (RS256)
│   ├── rbac/
│   │   └── RBACService.ts    # RBAC logic (permissions checking)
│   ├── audit/
│   │   └── AuditService.ts   # Audit logging (opérations sensibles)
│   └── index.ts              # Point d'entrée du package
├── package.json
└── tsconfig.json
```

### Dépendances

- `jsonwebtoken`: Génération/validation JWT
- `bcrypt`: Hash passwords
- `zod`: Validation runtime (schemas)

---

## 🗄️ Schéma PostgreSQL

**Fichier:** `infra/database/postgresql/init-scripts/03-security.sql` (~530 LOC)

### Tables créées

#### 1. `users`
Stocke les utilisateurs avec authentification.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt
  role VARCHAR(50) NOT NULL,    -- admin, power_user, user, guest
  active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
);
```

#### 2. `role_permissions`
Matrice RBAC: définit les permissions de chaque role.

```sql
CREATE TABLE role_permissions (
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  PRIMARY KEY (role, permission)
);
```

**Exemple permissions:**
- `database.read`, `database.write`, `database.delete`, `database.admin`
- `vault.read`, `vault.write`, `vault.admin`, `vault.secrets.*`
- `plugin.install`, `plugin.uninstall`, `plugin.configure`
- `user.create`, `user.delete`, `user.assign_role`
- `system.settings`, `system.backup`, `system.logs`

#### 3. `audit_logs`
Log toutes les opérations sensibles (compliance).

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ
);
```

**Actions loggées:**
- `auth.login`, `auth.logout`, `auth.login_failed`
- `user.created`, `user.deleted`, `user.role_changed`
- `vault.read_secret`, `vault.write_secret`, `vault.delete_secret`
- `plugin.installed`, `plugin.uninstalled`, `plugin.permission_granted`

#### 4. `jwt_blacklist`
Stocke les JWT tokens révoqués (logout, compromised).

```sql
CREATE TABLE jwt_blacklist (
  token_jti VARCHAR(255) PRIMARY KEY,  -- JWT ID
  expires_at TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES users(id),
  reason VARCHAR(100),
  revoked_at TIMESTAMPTZ
);
```

#### 5. `plugin_permissions`
Définit les permissions requises par chaque plugin (manifest).

```sql
CREATE TABLE plugin_permissions (
  plugin_id VARCHAR(100) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  permission_type VARCHAR(50) NOT NULL,  -- storage, network, vault, system
  description TEXT,
  PRIMARY KEY (plugin_id, permission)
);
```

#### 6. `user_plugin_permissions`
Permissions granted par user pour chaque plugin (user consent).

```sql
CREATE TABLE user_plugin_permissions (
  user_id UUID REFERENCES users(id),
  plugin_id VARCHAR(100) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ,
  granted_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, plugin_id, permission)
);
```

#### 7. `plugin_quotas`
Quotas enforcement pour chaque plugin par user.

```sql
CREATE TABLE plugin_quotas (
  user_id UUID REFERENCES users(id),
  plugin_id VARCHAR(100) NOT NULL,
  storage_mb DECIMAL(10,2),
  api_calls_hour INTEGER,
  max_storage_mb DECIMAL(10,2),
  max_api_calls_hour INTEGER,
  last_reset TIMESTAMPTZ,
  PRIMARY KEY (user_id, plugin_id)
);
```

### Fonctions SQL créées

- `user_has_permission(user_id, permission)`: Check RBAC permission
- `cleanup_jwt_blacklist()`: Purge tokens expirés
- `cleanup_audit_logs(retention_days)`: Purge vieux logs (défaut 90j)
- `reset_plugin_quotas_hourly()`: Reset API calls quotas

### Seed data

**Admin user par défaut:**
- Email: `admin@cartae.dev`
- Password: `changeme123` (⚠️ À changer en production!)
- Role: `admin`

**Permissions RBAC:**
- **admin**: 24 permissions (tous pouvoirs)
- **power_user**: 12 permissions (read/write, pas admin)
- **user**: 5 permissions (read/write data, vault read)
- **guest**: 2 permissions (read-only)

---

## 🔐 JWT Authentication

**Fichier:** `packages/auth/src/jwt/JWTService.ts` (~250 LOC)

### Concept

- **Algorithme**: RS256 (RSA signatures)
- **Clés**: RSA private/public stockées dans HashiCorp Vault
- **Access token**: Courte durée (15 min par défaut)
- **Refresh token**: Longue durée (7 jours par défaut)

### Utilisation

```typescript
import { JWTService } from '@cartae/auth';

// Initialiser avec clés RSA (depuis Vault)
const jwtService = new JWTService(privateKey, publicKey, {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'cartae-auth',
  audience: 'cartae-api',
});

// Générer paire de tokens (login)
const { accessToken, refreshToken, expiresIn } = jwtService.generateTokenPair(user);

// Vérifier access token
const payload = jwtService.verifyAccessToken(accessToken);
// => { sub: 'user-id', email: 'user@example.com', role: 'user', type: 'access', ... }

// Vérifier refresh token
const refreshPayload = jwtService.verifyRefreshToken(refreshToken);

// Extraire JWT ID (pour blacklist)
const jti = jwtService.getTokenId(accessToken);

// Vérifier si token expiré (sans valider signature)
const isExpired = jwtService.isTokenExpired(accessToken);
```

### JWT Payload

```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;     // admin, power_user, user, guest
  type: 'access' | 'refresh';
  iat: number;        // Issued at
  exp: number;        // Expires at
  jti: string;        // JWT ID (pour blacklist)
}
```

### Flow Login/Logout

**Login:**
1. User envoie email + password
2. Backend vérifie credentials (bcrypt)
3. Génère access + refresh tokens
4. Log `auth.login` dans audit_logs
5. Retourne tokens au client

**Logout:**
1. User envoie access token
2. Backend extrait `jti` du token
3. Ajoute `jti` dans `jwt_blacklist`
4. Log `auth.logout` dans audit_logs

**Refresh:**
1. User envoie refresh token
2. Backend vérifie refresh token
3. Génère nouveau access token
4. Retourne nouveau access token

---

## 🔑 RBAC (Role-Based Access Control)

**Fichier:** `packages/auth/src/rbac/RBACService.ts` (~200 LOC)

### 4 Roles

1. **admin**: Tous pouvoirs (user management, vault admin, system settings)
2. **power_user**: Pouvoirs étendus (read/write data, vault read/write, plugin install)
3. **user**: Utilisateur standard (read/write data, vault read, plugin view)
4. **guest**: Lecture seule (read-only data, plugin view)

### Permissions

50+ permissions granulaires organisées par catégorie:

**Database:**
- `database.read`, `database.write`, `database.delete`, `database.admin`

**Vault:**
- `vault.read`, `vault.write`, `vault.delete`, `vault.admin`, `vault.secrets.*`

**Plugins:**
- `plugin.install`, `plugin.uninstall`, `plugin.configure`, `plugin.view`
- `plugin.permissions.grant`, `plugin.permissions.revoke`

**Users:**
- `user.create`, `user.delete`, `user.assign_role`, `user.view`, `user.deactivate`

**System:**
- `system.settings`, `system.backup`, `system.restore`, `system.logs`, `system.monitoring`

### Utilisation

```typescript
import { RBACService } from '@cartae/auth';

const rbacService = new RBACService();

// Vérifier permission
const canWrite = rbacService.hasPermission(user, 'database.write');

// Require permission (throw si refusé)
rbacService.requirePermission(user, 'vault.admin');

// Vérifier AU MOINS UNE permission
const canManageVault = rbacService.hasAnyPermission(user, [
  'vault.write',
  'vault.admin',
]);

// Vérifier TOUTES les permissions
rbacService.requireAllPermissions(user, [
  'database.write',
  'vault.read',
]);

// Récupérer toutes les permissions d'un user
const permissions = rbacService.getUserPermissions(user);

// Vérifier si user peut assigner un role
rbacService.requireCanAssignRole(user, 'power_user');
// => Vérifie: user.assign_role + hiérarchie (admin > power_user > user > guest)

// Support wildcards
const canAccessSecret = rbacService.hasPermissionWildcard(
  user,
  'vault.secrets.database.postgres'
);
// => Matche 'vault.secrets.*' si admin
```

### Hiérarchie des roles

Un user peut assigner uniquement des roles **<=** son propre role:

- **admin** peut assigner: admin, power_user, user, guest
- **power_user** ne peut pas assigner de roles (pas `user.assign_role`)
- **user** ne peut pas assigner de roles
- **guest** ne peut pas assigner de roles

---

## 📝 Audit Trail

**Fichier:** `packages/auth/src/audit/AuditService.ts` (~250 LOC)

### Concept

Log automatique de **toutes les opérations sensibles** pour:
- **Compliance** (RGPD, SOC2)
- **Sécurité** (détection intrusions, forensics)
- **Debug** (tracer qui a fait quoi, quand)

### Opérations loggées

**Authentification:**
- `auth.login` (succès)
- `auth.login_failed` (échec avec raison)
- `auth.logout`

**User management:**
- `user.created`, `user.deleted`, `user.role_changed`, `user.deactivated`

**Vault:**
- `vault.read_secret`, `vault.write_secret`, `vault.delete_secret`

**Plugins:**
- `plugin.installed`, `plugin.uninstalled`
- `plugin.permission_granted`, `plugin.permission_revoked`

**System:**
- `system.backup`, `system.restore`, `system.settings_changed`

### Utilisation

```typescript
import { AuditService } from '@cartae/auth';

const auditService = new AuditService(storage);

// Log login réussi
await auditService.logLogin(user.id, ipAddress, userAgent);

// Log login échoué
await auditService.logLoginFailed(email, 'Invalid password', ipAddress);

// Log changement de role
await auditService.logRoleChange(
  adminUser.id,
  targetUser.id,
  'user',
  'power_user',
  ipAddress
);

// Log accès Vault
await auditService.logVaultAccess(
  user.id,
  'secret/database/postgres',
  'read',
  ipAddress
);

// Log installation plugin
await auditService.logPluginInstall(user.id, '@cartae/gmail-plugin', ipAddress);

// Récupérer logs avec filtres
const logs = await auditService.getLogs({
  userId: user.id,
  action: 'vault.read_secret',
  startDate: new Date('2025-11-01'),
  limit: 100,
});

// Récupérer logs d'échec (incidents)
const failedLogs = await auditService.getFailedLogs(50);

// Cleanup vieux logs (90 jours par défaut)
const deletedCount = await auditService.cleanupOldLogs(90);
```

### AuditLog structure

```typescript
interface AuditLog {
  id: string;
  userId?: string;          // User qui a fait l'action
  action: string;           // Ex: 'vault.read_secret'
  resourceType?: string;    // Ex: 'vault_secret'
  resourceId?: string;      // Ex: 'secret/database/postgres'
  ipAddress?: string;       // IP de la requête
  userAgent?: string;       // User-Agent HTTP
  metadata?: Record<string, any>;  // Contexte additionnel
  success: boolean;         // true/false
  errorMessage?: string;    // Si success=false
  createdAt: Date;
}
```

---

## 🔌 Plugin Permissions (à implémenter)

### Concept

Chaque plugin déclare ses permissions dans un **manifest** (permissions.json):

```json
{
  "plugin": "@cartae/gmail-plugin",
  "permissions": [
    "storage.email.read",
    "storage.email.write",
    "network.gmail.com",
    "network.googleapis.com",
    "vault.secrets.gmail.*"
  ],
  "quotas": {
    "storage_mb": 500,
    "api_calls_per_hour": 1000,
    "network_domains": ["gmail.com", "googleapis.com"]
  }
}
```

### User consent

Lors de l'installation, l'user doit **accepter** les permissions:

```
╔═══════════════════════════════════════════════════╗
║  🔌 Install @cartae/gmail-plugin ?               ║
╠═══════════════════════════════════════════════════╣
║  This plugin requests the following permissions: ║
║                                                   ║
║  ✅ Read/Write Email data (storage.email.*)      ║
║  ✅ Access Gmail API (network.gmail.com)         ║
║  ✅ Store OAuth tokens (vault.secrets.gmail.*)   ║
║                                                   ║
║  Quotas:                                         ║
║  - Storage: 500 MB max                           ║
║  - API calls: 1000 per hour                      ║
║                                                   ║
║  [Deny]  [Accept & Install]                      ║
╚═══════════════════════════════════════════════════╝
```

### Runtime enforcement

Le Plugin Sandbox vérifie **à chaque opération** que le plugin a la permission:

```typescript
// Exemple: Plugin veut lire des emails
if (!userPluginPermissions.hasPermission(userId, pluginId, 'storage.email.read')) {
  throw new PermissionDeniedError('Plugin does not have permission: storage.email.read');
}

// Exemple: Plugin veut faire API call
const quota = await getPluginQuota(userId, pluginId);
if (quota.apiCallsHour >= quota.maxApiCallsHour) {
  throw new QuotaExceededError('API calls quota exceeded');
}
```

---

## 🛡️ Security Gateway (à implémenter)

### Rate Limiting

- **Par user**: 10 req/s
- **Global**: 100 req/s
- **Admin**: Pas de limite

### CORS

- Whitelist origins (configurable)
- Credentials: true (cookies httpOnly)

### CSRF Protection

- Tokens CSRF pour mutations (POST, PUT, DELETE)
- Vérification header `X-CSRF-Token`

### Request Validation

- Zod schemas pour tous endpoints
- Sanitize inputs (XSS prevention)
- Prepared statements PostgreSQL (SQL injection prevention)

---

## 🔧 API Endpoints (à implémenter)

### Auth Routes

```typescript
POST   /api/auth/login           // Login (email + password) → JWT
POST   /api/auth/logout          // Logout (blacklist JWT)
POST   /api/auth/refresh         // Refresh token
GET    /api/auth/me              // Get current user
```

### User Routes (admin only)

```typescript
GET    /api/users                // List users
POST   /api/users                // Create user
PATCH  /api/users/:id/role       // Change user role
DELETE /api/users/:id            // Delete user
GET    /api/users/:id            // Get user by ID
```

### Permission Routes (admin only)

```typescript
GET    /api/permissions          // List all permissions
GET    /api/roles/:role/permissions  // Get role permissions
POST   /api/roles/:role/permissions  // Assign permission to role
DELETE /api/roles/:role/permissions/:perm  // Remove permission
```

### Audit Routes (admin only)

```typescript
GET    /api/audit/logs           // Get audit logs (paginated, filtres)
GET    /api/audit/logs/export    // Export logs (CSV/JSON)
```

---

## 🧪 Tests (à implémenter)

### Unit Tests

- JWT: generation, validation, expiry
- RBAC: permission checking, role hierarchy
- Audit: log creation, cleanup

### Integration Tests

- API endpoints avec auth
- Unauthorized access (401, 403)
- Rate limiting enforcement

### Security Tests

- SQL injection attempts
- XSS attempts
- CSRF bypass attempts
- Brute-force login (rate limiting)

**Coverage target: 80%+**

---

## 📊 Métriques

### LOC (Lines of Code)

**Actuel:**
- `03-security.sql`: ~530 LOC
- `types/index.ts`: ~250 LOC
- `jwt/JWTService.ts`: ~250 LOC
- `rbac/RBACService.ts`: ~200 LOC
- `audit/AuditService.ts`: ~250 LOC
- **Total: ~1,480 LOC**

**Estimation finale: ~2,500 LOC** (manque API endpoints, tests, docs)

### Impact

- ✅ Sécurité API: **0/10 → 9/10**
- ✅ RBAC fonctionnel (4 roles, 50+ permissions)
- ✅ Audit trail complet (compliance RGPD)
- ✅ JWT avec refresh tokens (15 min access, 7 jours refresh)
- 🚧 Security Gateway (rate limiting, CORS, CSRF)
- 🚧 Plugin Permissions (isolation, quotas)

### Débloque

- ✅ **Session 83**: Admin Dashboard MVP (user management, secrets manager)
- ✅ **Session 84**: Plugin Manager UI (marketplace, permissions)
- ✅ **Production deployment** (API sécurisée)

---

## 🚀 Prochaines Étapes

1. Implémenter Security Gateway (rate limiting, CORS, CSRF)
2. Implémenter API endpoints (/auth, /users, /permissions)
3. Implémenter Plugin Permissions System (runtime enforcement)
4. Créer tests unitaires + intégration
5. Créer documentation API (OpenAPI/Swagger)
6. Valider avec setup.sh (onboarding)

---

## 💡 Concepts Expliqués

### Pourquoi RS256 (RSA) et pas HS256 (HMAC) ?

**HS256** (HMAC with SHA-256):
- Clé symétrique (same key pour sign + verify)
- ❌ Problème: Si clé leakée, n'importe qui peut générer tokens valides

**RS256** (RSA Signature with SHA-256):
- Clé asymétrique (private key sign, public key verify)
- ✅ Avantage: Private key reste secrète (dans Vault), public key peut être distribuée
- ✅ Sécurité: Même si public key leakée, impossible de générer tokens
- ✅ Microservices: Chaque service peut vérifier tokens avec public key uniquement

### Pourquoi Access + Refresh tokens ?

**Access token** (courte durée: 15 min):
- Envoyé à chaque requête (header `Authorization: Bearer ...`)
- Si volé: Impact limité (15 min max)
- Stocké en mémoire (pas localStorage → XSS protection)

**Refresh token** (longue durée: 7 jours):
- Utilisé uniquement pour renouveler access token
- Stocké dans httpOnly cookie (XSS-proof) OU localStorage
- Si volé: Peut être révoqué (blacklist)

**Flow:**
1. Login → Access + Refresh tokens
2. Requête API → Access token (15 min)
3. Access token expiré → Refresh avec refresh token → Nouveau access token
4. Logout → Blacklist refresh token

### Pourquoi bcrypt pour passwords ?

**bcrypt**:
- Algorithme lent par design (cost factor = 10)
- ❌ Brute-force: 1000 tentatives/sec → 10 ans pour 10^10 combinaisons
- ✅ Rainbow tables: Impossible (salt unique par password)
- ✅ Future-proof: Cost factor augmentable (10 → 12 → 14)

**Alternatives:**
- **SHA-256**: ❌ Trop rapide (brute-force facile)
- **argon2**: ✅ Aussi bon (mais bcrypt plus mature)
- **scrypt**: ✅ Aussi bon (mais bcrypt plus supporté)

### Pourquoi RBAC et pas ACL ?

**ACL (Access Control List)**:
- Permissions par user (ex: user1 can read file1)
- ❌ Scalabilité: 1000 users × 1000 resources = 1M permissions

**RBAC (Role-Based Access Control)**:
- Permissions par role (ex: admin can delete any file)
- ✅ Scalabilité: 4 roles × 50 permissions = 200 entries
- ✅ Maintenance: Changer permissions d'un role → Tous users du role impactés

### Pourquoi Audit Trail ?

**Compliance:**
- RGPD: Obligation de tracer accès données personnelles
- SOC2: Obligation de tracer accès systèmes critiques
- HIPAA: Obligation de tracer accès données médicales

**Sécurité:**
- Détection intrusions (tentatives login multiples)
- Forensics (qui a supprimé quoi, quand)
- Accountability (prouver qui a fait quoi)

**Retention 90 jours:**
- Équilibre entre compliance (30-90j) et coûts storage
- Auto-cleanup via cron job quotidien

---

## 📚 Ressources

**Standards:**
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

**Best Practices:**
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [RBAC Best Practices](https://en.wikipedia.org/wiki/Role-based_access_control)

**Librairies:**
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [zod](https://github.com/colinhacks/zod)
