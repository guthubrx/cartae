import { Loader2 } from 'lucide-react';

/**
 * Props pour le composant LoadingSpinner
 *
 * @property size - Taille du spinner (sm: 16px, md: 24px, lg: 32px)
 * @property text - Texte optionnel à afficher sous le spinner
 * @property fullScreen - Affiche le spinner en plein écran avec overlay
 */
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

/**
 * Loading spinner générique avec support de différentes tailles
 *
 * Utilisations courantes :
 * - Fallback de Suspense pour lazy loading de composants
 * - État de chargement dans les boutons asynchrones
 * - Indicateur de chargement pour les routes lazy
 * - Chargement de données API
 *
 * @example
 * ```tsx
 * // Spinner simple
 * <LoadingSpinner />
 *
 * // Avec texte
 * <LoadingSpinner text="Chargement des données..." />
 *
 * // Plein écran (overlay)
 * <LoadingSpinner fullScreen text="Initialisation..." />
 *
 * // Dans un Suspense
 * <Suspense fallback={<LoadingSpinner />}>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
export const LoadingSpinner = ({ size = 'md', text, fullScreen }: LoadingSpinnerProps) => {
  const sizes = { sm: 16, md: 24, lg: 32 };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className="animate-spin text-blue-600" size={sizes[size]} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
        role="status"
        aria-label={text || "Chargement en cours"}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div role="status" aria-label={text || "Chargement en cours"}>
      {spinner}
    </div>
  );
};
