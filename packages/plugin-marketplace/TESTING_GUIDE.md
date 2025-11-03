# 🧪 Guide de Test - Marketplace UI

Ce guide explique comment tester tous les composants du marketplace via l'interface web.

## 🚀 Démarrage

### 1. Build du package marketplace

```bash
cd packages/plugin-marketplace
pnpm run build
```

### 2. Démarrer l'app web

```bash
cd ../../apps/web
pnpm run dev
```

### 3. Accéder au marketplace

Ouvrir le navigateur : **http://localhost:5173/marketplace**

---

## 📋 Checklist de Test Complète

### 🏠 Page Home

**URL**: `/marketplace`

✅ **Tests à effectuer** :

1. **Section Featured Plugins**
   - [ ] Le carousel affiche les plugins featured
   - [ ] Auto-scroll fonctionne (change toutes les 5 secondes)
   - [ ] Boutons prev/next fonctionnent
   - [ ] Indicators dots fonctionnent (click pour naviguer)
   - [ ] Click sur une card ouvre les détails

2. **Section Trending Plugins**
   - [ ] Affiche les plugins triés par downloads
   - [ ] Rank badges colorés : #1 Gold, #2 Silver, #3 Bronze
   - [ ] Scroll horizontal fonctionne
   - [ ] Scroll hint affiché si > 3 plugins
   - [ ] Click sur une card ouvre les détails

3. **Quick Actions**
   - [ ] Bouton "Browse All Plugins" → Vue browse
   - [ ] Bouton "Admin Dashboard" → Vue admin
   - [ ] Bouton "Refresh Data" → Invalide cache + reload

---

### 🔍 Page Browse

**Navigation**: Depuis Home → "Browse All Plugins"

✅ **Tests à effectuer** :

1. **Header**
   - [ ] Titre "Browse Plugins"
   - [ ] Compteur "X plugins available"
   - [ ] Bouton "Back to Home" fonctionne

2. **Filtres (PluginFilters)**
   - [ ] **Search**: Taper "test" filtre les plugins en temps réel
   - [ ] **Category**: Sélectionner une catégorie filtre les résultats
   - [ ] **Pricing**: Free/Paid/Freemium filtre correctement
   - [ ] **Featured**: Toggle filtre uniquement featured
   - [ ] **Verified**: Toggle filtre uniquement verified
   - [ ] Combiner plusieurs filtres fonctionne

3. **Grid de plugins (OptimizedPluginGrid)**
   - [ ] Grille responsive (1 col mobile, 2 cols tablet, 3 cols desktop)
   - [ ] Chaque PluginCard affiche :
     - Icon ou emoji fallback (🧩)
     - Nom + badge verified si applicable
     - Description truncated
     - Rating (étoiles + score)
     - Downloads count formatté (K, M)
     - Category badge
   - [ ] Hover sur card → shadow
   - [ ] Click sur card → ouvre détails
   - [ ] Bouton Install/Uninstall fonctionne

4. **Performance**
   - [ ] Si > 50 plugins, vérifier que virtualization fonctionne
   - [ ] Scroll fluide (pas de lag)
   - [ ] Images lazy loadées (spinner → fade-in)

---

### 📄 Page Plugin Details

**Navigation**: Click sur n'importe quelle PluginCard

✅ **Tests à effectuer** :

1. **Header**
   - [ ] Bouton "Back to marketplace" → retour browse
   - [ ] Icon large (ou emoji fallback)
   - [ ] Nom + badge verified
   - [ ] Author name
   - [ ] Bouton Install/Uninstall fonctionnel
   - [ ] Meta info: rating, downloads, version, size

2. **Description & Tags**
   - [ ] Description complète affichée
   - [ ] Category badge
   - [ ] Tags affichés

3. **Screenshots Carousel** (si disponible)
   - [ ] Image principale affichée
   - [ ] Boutons prev/next fonctionnent
   - [ ] Indicators dots cliquables
   - [ ] Hover tooltips si disponibles

