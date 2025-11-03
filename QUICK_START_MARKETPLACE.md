# 🚀 Quick Start - Tester le Marketplace

## 1. Build & Run (3 commandes)

```bash
# Terminal 1 - Build le package marketplace
cd packages/plugin-marketplace
pnpm run build

# Terminal 2 - Démarrer l'app web  
cd apps/web
pnpm run dev
```

## 2. Ouvrir dans le navigateur

**URL** : http://localhost:5173/marketplace

## 3. Test Rapide (5 minutes)

### ✅ Page Home
1. Regarde le carousel "Featured" → auto-scroll toutes les 5 secondes
2. Scroll horizontal "Trending" → rank badges colorés (#1 Gold)
3. Click "Browse All Plugins" → liste complète

### ✅ Page Browse
4. Tape "test" dans la recherche → filtrage instantané
5. Sélectionne category dropdown → filtre par catégorie
6. Click sur une card → ouvre détails

### ✅ Page Détails
7. Tab "Overview" → description + info (version, license, etc.)
8. Tab "Reviews" → stats + liste reviews + formulaire
9. Click "Write a Review" → remplis formulaire → Submit

### ✅ Admin Dashboard
10. Retour Home → Click "Admin Dashboard"
11. Tab "Overview" → stats globales (plugins, downloads, ratings)
12. Tab "Moderation" → queue ratings pending (approve/reject)
13. Tab "Analytics" → choisis plugin → charts (downloads, rating trend)

## 4. Vérifier Performance

- **Cache** : Browse → Home → Browse = instantané (pas de reload)
- **Lazy Images** : Scroll → images chargent progressivement
- **Virtual Scroll** : Si > 50 plugins, scroll fluide

## 5. Test Admin (Access Control)

Dans `apps/web/src/pages/MarketplacePage.tsx` ligne ~200 :

```tsx
// Change isAdmin={true} → isAdmin={false}
<AdminDashboard
  isAdmin={false}  // ← Mettre false ici
  ...
/>
```

Reload → voir "Access Denied" 🔒

## 🐛 Si Erreur

### "Cannot find module '@cartae/plugin-marketplace'"

```bash
# Rebuild le package
cd packages/plugin-marketplace
pnpm run build

# Redémarrer app
cd ../../apps/web  
pnpm run dev
```

### "No plugins found"

Normal si le registry `https://bigmind-registry.workers.dev` est vide ou down.

### Console Errors

Ouvrir DevTools (F12) → Console → copier/coller l'erreur

---

**C'est tout ! En 5 min tu as testé tous les features 🎉**

Voir `TESTING_GUIDE.md` pour checklist complète (19 tests E2E).
