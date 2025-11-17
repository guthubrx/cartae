# Session 88 - API Testing Guide

Guide complet pour tester les endpoints RBAC + MFA + JWT.

## 🚀 Setup Initial

### 1. Exécuter la migration
```bash
cd packages/database-api
pnpm migrate:rbac
```

**Output attendu** :
```
🔄 Running RBAC + MFA migration...

✅ Migration completed successfully!

Created:
  - 6 system roles (super_admin, admin, manager, editor, viewer, analyst)
  - 17 granular permissions
  - Role-permission assignments
  - Audit logs table
  - Sessions table
  - Enhanced users table (MFA + SSO columns)
```

### 2. Créer l'utilisateur super admin
```bash
pnpm setup:admin
```

**Output attendu** :
```
🔄 Creating initial super admin user...

✅ Super admin user created successfully!

Credentials:
  Email: admin@cartae.app
  Password: Admin123!ChangeMe
  Name: System Administrator
  Role: super_admin
  User ID: <uuid>

⚠️  IMPORTANT: Change the password after first login!
```

**Credentials custom** :
```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=SecurePass123! \
ADMIN_NAME="My Admin" \
pnpm setup:admin
```

### 3. Démarrer le serveur
```bash
pnpm dev
```

**Serveur accessible sur** : `http://localhost:3001`

---

## 📝 Tests des Endpoints

### 1. Registration (Public)

**Endpoint** : `POST /api/auth/register`

**Request** :
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Response 201** :
```json
{
  "status": "success",
  "user": {
    "id": "uuid-...",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "2025-11-16T..."
  }
}
```

---

### 2. Login sans MFA

**Endpoint** : `POST /api/auth/login`

**Request** :
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cartae.app",
    "password": "Admin123!ChangeMe"
  }'
