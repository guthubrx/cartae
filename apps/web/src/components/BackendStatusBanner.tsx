import React, { useState } from 'react';
import type { BackendHealthStatus } from '../hooks/useBackendHealth';

/**
 * Props du composant BackendStatusBanner
 */
export interface BackendStatusBannerProps {
  /**
   * Status actuel du backend (online/offline/checking/error)
   */
  status: BackendHealthStatus;

  /**
   * Message d'erreur optionnel (ex: "HTTP 503", "Failed to fetch")
   */
  error?: string;

  /**
   * Callback pour retester la connexion manuellement
   * Appelé quand l'utilisateur clique sur "Retester"
   */
  onRecheck: () => Promise<void>;

  /**
   * URL du backend (affichée dans le message)
   * Default: http://localhost:3001
   */
  backendUrl?: string;
}

/**
 * Composant de bandeau d'avertissement pour backend offline
 *
 * Affiche un bandeau orange quand le backend ne répond pas,
 * avec instructions pour relancer le backend et bouton retest.
 *
 * @example
 * ```tsx
 * const { state, recheck } = useBackendHealth();
 *
 * return (
 *   <div>
 *     {state.status === 'offline' && (
 *       <BackendStatusBanner
 *         status={state.status}
 *         error={state.error}
 *         onRecheck={recheck}
 *       />
 *     )}
 *   </div>
 * );
 * ```
 */
export const BackendStatusBanner: React.FC<BackendStatusBannerProps> = ({
  status,
  error,
  onRecheck,
  backendUrl = 'http://localhost:3001',
}) => {
  const [isRetesting, setIsRetesting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  /**
   * Handler pour bouton "Retester"
   * Appelle onRecheck() avec loading state
   */
  const handleRetest = async () => {
    setIsRetesting(true);
    try {
      await onRecheck();
    } finally {
      setIsRetesting(false);
    }
  };

  /**
   * Handler pour bouton "Copier"
   * Copie la commande bash dans le clipboard
   */
  const handleCopyCommand = async () => {
    const command = 'cd packages/database-api && pnpm dev';

    try {
      await navigator.clipboard.writeText(command);
      setCopySuccess(true);

      // Reset après 2s
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Erreur copie clipboard:', err);
    }
  };

  // Ne rien afficher si backend online ou état inconnu
  if (status !== 'offline' && status !== 'checking') {
    return null;
  }

  // État checking (retest en cours)
  if (status === 'checking' || isRetesting) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🔄 Vérification backend...</div>
        </div>
      </div>
    );
  }

  // État offline (backend down)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>⚠️ Backend non disponible</div>
        <button onClick={handleRetest} style={styles.button} disabled={isRetesting}>
          {isRetesting ? 'Vérification...' : 'Retester'}
        </button>
      </div>

      <div style={styles.content}>
        <p style={styles.text}>Le serveur backend ne répond pas sur :</p>
        <code style={styles.url}>{backendUrl}</code>

        {error && <p style={styles.errorText}>Erreur : {error}</p>}

        <div style={styles.instructionsContainer}>
          <p style={styles.instructionsTitle}>Pour démarrer le backend :</p>
          <ol style={styles.instructionsList}>
            <li>Ouvrez un terminal</li>
            <li>Lancez la commande suivante :</li>
          </ol>

          <div style={styles.codeBlock}>
            <code style={styles.codeText}>cd packages/database-api && pnpm dev</code>
            <button
              onClick={handleCopyCommand}
              style={styles.copyButton}
              title="Copier la commande"
            >
              {copySuccess ? '✓ Copié' : '📋 Copier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Styles inline (cohérence avec CartaeItemDetail + accessibilité)
 *
 * Couleurs accessibles (WCAG AA) :
 * - Background: amber-100 (#FEF3C7)
 * - Border: amber-500 (#F59E0B)
 * - Text: amber-900 (#92400E) - Contraste 7.5:1 sur fond clair
 * - Button: amber-500 hover amber-600
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#FEF3C7',
    border: '2px solid #F59E0B',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'fadeIn 0.3s ease-in-out',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },

  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400E',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  button: {
    padding: '8px 16px',
    backgroundColor: '#F59E0B',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },

  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  text: {
    margin: 0,
    fontSize: '14px',
    color: '#92400E',
  },

  url: {
    backgroundColor: '#FDE68A',
    padding: '6px 10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#78350F',
    display: 'inline-block',
  },

  errorText: {
    margin: 0,
    fontSize: '13px',
    color: '#DC2626',
    fontStyle: 'italic',
  },

  instructionsContainer: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  instructionsTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400E',
  },

  instructionsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#92400E',
  },

  codeBlock: {
    backgroundColor: '#FDE68A',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#78350F',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },

  codeText: {
    flex: 1,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  copyButton: {
    padding: '6px 12px',
    backgroundColor: '#D97706',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s',
  },
};

/**
 * Animation CSS fade-in (apparition progressive)
 * Injectée globalement via style tag
 */
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleTag);
}
