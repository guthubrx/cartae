/**
 * Composant de progression unseal Vault
 * Session 78 - Phase 3
 */

import React from 'react';
import { UnsealProgressProps } from '../types';

/**
 * UnsealProgress - Indicateur de progression unseal (0/3, 1/3, 2/3, 3/3)
 *
 * Affiche visuellement combien de clés ont été saisies sur le total requis.
 * Utilise un design step-by-step avec couleurs (gris → vert).
 */
export const UnsealProgress: React.FC<UnsealProgressProps> = ({
  current,
  total,
  showLabels = true,
}) => {
  const percentage = (current / total) * 100;

  // Générer les steps
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="unseal-progress">
      {showLabels && (
        <div className="progress-header">
          <span className="progress-label">Progression Unseal</span>
          <span className="progress-count">
            {current}/{total}
          </span>
        </div>
      )}

      {/* Barre de progression */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              percentage === 100 ? '#10b981' : percentage > 0 ? '#3b82f6' : '#e5e7eb',
          }}
        />
      </div>

      {/* Steps individuels */}
      <div className="progress-steps">
        {steps.map((step) => {
          const isCompleted = step <= current;
          const isCurrent = step === current + 1;

          return (
            <div
              key={step}
              className={`progress-step ${isCompleted ? 'completed' : ''} ${
                isCurrent ? 'current' : ''
              }`}
            >
              <div className="step-circle">
                {isCompleted ? '✓' : step}
              </div>
              {showLabels && (
                <div className="step-label">
                  {isCompleted ? 'Validée' : isCurrent ? 'En cours' : `Clé ${step}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Message de statut */}
      <div className="progress-status">
        {current === 0 && (
          <p className="status-message">
            🔒 Vault est verrouillé. Saisissez {total} clés pour le déverrouiller.
          </p>
        )}
        {current > 0 && current < total && (
          <p className="status-message">
            🔓 Progression: {current}/{total} clés saisies. Encore {total - current}{' '}
            clé(s) requise(s).
          </p>
        )}
        {current === total && (
          <p className="status-message success">
            ✅ Vault déverrouillé avec succès !
          </p>
        )}
      </div>

      <style>{`
        .unseal-progress {
          width: 100%;
          padding: 20px;
          background: var(--progress-bg, #f9fafb);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .progress-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color, #374151);
        }

        .progress-count {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-color, #3b82f6);
        }

        .progress-bar {
          height: 8px;
          background: var(--bar-bg, #e5e7eb);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .progress-steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          position: relative;
        }

        .progress-steps::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          height: 2px;
          background: var(--bar-bg, #e5e7eb);
          z-index: 0;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--step-bg, #e5e7eb);
          color: var(--step-text, #6b7280);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          border: 3px solid var(--step-border, #fff);
          transition: all 0.3s ease;
        }

        .progress-step.completed .step-circle {
          background: var(--success-color, #10b981);
          color: white;
        }

        .progress-step.current .step-circle {
          background: var(--primary-color, #3b82f6);
          color: white;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
          }
        }

        .step-label {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted, #6b7280);
          text-align: center;
        }

        .progress-step.completed .step-label {
          color: var(--success-color, #10b981);
          font-weight: 600;
        }

        .progress-step.current .step-label {
          color: var(--primary-color, #3b82f6);
          font-weight: 600;
        }

        .progress-status {
          margin-top: 16px;
          padding: 12px;
          background: var(--status-bg, #fff);
          border-radius: 8px;
          border-left: 4px solid var(--info-color, #3b82f6);
        }

        .status-message {
          margin: 0;
          font-size: 13px;
          color: var(--text-color, #374151);
          line-height: 1.5;
        }

        .status-message.success {
          color: var(--success-color, #10b981);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
