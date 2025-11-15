/**
 * Page de démo pour SetupWizard
 * Session 78 - Phase 2
 *
 * Usage:
 * import { SetupWizardDemo } from '@cartae/ui/components/vault/setup/SetupWizardDemo';
 */

import React, { useState } from 'react';
import { SetupWizard } from './SetupWizard';
import { VaultConfig } from '../types';

/**
 * Demo du wizard de configuration Vault
 */
export const SetupWizardDemo: React.FC = () => {
  const [completed, setCompleted] = useState(false);
  const [config, setConfig] = useState<VaultConfig | null>(null);

  const handleComplete = (vaultConfig: VaultConfig) => {
    console.log('🎉 Configuration Vault terminée:', vaultConfig);
    setConfig(vaultConfig);
    setCompleted(true);
  };

  const handleReset = () => {
    setCompleted(false);
    setConfig(null);
  };

  if (completed && config) {
    return (
      <div className="setup-demo">
        <div className="completion-screen">
          <h1>✅ Configuration Vault Complétée !</h1>

          <div className="config-summary">
            <h2>📋 Résumé de la configuration</h2>

            <div className="config-item">
              <strong>Niveau de sécurité:</strong> {config.securityLevel}
            </div>

            <div className="config-item">
              <strong>Adresse Vault:</strong> {config.vaultAddr}
            </div>

            <div className="config-item">
              <strong>Initialisé:</strong> {config.initialized ? '✅ Oui' : '❌ Non'}
            </div>

            <div className="config-item">
              <strong>Sealed:</strong> {config.sealed ? '🔒 Oui' : '🔓 Non'}
            </div>

            <div className="config-item">
              <strong>Créé le:</strong> {new Date(config.createdAt).toLocaleString()}
            </div>

            <div className="config-item">
              <strong>Nombre de clés unseal:</strong> {config.unsealKeys.length}
            </div>

            <div className="config-item">
              <strong>App Token:</strong>
              <code>{config.appToken.substring(0, 20)}...</code>
            </div>

            {config.masterPasswordHash && (
              <div className="config-item">
                <strong>Master Password Hash:</strong>
                <code>{config.masterPasswordHash.substring(0, 20)}...</code>
              </div>
            )}
          </div>

          <div className="config-actions">
            <button onClick={handleReset} className="btn-reset">
              🔄 Recommencer
            </button>

            <button
              onClick={() => console.log(config)}
              className="btn-console"
            >
              📋 Voir config complète (console)
            </button>
          </div>
        </div>

        <style>{`
          .setup-demo {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
          }

          .completion-screen {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .completion-screen h1 {
            font-size: 32px;
            text-align: center;
            margin-bottom: 32px;
            color: #10b981;
          }

          .config-summary {
            margin-bottom: 32px;
          }

          .config-summary h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #1f2937;
          }

          .config-item {
            padding: 12px;
            background: #f9fafb;
            border-left: 3px solid #3b82f6;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 14px;
          }

          .config-item strong {
            display: inline-block;
            min-width: 200px;
            color: #4b5563;
          }

          .config-item code {
            font-family: monospace;
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
          }

          .config-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
          }

          .btn-reset,
          .btn-console {
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-reset {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
          }

          .btn-reset:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }

          .btn-console {
            background: #f3f4f6;
            color: #374151;
          }

          .btn-console:hover {
            background: #e5e7eb;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="setup-demo">
      <div className="demo-container">
        <div className="demo-header">
          <h1>🔐 Cartae Vault Setup</h1>
          <p>Configuration sécurisée de HashiCorp Vault</p>
        </div>

        <SetupWizard
          onComplete={handleComplete}
          onCancel={() => console.log('Setup annulé')}
        />
      </div>

      <style>{`
        .setup-demo {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }

        .demo-container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .demo-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .demo-header h1 {
          font-size: 36px;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .demo-header p {
          font-size: 16px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};
