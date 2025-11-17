/**
 * SourceTestConnection - Widget de test de connexion
 *
 * Teste la connectivité et validité d'une config source:
 * - Validation credentials
 * - Test API endpoint
 * - Vérification permissions/scopes
 * - Récupération sample data
 * - Affichage résultats détaillés
 */

import React, { useState } from 'react';
import type { ConnectorType } from './SourceList';
import { Play, CheckCircle, AlertCircle, Loader, Info } from 'lucide-react';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    endpoint?: string;
    auth?: 'ok' | 'failed';
    permissions?: string[];
    sampleData?: any;
    latency?: number;
  };
  errors?: string[];
}

export interface SourceTestConnectionProps {
  connectorType: ConnectorType;
  config: Record<string, any>;
  onTest: (config: Record<string, any>) => Promise<TestConnectionResult>;
  autoTest?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const SourceTestConnection: React.FC<SourceTestConnectionProps> = ({
  connectorType: _connectorType,
  config,
  onTest,
  autoTest = false,
  style,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<TestConnectionResult | null>(null);

  React.useEffect(() => {
    if (autoTest && status === 'idle') {
      handleTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTest, status]);

  const handleTest = async () => {
    setStatus('testing');
    setResult(null);

    try {
      const testResult = await onTest(config);
      setResult(testResult);
      setStatus(testResult.success ? 'success' : 'error');
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
      setStatus('error');
    }
  };

  return (
    <div
      className={`source-test-connection ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        border: `2px solid ${
          status === 'success' ? '#d1fae5' : status === 'error' ? '#fee2e2' : '#e5e7eb'
        }`,
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
          Test de connexion
        </h4>

        <button
          type="button"
          onClick={handleTest}
          disabled={status === 'testing'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            background: status === 'testing' ? '#e5e7eb' : '#3b82f6',
            color: status === 'testing' ? '#9ca3af' : '#ffffff',
            cursor: status === 'testing' ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {status === 'testing' ? <Loader size={14} className="spin" /> : <Play size={14} />}
          {status === 'testing' ? 'Test en cours...' : 'Tester'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div>
          {/* Status Message */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              marginBottom: '12px',
              background: result.success ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${result.success ? '#86efac' : '#fecaca'}`,
              borderRadius: '6px',
            }}
          >
            {result.success ? (
              <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: result.success ? '#065f46' : '#991b1b', marginBottom: '4px' }}>
                {result.success ? 'Connexion réussie' : 'Échec de connexion'}
              </div>
              <div style={{ fontSize: '12px', color: result.success ? '#047857' : '#dc2626' }}>
                {result.message}
              </div>
            </div>
          </div>

          {/* Details */}
          {result.details && (
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Détails
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                {result.details.endpoint && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Endpoint:</span>
                    <code style={{ color: '#6366f1', fontFamily: 'monospace', fontSize: '11px' }}>
                      {result.details.endpoint}
                    </code>
                  </div>
                )}

                {result.details.auth && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Authentification:</span>
                    <span style={{ color: result.details.auth === 'ok' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {result.details.auth === 'ok' ? '✓ OK' : '✗ Failed'}
                    </span>
                  </div>
                )}

                {result.details.permissions && result.details.permissions.length > 0 && (
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Permissions:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.details.permissions.map((perm, i) => (
                        <span
                          key={`${perm}-${i}`}
                          style={{
                            padding: '2px 6px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 500,
                          }}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.details.latency !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Latence:</span>
                    <span style={{ color: '#1f2937', fontWeight: 500 }}>
                      {result.details.latency}ms
                    </span>
                  </div>
                )}

                {result.details.sampleData && (
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Sample data:</div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '8px',
                        background: '#1f2937',
                        color: '#10b981',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        maxHeight: '150px',
                      }}
                    >
                      {JSON.stringify(result.details.sampleData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', marginBottom: '6px' }}>
                Erreurs détaillées:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#dc2626' }}>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {status === 'idle' && !result && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
          <Info size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: '13px' }}>
            Cliquez sur &quot;Tester&quot; pour vérifier la connexion
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceTestConnection;
