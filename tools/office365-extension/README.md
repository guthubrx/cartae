# Cartae Office 365 Token Interceptor - Extension Firefox

Extension Firefox pour capturer automatiquement les tokens OAuth 2.0 Microsoft Office 365.

**Mode d'intégration:** Phase 2 - Intégration avec TokenInterceptorService

---

## 🎯 Objectif

Cette extension intercepte les tokens OAuth 2.0 générés par Microsoft lors de la connexion à OWA et les stocke dans `browser.storage.local` pour être utilisés par Cartae.

**Services capturés:**

- 📧 **OWA** (Outlook Web Access)
- 🔷 **Graph API** (Microsoft Graph)
- 📁 **SharePoint** (SharePoint Online)
- 💬 **Teams** (Microsoft Teams)

---

## 📦 Installation

### Prérequis

- Firefox ≥ 100
- Cartae plugin office365-connector activé

### Étapes

1. **Ouvrir Firefox**

   ```
   firefox
   ```

2. **Aller sur about:debugging**

   ```
   URL: about:debugging#/runtime/this-firefox
   ```

3. **Charger extension temporaire**
   - Cliquer "Load Temporary Add-on..."
   - Sélectionner: `plugins/office365-connector/extension-integration/manifest.json`

4. **Vérifier installation**
   - Extension "Cartae Office 365 Token Interceptor" apparaît dans la liste
   - Aucune icône dans la barre d'outils (mode background)

---

## 🚀 Utilisation

### 1. Se connecter à OWA

```
1. Aller sur: outlook.office365.com/owa/
2. Se connecter avec email + mdp SNCF
3. Extension capture tokens automatiquement en arrière-plan
```

**Console Firefox (F12) → Logs attendus:**

```
[Cartae O365] 🎯 Requête token détectée!
[Cartae O365] 🎉 TOKEN OWA CAPTURÉ!
[Cartae O365] 💾 Token sauvegardé: cartae-o365-token-owa
[Cartae O365] 🎉 TOKEN GRAPH CAPTURÉ!
[Cartae O365] 💾 Token sauvegardé: cartae-o365-token-graph
```

### 2. Lancer Cartae

```bash
cd cartae-private/plugins/office365-connector
npm run dev:web
```

**Logs Cartae attendus:**

```
[HH:MM:SS] 🔍 Détection extension Firefox...
[HH:MM:SS] ✅ Extension Firefox détectée
[HH:MM:SS] 🎯 Mode: Token Interception
[HH:MM:SS] ✅ Tokens disponibles (déjà connecté à OWA)
```

### 3. Utiliser EmailMVP

- Ouvrir EmailMVP dans Cartae
- Clic "Charger Emails" → emails listés automatiquement
- Aucune authentification manuelle requise ✨

---

## 🔧 Architecture Technique

### Flow de capture

```
1. User se connecte à OWA normalement
   ↓
2. OWA demande tokens à Microsoft (/oauth2/v2.0/token)
   ↓
3. Extension intercepte avec webRequest.filterResponseData()
   ↓
4. Extension parse JSON response
   ↓
5. Extension stocke dans browser.storage.local
   - cartae-o365-token-owa
   - cartae-o365-token-owa-refresh
   - cartae-o365-token-owa-expires-in
   - cartae-o365-token-owa-captured-at
   ↓
6. TokenInterceptorService lit tokens depuis storage
   ↓
7. Cartae utilise tokens pour APIs Microsoft
```

### Clés storage

**Format:**

```javascript
{
  'cartae-o365-token-{service}': 'eyJ0eXAiOiJKV1Q...',
  'cartae-o365-token-{service}-refresh': 'M.R3_...',
  'cartae-o365-token-{service}-expires-in': 86399,
  'cartae-o365-token-{service}-captured-at': '2025-11-01T18:46:00.000Z'
}
```

**Services:** `owa`, `graph`, `sharepoint`, `teams`

### Permissions requises

- `storage` - Stocker tokens dans browser.storage.local
- `tabs` - Détecter navigation OWA
- `webRequest` - Intercepter requêtes HTTP
- `webRequestBlocking` - Filtrer réponses HTTP
- `<all_urls>` - Accès toutes URLs (interception login.microsoftonline.com)

---

## 🧪 Tests

### Vérifier tokens capturés

**Console Firefox (F12):**

```javascript
// Vérifier tous les tokens
browser.storage.local.get(null).then(console.log);

// Vérifier token OWA spécifique
browser.storage.local.get('cartae-o365-token-owa').then(console.log);
```

### Nettoyer tokens

```javascript
// Nettoyer tous les tokens
browser.storage.local.clear();

// Nettoyer token OWA spécifique
browser.storage.local.remove('cartae-o365-token-owa');
```

---

## 🛠️ Debugging

### Extension ne capture pas

**Symptômes:**

- Aucun log "TOKEN CAPTURÉ" dans console
- Cartae affiche "Extension non détectée"

**Solutions:**

1. Vérifier extension chargée (about:debugging)
2. Refresh OWA (F5) pour forcer nouvelle requête token
3. Vérifier console Firefox pour erreurs

### Cartae ne détecte pas extension

**Symptômes:**

- Logs: "Extension Firefox non détectée"
- Fallback Device Code Flow

**Solutions:**

1. Vérifier `typeof browser !== 'undefined'` dans console Cartae
2. Si Tauri: Vérifier polyfill `browser` API
3. Mode dev:web: Extension doit être chargée dans même Firefox

### Tokens expirés

**Symptômes:**

- APIs retournent 401 Unauthorized
- Logs: "Token expiré"

**Solutions:**

1. Refresh OWA (F5) pour capturer nouveaux tokens
2. Extension recapture automatiquement avec refresh_token
3. Vérifier expiration: `expiresIn` dans storage

---

## 🔐 Sécurité

### Stockage tokens

- Tokens stockés en **clair** dans `browser.storage.local`
- ⚠️ **Attention:** Accessible via DevTools (F12)
- 🔒 **TODO Phase 4:** Encryption tokens

### Permissions

- Extension a accès **toutes URLs** (`<all_urls>`)
- Interception **transparente** (données transférées normalement)
- Pas d'impact sur OWA (user ne voit rien)

---

## 📚 Documentation Connexe

- `../README.md` - Vue d'ensemble Office 365 connector
- `../INTEGRATION.md` - Guide Phase 2 intégration
- `../ARCHITECTURE.md` - Détails techniques complets
- `../ROADMAP.md` - Timeline Phases 1-4

---

**Version:** 1.0.0
**Status:** Phase 2 - Intégration Cartae
**Date:** 1 Novembre 2025
