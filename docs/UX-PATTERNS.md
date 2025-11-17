# UX Patterns - Guide des Composants UX Professionnels

**Version :** 1.0.0
**Date :** 2025-11-17
**Package :** @cartae/ui

## Vue d'ensemble

Ce guide documente les patterns UX professionnels implémentés dans Cartae pour garantir une expérience utilisateur cohérente, accessible et production-ready.

**Composants couverts :**
- Loading States (Spinner + Skeleton)
- Error Handling (Boundary + Messages)
- Feedback (Toasts)
- Empty States

---

## 1. Loading States

### 1.1. Quand utiliser Spinner vs Skeleton

#### LoadingSpinner

**Utiliser quand :**
- Chargement de durée inconnue
- Opération asynchrone unique (save, delete)
- Lazy loading de routes/composants (Suspense)
- Pas de structure connue à l'avance

**Exemple :**
```tsx
import { LoadingSpinner } from '@cartae/ui';

// Dans un Suspense fallback
<Suspense fallback={<LoadingSpinner />}>
  <LazyRoute />
</Suspense>

// Pendant une opération asynchrone
{isSaving && <LoadingSpinner text="Sauvegarde en cours..." />}

// Plein écran (overlay)
{isInitializing && <LoadingSpinner fullScreen text="Initialisation..." />}
```

**Tailles disponibles :**
- `sm` : 16px (dans boutons, badges)
- `md` : 24px (défaut, chargement général)
- `lg` : 32px (plein écran, chargements majeurs)

#### Skeleton Loader

**Utiliser quand :**
- Chargement de listes/tableaux/cartes
- Structure de contenu connue à l'avance
- Meilleure UX car montre la forme du contenu

**Exemple :**
```tsx
import { Skeleton, SkeletonCard, SkeletonTable } from '@cartae/ui';

// Skeleton générique
<Skeleton variant="text" count={3} />
<Skeleton variant="circular" width={48} height={48} />
<Skeleton variant="rectangular" width="100%" height={200} />

// Presets pour patterns courants
{isLoading ? (
  <>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </>
) : (
  <ArticleList articles={articles} />
)}

// Tableau
{isLoading ? (
  <SkeletonTable rows={10} />
) : (
  <DataTable data={data} />
)}
```

**Guidelines :**
- ✅ Préférer Skeleton pour listes/cartes (meilleure UX)
- ✅ Préférer Spinner pour opérations ponctuelles
- ❌ Ne pas mixer Spinner + Skeleton pour même contenu
- ❌ Ne pas afficher Spinner si temps < 300ms (semble instable)

---

## 2. Error Handling

### 2.1. ErrorBoundary

**Rôle :** Capturer les erreurs React non gérées pour éviter le crash total de l'app.

**Ce qu'il capture :**
- ✅ Erreurs dans render de composants enfants
- ✅ Erreurs dans lifecycle methods
- ✅ Erreurs dans useEffect (avec try/catch manuel)

**Ce qu'il NE capture PAS :**
- ❌ Event handlers (gérer avec try/catch dans handler)
- ❌ Code asynchrone (promises, setTimeout)
- ❌ Erreurs serveur (SSR)
- ❌ Erreurs dans le boundary lui-même

**Exemple :**
```tsx
import { ErrorBoundary } from '@cartae/ui';

// Au niveau racine (capture toutes les erreurs)
<ErrorBoundary
  onError={(error, info) => logToSentry(error, info)}
>
  <App />
</ErrorBoundary>

// Boundaries multiples (isoler erreurs par section)
<App>
  <ErrorBoundary>
    <Sidebar />
  </ErrorBoundary>
  <ErrorBoundary>
    <MainContent />
  </ErrorBoundary>
</App>

// Fallback personnalisé
<ErrorBoundary
  fallback={(error) => (
    <CustomErrorPage
      error={error}
      onRetry={() => window.location.reload()}
    />
  )}
>
  <App />
</ErrorBoundary>
```

**Best practices :**
- ✅ Toujours wrapper app racine avec ErrorBoundary
- ✅ Utiliser boundaries multiples pour isoler sections
- ✅ Logger erreurs vers service externe (Sentry, LogRocket)
- ❌ Ne pas capturer erreurs event handlers (try/catch manuel)

### 2.2. ErrorMessage

**Rôle :** Afficher des messages d'erreur user-friendly avec actions actionnables.

**Types disponibles :**
- `error` : Erreur critique (rouge)
- `warning` : Avertissement (jaune)
- `info` : Information (bleu)

