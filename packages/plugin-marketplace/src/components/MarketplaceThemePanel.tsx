/**
 * FR: Panneau de personnalisation des thèmes marketplace
 * EN: Marketplace theme customization panel
 *
 * Session 61 - Marketplace UI Theme Customization
 */

import React, { useState, useCallback } from 'react';
import { useMarketplaceTheme, marketplaceDefaultThemes } from '@cartae/ui';
import type { MarketplaceTheme, CreateMarketplaceThemeOptions } from '@cartae/design';

/**
 * FR: Props du panneau de thèmes
 * EN: Theme panel props
 */
export interface MarketplaceThemePanelProps {
  /** FR: Afficher section avancée | EN: Show advanced section */
  showAdvanced?: boolean;

  /** FR: Callback de fermeture | EN: Close callback */
  onClose?: () => void;
}

/**
 * FR: Card de prévisualisation d'un thème
 * EN: Theme preview card
 */
function ThemePreviewCard({
  theme,
  isActive,
  onSelect,
  onDelete,
}: {
  theme: MarketplaceTheme;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`marketplace-theme-card ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      style={{
        border: isActive ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        padding: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: theme.colors.surface,
      }}
    >
      {/* Header */}
      <div className="theme-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, color: theme.colors.text, fontSize: '0.875rem', fontWeight: 600 }}>
            {theme.name}
          </h4>
          <p style={{ margin: '0.25rem 0 0', color: theme.colors.textMuted, fontSize: '0.75rem' }}>
            {theme.description}
          </p>
        </div>
        {isActive && (
          <span
            style={{
              backgroundColor: theme.colors.success,
              color: '#fff',
              padding: '0.125rem 0.5rem',
              borderRadius: theme.borderRadius.sm,
              fontSize: '0.625rem',
              fontWeight: 600,
            }}
          >
            ACTIF
          </span>
        )}
      </div>

      {/* Color preview */}
      <div className="theme-color-preview" style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
        {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.success, theme.colors.warning].map((color, i) => (
          <div
            key={i}
            style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: color,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.border}`,
            }}
          />
        ))}
      </div>

      {/* Metadata */}
      <div className="theme-metadata" style={{ display: 'flex', gap: '0.5rem', fontSize: '0.625rem', color: theme.colors.textMuted }}>
        <span>{theme.author}</span>
        <span>•</span>
        <span>v{theme.version}</span>
        <span>•</span>
        <span style={{ textTransform: 'capitalize' }}>{theme.category}</span>
      </div>

      {/* Delete button for custom themes */}
      {theme.isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            marginTop: '0.5rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: theme.colors.error,
            color: '#fff',
            border: 'none',
            borderRadius: theme.borderRadius.sm,
            cursor: 'pointer',
            fontSize: '0.625rem',
            width: '100%',
          }}
        >
          Supprimer
        </button>
      )}
    </div>
  );
}

/**
 * FR: Sélecteur de couleur simple
 * EN: Simple color picker
 */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="color-picker" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <label style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
        {label}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '3rem',
          height: '2rem',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '5rem',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          border: '1px solid #d1d5db',
          borderRadius: '0.25rem',
        }}
      />
    </div>
  );
}

/**
 * FR: Panneau principal de personnalisation des thèmes
 * EN: Main theme customization panel
 */
