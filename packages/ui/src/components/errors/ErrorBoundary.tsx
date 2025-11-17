import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Props pour ErrorBoundary
 *
 * @property children - Composants enfants protégés par le boundary
 * @property fallback - Fonction de rendu personnalisé en cas d'erreur
 * @property onError - Callback appelé quand une erreur est capturée (logging, monitoring)
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State interne de ErrorBoundary
 *
 * @property hasError - Indique si une erreur a été capturée
 * @property error - Objet Error capturé
 * @property errorInfo - Informations détaillées de React (stack trace de composants)
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary pour capturer les erreurs React
 *
 * Capture les erreurs dans :
 * - Le cycle de vie des composants enfants
 * - Les méthodes render des composants enfants
 * - Les hooks useEffect des composants enfants (avec try/catch manuel)
 *
 * NE capture PAS :
 * - Event handlers (gérer avec try/catch dans le handler)
 * - Code asynchrone (promises, setTimeout)
 * - Erreurs serveur (SSR)
 * - Erreurs dans le boundary lui-même
 *
 * @example
 * ```tsx
 * // Usage basique avec fallback par défaut
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Avec fallback personnalisé
 * <ErrorBoundary
 *   fallback={(error) => <CustomErrorPage error={error} />}
 *   onError={(error, info) => logErrorToService(error, info)}
 * >
 *   <App />
 * </ErrorBoundary>
 *
 * // Boundaries multiples pour isoler les erreurs
 * <App>
 *   <ErrorBoundary>
 *     <Sidebar />
 *   </ErrorBoundary>
 *   <ErrorBoundary>
 *     <MainContent />
 *   </ErrorBoundary>
 * </App>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Méthode statique appelée après qu'une erreur a été lancée par un composant descendant
   * Permet de mettre à jour le state pour afficher l'UI de fallback
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  /**
   * Méthode de cycle de vie appelée après qu'une erreur a été capturée
   * Utilisée pour le logging et monitoring
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    this.setState({ error, errorInfo });

    // Appeler le callback de monitoring externe si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Sinon utiliser le fallback par défaut
      return <DefaultErrorFallback error={this.state.error!} />;
    }

    return this.props.children;
  }
}

/**
 * Props pour DefaultErrorFallback
 *
 * @property error - Objet Error à afficher
 */
interface DefaultErrorFallbackProps {
  error: Error;
}

/**
 * Composant de fallback par défaut pour ErrorBoundary
 *
 * Affiche :
 * - Titre d'erreur user-friendly
 * - Message d'erreur (sans stack trace technique)
 * - Bouton de rechargement de la page
 *
 * Design :
 * - Fond rouge clair (bg-red-50)
 * - Bordure rouge (border-red-200)
 * - Centré verticalement et horizontalement
 */
const DefaultErrorFallback = ({ error }: DefaultErrorFallbackProps) => (
  <div className="flex min-h-screen items-center justify-center p-4">
    <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-red-900 mb-2">Une erreur s&apos;est produite</h2>
      <p className="text-red-700 mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Recharger la page
      </button>
    </div>
  </div>
);
