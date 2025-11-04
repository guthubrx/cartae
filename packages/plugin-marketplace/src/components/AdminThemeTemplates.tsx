/**
 * FR: Gestion des templates de thèmes pour admins
 * EN: Admin theme templates management
 *
 * Session 61 - Marketplace UI Theme Customization
 * Note: Placeholder implementation - requires backend API integration
 */

import React, { useState } from 'react';
import type { MarketplaceThemeTemplate } from '@cartae/design';

/**
 * FR: Props du composant
 * EN: Component props
 */
export interface AdminThemeTemplatesProps {
  /** FR: Callback de fermeture | EN: Close callback */
  onClose?: () => void;
}

/**
 * FR: Composant de gestion des templates admin (placeholder)
 * EN: Admin templates management component (placeholder)
 *
 * TODO: Implement backend integration:
 * - API endpoints for CRUD operations
 * - Database schema for templates
 * - Version control system
 * - Distribution mechanism to users
 * - Analytics tracking (installs, ratings)
 */
export function AdminThemeTemplates({ onClose }: AdminThemeTemplatesProps) {
  const [templates, setTemplates] = useState<MarketplaceThemeTemplate[]>([]);

  return (
    <div className="admin-theme-templates" style={{ padding: '1.5rem', maxWidth: '64rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Templates de Thèmes Admin
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Créez et distribuez des templates de thèmes pour tous les utilisateurs
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

      {/* Placeholder content */}
      <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '2px dashed #d1d5db' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Fonctionnalité à Venir
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', maxWidth: '32rem', margin: '0 auto 1.5rem' }}>
          La gestion des templates admin nécessite une intégration backend complète.
          Cette fonctionnalité sera implémentée dans une future session avec:
        </p>
        <ul style={{ textAlign: 'left', maxWidth: '32rem', margin: '0 auto', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.75' }}>
          <li>API REST pour créer, modifier, supprimer des templates</li>
          <li>Système de versions et de rollback</li>
          <li>Distribution automatique aux utilisateurs</li>
          <li>Analytics (installations, ratings, popularité)</li>
          <li>Modération et approbation des templates community</li>
        </ul>
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.375rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400e' }}>
            <strong>Note Technique:</strong> Voir packages/design/src/marketplace-theme-types.ts pour l'interface MarketplaceThemeTemplate
          </p>
        </div>
      </div>
    </div>
  );
}