```

**Response 200** :
```json
{
  "status": "success",
  "user": {
    "id": "uuid-...",
    "email": "admin@cartae.app",
    "roles": ["super_admin"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Sauvegarder le token** :
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Get Current User

**Endpoint** : `GET /api/auth/me`

**Request** :
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Response 200** :
```json
{
  "user": {
    "id": "uuid-...",
    "email": "admin@cartae.app",
    "name": "System Administrator",
    "mfaEnabled": false,
    "remainingBackupCodes": 0,
    "createdAt": "2025-11-16T...",
    "lastLogin": "2025-11-16T..."
  }
}
```

---

### 4. Enable MFA

**Endpoint** : `POST /api/auth/mfa/enable`

**Request** :
```bash
curl -X POST http://localhost:3001/api/auth/mfa/enable \
  -H "Authorization: Bearer $TOKEN"
```

**Response 200** :
```json
{
  "status": "success",
  "secret": "ABCD1234EFGH5678IJKL9012MNOP3456",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  "backupCodes": [
    "A3B7-9F2E",
    "C5D8-1K4P",
    "F2G9-3L7M",
    "H6J1-8N5Q",
    "K9M2-4P8R",
    "N3Q7-5S1T",
    "P8R4-9U6V",
    "S2T5-7W3X"
  ],
  "message": "Scan QR code in authenticator app, then confirm with 6-digit code"
}
```

**⚠️ IMPORTANT** : Sauvegarder les backup codes dans un endroit sûr !

**Scanner le QR code** avec Google Authenticator ou Authy.

---

### 5. Confirm MFA Setup

**Endpoint** : `POST /api/auth/mfa/confirm`

**Request** (avec code à 6 chiffres de l'app) :
```bash
curl -X POST http://localhost:3001/api/auth/mfa/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'
```

**Response 200** :
```json
{
  "status": "success",
  "message": "MFA confirmed and activated"
}
```

---

### 6. Login avec MFA (2-step flow)

**Step 1 - Email/Password** :
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cartae.app",
    "password": "Admin123!ChangeMe"
  }'
```

**Response 200** :
```json
{
  "status": "mfa_required",
  "userId": "uuid-...",
  "message": "Please provide MFA token"
}
```

**Step 2 - MFA Token** :
```bash
curl -X POST http://localhost:3001/api/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-...",
    "token": "123456"
  }'
```

**Response 200** :
```json
{
  "status": "success",
  "user": {
    "id": "uuid-...",
    "email": "admin@cartae.app",
    "roles": ["super_admin"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "remainingBackupCodes": 8
}
```

**Login avec backup code** (si TOTP pas disponible) :
```bash
curl -X POST http://localhost:3001/api/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-...",
    "token": "A3B7-9F2E"
  }'
```

**⚠️** Chaque backup code est **one-time use** !

---

### 7. User Management (RBAC Protected)

#### List Users (requires `users:read`)

**Request** :
```bash
curl -X GET "http://localhost:3001/api/users?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Response 200** :
```json
{
  "users": [
    {
      "id": "uuid-...",
      "email": "admin@cartae.app",
      "name": "System Administrator",
      "is_active": true,
      "mfa_enabled": true,
      "created_at": "2025-11-16T...",
      "last_login": "2025-11-16T...",
      "roles": ["super_admin"]
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Create User (requires `users:create`)

**Request** :
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "ManagerPass123!",
    "name": "Manager User",
    "roles": ["manager"]
  }'
```

**Response 201** :
```json
{
  "status": "success",
  "user": {
    "id": "uuid-...",
    "email": "manager@example.com",
    "name": "Manager User",
    "created_at": "2025-11-16T...",
    "roles": ["manager"]
  }
}
```

#### Update User Roles (requires `users:manage`)

**Request** :
```bash
curl -X PUT http://localhost:3001/api/users/<user-id>/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["admin", "manager"]
  }'
```

**Response 200** :
```json
{
  "status": "success",
  "roles": ["admin", "manager"]
}
```

---

### 8. Audit Logs (Admin Only)

#### Query Logs

**Request** :
```bash
curl -X GET "http://localhost:3001/api/audit?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Response 200** :
```json
{
  "logs": [
    {
      "id": "uuid-...",
      "timestamp": "2025-11-16T...",
      "userId": "uuid-...",
      "userEmail": "admin@cartae.app",
      "resource": "auth",
      "action": "login_success",
      "resourceId": null,
      "oldValues": null,
      "newValues": null,
      "ipAddress": "::1",
      "userAgent": "curl/..."
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Export to CSV

**Request** :
```bash
curl -X GET http://localhost:3001/api/audit/export \
  -H "Authorization: Bearer $TOKEN" \
  -o audit-logs.csv
```

**Output** : `audit-logs-2025-11-16.csv`

---

## 🔒 Permission Matrix Testing

### Super Admin (Full Access)
```bash
# Can do EVERYTHING
curl -X GET http://localhost:3001/api/users -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"      # ✅
curl -X POST http://localhost:3001/api/users -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" ...  # ✅
curl -X GET http://localhost:3001/api/audit -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"       # ✅
```

### Admin
```bash
# Can manage users, items, settings
curl -X GET http://localhost:3001/api/users -H "Authorization: Bearer $ADMIN_TOKEN"      # ✅
curl -X POST http://localhost:3001/api/users -H "Authorization: Bearer $ADMIN_TOKEN" ... # ✅
curl -X GET http://localhost:3001/api/audit -H "Authorization: Bearer $ADMIN_TOKEN"      # ✅
```

### Manager
```bash
# Can manage items + exports, NO user management
curl -X GET http://localhost:3001/api/users -H "Authorization: Bearer $MANAGER_TOKEN"      # ❌ 403
curl -X POST http://localhost:3001/api/users -H "Authorization: Bearer $MANAGER_TOKEN" ... # ❌ 403
# But can access items (not shown in this test guide)
```

### Viewer (Read-Only)
```bash
# Can only view items, NO modifications
curl -X GET http://localhost:3001/api/users -H "Authorization: Bearer $VIEWER_TOKEN"      # ❌ 403
curl -X POST http://localhost:3001/api/users -H "Authorization: Bearer $VIEWER_TOKEN" ... # ❌ 403
# Can read items (not shown)
```

---

## 🧪 Error Cases

### Invalid JWT
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer invalid-token"
```
**Response 401** :
```json
{
  "error": "Invalid or expired token",
  "message": "Invalid token"
}
```

### Insufficient Permissions
```bash
# Viewer trying to create user
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "pass"}'
```
**Response 403** :
```json
{
  "error": "Permission insuffisante",
  "required": "users:create"
}
```

### Invalid MFA Token
```bash
curl -X POST http://localhost:3001/api/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "uuid-...", "token": "000000"}'
```
**Response 401** :
```json
{
  "error": "Invalid MFA token"
}
```

---

## 📊 Checklist de Test Complet

- [ ] ✅ Migration exécutée sans erreur
- [ ] ✅ Admin créé avec succès
- [ ] ✅ Serveur démarre sans erreur
- [ ] ✅ Registration nouveau user fonctionne
- [ ] ✅ Login sans MFA retourne JWT valide
- [ ] ✅ JWT decode correctement (userId, email, roles)
- [ ] ✅ Endpoints protégés bloquent sans token
- [ ] ✅ MFA enable génère secret + QR + backup codes
- [ ] ✅ MFA confirm valide le setup
- [ ] ✅ Login avec MFA (2-step flow) fonctionne
- [ ] ✅ TOTP à 6 chiffres accepté
- [ ] ✅ Backup code accepté (one-time use)
- [ ] ✅ Liste users retourne rôles corrects
- [ ] ✅ Création user avec rôles fonctionne
- [ ] ✅ Modification rôles fonctionne
- [ ] ✅ Permissions bloquent accès non-autorisé
- [ ] ✅ Audit logs enregistrent toutes les mutations
- [ ] ✅ Export CSV fonctionne

---

## 🎯 Next Steps

Après avoir validé tous les tests :

1. **Frontend (Phase 6)** :
   - Composant `LoginWithMFA.tsx`
   - Composant `MFASetupWizard.tsx`
   - Page `UserManagement.tsx`
   - Page `AuditLogViewer.tsx`

2. **Tests Automatisés (Phase 7)** :
   - Tests unitaires MFA service
   - Tests unitaires Audit service
   - Tests E2E auth flow complet
   - Tests E2E RBAC permissions

3. **Production** :
   - Générer vrai `JWT_SECRET` sécurisé (min 32 chars)
   - Stocker secrets dans Vault
   - Activer HTTPS/TLS
   - Configurer rate limiting
   - Monitoring + alertes
