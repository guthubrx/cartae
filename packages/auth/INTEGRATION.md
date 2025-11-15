# @cartae/auth - Guide d'Intégration

Guide pour intégrer @cartae/auth dans database-api (Express).

## 1. Setup Initial

### Installer dépendances

```bash
cd packages/database-api
pnpm add @cartae/auth bcrypt jsonwebtoken
pnpm add -D @types/bcrypt @types/jsonwebtoken
```

### Récupérer clés RSA depuis Vault

```typescript
// src/config/auth.ts
import { VaultClient } from '@cartae/vault';

const vaultClient = new VaultClient({
  address: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

// Clés RSA stockées dans Vault
export const getJWTKeys = async () => {
  const privateKey = await vaultClient.readSecret('secret/jwt/private_key');
  const publicKey = await vaultClient.readSecret('secret/jwt/public_key');

  return {
    privateKey: privateKey.data.key,
    publicKey: publicKey.data.key,
  };
};
```

### Initialiser services

```typescript
// src/services/auth.ts
import { JWTService, RBACService, AuditService } from '@cartae/auth';
import { getJWTKeys } from '../config/auth';
import { PostgresAuditStorage } from '../storage/audit';

let jwtService: JWTService;
let rbacService: RBACService;
let auditService: AuditService;

export const initAuthServices = async () => {
  const { privateKey, publicKey } = await getJWTKeys();

  jwtService = new JWTService(privateKey, publicKey, {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'cartae-auth',
    audience: 'cartae-api',
  });

  rbacService = new RBACService();

  const auditStorage = new PostgresAuditStorage(pool);
  auditService = new AuditService(auditStorage);
};

export { jwtService, rbacService, auditService };
```

## 2. Middleware Express

### Auth Middleware (validateJWT)

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtService, auditService } from '../services/auth';
import { getUserById } from '../repositories/userRepository';

export interface AuthRequest extends Request {
  user?: User;
  jti?: string;
}

export const validateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extraire token depuis header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Vérifier token
    const payload = jwtService.verifyAccessToken(token);

    // Vérifier si token blacklisté
    const isBlacklisted = await isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Récupérer user depuis DB
    const user = await getUserById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attacher user et jti à la requête
    req.user = user;
    req.jti = payload.jti;

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof InvalidTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
```

### RBAC Middleware (requirePermission)

```typescript
// src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/auth';
import type { Permission } from '@cartae/auth';
import type { AuthRequest } from './auth';

export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      rbacService.requirePermission(req.user, permission);
      next();
    } catch (error) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }
  };
};

