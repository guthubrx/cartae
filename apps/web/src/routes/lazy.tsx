/**
 * Lazy-loaded routes pour optimiser le bundle initial
 *
 * FR: Routes chargées à la demande pour réduire la taille du bundle principal
 * EN: On-demand loaded routes to reduce main bundle size
 *
 * Stratégie:
 * - Pages critiques (Home, Login) : Chargées immédiatement
 * - Pages secondaires (Settings, Marketplace) : Lazy loaded
 * - Components volumineux : Lazy loaded
 *
 * Usage:
 * ```tsx
 * import { Suspense } from 'react';
 * import { Settings, Marketplace } from './routes/lazy';
 *
 * <Suspense fallback={<LoadingSpinner />}>
 *   <Routes>
 *     <Route path="/settings" element={<Settings />} />
 *     <Route path="/marketplace" element={<Marketplace />} />
 *   </Routes>
 * </Suspense>
 * ```
 */

import { lazy } from 'react';

/**
 * Pages critiques (chargées immédiatement, pas de lazy)
 *
 * Ces pages sont dans le bundle principal car:
 * - Home: Landing page (première impression)
 * - Login: Souvent premier accès utilisateur
 */
// Note: Pour les exporter sans lazy, décommenter si nécessaire:
// export { default as Home } from '../pages/Home';
// export { default as Login } from '../pages/Login';

/**
 * Pages secondaires (lazy loaded)
 *
 * Ces pages ne sont chargées que si l'utilisateur y navigue
 */

/**
 * Settings Page
 * Taille estimée: ~50KB (formulaires, préférences)
 * Fréquence accès: Faible (occasionnel)
 */
export const Settings = lazy(() => import('../pages/Settings'));

/**
 * Marketplace Page
 * Taille estimée: ~80KB (grilles, filtres, ratings)
 * Fréquence accès: Moyenne
 */
export const Marketplace = lazy(() => import('../pages/MarketplacePage'));

/**
 * Plugins Page
 * Taille estimée: ~40KB (liste plugins, configuration)
 * Fréquence accès: Faible
 */
export const PluginsPage = lazy(() => import('../pages/PluginsPage'));

/**
 * Admin Dashboard (si existant)
 * Taille estimée: ~100KB (tables, stats, RBAC)
 * Fréquence accès: Très faible (admin seulement)
 */
// export const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));

/**
 * Vault Page (si existant)
 * Taille estimée: ~60KB (encryption, key management)
 * Fréquence accès: Faible
 */
// export const Vault = lazy(() => import('../pages/Vault'));

/**
 * User Profile (si existant)
 * Taille estimée: ~30KB (formulaire profil, avatar)
 * Fréquence accès: Faible
 */
// export const Profile = lazy(() => import('../pages/Profile'));

/**
 * Components volumineux (lazy loaded)
 *
 * Stratégie: Charger uniquement si utilisés dans la page active
 */

/**
 * Data Visualization (charts, graphs)
 * Taille estimée: ~150KB (D3, Recharts, SVG rendering)
 * Utilisation: Sporadique (dashboards seulement)
 */
// export const DataVisualization = lazy(() => import('../components/DataVisualization'));

/**
 * Chart Dashboard
 * Taille estimée: ~120KB (Recharts bundle complet)
 * Utilisation: Sporadique
 */
// export const ChartDashboard = lazy(() => import('../components/ChartDashboard'));

/**
 * Advanced Table (sorting, filtering, pagination)
 * Taille estimée: ~70KB (@tanstack/react-table)
 * Utilisation: Pages spécifiques uniquement
 */
// export const AdvancedTable = lazy(() => import('../components/AdvancedTable'));

/**
 * Markdown Editor (BlockNote, ByteMD)
 * Taille estimée: ~200KB (éditeur riche, syntaxe highlight)
 * Utilisation: Édition notes uniquement
 */
// export const MarkdownEditor = lazy(() => import('../components/MarkdownEditor'));

/**
 * OAuth Callback Handler
 * Taille estimée: ~20KB (logique auth)
 * Utilisation: Callback OAuth uniquement
 */
export const OAuthCallbackHandler = lazy(() => import('../components/plugins/OAuthCallbackHandler'));

/**
 * Helper: Suspense wrapper avec loading custom
 *
 * @example
 * ```tsx
 * import { withSuspense } from './routes/lazy';
 * const SettingsWithLoader = withSuspense(Settings, <SettingsLoader />);
 * ```
 */
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <div>Loading...</div>
) {
  return (props: P) => (
    <React.Suspense fallback={fallback}>
      <Component {...props} />
    </React.Suspense>
  );
}

/**
 * Note: Pour migrer vers lazy loading:
 *
 * AVANT (chargement immédiat):
 * ```tsx
 * import Settings from './pages/Settings';
 * <Route path="/settings" element={<Settings />} />
 * ```
 *
 * APRÈS (lazy loading):
 * ```tsx
 * import { Suspense } from 'react';
 * import { Settings } from './routes/lazy';
 *
 * <Suspense fallback={<LoadingSpinner />}>
 *   <Route path="/settings" element={<Settings />} />
 * </Suspense>
 * ```
 *
 * Gain estimé:
 * - Bundle principal: -200KB à -500KB (selon pages migrées)
 * - First Contentful Paint: -30% à -50%
 * - Time to Interactive: -20% à -40%
 */
