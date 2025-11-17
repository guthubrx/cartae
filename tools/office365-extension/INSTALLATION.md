# 📦 Installation Guide - Cartae Office365 Extension Firefox

## 🎯 Objectif

Cette extension Firefox capture automatiquement les **tokens Office 365** (OWA, Graph API, SharePoint, Teams) pour permettre à Cartae de se connecter à vos services Microsoft sans redemander les identifiants à chaque fois.

**Workflow simple :**

1. Tu installes l'extension dans Firefox
2. Tu te connectes normalement à Outlook (outlook.office365.com)
3. L'extension capture automatiquement les tokens en arrière-plan
4. Cartae utilise ces tokens pour synchroniser tes emails/calendrier/documents

---

## ⚡ Installation Rapide (2 minutes)

### Étape 1 : Build l'extension

```bash
cd cartae/tools/office365-extension
./build.sh
```

**Résultat :** Fichier `cartae-office365-extension.xpi` créé (8.0K)

---

### Étape 2 : Charger l'extension dans Firefox

1. **Ouvrir Firefox**

2. **Naviguer vers les outils développeur :**
   - Taper dans la barre d'adresse : `about:debugging#/runtime/this-firefox`
   - Ou : Menu → Plus d'outils → Outils de développement d'extensions

3. **Charger le module temporaire :**
   - Cliquer sur **"Charger un module complémentaire temporaire..."**
   - Naviguer vers : `cartae/tools/office365-extension/`
   - Sélectionner : `cartae-office365-extension.xpi`
   - Cliquer **"Ouvrir"**

4. **Vérifier l'installation :**
   - Extension "Cartae Office 365 Token Interceptor" apparaît dans la liste
   - Statut : ✅ Activée

---

### Étape 3 : Se connecter à Outlook pour capturer les tokens

1. **Ouvrir un nouvel onglet Firefox**

2. **Naviguer vers Outlook :**

   ```
   https://outlook.office365.com/
   ```

3. **Se connecter normalement :**
   - Entrer ton email
   - Entrer ton mot de passe
   - Compléter l'authentification multi-facteurs (si activée)

4. **Vérifier la capture des tokens :**
   - Ouvrir la console développeur : `F12` → onglet **Console**
   - Tu dois voir les messages :
     ```
     [Cartae O365] 🚀 Extension démarrée - Multi-tokens interceptor
     [Cartae O365] ✅ 📧 Token OWA capturé!
     [Cartae O365] ✅ 🔷 Token Graph API capturé!
     ```

---

## ✅ Vérification de l'installation

### Test 1 : Extension chargée

```javascript
// Dans la console Firefox (F12 → Console)
typeof window.cartaeBrowserStorage !== 'undefined';
// Résultat attendu : true
```

### Test 2 : Tokens capturés

```javascript
// Dans la console Firefox
(async () => {
  const data = await window.cartaeBrowserStorage.get(['cartae-o365-token-owa']);
  console.log('Token OWA:', data['cartae-o365-token-owa'] ? '✅ Capturé' : '❌ Manquant');
})();
```

**Résultat attendu :**

```
Token OWA: ✅ Capturé
```

---

## 🔧 Troubleshooting

### Problème 1 : `window.cartaeBrowserStorage` undefined

**Cause :** Extension non chargée ou content script non injecté

**Solutions :**

1. Recharger l'extension dans `about:debugging`
2. Vérifier que l'extension est bien activée
3. Fermer/rouvrir Firefox
4. Vérifier les permissions dans le manifest.json

---

### Problème 2 : Pas de tokens capturés

**Cause :** User non connecté à Outlook ou tokens pas encore générés

**Solutions :**

1. Se déconnecter complètement d'Outlook : `logout`
2. Vider le cache Firefox : `Ctrl+Shift+Delete` → Cookies et données de sites
3. Se reconnecter à Outlook : `https://outlook.office365.com/`
4. Attendre 5-10 secondes après connexion
5. Vérifier la console : messages `[Cartae O365] ✅`

---

### Problème 3 : Extension disparaît au redémarrage de Firefox

**Cause :** Extensions temporaires ne persistent pas

**Solution :** C'est normal ! Pour une extension permanente :

1. Option A : Recharger manuellement à chaque session
2. Option B : Signer l'extension (advanced, nécessite compte développeur Mozilla)
3. Option C : Utiliser Firefox Developer Edition (extensions temporaires persistantes)