4. **Onglets (Tabs)**

   **Tab Overview** :
   - [ ] Long description affichée (si disponible)
   - [ ] Section "Information" :
     - Version
     - Updated date
     - License
     - Website link (ouvre dans nouvel onglet)
     - Repository link

   **Tab Reviews** :
   - [ ] RatingStats visible :
     - Average rating (grand nombre + étoiles)
     - Total count
     - Distribution 5★ → 1★ avec barres
     - Pourcentages corrects
   - [ ] Bouton "Write a Review" visible
   - [ ] RatingList affiche les reviews :
     - Tri par recent/helpful/rating
     - Pagination si > 10 reviews
     - Boutons Helpful/Report
   - [ ] Click "Write a Review" ouvre formulaire :
     - 5 étoiles cliquables (1-5)
     - Champs title (optionnel)
     - Champs comment (optionnel)
     - Champ author (requis)
     - Bouton Submit
     - Bouton Cancel

   **Tab Changelog** :
   - [ ] Version actuelle affichée
   - [ ] Date de mise à jour
   - [ ] Description ou "No changelog available"

5. **Formulaire Review (Tests de validation)**
   - [ ] Submit sans rating → erreur "Please select a rating"
   - [ ] Submit sans author → erreur "Please enter your name"
   - [ ] Author > 100 chars → erreur
   - [ ] Title > 200 chars → erreur
   - [ ] Comment > 2000 chars → erreur
   - [ ] Spam detection :
     - [ ] Caps ratio > 50% → erreur spam
     - [ ] Plus d'1 URL → erreur spam
     - [ ] Caractères répétés (aaaa) → erreur spam
     - [ ] Keywords spam (viagra, casino) → erreur spam
   - [ ] Submit valide → succès message

---

### 🛡️ Admin Dashboard

**Navigation**: Depuis Home → "Admin Dashboard"

**Note**: Par défaut, `isAdmin={true}` dans la demo. Tester aussi avec `false` pour voir "Access Denied".

✅ **Tests à effectuer** :

1. **Header Dashboard**
   - [ ] Titre "Admin Dashboard"
   - [ ] Username affiché ("demo-admin")
   - [ ] Bouton Logout fonctionne

2. **Tab Overview (MarketplaceStats)**
   - [ ] 4 Key Metrics cards :
     - Total Plugins (🧩)
     - Total Downloads (⬇️)
     - Total Ratings (⭐ + avg)
     - Pending Moderation (🛡️)
   - [ ] 3 Secondary Metrics :
     - Featured (count)
     - Verified (count)
     - Categories (count)
   - [ ] Health Indicators (3 barres) :
     - Moderation Queue: Clear (vert) si 0, Low (jaune) si < 10, High (rouge) si >= 10
     - Featured Coverage: % plugins featured
     - Verified Coverage: % plugins verified

3. **Tab Moderation (ModerationQueue)**
   - [ ] Titre "Moderation Queue"
   - [ ] Compteur "X ratings pending review"
   - [ ] Si 0 pending → "All caught up!" message
   - [ ] Checkbox "Select all" fonctionne
   - [ ] Sélectionner ratings individuellement fonctionne
   - [ ] Bulk actions (si ratings sélectionnés) :
     - [ ] "Approve Selected" → prompt confirmation → approuve en batch
     - [ ] "Reject Selected" → prompt confirmation → rejette en batch
   - [ ] Actions individuelles par rating :
     - [ ] Bouton "Approve" → approuve immédiatement
     - [ ] Bouton "Reject" → prompt reason → rejette avec raison
   - [ ] Après modération, rating disparaît de la liste

