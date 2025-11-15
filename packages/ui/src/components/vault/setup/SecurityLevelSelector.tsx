/**
 * Sélecteur de niveau de sécurité Vault
 * Session 78 - Phase 2
 */

import React from 'react';
import { SecurityLevel, SecurityLevelSelectorProps } from '../types';

/**
 * SecurityLevelSelector - Choix du niveau de sécurité
 *
 * 3 niveaux disponibles:
 * - DÉVELOPPEMENT: Auto-unlock, clés en clair (DEV uniquement)
 * - PERSONNEL: Master password + recovery (recommandé)
 * - ENTREPRISE: Clés affichées une fois, pas de recovery (haute sécurité)
 */
export const SecurityLevelSelector: React.FC<SecurityLevelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const levels = [
    {
      value: SecurityLevel.DEVELOPMENT,
      icon: '🛠️',
      label: 'Développement',
      description: 'Auto-unlock au démarrage, clés en clair',
      features: [
        'Déverrouillage automatique',
        'Clés stockées en clair',
        'Pas de master password',
        'Unseal keys visibles',
      ],
      warnings: [
        '⚠️ NE PAS utiliser en production',
        '⚠️ Sécurité minimale',
      ],
      color: '#f59e0b', // Orange
    },
    {
      value: SecurityLevel.PERSONAL,
      icon: '🏠',
      label: 'Personnel',
      description: 'Master password + système de recovery',
      features: [
        'Master password requis',
        'Clés chiffrées (AES-256-GCM)',
        'Recovery possible avec password',
        'Balance sécurité/praticité',
      ],
      warnings: [],
      color: '#10b981', // Vert
      recommended: true,
    },
    {
      value: SecurityLevel.ENTERPRISE,
      icon: '🏢',
      label: 'Entreprise',
      description: 'Sécurité maximale, pas de recovery',
      features: [
        'Clés affichées UNE FOIS',
        'Pas de recovery possible',
        'Multi-admin (quorum 3/5)',
        'Audit trail obligatoire',
      ],
      warnings: [
        '⚠️ Clés perdues = données perdues',
        '⚠️ Pas de système de recovery',
      ],
      color: '#ef4444', // Rouge
    },
  ];

  return (
    <div className="security-level-selector">
      <h2>🔐 Choisissez votre niveau de sécurité</h2>
      <p className="selector-description">
        Le niveau de sécurité détermine comment vos secrets sont protégés et comment
        vous pouvez y accéder.
      </p>

      <div className="levels-grid">
        {levels.map((level) => (
          <div
            key={level.value}
            className={`level-card ${value === level.value ? 'selected' : ''} ${
              disabled ? 'disabled' : ''
            }`}
            onClick={() => !disabled && onChange(level.value)}
            style={{
              borderColor: value === level.value ? level.color : undefined,
            }}
          >
            {/* Badge "Recommandé" */}
            {level.recommended && (
              <div className="recommended-badge">⭐ Recommandé</div>
            )}

            {/* Header */}
            <div className="level-header">
              <span className="level-icon">{level.icon}</span>
              <div>
                <h3 className="level-label">{level.label}</h3>
                <p className="level-description">{level.description}</p>
              </div>
            </div>

            {/* Features */}
            <ul className="level-features">
              {level.features.map((feature, idx) => (
                <li key={idx}>✅ {feature}</li>
              ))}
            </ul>

            {/* Warnings */}
            {level.warnings.length > 0 && (
              <div className="level-warnings">
                {level.warnings.map((warning, idx) => (
                  <div key={idx} className="warning-item">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Selection indicator */}
            {value === level.value && (
              <div className="selection-indicator" style={{ backgroundColor: level.color }}>
                ✓ Sélectionné
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .security-level-selector {
          max-width: 1200px;
          margin: 0 auto;
        }

        .security-level-selector h2 {
          font-size: 24px;
          margin-bottom: 8px;
          color: var(--text-color, #1f2937);
        }

        .selector-description {
          font-size: 14px;
          color: var(--text-muted, #6b7280);
          margin-bottom: 24px;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .level-card {
          position: relative;
          padding: 20px;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          background: var(--card-bg, #fff);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .level-card:hover:not(.disabled) {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .level-card.selected {
          border-width: 3px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .level-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recommended-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 12px;
          font-weight: 600;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .level-header {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .level-icon {
          font-size: 36px;
        }

        .level-label {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: var(--text-color, #1f2937);
        }

        .level-description {
          font-size: 13px;
          color: var(--text-muted, #6b7280);
          margin: 0;
        }

        .level-features {
          list-style: none;
          padding: 0;
          margin: 0 0 16px 0;
        }

        .level-features li {
          font-size: 13px;
          color: var(--text-color, #374151);
          margin-bottom: 8px;
          padding-left: 4px;
        }

        .level-warnings {
          padding: 12px;
          background: var(--warning-bg, #fef3c7);
          border-left: 3px solid var(--warning-color, #f59e0b);
          border-radius: 4px;
          margin-top: 12px;
        }

        .warning-item {
          font-size: 12px;
          color: var(--warning-text, #92400e);
          margin-bottom: 4px;
        }

        .warning-item:last-child {
          margin-bottom: 0;
        }

        .selection-indicator {
          margin-top: 16px;
          padding: 10px;
          text-align: center;
          color: white;
          font-weight: 600;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};
