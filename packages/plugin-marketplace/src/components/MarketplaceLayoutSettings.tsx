/**
 * FR: Paramètres de layout du marketplace
 * EN: Marketplace layout settings
 *
 * Session 61 - Marketplace UI Theme Customization
 */

import React, { useCallback } from 'react';
import { useMarketplaceTheme } from '@cartae/ui';
import type { MarketplaceLayoutMode, SidebarPosition, SearchPosition } from '@cartae/design';

/**
 * FR: Props du composant
 * EN: Component props
 */
export interface MarketplaceLayoutSettingsProps {
  /** FR: Callback de fermeture | EN: Close callback */
  onClose?: () => void;
}

/**
 * FR: Option de layout sélectionnable
 * EN: Selectable layout option
 */
function LayoutOption<T extends string>({
  label,
  value,
  currentValue,
  onChange,
  icon,
  description,
}: {
  label: string;
  value: T;
  currentValue: T;
  onChange: (value: T) => void;
  icon?: string;
  description?: string;
}) {
  const isActive = value === currentValue;

  return (
    <div
      onClick={() => onChange(value)}
      style={{
        padding: '0.75rem 1rem',
        border: isActive ? '2px solid #3b82f6' : '1px solid #d1d5db',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        backgroundColor: isActive ? '#eff6ff' : '#fff',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isActive ? '#1e40af' : '#1f2937' }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
              {description}
            </div>
          )}
        </div>
        {isActive && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: '#3b82f6' }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * FR: Toggle switch
 * EN: Toggle switch
 */
function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1f2937' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
            {description}
          </div>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '3rem',
          height: '1.5rem',
          backgroundColor: checked ? '#3b82f6' : '#d1d5db',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color 0.2s',
        }}
      >
        <div
          style={{
            width: '1.25rem',
            height: '1.25rem',
            backgroundColor: '#fff',
            borderRadius: '50%',
            position: 'absolute',
            top: '0.125rem',
            left: checked ? '1.625rem' : '0.125rem',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          }}
        />
      </button>
    </div>
  );
}

/**
 * FR: Composant principal des paramètres de layout
 * EN: Main layout settings component
 */