4. **Tab Analytics (PluginAnalytics)**
   - [ ] Dropdown "Select Plugin" avec tous les plugins
   - [ ] Plugin info card affichée :
     - Icon
     - Nom + badges (verified, featured)
     - Description
     - Author, version, category
   - [ ] 3 Key Metrics :
     - Total Downloads
     - Average Rating (X.X stars, Y reviews)
     - Downloads Last 7 days
   - [ ] **DownloadChart** (bar chart SVG) :
     - [ ] 30 barres (1 par jour)
     - [ ] Hover tooltip affiche "date: X downloads"
     - [ ] Grid lines visibles
     - [ ] X-axis labels (tous les 5 jours)
     - [ ] Y-axis labels (0, 25%, 50%, 75%, 100%)
     - [ ] Summary stats en bas : Total 30d, Avg/Day, Peak Day
   - [ ] **RatingTrendChart** (line chart SVG) :
     - [ ] Ligne jaune (rating trend)
     - [ ] Area fill gradient sous la ligne
     - [ ] Points cliquables avec tooltips ("date: X.X ★, Y ratings")
     - [ ] Volume bars grises en bas (hauteur = nb ratings)
     - [ ] Y-axis 1★-5★ (ligne 3★ en pointillés)
     - [ ] X-axis labels (tous les 5 jours)
     - [ ] Summary stats : Avg 30d, Peak rating, New ratings
     - [ ] Legend : Average Rating (ligne) + Rating Volume (bars)
   - [ ] Rating Distribution (5★ → 1★) :
     - [ ] Barres de progression jaunes
     - [ ] Pourcentages corrects
     - [ ] Count affiché

5. **Access Control**
   - [ ] Modifier `isAdmin={false}` dans MarketplacePage.tsx
   - [ ] Recharger → voir "Access Denied" avec icône 🔒
   - [ ] Message "This dashboard is restricted to marketplace administrators"

---

### ⚡ Tests de Performance

✅ **Tests à effectuer** :

1. **Caching**
   - [ ] Charger Browse page (première fois)
   - [ ] Noter le temps de chargement
   - [ ] Cliquer "Back to Home"
   - [ ] Retourner sur Browse page
   - [ ] Vérifier chargement instantané (depuis cache)
   - [ ] Ouvrir DevTools → Network → vérifier pas de requête réseau

2. **Lazy Loading Images**
   - [ ] Ouvrir Browse page
   - [ ] Ouvrir DevTools → Network → Filter Images
   - [ ] Vérifier que seules images visibles sont chargées
   - [ ] Scroll vers le bas
   - [ ] Vérifier que nouvelles images se chargent progressivement
   - [ ] Observer spinner → fade-in animation

3. **Virtual Scrolling** (si > 50 plugins)
   - [ ] Ouvrir Browse avec beaucoup de plugins
   - [ ] Vérifier scroll fluide (pas de lag)
   - [ ] Ouvrir React DevTools
   - [ ] Vérifier que seulement ~15-20 PluginCard sont montées dans le DOM
   - [ ] Scroll vers le bas
   - [ ] Vérifier que anciennes cards sont démontées

4. **Stale-While-Revalidate**
   - [ ] Charger Browse page
   - [ ] Attendre 1 minute (staleTime)
   - [ ] Click sur un plugin puis "Back"
   - [ ] Vérifier :
     - [ ] Données cached affichées immédiatement
     - [ ] Requête background pour refresh
     - [ ] Données mises à jour silencieusement si changement

5. **Page Load < 3s**
   - [ ] Vider cache navigateur (DevTools → Clear storage)
   - [ ] Recharger `/marketplace`
   - [ ] Ouvrir DevTools → Network → Check "Disable cache"
   - [ ] Mesurer temps jusqu'à affichage complet
   - [ ] Vérifier < 3000ms

---

### ♿ Tests d'Accessibilité

✅ **Tests à effectuer** :

1. **Navigation Clavier**
   - [ ] Appuyer Tab plusieurs fois
   - [ ] Vérifier focus visible (outline bleu)
   - [ ] Naviguer vers un bouton
   - [ ] Appuyer Enter → action executée
   - [ ] Naviguer dans formulaire avec Tab
   - [ ] Submit formulaire avec Enter

2. **ARIA Labels**
   - [ ] Ouvrir DevTools → Inspect boutons
   - [ ] Vérifier `aria-label` ou text content
   - [ ] Screenshots carousel : `aria-label="Next screenshot"`
   - [ ] Pagination : `aria-label="Go to page 2"`

3. **Screen Reader** (si disponible)
   - [ ] Activer VoiceOver (Mac) ou NVDA (Windows)
   - [ ] Naviguer dans la page
   - [ ] Vérifier annonces correctes