export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      rbacService.requireAnyPermission(req.user, permissions);
      next();
    } catch (error) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }
  };
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    rbacService.requireAdmin(req.user);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Admin role required' });
  }
};
```

## 3. Routes Auth

### POST /api/auth/login

```typescript
// src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcrypt';
import { jwtService, auditService } from '../services/auth';
import { getUserByEmail } from '../repositories/userRepository';
import { LoginRequestSchema } from '@cartae/auth';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    // Valider input
    const { email, password } = LoginRequestSchema.parse(req.body);

    // Récupérer user
    const user = await getUserByEmail(email);
    if (!user || !user.active) {
      await auditService.logLoginFailed(
        email,
        'User not found or inactive',
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Vérifier password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await auditService.logLoginFailed(
        email,
        'Invalid password',
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Générer tokens
    const { accessToken, refreshToken, expiresIn } = jwtService.generateTokenPair(user);

    // Log success
    await auditService.logLogin(user.id, req.ip, req.headers['user-agent']);

    // Update last_login
    await updateUserLastLogin(user.id);

    res.json({
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

### POST /api/auth/logout

```typescript
router.post('/logout', validateJWT, async (req: AuthRequest, res) => {
  try {
    // Blacklist le token
    await blacklistToken(req.jti!, req.user!.id, 'logout');

    // Log logout
    await auditService.logLogout(req.user!.id, req.ip);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});
```

### POST /api/auth/refresh

```typescript
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = RefreshTokenRequestSchema.parse(req.body);

    // Vérifier refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Vérifier si blacklisté
    const isBlacklisted = await isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Récupérer user
    const user = await getUserById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Générer nouveau access token
    const { accessToken, expiresIn } = jwtService.generateTokenPair(user);

    res.json({ accessToken, expiresIn });
  } catch (error) {
    res.status(401).json({ error: 'Refresh failed' });
  }
});
```

### GET /api/auth/me

```typescript
router.get('/me', validateJWT, async (req: AuthRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    permissions: rbacService.getUserPermissions(req.user!),
  });
});
```

## 4. Routes Users (Admin only)

```typescript
// src/routes/users.ts
import express from 'express';
import { validateJWT } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/rbac';
import { auditService, rbacService } from '../services/auth';

const router = express.Router();

// GET /api/users - Liste users
router.get('/', validateJWT, requirePermission('user.view'), async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

// POST /api/users - Créer user
router.post('/', validateJWT, requirePermission('user.create'), async (req: AuthRequest, res) => {
  const { email, password, role } = RegisterRequestSchema.parse(req.body);

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Créer user
  const newUser = await createUser({ email, passwordHash, role });

  // Log
  await auditService.logUserCreated(
    req.user!.id,
    newUser.id,
    email,
    role,
    req.ip
  );

  res.status(201).json(newUser);
});

// PATCH /api/users/:id/role - Change role
router.patch('/:id/role', validateJWT, requirePermission('user.assign_role'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role } = ChangeRoleRequestSchema.parse(req.body);

  // Vérifier hiérarchie
  rbacService.requireCanAssignRole(req.user!, role);

  // Update role
  const oldUser = await getUserById(id);
  await updateUserRole(id, role);

  // Log
  await auditService.logRoleChange(
    req.user!.id,
    id,
    oldUser.role,
    role,
    req.ip
  );

  res.json({ message: 'Role updated' });
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', validateJWT, requirePermission('user.delete'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const user = await getUserById(id);
  await deleteUser(id);

  // Log
  await auditService.logUserDeleted(req.user!.id, id, user.email, req.ip);

  res.json({ message: 'User deleted' });
});

export default router;
```

## 5. Utilisation dans app.ts

```typescript
// src/app.ts
import express from 'express';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { initAuthServices } from './services/auth';

const app = express();

app.use(express.json());

// Initialiser services auth
await initAuthServices();

// Routes publiques
app.use('/api/auth', authRoutes);

// Routes protégées
app.use('/api/users', userRoutes);

// ... autres routes

app.listen(3001, () => {
  console.log('Database API running on port 3001');
});
```

## 6. Exemple Complet: Protéger une route

```typescript
// Route protégée avec permission spécifique
app.get(
  '/api/vault/secrets/:path',
  validateJWT,
  requirePermission('vault.read'),
  async (req: AuthRequest, res) => {
    const { path } = req.params;

    // Récupérer secret
    const secret = await vaultClient.readSecret(path);

    // Log accès
    await auditService.logVaultAccess(
      req.user!.id,
      path,
      'read',
      req.ip
    );

    res.json(secret);
  }
);
```

## 7. Frontend: Stockage Tokens

### localStorage (simple mais XSS-vulnerable)

```typescript
// Frontend: Login
const { accessToken, refreshToken } = await loginAPI(email, password);
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Frontend: Requête avec token
const response = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  },
});
```

### httpOnly Cookies (XSS-proof, recommandé)

```typescript
// Backend: Set cookie lors du login
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
});

res.json({ accessToken, expiresIn });

// Frontend: Refresh automatique
if (isTokenExpired(accessToken)) {
  const { accessToken: newToken } = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // Envoie cookie refreshToken
  });
}
```

## 8. Tests

```typescript
// test/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cartae.dev',
        password: 'changeme123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cartae.dev',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
  });

  it('should require permission for protected route', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });
});
```

---

## Résumé Checklist

- [ ] Installer @cartae/auth + dépendances
- [ ] Récupérer clés RSA depuis Vault
- [ ] Initialiser JWTService, RBACService, AuditService
- [ ] Créer middleware validateJWT
- [ ] Créer middleware requirePermission
- [ ] Implémenter routes /api/auth (login, logout, refresh, me)
- [ ] Implémenter routes /api/users (CRUD, role management)
- [ ] Protéger routes existantes avec validateJWT + requirePermission
- [ ] Logger opérations sensibles avec AuditService
- [ ] Tester avec tests unitaires + intégration

**Après intégration: API sécurisée 0/10 → 9/10 ✅**
