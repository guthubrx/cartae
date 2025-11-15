/**
 * Composant de génération de mot de passe fort
 * Session 78 - Phase 2
 */

import React, { useState, useEffect } from 'react';
import { PasswordGeneratorProps } from '../types';
import {
  evaluatePasswordStrength,
  generateStrongPassword,
  estimateCrackTime,
} from './passwordStrength';

/**
 * PasswordGenerator - Générateur de mots de passe avec évaluation de force
 *
 * Features:
 * - Génération aléatoire sécurisée (crypto.getRandomValues)
 * - Évaluation de force en temps réel
 * - Indicateur visuel de force (barre colorée)
 * - Suggestions pour améliorer
 * - Copie dans le presse-papier
 */
export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  value,
  onChange,
  minLength = 12,
  showStrength = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Évaluer la force du mot de passe
  const strength = evaluatePasswordStrength(value);
  const crackTime = estimateCrackTime(value);

  // Auto-générer un mot de passe si vide
  useEffect(() => {
    if (!value) {
      onChange(generateStrongPassword(16));
    }
  }, []);

  const handleGenerate = () => {
    const newPassword = generateStrongPassword(16);
    onChange(newPassword);
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="password-generator">
      {/* Input mot de passe */}
      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="password-input"
          placeholder="Votre mot de passe..."
          minLength={minLength}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="toggle-visibility-btn"
          title={showPassword ? 'Masquer' : 'Afficher'}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="copy-btn"
          title="Copier"
        >
          {copied ? '✅' : '📋'}
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          className="generate-btn"
          title="Générer un nouveau mot de passe"
        >
          🔄
        </button>
      </div>

      {/* Indicateur de force */}
      {showStrength && (
        <div className="password-strength">
          {/* Barre de force */}
          <div className="strength-bar">
            <div
              className="strength-fill"
              style={{
                width: `${(strength.score / 4) * 100}%`,
                backgroundColor: strength.color,
              }}
            />
          </div>

          {/* Label et temps de crack */}
          <div className="strength-info">
            <span className="strength-label" style={{ color: strength.color }}>
              {strength.label}
            </span>
            <span className="crack-time">Temps de crack: {crackTime}</span>
          </div>

          {/* Critères validés */}
          <div className="password-criteria">
            <div className={strength.criteria.minLength ? 'valid' : 'invalid'}>
              {strength.criteria.minLength ? '✅' : '❌'} {minLength}+ caractères
            </div>
            <div className={strength.criteria.hasUppercase ? 'valid' : 'invalid'}>
              {strength.criteria.hasUppercase ? '✅' : '❌'} Majuscules
            </div>
            <div className={strength.criteria.hasLowercase ? 'valid' : 'invalid'}>
              {strength.criteria.hasLowercase ? '✅' : '❌'} Minuscules
            </div>
            <div className={strength.criteria.hasNumber ? 'valid' : 'invalid'}>
              {strength.criteria.hasNumber ? '✅' : '❌'} Chiffres
            </div>
            <div className={strength.criteria.hasSpecial ? 'valid' : 'invalid'}>
              {strength.criteria.hasSpecial ? '✅' : '❌'} Spéciaux
            </div>
          </div>

          {/* Suggestions */}
          {strength.suggestions.length > 0 && (
            <div className="password-suggestions">
              <strong>💡 Suggestions:</strong>
              <ul>
                {strength.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .password-generator {
          width: 100%;
        }

        .password-input-wrapper {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .password-input {
          flex: 1;
          padding: 10px 12px;
          font-size: 14px;
          font-family: monospace;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--input-bg, #fff);
          color: var(--text-color, #333);
        }

        .password-input:focus {
          outline: none;
          border-color: var(--primary-color, #007bff);
        }

        .toggle-visibility-btn,
        .copy-btn,
        .generate-btn {
          padding: 10px 12px;
          font-size: 16px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--button-bg, #f8f9fa);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-visibility-btn:hover,
        .copy-btn:hover,
        .generate-btn:hover {
          background: var(--button-hover-bg, #e9ecef);
        }

        .password-strength {
          margin-top: 12px;
        }

        .strength-bar {
          height: 6px;
          background: var(--bar-bg, #e9ecef);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .strength-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .strength-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .strength-label {
          font-weight: 600;
        }

        .crack-time {
          color: var(--text-muted, #6c757d);
        }

        .password-criteria {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 6px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .password-criteria .valid {
          color: var(--success-color, #28a745);
        }

        .password-criteria .invalid {
          color: var(--danger-color, #dc3545);
        }

        .password-suggestions {
          padding: 12px;
          background: var(--info-bg, #e7f3ff);
          border-left: 3px solid var(--info-color, #007bff);
          border-radius: 4px;
          font-size: 13px;
        }

        .password-suggestions ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .password-suggestions li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};
