import { FileX, Search, Inbox, AlertCircle } from 'lucide-react';

/**
 * Props pour EmptyState
 *
 * @property icon - Type d'icône prédéfini (default: fichier vide, search: recherche, inbox: boîte vide, error: erreur)
 * @property title - Titre de l'état vide (obligatoire)
 * @property description - Description optionnelle (contexte supplémentaire)
 * @property action - Action optionnelle (bouton pour résoudre l'état vide)
 */
interface EmptyStateProps {
  icon?: 'default' | 'search' | 'inbox' | 'error';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty State pour afficher un état vide de manière élégante
 *
 * Utiliser quand :
 * - Liste/tableau vide (pas de données à afficher)
 * - Recherche sans résultats
 * - Boîte de réception vide
 * - Erreur de chargement (avec icon="error")
 *
 * Features :
 * - Icônes prédéfinies pour cas courants
 * - Centré verticalement et horizontalement
 * - Action optionnelle (CTA pour résoudre l'état vide)
 * - Design minimaliste et aéré
 *
 * @example
 * ```tsx
 * // Liste vide
 * {items.length === 0 && (
 *   <EmptyState
 *     title="Aucun élément"
 *     description="Commencez par créer votre premier élément"
 *     action={{
 *       label: "Créer un élément",
 *       onClick: () => setShowModal(true)
 *     }}
 *   />
 * )}
 *
 * // Recherche sans résultats
 * {searchResults.length === 0 && query && (
 *   <EmptyState
 *     icon="search"
 *     title="Aucun résultat"
 *     description={`Aucun résultat pour "${query}"`}
 *   />
 * )}
 *
 * // Boîte de réception vide
 * <EmptyState
 *   icon="inbox"
 *   title="Boîte de réception vide"
 *   description="Tous vos messages ont été traités"
 * />
 *
 * // Erreur de chargement
 * <EmptyState
 *   icon="error"
 *   title="Impossible de charger les données"
 *   description="Une erreur s'est produite lors du chargement"
 *   action={{
 *     label: "Réessayer",
 *     onClick: () => refetch()
 *   }}
 * />
 * ```
 */
export const EmptyState = ({ icon = 'default', title, description, action }: EmptyStateProps) => {
  const icons = {
    default: <FileX size={48} className="text-gray-400" aria-hidden="true" />,
    search: <Search size={48} className="text-gray-400" aria-hidden="true" />,
    inbox: <Inbox size={48} className="text-gray-400" aria-hidden="true" />,
    error: <AlertCircle size={48} className="text-gray-400" aria-hidden="true" />,
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icons[icon]}
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-600 max-w-md">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