**Exemple :**
```tsx
import { ErrorMessage, errorMessages } from '@cartae/ui';

// Erreur simple
<ErrorMessage message="Impossible de charger les données" />

// Avec action retry
<ErrorMessage
  title="Erreur de chargement"
  message={errorMessages.network}
  action={{
    label: "Réessayer",
    onClick: () => refetch()
  }}
/>

// Avertissement dismissable
<ErrorMessage
  type="warning"
  message="Certaines données pourraient être obsolètes"
  onDismiss={() => setShowWarning(false)}
/>

// Info avec action
<ErrorMessage
  type="info"
  title="Mise à jour disponible"
  message="Une nouvelle version est disponible"
  action={{
    label: "En savoir plus",
    onClick: () => navigate('/changelog')
  }}
/>
```

**Messages prédéfinis :**
```tsx
import { errorMessages } from '@cartae/ui';

errorMessages.network     // Erreur connexion internet
errorMessages.auth        // Session expirée
errorMessages.permission  // Permissions insuffisantes
errorMessages.notFound    // Ressource introuvable
errorMessages.validation  // Données invalides
errorMessages.rateLimit   // Trop de requêtes
errorMessages.server      // Erreur serveur 500
```

**Guidelines :**
- ✅ Toujours user-friendly (pas de stack traces)
- ✅ Fournir action actionnable (retry, contact, doc)
- ✅ Utiliser messages prédéfinis pour cohérence
- ❌ Ne pas afficher code HTTP (500, 401) directement
- ❌ Ne pas afficher stack traces techniques

---

## 3. Toast Notifications

**Rôle :** Feedback temporaire et non intrusif pour actions utilisateur.

**Quand utiliser :**
- ✅ Confirmation d'action (save, delete)
- ✅ Succès d'opération
- ✅ Erreur ponctuelle non bloquante
- ❌ Erreurs critiques (utiliser ErrorMessage)
- ❌ Informations permanentes

**Setup (racine app) :**
```tsx
import { ToastProvider } from '@cartae/ui';

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  );
}
```

**Utilisation :**
```tsx
import { useToast } from '@cartae/ui';

function MyComponent() {
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      addToast('success', 'Données sauvegardées avec succès');
    } catch (error) {
      addToast('error', 'Erreur lors de la sauvegarde');
    }
  };

  return <button onClick={handleSave}>Sauvegarder</button>;
}
```

**Types de toasts :**
```tsx
// Succès (vert, icône check)
addToast('success', 'Opération réussie');

// Erreur (rouge, icône X)
addToast('error', 'Une erreur est survenue');

// Info (bleu, icône i)
addToast('info', 'Nouvelle fonctionnalité disponible');

// Avertissement (jaune, icône triangle)
addToast('warning', 'Attention, données non sauvegardées');

// Durée personnalisée (défaut: 5000ms)
addToast('success', 'Message', 3000);

// Persistant (durée = 0, fermeture manuelle uniquement)
addToast('error', 'Erreur critique', 0);
```

**Guidelines :**
- ✅ Messages courts (max 2 lignes)
- ✅ Un toast à la fois (max 3 simultanés)
- ✅ Durée : 3-5s (succès), 5-7s (erreur)
- ❌ Ne pas spammer toasts (debounce si nécessaire)
- ❌ Ne pas utiliser pour erreurs critiques

---

## 4. Empty States

**Rôle :** Afficher un état vide élégant avec guidance utilisateur.

**Quand utiliser :**
- ✅ Liste/tableau vide
- ✅ Recherche sans résultats
- ✅ Boîte de réception vide
- ✅ Erreur de chargement (avec action retry)

**Exemple :**
```tsx
import { EmptyState } from '@cartae/ui';

// Liste vide avec CTA
{items.length === 0 && (
  <EmptyState
    title="Aucun élément"
    description="Commencez par créer votre premier élément"
    action={{
      label: "Créer un élément",
      onClick: () => setShowModal(true)
    }}
  />
)}

// Recherche sans résultats
{searchResults.length === 0 && query && (
  <EmptyState
    icon="search"
    title="Aucun résultat"
    description={`Aucun résultat pour "${query}"`}
  />
)}

// Boîte vide (state positif)
<EmptyState
  icon="inbox"
  title="Boîte de réception vide"
  description="Tous vos messages ont été traités"
/>

// Erreur de chargement
<EmptyState
  icon="error"
  title="Impossible de charger les données"
  description="Une erreur s'est produite lors du chargement"
  action={{
    label: "Réessayer",
    onClick: () => refetch()
  }}
/>
```

**Icônes disponibles :**
- `default` : FileX (liste vide générique)
- `search` : Search (recherche sans résultats)
- `inbox` : Inbox (boîte vide)
- `error` : AlertCircle (erreur de chargement)

**Guidelines :**
- ✅ Toujours expliquer POURQUOI vide
- ✅ Fournir action pour sortir de l'état vide (CTA)
- ✅ Ton positif si état vide = succès (inbox vide)
- ❌ Ne pas dire juste "Aucun élément" (expliquer)

