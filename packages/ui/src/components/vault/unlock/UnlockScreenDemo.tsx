/**
 * Page de démo pour UnlockScreen
 * Session 78 - Phase 3
 *
 * Usage:
 * import { UnlockScreenDemo } from '@cartae/ui/components/vault/unlock/UnlockScreenDemo';
 */

import React, { useState } from 'react';
import { UnlockScreen } from './UnlockScreen';
import { SecurityLevel, VaultConfig } from '../types';

/**
 * Demo du unlock screen avec 3 modes
 */
export const UnlockScreenDemo: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<SecurityLevel>(SecurityLevel.ENTERPRISE);
  const [unlocked, setUnlocked] = useState(false);

  // Mock config Vault pour chaque mode
  const mockConfigs: Record<SecurityLevel, VaultConfig> = {
    [SecurityLevel.DEVELOPMENT]: {
      securityLevel: SecurityLevel.DEVELOPMENT,
      vaultAddr: 'http://localhost:8200',
      appToken: 'dev-only-token',
      unsealKeys: [], // Auto-unlock, pas de clés
      createdAt: new Date().toISOString(),
      initialized: true,
      sealed: false,
    },
    [SecurityLevel.PERSONAL]: {
      securityLevel: SecurityLevel.PERSONAL,
      vaultAddr: 'http://localhost:8200',
      appToken: 'hvs.personal-token-xxx',
      unsealKeys: [
        'key1-aaaa-bbbb-cccc-dddd-eeee',
        'key2-ffff-gggg-hhhh-iiii-jjjj',
        'key3-kkkk-llll-mmmm-nnnn-oooo',
      ],
      masterPasswordHash: 'mock-hash-xxx', // Mock hash
      encryptedRecoveryKey: 'mock-encrypted-key',
      createdAt: new Date().toISOString(),
      initialized: true,
      sealed: true,
    },
    [SecurityLevel.ENTERPRISE]: {
      securityLevel: SecurityLevel.ENTERPRISE,
      vaultAddr: 'http://localhost:8200',
      appToken: 'hvs.enterprise-token-xxx',
      unsealKeys: [
        'key1-aaaa-bbbb-cccc-dddd-eeee',
        'key2-ffff-gggg-hhhh-iiii-jjjj',
        'key3-kkkk-llll-mmmm-nnnn-oooo',
        'key4-pppp-qqqq-rrrr-ssss-tttt',
        'key5-uuuu-vvvv-wwww-xxxx-yyyy',
      ],
      createdAt: new Date().toISOString(),
      initialized: true,
      sealed: true,
    },
  };

  const handleUnlockSuccess = () => {
    console.log('🎉 Vault unlocked successfully!');
    setUnlocked(true);
  };

  const handleReset = () => {
    setUnlocked(false);
  };

  if (unlocked) {
    return (
      <div className="unlock-demo">
        <div className="success-screen">
          <div className="success-icon">🎉</div>
          <h1>Vault Déverrouillé !</h1>
          <p>Mode: <strong>{selectedMode}</strong></p>

          <div className="success-actions">
            <button onClick={handleReset} className="btn-reset">
              🔄 Recommencer
            </button>

            <button onClick={() => console.log('Navigate to app')} className="btn-continue">
              ➜ Accéder à l'application
            </button>
          </div>
        </div>

        <style>{`
          .unlock-demo {
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

          .success-screen p strong {
            color: #1f2937;
            font-weight: 600;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="unlock-demo">
      {/* Mode selector */}
      <div className="mode-selector">
        <h2>🔐 Unlock Screen Demo</h2>
        <p>Sélectionnez un mode de sécurité:</p>

        <div className="mode-buttons">
          <button
            onClick={() => setSelectedMode(SecurityLevel.DEVELOPMENT)}
            className={`mode-btn ${selectedMode === SecurityLevel.DEVELOPMENT ? 'active' : ''}`}
          >
            🛠️ Development
          </button>

          <button
            onClick={() => setSelectedMode(SecurityLevel.PERSONAL)}
            className={`mode-btn ${selectedMode === SecurityLevel.PERSONAL ? 'active' : ''}`}
          >
            🏠 Personal
          </button>

          <button
            onClick={() => setSelectedMode(SecurityLevel.ENTERPRISE)}
            className={`mode-btn ${selectedMode === SecurityLevel.ENTERPRISE ? 'active' : ''}`}
          >
            🏢 Enterprise
          </button>
        </div>
      </div>

      {/* Unlock screen */}
      <UnlockScreen
        vaultConfig={mockConfigs[selectedMode]}
        onUnlockSuccess={handleUnlockSuccess}
        onCancel={() => console.log('Unlock cancelled')}
      />

      <style>{`
        .unlock-demo {
          position: relative;
        }

        .mode-selector {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          max-width: 300px;
        }

        .mode-selector h2 {
          font-size: 18px;
          margin: 0 0 8px 0;
        }

        .mode-selector p {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .mode-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mode-btn {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .mode-btn:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .mode-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1e40af;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
