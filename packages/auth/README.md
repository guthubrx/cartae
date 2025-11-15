# @cartae/auth

Security Layer pour Cartae - Authentification JWT, RBAC, Audit Trail.

## Installation

```bash
pnpm add @cartae/auth
```

## Features

- ✅ **JWT Authentication** (RS256, access + refresh tokens)
- ✅ **RBAC** (4 roles: admin, power_user, user, guest)
- ✅ **Audit Trail** (logging automatique opérations sensibles)
- ✅ **50+ permissions granulaires**
- ✅ **Wildcard permissions** (`vault.secrets.*`)
- ✅ **Role hierarchy** (admin > power_user > user > guest)

## Quick Start

### 1. JWT Authentication

```typescript
import { JWTService } from '@cartae/auth';

// Initialiser avec clés RSA (depuis Vault)
const jwtService = new JWTService(privateKey, publicKey, {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
});

// Login: Générer tokens
const { accessToken, refreshToken } = jwtService.generateTokenPair(user);

// Vérifier access token
const payload = jwtService.verifyAccessToken(accessToken);
// => { sub: 'user-id', email: 'user@example.com', role: 'user', ... }
```

### 2. RBAC

```typescript
import { RBACService } from '@cartae/auth';

const rbacService = new RBACService();

// Check permission
if (rbacService.hasPermission(user, 'database.write')) {
  // User peut écrire dans la DB
}

// Require permission (throw si refusé)
rbacService.requirePermission(user, 'vault.admin');

// Vérifier AU MOINS UNE permission
const canManage = rbacService.hasAnyPermission(user, [
  'vault.write',
  'vault.admin',
]);

// Support wildcards
rbacService.hasPermissionWildcard(user, 'vault.secrets.database.postgres');
// => Matche 'vault.secrets.*' si admin
```

### 3. Audit Trail

```typescript
import { AuditService } from '@cartae/auth';

const auditService = new AuditService(storage);

// Log login
await auditService.logLogin(user.id, ipAddress, userAgent);

// Log accès Vault
await auditService.logVaultAccess(
  user.id,
  'secret/database/postgres',
  'read',
  ipAddress
);

// Récupérer logs
const logs = await auditService.getLogs({
  userId: user.id,
  action: 'vault.read_secret',
  limit: 100,
});
```

## Roles & Permissions

### 4 Roles

- **admin**: Tous pouvoirs (24 permissions)
- **power_user**: Pouvoirs étendus (12 permissions)
- **user**: Utilisateur standard (5 permissions)
- **guest**: Lecture seule (2 permissions)

### Permissions

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

## Database Schema

Requiert PostgreSQL avec extensions:
- `uuid-ossp` (génération UUIDs)

Tables créées par `03-security.sql`:
- `users`, `role_permissions`, `audit_logs`, `jwt_blacklist`
- `plugin_permissions`, `user_plugin_permissions`, `plugin_quotas`

## Types

```typescript
import type {
  User,
  UserRole,
  Permission,
  JWTPayload,
  TokenPair,
  AuditLog,
} from '@cartae/auth';
```

## Error Handling

```typescript
import {
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
} from '@cartae/auth';

try {
  const payload = jwtService.verifyAccessToken(token);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Token expiré → Refresh
  } else if (error instanceof InvalidTokenError) {
    // Token invalide → Re-login
  }
}
```

## Documentation

Voir `SESSION-80-SECURITY-AUTH-RBAC.md` pour documentation complète.

## License

MIT