---

## 5. Accessibilité

### ARIA Labels

Tous les composants UX incluent les ARIA labels appropriés :

```tsx
// LoadingSpinner
<div role="status" aria-label="Chargement en cours">

// ErrorBoundary fallback
<div role="alert" aria-live="assertive">

// ErrorMessage
<div role="alert" aria-live="assertive">  // error
<div role="status" aria-live="polite">    // warning/info

// Toast container
<div role="region" aria-label="Notifications" aria-live="polite">

// EmptyState (implicite, pas de role car contenu statique)
```

### Keyboard Navigation

- **Toasts** : Fermeture au clavier (Tab + Enter sur bouton ×)
- **ErrorMessage** : Fermeture au clavier (Tab + Enter)
- **EmptyState** : Bouton action focusable au clavier
- **LoadingSpinner** : Pas d'interaction nécessaire

### Focus Management

```tsx
// Boutons avec focus visible
className="... focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

---

## 6. Exemples Complets

### Pattern : Fetch de données avec tous les états

```tsx
import {
  LoadingSpinner,
  ErrorMessage,
  errorMessages,
  EmptyState,
  useToast
} from '@cartae/ui';

function DataList() {
  const { data, isLoading, error, refetch } = useQuery('data');
  const { addToast } = useToast();

  // Loading state
  if (isLoading) {
    return <LoadingSpinner text="Chargement des données..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorMessage
        message={errorMessages.network}
        action={{
          label: "Réessayer",
          onClick: () => refetch()
        }}
      />
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <EmptyState
        title="Aucune donnée"
        description="Commencez par créer votre premier élément"
        action={{
          label: "Créer un élément",
          onClick: () => {/* ... */}
        }}
      />
    );
  }

  // Success state avec toast sur action
  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      addToast('success', 'Élément supprimé');
      refetch();
    } catch (error) {
      addToast('error', 'Erreur lors de la suppression');
    }
  };

  return <List data={data} onDelete={handleDelete} />;
}
```

### Pattern : Liste avec Skeleton

```tsx
import { SkeletonCard, EmptyState } from '@cartae/ui';

function ArticleList() {
  const { data, isLoading } = useQuery('articles');

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="Aucun article"
        description="Publiez votre premier article"
        action={{
          label: "Créer un article",
          onClick: () => navigate('/articles/new')
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {data.map(article => <ArticleCard key={article.id} {...article} />)}
    </div>
  );
}
```

### Pattern : ErrorBoundary avec logging

```tsx
import { ErrorBoundary } from '@cartae/ui';
import * as Sentry from '@sentry/react';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Logger vers Sentry
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }}
      fallback={(error) => (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      )}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

---

## 7. Design Tokens

### Couleurs par type

```tsx
// Success (vert)
bg-green-50 border-green-200 text-green-900

// Error (rouge)
bg-red-50 border-red-200 text-red-900

// Warning (jaune)
bg-yellow-50 border-yellow-200 text-yellow-900

// Info (bleu)
bg-blue-50 border-blue-200 text-blue-900
```

### Tailles d'icônes

```tsx
// Petite (dans toasts, messages)
size={16}  // X close button
size={20}  // Icons dans messages/toasts

// Moyenne (loading spinner)
size={24}  // Spinner md

// Grande (empty states)
size={48}  // Empty state icons
```

### Animations

```css
/* Slide-in (toasts) */
@keyframes slide-in {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
animation: slide-in 0.3s ease-out;

/* Pulse (skeleton) */
animate-pulse  // Tailwind built-in

/* Spin (spinner) */
animate-spin   // Tailwind built-in
```

---

## 8. Checklist UX par Feature

Avant de merger une feature, vérifier que tous les états UX sont gérés :

- [ ] **Loading state** : Spinner ou Skeleton ?
- [ ] **Error state** : ErrorMessage avec action retry ?
- [ ] **Empty state** : EmptyState avec CTA ?
- [ ] **Success feedback** : Toast de confirmation ?
- [ ] **Error boundary** : Page wrappée dans ErrorBoundary ?
- [ ] **Accessibility** : ARIA labels + keyboard navigation ?
- [ ] **Messages user-friendly** : Pas de termes techniques ?
- [ ] **Actions actionnables** : Toujours proposer next step ?

---

## 9. Ressources

**Documentation React :**
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Suspense](https://react.dev/reference/react/Suspense)

**Accessibilité :**
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

**Design Systems :**
- [Material Design - Empty States](https://material.io/design/communication/empty-states.html)
- [Human Interface Guidelines - Loading](https://developer.apple.com/design/human-interface-guidelines/loading)

---

**Dernière mise à jour :** 2025-11-17
**Auteur :** Session 87 - Enterprise Features Polish
