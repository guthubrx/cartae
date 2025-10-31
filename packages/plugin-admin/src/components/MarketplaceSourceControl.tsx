/**
 * Marketplace Source Control Component
 * Contrôle de la source du marketplace avec interface visuelle
 */

import React, { useState, useEffect } from 'react';
import {
  getCurrentConfig,
  switchToGit,
  switchToCloudflare,
  switchToBoth,
  testSourceConnectivity,
  type SourceConfig,
} from '../services/MarketplaceConfigService';

export const MarketplaceSourceControl: React.FC = () => {
  const [config, setConfig] = useState<SourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [testingGit, setTestingGit] = useState(false);
  const [testingCloudflare, setTestingCloudflare] = useState(false);
  const [gitTestResult, setGitTestResult] = useState<any>(null);
  const [cloudflareTestResult, setCloudflareTestResult] = useState<any>(null);
  const [customGitUrl, setCustomGitUrl] = useState('');
  const [customCloudflareUrl, setCustomCloudflareUrl] = useState('');

  // Charger la config au montage
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const currentConfig = await getCurrentConfig();
    setConfig(currentConfig);

    if (currentConfig) {
      setCustomGitUrl(currentConfig.gitUrl || '');
      setCustomCloudflareUrl(currentConfig.cloudflareUrl || '');
    }

    setLoading(false);
  };

  const handleSwitchToGit = async () => {
    setSwitching(true);
    const success = await switchToGit();
    if (success) {
      await loadConfig();
      alert('✅ Marketplace basculé vers Git');
    } else {
      alert('❌ Erreur lors de la bascule');
    }
    setSwitching(false);
  };

  const handleSwitchToCloudflare = async () => {
    setSwitching(true);
    const success = await switchToCloudflare(customCloudflareUrl || undefined);
    if (success) {
      await loadConfig();
      alert('✅ Marketplace basculé vers Cloudflare CDN');
    } else {
      alert('❌ Erreur lors de la bascule');
    }
    setSwitching(false);
  };

  const handleSwitchToBoth = async (priority: ('git' | 'cloudflare')[]) => {
    setSwitching(true);
    const success = await switchToBoth(priority, {
      gitUrl: customGitUrl || undefined,
      cloudflareUrl: customCloudflareUrl || undefined,
    });
    if (success) {
      await loadConfig();
      alert(`✅ Mode hybride activé (priorité: ${priority.join(' → ')})`);
    } else {
      alert('❌ Erreur lors de la bascule');
    }
    setSwitching(false);
  };

  const handleTestGit = async () => {
    setTestingGit(true);
    const url = customGitUrl || 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json';
    const result = await testSourceConnectivity('git', url);
    setGitTestResult(result);
    setTestingGit(false);
  };

  const handleTestCloudflare = async () => {
    setTestingCloudflare(true);
    const url = customCloudflareUrl || 'https://marketplace.cartae.com';
    const result = await testSourceConnectivity('cloudflare', url);
    setCloudflareTestResult(result);
    setTestingCloudflare(false);
  };

  if (loading) {
    return <div className="loading">Chargement de la configuration...</div>;
  }

  return (
    <div className="source-control">
      {/* État actuel */}
      <div className="current-state">
        <h3>État Actuel</h3>
        <div className={`state-badge state-${config?.type || 'unknown'}`}>
          {config?.type === 'git' && '📦 Git'}
          {config?.type === 'cloudflare' && '☁️ Cloudflare CDN'}
          {config?.type === 'both' && '🔄 Hybride'}
          {!config && '❓ Non configuré'}
        </div>

        {config?.type === 'both' && (
          <div className="priority-info">
            Priorité: {config.priority.map((s: string) => (s === 'git' ? '📦 Git' : '☁️ CDN')).join(' → ')}
          </div>
        )}
      </div>

      {/* Configuration des URLs */}
      <div className="url-config">
        <h3>Configuration des URLs</h3>

        <div className="url-group">
          <label>Git URL</label>
          <input
            type="text"
            value={customGitUrl}
            onChange={e => setCustomGitUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json"
          />
          <button onClick={handleTestGit} disabled={testingGit}>
            {testingGit ? 'Test...' : 'Tester'}
          </button>
          {gitTestResult && (
            <div className={`test-result ${gitTestResult.success ? 'success' : 'error'}`}>
              {gitTestResult.success ? (
                <>✅ OK ({gitTestResult.responseTime}ms)</>
              ) : (
                <>❌ {gitTestResult.error}</>
              )}
            </div>
          )}
        </div>

        <div className="url-group">
          <label>Cloudflare CDN URL</label>
          <input
            type="text"
            value={customCloudflareUrl}
            onChange={e => setCustomCloudflareUrl(e.target.value)}
            placeholder="https://marketplace.cartae.com"
          />
          <button onClick={handleTestCloudflare} disabled={testingCloudflare}>
            {testingCloudflare ? 'Test...' : 'Tester'}
          </button>
          {cloudflareTestResult && (
            <div className={`test-result ${cloudflareTestResult.success ? 'success' : 'error'}`}>
              {cloudflareTestResult.success ? (
                <>✅ OK ({cloudflareTestResult.responseTime}ms)</>
              ) : (
                <>❌ {cloudflareTestResult.error}</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions de bascule */}
      <div className="switch-actions">
        <h3>Basculer vers...</h3>

        <div className="action-buttons">
          <button
            className="action-btn btn-git"
            onClick={handleSwitchToGit}
            disabled={switching || config?.type === 'git'}
          >
            📦 Git
            <span className="btn-description">
              Source par défaut, gratuit, rate-limited
            </span>
          </button>

          <button
            className="action-btn btn-cloudflare"
            onClick={handleSwitchToCloudflare}
            disabled={switching || config?.type === 'cloudflare'}
          >
            ☁️ Cloudflare CDN
            <span className="btn-description">
              Rapide, scalable, nécessite déploiement
            </span>
          </button>

          <button
            className="action-btn btn-both-cf-first"
            onClick={() => handleSwitchToBoth(['cloudflare', 'git'])}
            disabled={switching}
          >
            🔄 Hybride (CDN → Git)
            <span className="btn-description">
              CDN en priorité, fallback sur Git
            </span>
          </button>

          <button
            className="action-btn btn-both-git-first"
            onClick={() => handleSwitchToBoth(['git', 'cloudflare'])}
            disabled={switching}
          >
            🔄 Hybride (Git → CDN)
            <span className="btn-description">
              Git en priorité, fallback sur CDN
            </span>
          </button>
        </div>
      </div>

      {/* Avertissement */}
      <div className="warning-box">
        ⚠️ <strong>Important :</strong> Les changements sont appliqués immédiatement à toutes les
        applications installées (anciennes et nouvelles). Assurez-vous de tester la connectivité
        avant de basculer.
      </div>

    </div>
  );
};

export default MarketplaceSourceControl;
