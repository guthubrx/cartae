/**
 * Wizard de configuration Vault
 * Session 78 - Phase 2
 */

import React, { useState } from 'react';
import {
  SetupWizardProps,
  SetupWizardState,
  SetupStep,
  SecurityLevel,
  VaultConfig,
} from '../types';
import { SecurityLevelSelector } from './SecurityLevelSelector';
import { PasswordGenerator } from './PasswordGenerator';

/**
 * SetupWizard - Wizard multi-étapes pour configurer Vault
 *
 * Flow du wizard:
 * 1. SECURITY_LEVEL: Choix du niveau de sécurité
 * 2. MASTER_PASSWORD: Création master password (PERSONAL uniquement)
 * 3. VAULT_INIT: Initialisation Vault (appel API)
 * 4. KEYS_DISPLAY: Affichage des unseal keys (WARNING critique)
 * 5. KEYS_CONFIRMATION: Confirmation sauvegarde
 * 6. FINALIZATION: Création token app
 * 7. SUCCESS: Finalisation
 */
export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const [state, setState] = useState<SetupWizardState>({
    currentStep: SetupStep.SECURITY_LEVEL,
    securityLevel: null,
    keysConfirmed: false,
  });

  const [masterPassword, setMasterPassword] = useState('');
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('');

  // Navigation entre étapes
  const goToStep = (step: SetupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const handleSecurityLevelSelect = (level: SecurityLevel) => {
    setState((prev) => ({ ...prev, securityLevel: level }));
  };

  const handleNext = () => {
    const { currentStep, securityLevel } = state;

    if (currentStep === SetupStep.SECURITY_LEVEL) {
      if (!securityLevel) return;

      // Si PERSONAL, aller à MASTER_PASSWORD
      // Sinon, aller directement à VAULT_INIT
      if (securityLevel === SecurityLevel.PERSONAL) {
        goToStep(SetupStep.MASTER_PASSWORD);
      } else {
        goToStep(SetupStep.VAULT_INIT);
      }
    } else if (currentStep === SetupStep.MASTER_PASSWORD) {
      if (masterPassword !== masterPasswordConfirm) {
        setState((prev) => ({
          ...prev,
          error: 'Les mots de passe ne correspondent pas',
        }));
        return;
      }

      if (masterPassword.length < 12) {
        setState((prev) => ({
          ...prev,
          error: 'Le mot de passe doit contenir au moins 12 caractères',
        }));
        return;
      }

      setState((prev) => ({ ...prev, error: undefined }));
      goToStep(SetupStep.VAULT_INIT);
    } else if (currentStep === SetupStep.VAULT_INIT) {
      // Simuler l'initialisation Vault (sera remplacé par API call)
      handleVaultInit();
    } else if (currentStep === SetupStep.KEYS_DISPLAY) {
      goToStep(SetupStep.KEYS_CONFIRMATION);
    } else if (currentStep === SetupStep.KEYS_CONFIRMATION) {
      if (!state.keysConfirmed) {
        setState((prev) => ({
          ...prev,
          error: 'Vous devez confirmer avoir sauvegardé les clés',
        }));
        return;
      }
      goToStep(SetupStep.FINALIZATION);
    } else if (currentStep === SetupStep.FINALIZATION) {
      handleFinalization();
    }
  };

  const handleBack = () => {
    const { currentStep, securityLevel } = state;

    if (currentStep === SetupStep.MASTER_PASSWORD) {
      goToStep(SetupStep.SECURITY_LEVEL);
    } else if (currentStep === SetupStep.VAULT_INIT) {
      if (securityLevel === SecurityLevel.PERSONAL) {
        goToStep(SetupStep.MASTER_PASSWORD);
      } else {
        goToStep(SetupStep.SECURITY_LEVEL);
      }
    } else if (currentStep === SetupStep.KEYS_DISPLAY) {
      goToStep(SetupStep.VAULT_INIT);
    } else if (currentStep === SetupStep.KEYS_CONFIRMATION) {
      goToStep(SetupStep.KEYS_DISPLAY);
    }
  };

  // Simuler initialisation Vault (Phase 5: sera remplacé par API call)
  const handleVaultInit = () => {
    // Générer des clés factices pour le moment
    const mockUnsealKeys = [
      'key1-aaaa-bbbb-cccc-dddd-eeee',
      'key2-ffff-gggg-hhhh-iiii-jjjj',
      'key3-kkkk-llll-mmmm-nnnn-oooo',
      'key4-pppp-qqqq-rrrr-ssss-tttt',
      'key5-uuuu-vvvv-wwww-xxxx-yyyy',
    ];

    const mockRootToken = 'hvs.mock-root-token-' + Date.now();

    const vaultConfig: VaultConfig = {
      securityLevel: state.securityLevel!,
      vaultAddr: 'http://localhost:8200',
      appToken: '', // Sera généré à l'étape FINALIZATION
      unsealKeys: mockUnsealKeys,
      rootToken: mockRootToken,
      masterPasswordHash:
        state.securityLevel === SecurityLevel.PERSONAL
          ? btoa(masterPassword) // Mock hash (sera remplacé par PBKDF2)
          : undefined,
      createdAt: new Date().toISOString(),
      initialized: true,
      sealed: false,
    };

    setState((prev) => ({
      ...prev,
      vaultConfig,
    }));

    goToStep(SetupStep.KEYS_DISPLAY);
  };

  // Finalisation: créer token app et compléter
  const handleFinalization = () => {
    const mockAppToken = 'hvs.mock-app-token-' + Date.now();

    const finalConfig: VaultConfig = {
      ...state.vaultConfig!,
      appToken: mockAppToken,
    };

    setState((prev) => ({
      ...prev,
      vaultConfig: finalConfig,
    }));

    goToStep(SetupStep.SUCCESS);
  };

  const handleComplete = () => {
    if (state.vaultConfig) {
      onComplete(state.vaultConfig);
    }
  };

  // Rendu des étapes
  const renderStep = () => {
    const { currentStep, securityLevel, vaultConfig, error } = state;

    switch (currentStep) {
      case SetupStep.SECURITY_LEVEL:
        return (
          <div className="wizard-step">
            <SecurityLevelSelector
              value={securityLevel}
              onChange={handleSecurityLevelSelect}
            />
          </div>
        );

      case SetupStep.MASTER_PASSWORD:
        return (
          <div className="wizard-step">
            <h2>🔑 Créez votre Master Password</h2>
            <p className="step-description">
              Ce mot de passe protégera vos clés Vault. Ne le perdez jamais !
            </p>

            <div className="password-section">
              <label>Master Password</label>
              <PasswordGenerator
                value={masterPassword}
                onChange={setMasterPassword}
                minLength={12}
                showStrength={true}
              />
            </div>

            <div className="password-section">
              <label>Confirmez le Master Password</label>
              <input
                type="password"
                value={masterPasswordConfirm}
                onChange={(e) => setMasterPasswordConfirm(e.target.value)}
                placeholder="Retapez le mot de passe..."
                className="password-confirm-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        );

      case SetupStep.VAULT_INIT:
        return (
          <div className="wizard-step">
            <h2>⚙️ Initialisation de Vault</h2>
            <p className="step-description">
              Vault va générer 5 clés d'unseal. Vous aurez besoin de 3 clés sur 5 pour
              déverrouiller Vault après chaque redémarrage.
            </p>

            <div className="info-box">
              <strong>📋 Niveau sélectionné:</strong> {securityLevel}
              {securityLevel === SecurityLevel.PERSONAL && (
                <div>
                  <strong>🔐 Master Password:</strong> Configuré ✅
                </div>
              )}
            </div>

            <button onClick={handleNext} className="btn-primary">
              Initialiser Vault
            </button>
          </div>
        );

      case SetupStep.KEYS_DISPLAY:
        return (
          <div className="wizard-step">
            <h2>⚠️ ATTENTION: Sauvegardez ces clés</h2>
            <p className="step-description critical">
              Ces clés seront affichées <strong>UNE SEULE FOIS</strong>. Sans elles, vous
              ne pourrez PAS déverrouiller Vault !
            </p>

            <div className="keys-display">
              <h3>🔑 Unseal Keys (Shamir 5/3)</h3>
              <div className="keys-list">
                {vaultConfig?.unsealKeys.map((key, idx) => (
                  <div key={idx} className="key-item">
                    <span className="key-number">Clé {idx + 1}:</span>
                    <code className="key-value">{key}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(key)}
                      className="btn-copy"
                    >
                      📋
                    </button>
                  </div>
                ))}
              </div>

              <h3>🔐 Root Token</h3>
              <div className="key-item">
                <code className="key-value">{vaultConfig?.rootToken}</code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(vaultConfig?.rootToken || '')
                  }
                  className="btn-copy"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="warning-box">
              ⚠️ Copiez ces clés dans un coffre-fort sécurisé (1Password, Bitwarden,
              etc.)
              <br />
              ⚠️ Ne les stockez JAMAIS en clair sur votre ordinateur
              <br />⚠️ Sans ces clés, vos données seront PERDUES
            </div>
          </div>
        );

      case SetupStep.KEYS_CONFIRMATION:
        return (
          <div className="wizard-step">
            <h2>✅ Confirmez la sauvegarde</h2>
            <p className="step-description">
              Avant de continuer, confirmez que vous avez bien sauvegardé toutes les clés.
            </p>

            <div className="confirmation-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state.keysConfirmed}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, keysConfirmed: e.target.checked }))
                  }
                />
                <span>
                  J'ai sauvegardé les 5 unseal keys et le root token dans un lieu sûr
                </span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        );

      case SetupStep.FINALIZATION:
        return (
          <div className="wizard-step">
            <h2>🎯 Finalisation</h2>
            <p className="step-description">
              Création du token d'application avec policy cartae-app...
            </p>

            <div className="spinner">⏳ Finalisation en cours...</div>
          </div>
        );

      case SetupStep.SUCCESS:
        return (
          <div className="wizard-step success-step">
            <h2>🎉 Configuration terminée !</h2>
            <p className="step-description">
              Vault est maintenant configuré et prêt à l'emploi.
            </p>

            <div className="success-box">
              <div>✅ Niveau de sécurité: {securityLevel}</div>
              <div>✅ Vault initialisé et unseal</div>
              <div>✅ Token application créé</div>
              <div>✅ Policies ACL chargées</div>
            </div>

            <button onClick={handleComplete} className="btn-success">
              Terminer la configuration
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Progress bar
  const steps = Object.values(SetupStep);
  const currentStepIndex = steps.indexOf(state.currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="setup-wizard">
      {/* Progress bar */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          Étape {currentStepIndex + 1} / {steps.length}
        </div>
      </div>

      {/* Step content */}
      <div className="wizard-content">{renderStep()}</div>

      {/* Navigation buttons */}
      {state.currentStep !== SetupStep.SUCCESS &&
        state.currentStep !== SetupStep.FINALIZATION && (
          <div className="wizard-actions">
            {state.currentStep !== SetupStep.SECURITY_LEVEL && (
              <button onClick={handleBack} className="btn-secondary">
                ← Retour
              </button>
            )}

            {onCancel && (
              <button onClick={onCancel} className="btn-cancel">
                Annuler
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary"
              disabled={
                (state.currentStep === SetupStep.SECURITY_LEVEL &&
                  !state.securityLevel) ||
                (state.currentStep === SetupStep.KEYS_CONFIRMATION &&
                  !state.keysConfirmed)
              }
            >
              Suivant →
            </button>
          </div>
        )}

      <style>{`
        .setup-wizard {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }

        .wizard-progress {
          margin-bottom: 32px;
        }

        .progress-bar {
          height: 8px;
          background: var(--progress-bg, #e5e7eb);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.3s ease;
        }

        .progress-text {
          text-align: center;
          font-size: 13px;
          color: var(--text-muted, #6b7280);
        }

        .wizard-step {
          min-height: 400px;
        }

        .wizard-step h2 {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .step-description {
          font-size: 14px;
          color: var(--text-muted, #6b7280);
          margin-bottom: 24px;
        }

        .step-description.critical {
          color: var(--danger-color, #dc3545);
          font-weight: 600;
        }

        .password-section {
          margin-bottom: 24px;
        }

        .password-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .password-confirm-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
        }

        .info-box {
          padding: 16px;
          background: var(--info-bg, #e0f2fe);
          border-left: 4px solid var(--info-color, #0ea5e9);
          border-radius: 4px;
          margin-bottom: 24px;
        }

        .keys-display {
          margin-bottom: 24px;
        }

        .keys-list {
          margin-bottom: 24px;
        }

        .key-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--key-bg, #f8f9fa);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .key-number {
          font-weight: 600;
          min-width: 60px;
        }

        .key-value {
          flex: 1;
          font-family: monospace;
          font-size: 13px;
          padding: 4px 8px;
          background: var(--code-bg, #fff);
          border-radius: 3px;
        }

        .btn-copy {
          padding: 6px 12px;
          border: none;
          background: var(--button-bg, #f3f4f6);
          border-radius: 4px;
          cursor: pointer;
        }

        .warning-box {
          padding: 16px;
          background: var(--warning-bg, #fef3c7);
          border-left: 4px solid var(--warning-color, #f59e0b);
          border-radius: 4px;
          font-size: 13px;
          line-height: 1.6;
        }

        .confirmation-box {
          padding: 20px;
          background: var(--card-bg, #fff);
          border: 2px solid var(--border-color, #ddd);
          border-radius: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-label input[type='checkbox'] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .success-step {
          text-align: center;
        }

        .success-box {
          padding: 24px;
          background: var(--success-bg, #d1fae5);
          border-left: 4px solid var(--success-color, #10b981);
          border-radius: 8px;
          margin-bottom: 24px;
          text-align: left;
        }

        .success-box > div {
          font-size: 14px;
          margin-bottom: 8px;
        }

        .spinner {
          text-align: center;
          font-size: 18px;
          padding: 40px;
        }

        .error-message {
          padding: 12px;
          background: var(--error-bg, #fee2e2);
          border-left: 4px solid var(--error-color, #dc3545);
          border-radius: 4px;
          color: var(--error-text, #991b1b);
          margin-top: 16px;
        }

        .wizard-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .btn-primary,
        .btn-secondary,
        .btn-cancel,
        .btn-success {
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--secondary-bg, #f3f4f6);
          color: var(--text-color, #374151);
        }

        .btn-secondary:hover {
          background: var(--secondary-hover, #e5e7eb);
        }

        .btn-cancel {
          background: transparent;
          color: var(--text-muted, #6b7280);
          border: 1px solid var(--border-color, #ddd);
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 16px;
          padding: 14px 32px;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
};
