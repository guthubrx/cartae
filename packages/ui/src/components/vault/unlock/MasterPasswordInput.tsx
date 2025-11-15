/**
 * Composant d'input pour master password (mode PERSONAL)
 * Session 78 - Phase 3
 */

import React, { useState } from 'react';
import { MasterPasswordInputProps } from '../types';

/**
 * MasterPasswordInput - Input pour master password
 *
 * Utilisé en mode PERSONAL pour déchiffrer les unseal keys stockées.
 * Features:
 * - Masquage par défaut
 * - Toggle show/hide
 * - Support Enter pour soumettre
 * - Indicateur de force (optionnel)
 */
export const MasterPasswordInput: React.FC<MasterPasswordInputProps> = ({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="master-password-input">
      <label className="password-label">
        🔑 Master Password
        <span className="label-hint">
          (Utilisé pour déchiffrer vos clés d'unseal)
        </span>
      </label>

      <div className="password-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Saisissez votre master password..."
          disabled={disabled}
          autoFocus={autoFocus}
          className="password-input"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="toggle-password-btn"
          title={showPassword ? 'Masquer' : 'Afficher'}
          disabled={disabled}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      <div className="password-hint">
        💡 <strong>Astuce:</strong> Ce password a été créé lors du setup initial.
        Si oublié, utilisez la procédure de recovery.
      </div>

      <style>{`
        .master-password-input {
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 4px solid var(--warning-color, #f59e0b);
          border-radius: 8px;
        }

        .password-label {
          display: flex;
          flex-direction: column;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-color, #1f2937);
          margin-bottom: 12px;
        }

        .label-hint {
          font-size: 12px;
          font-weight: 400;
          color: var(--text-muted, #6b7280);
          margin-top: 4px;
        }

        .password-wrapper {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .password-input {
          flex: 1;
          padding: 12px 14px;
          font-size: 15px;
          border: 2px solid var(--border-color, #d1d5db);
          border-radius: 8px;
          background: white;
          color: var(--text-color, #1f2937);
          transition: all 0.2s ease;
        }

        .password-input:focus {
          outline: none;
          border-color: var(--warning-color, #f59e0b);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .password-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--disabled-bg, #f3f4f6);
        }

        .toggle-password-btn {
          padding: 10px 14px;
          font-size: 16px;
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-password-btn:hover:not(:disabled) {
          background: var(--button-hover-bg, #f9fafb);
        }

        .toggle-password-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .password-hint {
          font-size: 12px;
          color: var(--warning-text, #92400e);
          line-height: 1.5;
          padding: 10px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
        }

        .password-hint strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
