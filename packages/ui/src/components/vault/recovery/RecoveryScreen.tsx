/**
 * RecoveryScreen - Interface de recovery Vault
 * Session 78 - Phase 4
 *
 * Scénario: Utilisateur a oublié son master password
 * Solution: Utiliser la recovery key pour récupérer accès
 *
 * Flow:
 * 1. Affiche formulaire recovery key
 * 2. Valide recovery key
 * 3. Déchiffre unseal keys avec RecoveryManager
 * 4. Unseal Vault automatiquement
 * 5. Propose de changer master password
 *
 * Usage:
 * import { RecoveryScreen } from '@cartae/ui/components/vault/recovery';
 */

import React, { useState } from 'react';
import { RecoveryManager, RecoveryResult } from '@cartae/core/crypto/RecoveryManager';
import { VaultConfig } from '../types';

export interface RecoveryScreenProps {
  /** Configuration Vault actuelle */
  vaultConfig: VaultConfig;

  /** Callback quand recovery réussie */
  onRecoverySuccess: (unsealKeys: string[]) => void;

  /** Callback pour annuler et retourner à unlock screen */
  onCancel: () => void;
}

/**
 * RecoveryScreen - Interface de récupération Vault
 *
 * Mode PERSONAL uniquement:
 * - Demande recovery key
 * - Demande master password (pour déchiffrer recovery key)
 * - Récupère unseal keys
 * - Unseal Vault automatiquement
 */
export const RecoveryScreen: React.FC<RecoveryScreenProps> = ({
  vaultConfig,
  onRecoverySuccess,
  onCancel,
}) => {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recoveryManager = new RecoveryManager();

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Vérifier que recovery data existe
      if (!vaultConfig.encryptedRecoveryKey || !vaultConfig.encryptedUnsealKeys) {
        setError('Configuration de recovery manquante. Mode recovery non disponible.');
        setLoading(false);
        return;
      }

      // Valider format recovery key (XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)
      const recoveryKeyFormatted = recoveryKey.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(recoveryKeyFormatted)) {
        setError('Format de recovery key invalide. Format attendu: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX');
        setLoading(false);
        return;
      }

      // Récupérer unseal keys avec recovery key
      const result: RecoveryResult = await recoveryManager.recoverWithRecoveryKey(
        vaultConfig.encryptedRecoveryKey,
        vaultConfig.encryptedUnsealKeys,
        recoveryKeyFormatted,
        masterPassword
      );

      if (!result.success) {
        setError(result.error || 'Recovery échouée. Vérifiez recovery key et master password.');
        setLoading(false);
        return;
      }

      // Recovery réussie !
      console.log('✅ Recovery successful, unseal keys retrieved');
      onRecoverySuccess(result.unsealKeys);
    } catch (err) {
      console.error('Recovery error:', err);
      setError('Erreur lors de la recovery. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="recovery-screen">
      <div className="recovery-container">
        <div className="recovery-header">
          <div className="icon">🔑</div>
          <h1>Recovery Vault</h1>
          <p>Utilisez votre recovery key pour récupérer l'accès au Vault</p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        <form onSubmit={handleRecover} className="recovery-form">
          {/* Recovery Key Input */}
          <div className="form-group">
            <label htmlFor="recovery-key">Recovery Key</label>
            <input
              id="recovery-key"
              type="text"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              className="recovery-key-input"
              autoComplete="off"
              autoFocus
              required
            />
            <p className="input-hint">
              Format: 6 segments de 4 caractères séparés par des tirets
            </p>
          </div>

          {/* Master Password Input */}
          <div className="form-group">
            <label htmlFor="master-password">Master Password</label>
            <input
              id="master-password"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Votre master password"
              className="password-input"
              autoComplete="off"
              required
            />
            <p className="input-hint">
              Requis pour déchiffrer la recovery key stockée
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>
              ← Annuler
            </button>

            <button type="submit" className="btn-recover" disabled={loading || !recoveryKey || !masterPassword}>
              {loading ? '⏳ Recovery en cours...' : '🔓 Récupérer Accès'}
            </button>
          </div>
        </form>

        <div className="recovery-info">
          <h3>ℹ️ À propos de la Recovery</h3>
          <ul>
            <li>La recovery key a été générée lors de la configuration initiale</li>
            <li>Elle vous permet de récupérer l'accès si vous oubliez votre master password</li>
            <li>Après recovery réussie, vous pourrez changer votre master password</li>
            <li>Conservez toujours votre recovery key en lieu sûr (coffre-fort, gestionnaire de mots de passe)</li>
          </ul>
        </div>

        <div className="recovery-warning">
          <span className="warning-icon">⚠️</span>
          <p>
            <strong>Attention:</strong> Si vous perdez à la fois votre master password ET votre recovery key,
            vos données seront définitivement inaccessibles. Aucune backdoor n'existe (by design).
          </p>
        </div>
      </div>

      <style>{`
        .recovery-screen {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .recovery-container {
          max-width: 600px;
          width: 100%;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        /* Header */
        .recovery-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .recovery-header .icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .recovery-header h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .recovery-header p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        /* Error Banner */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fee2e2;
          border: 2px solid #ef4444;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
        }

        .error-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .error-text {
          font-size: 14px;
          color: #991b1b;
          font-weight: 500;
        }

        /* Form */
        .recovery-form {
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .recovery-key-input,
        .password-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 15px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .recovery-key-input {
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .recovery-key-input:focus,
        .password-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-hint {
          font-size: 12px;
          color: #6b7280;
          margin: 6px 0 0 0;
          font-style: italic;
        }

        /* Actions */
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }

        .btn-cancel,
        .btn-recover {
          flex: 1;
          padding: 14px 24px;
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

        .btn-cancel:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-recover {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .btn-recover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-cancel:disabled,
        .btn-recover:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Info */
        .recovery-info {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }

        .recovery-info h3 {
          font-size: 14px;
          margin: 0 0 12px 0;
          color: #1e40af;
        }

        .recovery-info ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #1e3a8a;
        }

        .recovery-info li {
          margin: 6px 0;
          line-height: 1.5;
        }

        /* Warning */
        .recovery-warning {
          display: flex;
          gap: 12px;
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
        }

        .warning-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .recovery-warning p {
          font-size: 13px;
          color: #78350f;
          margin: 0;
          line-height: 1.5;
        }

        .recovery-warning strong {
          color: #dc2626;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
