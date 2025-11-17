import { AlertCircle, XCircle, Info } from 'lucide-react';

/**
 * Props pour ErrorMessage
 *
 * @property title - Titre de l'erreur (défaut: "Erreur")
 * @property message - Message d'erreur user-friendly (obligatoire)
 * @property type - Type de message (error: erreur critique, warning: avertissement, info: information)
 * @property action - Action optionnelle (bouton retry, contact support, etc.)
 * @property onDismiss - Callback pour fermer le message (rend le message dismissable)
 */
interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

/**
 * Error message user-friendly avec actions actionnables
 *
 * Features :
 * - Messages clairs sans stack traces techniques
 * - Actions actionnables (retry, contact support, documentation)
 * - Icônes par type pour reconnaissance visuelle rapide
 * - Dismissable si onDismiss fourni
 * - Design cohérent avec système de couleurs par type
 *
 * @example
 * ```tsx
 * // Erreur simple
 * <ErrorMessage
 *   message="Impossible de charger les données"
 * />
 *
 * // Erreur avec action retry
 * <ErrorMessage
 *   title="Erreur de chargement"
 *   message="La connexion au serveur a échoué"
 *   action={{
 *     label: "Réessayer",
 *     onClick: () => refetch()
 *   }}
 * />
 *
 * // Avertissement dismissable
 * <ErrorMessage
 *   type="warning"
 *   message="Certaines données pourraient être obsolètes"
 *   onDismiss={() => setShowWarning(false)}
 * />
 *
 * // Info avec action
 * <ErrorMessage
 *   type="info"
 *   title="Mise à jour disponible"
 *   message="Une nouvelle version est disponible"
 *   action={{
 *     label: "En savoir plus",
 *     onClick: () => navigate('/changelog')
 *   }}
 * />
 * ```
 */
export const ErrorMessage = ({
  title = 'Erreur',
  message,
  type = 'error',
  action,
  onDismiss,
}: ErrorMessageProps) => {
  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      textSecondary: 'text-red-700',
      icon: <XCircle className="text-red-600 flex-shrink-0" size={20} />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      textSecondary: 'text-yellow-700',
      icon: <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      textSecondary: 'text-blue-700',
      icon: <Info className="text-blue-600 flex-shrink-0" size={20} />,
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${style.text} mb-1`}>{title}</h3>
          <p className={`text-sm ${style.textSecondary}`}>{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sm font-medium underline hover:no-underline ${style.text}`}
            >
              {action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Fermer le message"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Messages d'erreur prédéfinis pour cas courants
 *
 * Utiliser ces messages pour cohérence UX à travers l'application.
 * Tous les messages sont user-friendly (pas de termes techniques comme "500", "401", etc.)
 *
 * @example
 * ```tsx
 * // Erreur réseau
 * <ErrorMessage
 *   message={errorMessages.network}
 *   action={{ label: "Réessayer", onClick: retry }}
 * />
 *
 * // Session expirée
 * <ErrorMessage
 *   message={errorMessages.auth}
 *   action={{ label: "Se reconnecter", onClick: () => navigate('/login') }}
 * />
 * ```
 */
export const errorMessages = {
  network: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
  auth: 'Session expirée. Veuillez vous reconnecter.',
  permission: "Vous n'avez pas les permissions nécessaires pour cette action.",
  notFound: "La ressource demandée n'existe pas.",
  validation: 'Les données saisies sont invalides. Veuillez corriger les erreurs.',
  rateLimit: 'Trop de requêtes. Veuillez patienter quelques instants.',
  server: "Une erreur serveur s'est produite. Réessayez dans quelques instants.",
} as const;