export function MarketplaceLayoutSettings({ onClose }: MarketplaceLayoutSettingsProps) {
  const {
    layoutConfig,
    updateLayout,
    resetLayout,
    isLoading,
    error,
  } = useMarketplaceTheme();

  /**
   * FR: Changer le mode de layout
   * EN: Change layout mode
   */
  const handleLayoutModeChange = useCallback(async (mode: MarketplaceLayoutMode) => {
    try {
      await updateLayout({ layoutMode: mode });
    } catch (err) {
      console.error('Failed to update layout mode:', err);
    }
  }, [updateLayout]);

  /**
   * FR: Changer la position de la sidebar
   * EN: Change sidebar position
   */
  const handleSidebarPositionChange = useCallback(async (position: SidebarPosition) => {
    try {
      await updateLayout({ sidebarPosition: position });
    } catch (err) {
      console.error('Failed to update sidebar position:', err);
    }
  }, [updateLayout]);

  /**
   * FR: Changer la position de la recherche
   * EN: Change search position
   */
  const handleSearchPositionChange = useCallback(async (position: SearchPosition) => {
    try {
      await updateLayout({ searchPosition: position });
    } catch (err) {
      console.error('Failed to update search position:', err);
    }
  }, [updateLayout]);

  /**
   * FR: Changer le nombre de colonnes
   * EN: Change grid columns
   */
  const handleGridColumnsChange = useCallback(async (columns: 1 | 2 | 3 | 4) => {
    try {
      await updateLayout({ gridColumns: columns });
    } catch (err) {
      console.error('Failed to update grid columns:', err);
    }
  }, [updateLayout]);

  /**
   * FR: Changer la taille des cartes
   * EN: Change card size
   */
  const handleCardSizeChange = useCallback(async (size: 'compact' | 'normal' | 'large') => {
    try {
      await updateLayout({ cardSize: size });
    } catch (err) {
      console.error('Failed to update card size:', err);
    }
  }, [updateLayout]);

  /**
   * FR: Toggle options d'affichage
   * EN: Toggle display options
   */
  const handleToggleOption = useCallback(async (option: 'showPreviews' | 'showStats' | 'showRatings', value: boolean) => {
    try {
      await updateLayout({ [option]: value });
    } catch (err) {
      console.error(`Failed to toggle ${option}:`, err);
    }
  }, [updateLayout]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement des paramètres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem', color: '#991b1b' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Erreur</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-layout-settings" style={{ padding: '1.5rem', maxWidth: '56rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Paramètres de Layout
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Personnalisez l'affichage et l'organisation du marketplace
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

      {/* Layout Mode */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Mode d'Affichage
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <LayoutOption
            label="Grille Compacte"
            value="grid-compact"
            currentValue={layoutConfig.layoutMode}
            onChange={handleLayoutModeChange}
            icon="⊞"
            description="Grille dense avec cartes petites"
          />
          <LayoutOption
            label="Grille Normale"
            value="grid-normal"
            currentValue={layoutConfig.layoutMode}
            onChange={handleLayoutModeChange}
            icon="▦"
            description="Grille équilibrée (recommandé)"
          />
          <LayoutOption
            label="Grille Large"
            value="grid-large"
            currentValue={layoutConfig.layoutMode}
            onChange={handleLayoutModeChange}
            icon="▥"
            description="Grandes cartes avec plus de détails"
          />
          <LayoutOption
            label="Liste"
            value="list"
            currentValue={layoutConfig.layoutMode}
            onChange={handleLayoutModeChange}
            icon="☰"
            description="Vue liste verticale compacte"
          />
          <LayoutOption
            label="Minimal"
            value="minimal"
            currentValue={layoutConfig.layoutMode}
            onChange={handleLayoutModeChange}
            icon="▬"
            description="Vue ultra-minimaliste"
          />
        </div>
      </section>

      {/* Grid Columns (only in grid modes) */}
      {layoutConfig.layoutMode.startsWith('grid') && (
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Nombre de Colonnes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {[1, 2, 3, 4].map(cols => (
              <LayoutOption
                key={cols}
                label={`${cols} colonne${cols > 1 ? 's' : ''}`}
                value={cols as 1 | 2 | 3 | 4}
                currentValue={layoutConfig.gridColumns}
                onChange={handleGridColumnsChange}
                icon={cols.toString()}
              />
            ))}
          </div>
        </section>
      )}

      {/* Card Size */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Taille des Cartes
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <LayoutOption
            label="Compacte"
            value="compact"
            currentValue={layoutConfig.cardSize}
            onChange={handleCardSizeChange}
            description="Plus d'items visibles"
          />
          <LayoutOption
            label="Normale"
            value="normal"
            currentValue={layoutConfig.cardSize}
            onChange={handleCardSizeChange}
            description="Équilibrée"
          />
          <LayoutOption
            label="Large"
            value="large"
            currentValue={layoutConfig.cardSize}
            onChange={handleCardSizeChange}
            description="Plus de détails"
          />
        </div>
      </section>

      {/* Sidebar Position */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Position de la Barre Latérale
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <LayoutOption
            label="Gauche"
            value="left"
            currentValue={layoutConfig.sidebarPosition}
            onChange={handleSidebarPositionChange}
            icon="◧"
          />
          <LayoutOption
            label="Droite"
            value="right"
            currentValue={layoutConfig.sidebarPosition}
            onChange={handleSidebarPositionChange}
            icon="◨"
          />
          <LayoutOption
            label="Masquée"
            value="hidden"
            currentValue={layoutConfig.sidebarPosition}
            onChange={handleSidebarPositionChange}
            icon="▬"
          />
        </div>
      </section>

      {/* Search Position */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Position de la Recherche
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <LayoutOption
            label="Haut Fixe (Sticky)"
            value="top-sticky"
            currentValue={layoutConfig.searchPosition}
            onChange={handleSearchPositionChange}
            description="Reste visible en scrollant"
          />
          <LayoutOption
            label="Haut Fixe"
            value="top-fixed"
            currentValue={layoutConfig.searchPosition}
            onChange={handleSearchPositionChange}
            description="Toujours en haut de page"
          />
          <LayoutOption
            label="Flottante"
            value="floating"
            currentValue={layoutConfig.searchPosition}
            onChange={handleSearchPositionChange}
            description="Barre de recherche flottante"
          />
          <LayoutOption
            label="Dans la Sidebar"
            value="sidebar"
            currentValue={layoutConfig.searchPosition}
            onChange={handleSearchPositionChange}
            description="Intégrée à la barre latérale"
          />
        </div>
      </section>

      {/* Display Options */}
      <section style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Options d'Affichage
        </h3>
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          <ToggleSwitch
            label="Afficher les Prévisualisations"
            description="Images de prévisualisation des plugins"
            checked={layoutConfig.showPreviews}
            onChange={(checked) => handleToggleOption('showPreviews', checked)}
          />
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <ToggleSwitch
              label="Afficher les Statistiques"
              description="Nombre de téléchargements et autres métriques"
              checked={layoutConfig.showStats}
              onChange={(checked) => handleToggleOption('showStats', checked)}
            />
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <ToggleSwitch
              label="Afficher les Notes"
              description="Évaluations et commentaires"
              checked={layoutConfig.showRatings}
              onChange={(checked) => handleToggleOption('showRatings', checked)}
            />
          </div>
        </div>
      </section>

      {/* Reset button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={resetLayout}
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
          Réinitialiser au Layout par Défaut
        </button>
      </div>
    </div>
  );
}
