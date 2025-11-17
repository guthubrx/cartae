/**
 * Composant d'input pour clé d'unseal Vault
 * Session 78 - Phase 3
 */

import React, { useState } from 'react';
import { UnsealKeyInputProps } from '../types';

/**
 * UnsealKeyInput - Input sécurisé pour clés d'unseal
 *
 * Features:
 * - Masquage par défaut (type=password)
 * - Toggle show/hide
 * - Copier dans presse-papier
 * - Validation format (base64 attendu)
 * - Auto-focus optionnel
 */
export const UnsealKeyInput: React.FC<UnsealKeyInputProps> = ({
  label,
  value,
  onChange,
  masked = true,
  disabled = false,
  placeholder = 'Collez la clé d\'unseal ici...',
}) => {
  const [showKey, setShowKey] = useState(!masked);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    onChange(text.trim());
  };

  // Validation basique format base64
  const isValidFormat = value
    ? /^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 10
    : true;

  return (
    <div className="unseal-key-input">
      <label className="input-label">
        {label}
        {!isValidFormat && value && (
          <span className="validation-error">⚠️ Format invalide</span>
        )}
      </label>

      <div className="input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`key-input ${!isValidFormat && value ? 'invalid' : ''}`}
        />

        {/* Toggle show/hide */}
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="toggle-btn"
          title={showKey ? 'Masquer' : 'Afficher'}
          disabled={disabled}
        >
          {showKey ? '🙈' : '👁️'}
        </button>

        {/* Bouton coller depuis presse-papier */}
        {!value && (
          <button
            type="button"
            onClick={handlePaste}
            className="paste-btn"
            title="Coller depuis presse-papier"
            disabled={disabled}
          >
            📋 Coller
          </button>
        )}

        {/* Bouton copier */}
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="copy-btn"
            title="Copier"
            disabled={disabled}
          >
            {copied ? '✅' : '📋'}
          </button>
        )}

        {/* Bouton effacer */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="clear-btn"
            title="Effacer"
            disabled={disabled}
          >
            ❌
          </button>
        )}
      </div>

      {/* Compteur caractères */}
      {value && (
        <div className="input-footer">
          <span className="char-count">{value.length} caractères</span>
          {isValidFormat && (
            <span className="format-ok">✅ Format valide</span>
          )}
        </div>
      )}

      <style>{`
        .unseal-key-input {
          margin-bottom: 20px;
        }

        .input-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color, #374151);
          margin-bottom: 8px;
        }

        .validation-error {
          font-size: 12px;
          color: var(--danger-color, #ef4444);
          font-weight: 500;
        }

        .input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .key-input {
          flex: 1;
          padding: 12px 14px;
          font-size: 14px;
          font-family: monospace;
          border: 2px solid var(--border-color, #d1d5db);
          border-radius: 8px;
          background: var(--input-bg, #fff);
          color: var(--text-color, #1f2937);
          transition: all 0.2s ease;
        }

        .key-input:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .key-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--disabled-bg, #f3f4f6);
        }

        .key-input.invalid {
          border-color: var(--danger-color, #ef4444);
        }

        .key-input.invalid:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .toggle-btn,
        .paste-btn,
        .copy-btn,
        .clear-btn {
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 6px;
          background: var(--button-bg, #f9fafb);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .toggle-btn:hover,
        .paste-btn:hover,
        .copy-btn:hover,
        .clear-btn:hover {
          background: var(--button-hover-bg, #e5e7eb);
          transform: translateY(-1px);
        }

        .toggle-btn:disabled,
        .paste-btn:disabled,
        .copy-btn:disabled,
        .clear-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          font-size: 12px;
        }

        .char-count {
          color: var(--text-muted, #6b7280);
        }

        .format-ok {
          color: var(--success-color, #10b981);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
