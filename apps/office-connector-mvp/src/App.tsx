import React, { useEffect, useState } from 'react';
import './App.css';

export const App: React.FC = () => {
  const [extensionStatus, setExtensionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [tokenInfo, setTokenInfo] = useState<{ token?: string; expiresIn?: number } | null>(null);

  useEffect(() => {
    // Vérifier si l'extension est disponible via l'API injectée
    const checkExtension = () => {
      const api = (window as any).cartaeExtensionAPI;

      if (api?._token) {
        // Token déjà reçu
        setTokenInfo({ token: api._token, expiresIn: api._expiresIn });
        setExtensionStatus('connected');
        return;
      }

      // Enregistrer les callbacks
      api?.onExtensionReady?.(() => {
        console.log('[MVP] ✅ Extension ready detected');
        setExtensionStatus('connected');
      });

      api?.onTokenReceived?.((token: string, expiresIn: number) => {
        console.log('[MVP] 🔑 Token received via callback');
        setTokenInfo({ token, expiresIn });
      });

      // Timeout si pas d'extension après 5s
      setTimeout(() => {
        if (extensionStatus === 'checking') {
          console.log('[MVP] ⚠️ Extension not detected');
          setExtensionStatus('failed');
        }
      }, 5000);
    };

    checkExtension();
  }, []);

  return (
    <div className="office365-app">
      {/* Header */}
      <header className="app-header">
        <h1>🔗 Office 365 Connector</h1>
        <p className="subtitle">Powered by Cartae Extension</p>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="label">Extension:</span>
          <span className={`status ${extensionStatus}`}>
            {extensionStatus === 'checking' && '⏳ Checking...'}
            {extensionStatus === 'connected' && '✅ Connected'}
            {extensionStatus === 'failed' && '❌ Not Found'}
          </span>
        </div>
        {tokenInfo && (
          <div className="status-item">
            <span className="label">Token:</span>
            <span className="token-value">
              {tokenInfo.token?.substring(0, 20)}...
              {tokenInfo.expiresIn && ` (expires in ${Math.round(tokenInfo.expiresIn / 60)}m)`}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="app-container">
        {extensionStatus === 'connected' && tokenInfo ? (
          <iframe
            src="http://localhost:5175"
            className="plugin-iframe"
            title="Office 365 Connector Plugin"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="info-panel">
            <h2>
              {extensionStatus === 'checking' && '🔄 Checking Extension...'}
              {extensionStatus === 'failed' && '⚠️ Extension Not Found'}
            </h2>
            <p>
              {extensionStatus === 'checking' &&
                'Waiting for Cartae Office 365 Connector extension to be loaded...'}
              {extensionStatus === 'failed' &&
                'The Firefox extension is not loaded. Please load the extension and refresh this page.'}
            </p>
            {extensionStatus === 'failed' && (
              <div className="instructions">
                <h3>To fix this:</h3>
                <ol>
                  <li>Open Firefox Developer Tools (F12)</li>
                  <li>Go to "about:debugging"</li>
                  <li>Load the extension from: <code>cartae-private/plugins/office365-connector/extension-test</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>Office 365 Connector MVP v1.0 | Cartae Extension Integration</p>
      </footer>
    </div>
  );
};
