/**
 * Props pour le composant Skeleton
 *
 * @property variant - Type de skeleton (text: ligne de texte, circular: avatar rond, rectangular: bloc rectangulaire)
 * @property width - Largeur du skeleton (CSS string ou nombre de pixels)
 * @property height - Hauteur du skeleton (CSS string ou nombre de pixels)
 * @property count - Nombre de skeletons à afficher (répétition)
 */
export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

/**
 * Skeleton loader pour chargement de contenu progressif
 *
 * Préférable au spinner pour :
 * - Listes d'éléments (articles, cartes, tableaux)
 * - Cartes de contenu (profil utilisateur, dashboard)
 * - Meilleure UX car montre la structure attendue
 *
 * @example
 * ```tsx
 * // Lignes de texte
 * <Skeleton variant="text" count={3} />
 *
 * // Avatar circulaire
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * // Bloc rectangulaire (image)
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * ```
 */
export const Skeleton = ({ variant = 'text', width = '100%', height, count = 1 }: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'h-32',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variantClasses[variant]}`}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

/**
 * Skeleton preset pour une carte de profil/article
 *
 * Affiche :
 * - Avatar circulaire (48x48)
 * - Titre court (60% largeur)
 * - 2 lignes de description
 *
 * @example
 * ```tsx
 * // Chargement de cartes d'articles
 * {loading && (
 *   <>
 *     <SkeletonCard />
 *     <SkeletonCard />
 *     <SkeletonCard />
 *   </>
 * )}
 * ```
 */
export const SkeletonCard = () => (
  <div className="p-4 border rounded-lg space-y-3" aria-label="Chargement de la carte">
    <Skeleton variant="circular" width={48} height={48} />
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="100%" />
    <Skeleton variant="text" width="80%" />
  </div>
);

/**
 * Props pour SkeletonTable
 *
 * @property rows - Nombre de lignes à afficher (défaut: 5)
 */
export interface SkeletonTableProps {
  rows?: number;
}

/**
 * Skeleton preset pour un tableau
 *
 * Affiche des lignes de hauteur fixe (40px) simulant des rangées de tableau
 *
 * @example
 * ```tsx
 * // Chargement d'un tableau de 10 lignes
 * {loading ? (
 *   <SkeletonTable rows={10} />
 * ) : (
 *   <Table data={data} />
 * )}
 * ```
 */
export const SkeletonTable = ({ rows = 5 }: SkeletonTableProps) => (
  <div className="space-y-2" aria-label="Chargement du tableau">
    <Skeleton variant="text" height={40} count={rows} />
  </div>
);