---

## 📊 Tokens capturés

L'extension capture **4 types de tokens** :

| Emoji | Type       | Service             | Utilisation Cartae               |
| ----- | ---------- | ------------------- | -------------------------------- |
| 📧    | OWA        | Outlook Web Access  | Emails (Session 120)             |
| 🔷    | Graph      | Microsoft Graph API | Calendar (Session 121), Contacts |
| 📁    | SharePoint | SharePoint Online   | Documents                        |
| 💬    | Teams      | Microsoft Teams     | Chats, Messages                  |

**Stockage :** `browser.storage.local` (persiste entre sessions Firefox)

**Clés de stockage :**

- `cartae-o365-token-owa` - Access token Outlook
- `cartae-o365-token-owa-refresh` - Refresh token Outlook
- `cartae-o365-token-graph` - Access token Graph API
- `cartae-o365-token-graph-refresh` - Refresh token Graph API
- `cartae-o365-token-sharepoint` - Access token SharePoint
- `cartae-o365-token-teams` - Access token Teams

---

## 🔐 Sécurité & Confidentialité

### Qu'est-ce que l'extension fait exactement ?

1. **Intercepte les requêtes OAuth2 :**
   - URL: `https://login.microsoftonline.com/*/oauth2/v2.0/token`
   - Méthode: POST (requêtes de tokens Microsoft)

2. **Extrait access_token + refresh_token :**
   - Parse la réponse JSON Microsoft
   - Stocke dans `browser.storage.local` (local à Firefox, jamais envoyé ailleurs)

3. **Expose API simple :**
   - `window.cartaeBrowserStorage.get(keys)` - Lecture tokens
   - Utilisé par Cartae app pour authentification

### L'extension peut-elle voler mes données ?

**NON**. Voici pourquoi :

✅ **Code open source** - Tu peux inspecter le code complet :

- `background.js` - Logique d'interception (100 lignes)
- `content-script.js` - Injection API (50 lignes)
- `manifest.json` - Permissions déclarées

✅ **Aucune connexion externe** - L'extension ne fait AUCUNE requête réseau vers des serveurs tiers

✅ **Stockage local uniquement** - Tokens restent dans Firefox, jamais transmis ailleurs

✅ **Permissions minimales** - Seulement : `storage`, `tabs`, `webRequest` (pour interception)

✅ **Même tokens que Microsoft utilise** - L'extension ne génère rien, elle capture ce que Microsoft envoie déjà

---

## 🛠️ Développement & Débogage

### Voir les logs en direct

```bash
# Console Firefox (F12 → Console)
# Filtrer par "Cartae O365" pour voir seulement les messages de l'extension
```

### Modifier l'extension

1. Éditer `background.js` ou `content-script.js`
2. Rebuild : `./build.sh`
3. Recharger l'extension dans `about:debugging` → **"Recharger"**
4. Recharger la page Outlook pour voir les changements

### Architecture de l'extension

```
Extension Firefox
├── manifest.json         # Configuration, permissions
├── background.js         # Service worker - Interception tokens
│   └── webRequest.onBeforeRequest → Capture requêtes /token
│   └── filterResponseData → Parse réponse JSON
│   └── browser.storage.local.set → Stocke tokens
│
└── content-script.js     # Injection dans pages localhost
    └── window.cartaeBrowserStorage → API pour Cartae app
```

---

## 📝 Prochaines étapes

Une fois l'extension installée et les tokens capturés :

1. ✅ Extension Firefox chargée
2. ✅ Tokens OWA/Graph/SharePoint/Teams capturés
3. ⏳ **Session 120** : Office365MailConnector utilisera ces tokens
4. ⏳ **Session 121** : Office365CalendarConnector utilisera ces tokens

---

## 🆘 Support

**Problème persistant ?**

1. Vérifie les logs : Console Firefox (F12)
2. Vérifie le storage : `about:debugging` → Storage → Extension Storage
3. Réessaye workflow complet : Désinstaller → Réinstaller → Reconnecter Outlook

**Ressources :**

- README.md : Documentation technique extension
- background.js : Code source complet commenté
- Session 120 plan : Architecture Office365 connector

---

**Version :** 1.0.0
**Dernière mise à jour :** 17 Novembre 2025
**Compatibilité :** Firefox 115+ (Manifest v2)