export function MarketplaceThemePanel({
  showAdvanced = false,
  onClose,
}: MarketplaceThemePanelProps) {
  const {
    currentTheme,
    availableThemes,
    customThemes,
    changeTheme,
    createCustomTheme,
    deleteCustomTheme,
    resetToDefault,
    isLoading,
    error,
  } = useMarketplaceTheme();

  const [isCreating, setIsCreating] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [selectedBaseTheme, setSelectedBaseTheme] = useState(marketplaceDefaultThemes[0].id);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  /**
   * FR: Gérer le changement de thème
   * EN: Handle theme change
   */
  const handleThemeSelect = useCallback(async (themeId: string) => {
    try {
      await changeTheme(themeId);
    } catch (err) {
      console.error('Failed to select theme:', err);
    }
  }, [changeTheme]);

  /**
   * FR: Gérer la suppression d'un thème personnalisé
   * EN: Handle custom theme deletion
   */
  const handleDeleteCustomTheme = useCallback(async (themeId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce thème personnalisé ?')) {
      try {
        await deleteCustomTheme(themeId);
      } catch (err) {
        console.error('Failed to delete theme:', err);
      }
    }
  }, [deleteCustomTheme]);

  /**
   * FR: Créer un nouveau thème personnalisé
   * EN: Create new custom theme
   */
  const handleCreateTheme = useCallback(async () => {
    if (!newThemeName.trim()) {
      alert('Veuillez entrer un nom pour le thème');
      return;
    }

    try {
      const options: CreateMarketplaceThemeOptions = {
        name: newThemeName,
        description: newThemeDescription || `Thème personnalisé basé sur ${selectedBaseTheme}`,
        baseThemeId: selectedBaseTheme,
        customColors: Object.keys(customColors).length > 0 ? customColors as any : undefined,
      };

      const theme = await createCustomTheme(options);
      await changeTheme(theme.id);

      // Reset form
      setIsCreating(false);
      setNewThemeName('');
      setNewThemeDescription('');
      setCustomColors({});
    } catch (err) {
      console.error('Failed to create theme:', err);
      alert('Échec de la création du thème');
    }
  }, [newThemeName, newThemeDescription, selectedBaseTheme, customColors, createCustomTheme, changeTheme]);

  if (isLoading) {
    return (
      <div className="marketplace-theme-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement des thèmes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-theme-panel" style={{ padding: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem', color: '#991b1b' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Erreur</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-theme-panel" style={{ padding: '1.5rem', maxWidth: '64rem', margin: '0 auto' }}>
      {/* Header */}
      <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Thèmes Marketplace
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Personnalisez l'apparence du marketplace avec des thèmes prédéfinis ou créez le vôtre
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Fermer
          </button>
        )}
      </div>

      {/* Current theme info */}
      {currentTheme && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
            Thème Actif
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.125rem', fontWeight: 600 }}>
            {currentTheme.name}
          </p>
        </div>
      )}

      {/* Predefined themes */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Thèmes Prédéfinis
        </h3>
        <div className="themes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '1rem' }}>
          {availableThemes.map(theme => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              isActive={currentTheme?.id === theme.id}
              onSelect={() => handleThemeSelect(theme.id)}
            />
          ))}
        </div>
      </section>

      {/* Custom themes */}
      {customThemes.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Thèmes Personnalisés
          </h3>
          <div className="themes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '1rem' }}>
            {customThemes.map(theme => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isActive={currentTheme?.id === theme.id}
                onSelect={() => handleThemeSelect(theme.id)}
                onDelete={() => handleDeleteCustomTheme(theme.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Create custom theme */}
      <section style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #d1d5db', borderRadius: '0.5rem' }}>
        {!isCreating ? (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Créer un Thème Personnalisé
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Créez votre propre thème en personnalisant les couleurs
            </p>
            <button
              onClick={() => setIsCreating(true)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              + Nouveau Thème
            </button>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Nouveau Thème Personnalisé
            </h3>

            {/* Theme name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Nom du Thème
              </label>
              <input
                type="text"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Mon Thème Marketplace"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Theme description */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Description (optionnel)
              </label>
              <textarea
                value={newThemeDescription}
                onChange={(e) => setNewThemeDescription(e.target.value)}
                placeholder="Description de votre thème..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Base theme selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Basé sur
              </label>
              <select
                value={selectedBaseTheme}
                onChange={(e) => setSelectedBaseTheme(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              >
                {marketplaceDefaultThemes.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced color customization */}
            {showAdvanced && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Personnalisation Avancée (optionnel)
                </h4>
                <ColorPicker
                  label="Couleur Principale"
                  value={customColors.cardBackground || marketplaceDefaultThemes[0].marketplaceVars.cardBackground}
                  onChange={(color) => setCustomColors(prev => ({ ...prev, cardBackground: color }))}
                />
                <ColorPicker
                  label="Bordure des Cartes"
                  value={customColors.cardBorder || marketplaceDefaultThemes[0].marketplaceVars.cardBorder}
                  onChange={(color) => setCustomColors(prev => ({ ...prev, cardBorder: color }))}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleCreateTheme}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Créer le Thème
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewThemeName('');
                  setNewThemeDescription('');
                  setCustomColors({});
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Reset to default */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={resetToDefault}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Réinitialiser au Thème par Défaut
        </button>
      </div>
    </div>
  );
}