---

## 🐛 Tests de Cas d'Erreur

✅ **Tests à effectuer** :

1. **Erreur Réseau**
   - [ ] Ouvrir DevTools → Network → Throttling → Offline
   - [ ] Recharger Browse page
   - [ ] Vérifier message d'erreur "Failed to load plugins"
   - [ ] Bouton "Retry" visible
   - [ ] Click Retry → nouvelle tentative

2. **Plugin Non Trouvé**
   - [ ] Naviguer vers `/marketplace` puis browse
   - [ ] Filtrer avec search "xxxxxxx" (inexistant)
   - [ ] Vérifier message "No plugins found"
   - [ ] "Try adjusting your search or filters"

3. **Rating Submit Fail**
   - [ ] Ouvrir plugin details → Reviews tab
   - [ ] Remplir formulaire review
   - [ ] Simuler erreur (modifier RatingService pour throw)
   - [ ] Vérifier alert "Failed to submit"

4. **Install Fail**
   - [ ] Click Install sur un plugin
   - [ ] Simuler erreur (modifier PluginStore)
   - [ ] Vérifier alert "Failed to install: ..."

---

## 📸 Tests Visuels (Screenshots)

Prendre des screenshots pour validation :

1. **Home Page** - Featured + Trending sections
2. **Browse Page** - Grid avec filtres actifs
3. **Plugin Details** - Tab Overview
4. **Plugin Details** - Tab Reviews avec ratings
5. **Rating Form** - Formulaire ouvert
6. **Admin Dashboard** - Tab Overview stats
7. **Admin Dashboard** - Tab Moderation queue
8. **Admin Dashboard** - Tab Analytics avec charts
9. **Mobile View** - Home responsive
10. **Error State** - No plugins found
11. **Loading State** - Spinner
12. **Access Denied** - Admin dashboard non-auth

---

## 🔧 Debugging

### Console Logs

Le marketplace log toutes les actions importantes :

```javascript
[Marketplace] Installing plugin: com.example.plugin
[Marketplace] Install failed: Network error
[RatingService] Fetch failed for plugins:...: ...
[usePluginCache] markHelpful not yet implemented in Supabase
```

### React DevTools

1. Installer React DevTools extension
2. Ouvrir Components tab
3. Chercher composants marketplace :
   - `OptimizedPluginGrid`
   - `usePluginsQuery` hook
   - `PluginDetails`
4. Inspecter props/state

### Network Tab

Vérifier requêtes :
- `GET https://bigmind-registry.workers.dev/plugins` → Liste plugins
- Supabase queries pour ratings (si configuré)

---

## ✅ Checklist Finale

Avant de considérer les tests complets :

- [ ] Tous les composants Discovery fonctionnent
- [ ] Système de ratings complet (stats, list, form)
- [ ] Admin dashboard accessible et fonctionnel
- [ ] Performance OK (cache, lazy loading, virtual scroll)
- [ ] Accessibilité validée (keyboard, ARIA)
- [ ] Cas d'erreur gérés proprement
- [ ] Mobile responsive
- [ ] Pas d'erreurs console

---

## 🚀 Commandes Rapides

```bash
# Build marketplace
cd packages/plugin-marketplace && pnpm run build

# Start dev server
cd apps/web && pnpm run dev

# Run E2E tests
cd packages/plugin-marketplace && npx playwright test

# Open Playwright UI
npx playwright test --ui

# Debug specific test
npx playwright test marketplace.spec.ts:22 --debug
```

---

## 📝 Rapport de Bug

Si tu trouves un bug, noter :

1. **URL/Page** : `/marketplace` ou `/marketplace#details`
2. **Action** : Click Install, Submit review, etc.
3. **Attendu** : Plugin s'installe
4. **Obtenu** : Erreur "Failed to install"
5. **Console** : Copier logs console
6. **Network** : Screenshot Network tab si pertinent
7. **Browser** : Chrome 120, Firefox 121, etc.

---

**Bon test ! 🧪**

Si tu trouves des bugs ou as des questions, ouvre une issue sur GitHub.
