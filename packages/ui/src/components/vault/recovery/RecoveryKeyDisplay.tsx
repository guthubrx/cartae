/**
 * RecoveryKeyDisplay - Affichage de la recovery key (UNE SEULE FOIS)
 * Session 78 - Phase 4
 *
 * Composant critique:
 * - Affiche recovery key générée pendant SetupWizard
 * - Force l'utilisateur à copier/sauvegarder
 * - Confirmation obligatoire avant de continuer
 * - Warning: "Cette clé ne sera JAMAIS ré-affichée"
 *
 * Usage:
 * import { RecoveryKeyDisplay } from '@cartae/ui/components/vault/recovery';
 */

import React, { useState } from 'react';

export interface RecoveryKeyDisplayProps {
  /** Recovery key à afficher (format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX) */
  recoveryKey: string;

  /** Callback quand l'utilisateur confirme avoir sauvegardé */
  onConfirm: () => void;

  /** Callback optionnel si l'utilisateur annule */
  onCancel?: () => void;
}

/**
 * RecoveryKeyDisplay - Affichage unique de la recovery key
 *
 * Flow:
 * 1. Affiche warning + recovery key
 * 2. Bouton "Copier" pour faciliter la sauvegarde
 * 3. Checkbox "J'ai sauvegardé cette clé en lieu sûr"
 * 4. Bouton "Confirmer" (disabled tant que checkbox pas cochée)
 */
export const RecoveryKeyDisplay: React.FC<RecoveryKeyDisplayProps> = ({
  recoveryKey,
  onConfirm,
  onCancel,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);

      // Reset copied state après 3 secondes
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy recovery key:', error);
      alert('Échec de la copie. Veuillez copier manuellement.');
    }
  };

  const handleConfirm = () => {
    if (!confirmed) {
      alert('Veuillez confirmer que vous avez sauvegardé la recovery key.');
      return;
    }

    onConfirm();
  };

  return (
    <div className="recovery-key-display">
      <div className="warning-banner">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <h3>Recovery Key - ATTENTION CRITIQUE</h3>
          <p>
            Cette clé ne sera <strong>JAMAIS</strong> ré-affichée après cette étape.
            <br />
            Si vous perdez votre master password ET cette recovery key, vos données seront{' '}
            <strong>définitivement inaccessibles</strong>.
          </p>
        </div>
      </div>

      <div className="key-container">
        <label className="key-label">Votre Recovery Key:</label>

        <div className="key-display">
          <code className="recovery-key">{recoveryKey}</code>

          <button onClick={handleCopy} className="btn-copy">
            {copied ? '✓ Copié !' : '📋 Copier'}
          </button>
        </div>

        <div className="key-info">
          <p>
            ✅ <strong>Recommandations de stockage:</strong>
          </p>
          <ul>
            <li>📝 Imprimez-la et stockez-la dans un coffre-fort physique</li>
            <li>💾 Sauvegardez-la dans un gestionnaire de mots de passe (1Password, Bitwarden)</li>
            <li>🔐 Stockez-la sur une clé USB chiffrée (LUKS, VeraCrypt)</li>
            <li>❌ NE PAS la stocker en texte clair sur votre ordinateur</li>
            <li>❌ NE PAS la partager par email ou chat</li>
          </ul>
        </div>
      </div>

      <div className="confirmation-container">
        <label className="confirmation-checkbox">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            J'ai sauvegardé cette recovery key en lieu sûr et je comprends qu'elle ne sera plus
            jamais affichée.
          </span>
        </label>
      </div>

      <div className="actions">
        {onCancel && (
          <button onClick={onCancel} className="btn-cancel">
            ← Annuler
          </button>
        )}

        <button onClick={handleConfirm} className="btn-confirm" disabled={!confirmed}>
          {confirmed ? '✓ Continuer' : '⚠️ Confirmez d\'abord'}
        </button>
      </div>

      <style>{`
        .recovery-key-display {
          max-width: 700px;
          margin: 0 auto;
          padding: 32px;
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          gap: 16px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
        }

        .warning-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .warning-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #92400e;
        }

        .warning-content p {
          margin: 0;
          font-size: 14px;
          color: #78350f;
          line-height: 1.6;
        }

        .warning-content strong {
          color: #dc2626;
          font-weight: 700;
        }

        /* Key Container */
        .key-container {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .key-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .key-display {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f9fafb;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .recovery-key {
          flex: 1;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          letter-spacing: 1px;
          user-select: all;
        }

        .btn-copy {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-copy:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-copy:active {
          transform: translateY(0);
        }

        /* Key Info */
        .key-info {
          font-size: 13px;
          color: #4b5563;
        }

        .key-info p {
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .key-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .key-info li {
          margin: 6px 0;
          line-height: 1.5;
        }

        /* Confirmation */
        .confirmation-container {
          background: #f0f9ff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .confirmation-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .confirmation-checkbox input[type="checkbox"] {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .confirmation-checkbox span {
          font-size: 14px;
          font-weight: 500;
          color: #1e40af;
          line-height: 1.5;
        }

        /* Actions */
        .actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-cancel,
        .btn-confirm {
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-confirm {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .btn-confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-confirm:disabled {
          background: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
