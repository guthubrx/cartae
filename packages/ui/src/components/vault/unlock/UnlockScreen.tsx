/**
 * Écran de déverrouillage Vault
 * Session 78 - Phase 3
 */

import React, { useState, useEffect } from 'react';
import {
  UnlockScreenProps,
  UnlockState,
  SecurityLevel,
  VaultStatus,
} from '../types';
import { UnsealProgress } from './UnsealProgress';
import { UnsealKeyInput } from './UnsealKeyInput';
import { MasterPasswordInput } from './MasterPasswordInput';

/**
 * UnlockScreen - Écran principal de déverrouillage Vault
 *
 * Flow:
 * 1. DEVELOPMENT: Auto-unlock (pas d'interaction utilisateur)
 * 2. PERSONAL: Master password → déchiffre keys → unseal
 * 3. ENTERPRISE: Saisie manuelle de 3 clés sur 5 → unseal
 *
 * Features:
 * - Progression visuelle (0/3, 1/3, 2/3, 3/3)
 * - Support master password (mode PERSONAL)
 * - Validation format clés (base64)
 * - Gestion erreurs (mauvaise clé, timeout, etc.)
 * - Auto-focus premier champ
 */
export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  vaultConfig,
  onUnlockSuccess,
  onCancel,
}) => {
  const [state, setState] = useState<UnlockState>({
    sealed: true,
    progress: 0,
    threshold: 3, // Shamir 3/5 par défaut
    keysEntered: [],
    loading: false,
  });

  const [currentKeyInput, setCurrentKeyInput] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  // Vérifier status Vault au montage
  useEffect(() => {
    checkVaultStatus();
  }, []);

  // Vérifier status Vault (API call - sera implémenté Phase 5)
  const checkVaultStatus = async () => {
    // Mock pour l'instant - Phase 5: API call réel
    const mockStatus: VaultStatus = {
      sealed: true,
      t: 5, // Total keys
      n: 3, // Threshold
      progress: 0,
      version: '1.17.0',
      initialized: true,
    };

    setState((prev) => ({
      ...prev,
      sealed: mockStatus.sealed,
      threshold: mockStatus.n,
      progress: mockStatus.progress,
    }));
  };

  // Unseal Vault avec une clé (API call - sera implémenté Phase 5)
  const unsealVaultWithKey = async (key: string) => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      // Mock pour l'instant - Phase 5: API call réel
      // const response = await fetch(`${vaultConfig.vaultAddr}/v1/sys/unseal`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ key }),
      // });

      // Simuler unseal
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newProgress = state.progress + 1;
      const isUnsealed = newProgress >= state.threshold;

      setState((prev) => ({
        ...prev,
        progress: newProgress,
        keysEntered: [...prev.keysEntered, key],
        sealed: !isUnsealed,
        loading: false,
      }));

      // Si unseal complet, notifier succès
      if (isUnsealed) {
        setTimeout(() => {
          onUnlockSuccess();
        }, 1000); // Delay pour afficher animation succès
      } else {
        // Reset input pour clé suivante
        setCurrentKeyInput('');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Erreur lors de l\'unseal. Vérifiez la clé et réessayez.',
      }));
    }
  };

  // Déchiffrer keys avec master password (mode PERSONAL)
  const decryptKeysWithMasterPassword = async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      // Mock pour l'instant - Phase 4: Encryptor réel
      // const encryptor = new Encryptor();
      // const decryptedKeys = await encryptor.decrypt(
      //   vaultConfig.encryptedRecoveryKey,
      //   masterPassword
      // );

      // Simuler déchiffrement
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Si master password valide, auto-unseal avec clés déchiffrées
      // Pour l'instant, on simule avec les clés du config
      const keys = vaultConfig.unsealKeys.slice(0, state.threshold);

      for (const key of keys) {
        await unsealVaultWithKey(key);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Master password incorrect. Vérifiez et réessayez.',
      }));
    }
  };

  const handleSubmitKey = () => {
    if (!currentKeyInput.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Veuillez saisir une clé d\'unseal.',
      }));
      return;
    }

    // Validation format base64 basique
    if (!/^[A-Za-z0-9+/]+=*$/.test(currentKeyInput)) {
      setState((prev) => ({
        ...prev,
        error: 'Format de clé invalide. Attendu: base64.',
      }));
      return;
    }

    unsealVaultWithKey(currentKeyInput);
  };

  const handleSubmitMasterPassword = () => {
    if (!masterPassword.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Veuillez saisir votre master password.',
      }));
      return;
    }

    decryptKeysWithMasterPassword();
  };

  // Rendu selon security level
  const renderUnlockMethod = () => {
    switch (vaultConfig.securityLevel) {
      case SecurityLevel.DEVELOPMENT:
        return (
          <div className="auto-unlock-notice">
            <h3>🛠️ Mode Développement</h3>
            <p>
              Vault est configuré en mode développement avec auto-unlock.
              Aucune action requise.
            </p>
            <div className="spinner">⏳ Déverrouillage automatique...</div>
          </div>
        );

      case SecurityLevel.PERSONAL:
        return (
          <>
            <h2>🏠 Mode Personnel - Déverrouillage</h2>
            <p className="unlock-description">
              Saisissez votre master password pour déchiffrer automatiquement
              vos clés d'unseal.
            </p>

            <MasterPasswordInput
              value={masterPassword}
              onChange={setMasterPassword}
              disabled={state.loading}
              autoFocus={true}
              onSubmit={handleSubmitMasterPassword}
            />

            <button
              onClick={handleSubmitMasterPassword}
              disabled={state.loading || !masterPassword}
              className="btn-unlock"
            >
              {state.loading ? '⏳ Déverrouillage...' : '🔓 Déverrouiller Vault'}
            </button>
          </>
        );

      case SecurityLevel.ENTERPRISE:
      default:
        return (
          <>
            <h2>🏢 Mode Entreprise - Déverrouillage</h2>
            <p className="unlock-description">
              Saisissez {state.threshold} clés d'unseal (sur {state.threshold + 2}) pour
              déverrouiller Vault.
            </p>

            <UnsealKeyInput
              label={`Clé ${state.progress + 1}/${state.threshold}`}
              value={currentKeyInput}
              onChange={setCurrentKeyInput}
              disabled={state.loading || state.progress >= state.threshold}
              autoFocus={true}
              placeholder="Collez la clé d'unseal ici..."
            />

            <button
              onClick={handleSubmitKey}
              disabled={state.loading || !currentKeyInput || state.progress >= state.threshold}
              className="btn-submit-key"
            >
              {state.loading ? '⏳ Validation...' : `➜ Soumettre Clé ${state.progress + 1}`}
            </button>
          </>
        );
    }
  };

  return (
    <div className="unlock-screen">
      <div className="unlock-container">
        {/* Header */}
        <div className="unlock-header">
          <div className="vault-icon">🔐</div>
          <h1>Déverrouillage Vault</h1>
          <p className="vault-addr">{vaultConfig.vaultAddr}</p>
        </div>

        {/* Progress */}
        {vaultConfig.securityLevel !== SecurityLevel.DEVELOPMENT && (
          <UnsealProgress
            current={state.progress}
            total={state.threshold}
            showLabels={true}
          />
        )}

        {/* Error message */}
        {state.error && (
          <div className="error-message">
            ⚠️ {state.error}
          </div>
        )}

        {/* Unlock method (depends on security level) */}
        <div className="unlock-method">
          {renderUnlockMethod()}
        </div>

        {/* Actions */}
        <div className="unlock-actions">
          {onCancel && (
            <button onClick={onCancel} className="btn-cancel" disabled={state.loading}>
              Annuler
            </button>
          )}

          {vaultConfig.securityLevel === SecurityLevel.PERSONAL && (
            <button
              onClick={() => {
                /* Phase 4: Ouvrir RecoveryScreen */
              }}
              className="btn-recovery"
              disabled={state.loading}
            >
              🆘 Recovery
            </button>
          )}
        </div>
      </div>

      <style>{`
        .unlock-screen {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .unlock-container {
          max-width: 600px;
          width: 100%;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .unlock-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .vault-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .unlock-header h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          color: var(--text-color, #1f2937);
        }

        .vault-addr {
          font-size: 13px;
          color: var(--text-muted, #6b7280);
          font-family: monospace;
        }

        .unlock-description {
          font-size: 14px;
          color: var(--text-muted, #6b7280);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .unlock-method h2 {
          font-size: 20px;
          margin-bottom: 12px;
          color: var(--text-color, #1f2937);
        }

        .auto-unlock-notice {
          text-align: center;
          padding: 40px 20px;
        }

        .auto-unlock-notice h3 {
          font-size: 24px;
          margin-bottom: 12px;
        }

        .auto-unlock-notice p {
          font-size: 14px;
          color: var(--text-muted, #6b7280);
          margin-bottom: 24px;
        }

        .spinner {
          font-size: 18px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          padding: 12px 16px;
          background: var(--error-bg, #fee2e2);
          border-left: 4px solid var(--error-color, #ef4444);
          border-radius: 6px;
          color: var(--error-text, #991b1b);
          font-size: 13px;
          margin-bottom: 20px;
        }

        .btn-unlock,
        .btn-submit-key {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-unlock:hover:not(:disabled),
        .btn-submit-key:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-unlock:disabled,
        .btn-submit-key:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .unlock-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .btn-cancel,
        .btn-recovery {
          flex: 1;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 6px;
          background: white;
          color: var(--text-color, #374151);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover:not(:disabled),
        .btn-recovery:hover:not(:disabled) {
          background: var(--button-hover-bg, #f3f4f6);
        }

        .btn-cancel:disabled,
        .btn-recovery:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
