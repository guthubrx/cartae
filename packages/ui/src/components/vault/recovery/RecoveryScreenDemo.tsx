/**
 * Page de démo pour RecoveryScreen
 * Session 78 - Phase 4
 *
 * Usage:
 * import { RecoveryScreenDemo } from '@cartae/ui/components/vault/recovery/RecoveryScreenDemo';
 */

import React, { useState } from 'react';
import { RecoveryScreen } from './RecoveryScreen';
import { RecoveryKeyDisplay } from './RecoveryKeyDisplay';
import { SecurityLevel, VaultConfig } from '../types';

/**
 * Demo du recovery screen avec 2 flows
 */
export const RecoveryScreenDemo: React.FC = () => {
  const [currentView, setCurrentView] = useState<'menu' | 'recovery-key-display' | 'recovery-screen'>('menu');
  const [recovered, setRecovered] = useState(false);

  // Mock config Vault PERSONAL avec recovery data
  const mockVaultConfig: VaultConfig = {
    securityLevel: SecurityLevel.PERSONAL,
    vaultAddr: 'http://localhost:8200',
    appToken: 'hvs.personal-token-xxx',
    unsealKeys: [
      'key1-aaaa-bbbb-cccc-dddd-eeee',
      'key2-ffff-gggg-hhhh-iiii-jjjj',
      'key3-kkkk-llll-mmmm-nnnn-oooo',
    ],
    masterPasswordHash: 'mock-hash-xxx',
    // Recovery key: ABCD-EFGH-IJKL-MNOP-QRST-UVWX
    encryptedRecoveryKey: 'mock-encrypted-recovery-key',
    encryptedUnsealKeys: 'mock-encrypted-unseal-keys',
    createdAt: new Date().toISOString(),
    initialized: true,
    sealed: true,
  };

  const mockRecoveryKey = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX';

  const handleRecoverySuccess = (unsealKeys: string[]) => {
    console.log('🎉 Recovery successful! Unseal keys:', unsealKeys);
    setRecovered(true);
  };

  const handleRecoveryKeyConfirm = () => {
    console.log('✅ Recovery key saved by user');
    setCurrentView('menu');
  };

  const handleReset = () => {
    setRecovered(false);
    setCurrentView('menu');
  };

  // Success screen
  if (recovered) {
    return (
      <div className="recovery-demo">
        <div className="success-screen">
          <div className="success-icon">🎉</div>
          <h1>Recovery Réussie !</h1>
          <p>Vous avez récupéré l'accès au Vault</p>

          <div className="success-actions">
            <button onClick={handleReset} className="btn-reset">
              🔄 Recommencer
            </button>

            <button onClick={() => console.log('Navigate to change password')} className="btn-continue">
              🔑 Changer Master Password
            </button>
          </div>
        </div>

        <style>{successStyles}</style>
      </div>
    );
  }

  // Menu de sélection
  if (currentView === 'menu') {
    return (
      <div className="recovery-demo">
        <div className="demo-menu">
          <h2>🔑 Recovery System Demo</h2>
          <p>Sélectionnez un scénario à tester:</p>

          <div className="demo-buttons">
            <button
              onClick={() => setCurrentView('recovery-key-display')}
              className="demo-btn"
            >
              📄 RecoveryKeyDisplay
              <span className="demo-hint">Affichage unique de la recovery key (pendant setup)</span>
            </button>

            <button
              onClick={() => setCurrentView('recovery-screen')}
              className="demo-btn"
            >
              🔓 RecoveryScreen
              <span className="demo-hint">Recovery avec recovery key (password oublié)</span>
            </button>
          </div>

          <div className="demo-info">
            <h3>ℹ️ Informations de Test</h3>
            <ul>
              <li><strong>Recovery Key:</strong> ABCD-EFGH-IJKL-MNOP-QRST-UVWX</li>
              <li><strong>Master Password:</strong> test-password-123</li>
              <li><strong>Note:</strong> Cette démo utilise des données mockées</li>
            </ul>
          </div>
        </div>

        <style>{menuStyles}</style>
      </div>
    );
  }

  // RecoveryKeyDisplay demo
  if (currentView === 'recovery-key-display') {
    return (
      <>
        <RecoveryKeyDisplay
          recoveryKey={mockRecoveryKey}
          onConfirm={handleRecoveryKeyConfirm}
          onCancel={() => setCurrentView('menu')}
        />
      </>
    );
  }

  // RecoveryScreen demo
  if (currentView === 'recovery-screen') {
    return (
      <>
        <RecoveryScreen
          vaultConfig={mockVaultConfig}
          onRecoverySuccess={handleRecoverySuccess}
          onCancel={() => setCurrentView('menu')}
        />
      </>
    );
  }

  return null;
};

const menuStyles = `
  .recovery-demo {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .demo-menu {
    max-width: 600px;
    width: 100%;
    background: white;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .demo-menu h2 {
    font-size: 28px;
    margin: 0 0 8px 0;
    text-align: center;
  }

  .demo-menu > p {
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 32px 0;
  }

  .demo-buttons {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;
  }

  .demo-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
    font-size: 16px;
    font-weight: 600;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .demo-btn:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.2);
  }

  .demo-hint {
    font-size: 13px;
    font-weight: 400;
    color: #6b7280;
    margin-top: 6px;
  }

  .demo-info {
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 8px;
    padding: 20px;
  }

  .demo-info h3 {
    font-size: 14px;
    margin: 0 0 12px 0;
    color: #1e40af;
  }

  .demo-info ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    color: #1e3a8a;
  }

  .demo-info li {
    margin: 6px 0;
    line-height: 1.5;
  }

  .demo-info strong {
    font-weight: 600;
  }
`;

const successStyles = `
  .recovery-demo {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .success-screen {
    max-width: 500px;
    width: 100%;
    background: white;
    border-radius: 16px;
    padding: 60px 40px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .success-icon {
    font-size: 80px;
    margin-bottom: 24px;
  }

  .success-screen h1 {
    font-size: 32px;
    margin-bottom: 12px;
    color: #10b981;
  }

  .success-screen p {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 32px;
  }

  .success-actions {
    display: flex;
    gap: 12px;
  }

  .btn-reset,
  .btn-continue {
    flex: 1;
    padding: 14px 24px;
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-reset {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-reset:hover {
    background: #e5e7eb;
  }

  .btn-continue {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  .btn-continue:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
`;
