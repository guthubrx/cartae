/**
 * Plugin Badges Component
 * Displays status and source badges for plugins
 */

import React from 'react';

interface PluginBadgesProps {
  source: 'core' | 'official' | 'community';
  state?: 'active' | 'inactive' | 'available';
  featured?: boolean;
}

export function PluginBadges({ source, state, featured }: PluginBadgesProps) {
  const sourceBadge = {
    core: {
      label: 'CORE',
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      borderColor: '#93c5fd',
    },
    official: {
      label: 'OFFICIAL',
      bgColor: '#dcfce7',
      textColor: '#15803d',
      borderColor: '#86efac',
    },
    community: {
      label: 'COMMUNITY',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      borderColor: '#fde047',
    },
  }[source];

  const stateBadge = state
    ? {
        active: {
          label: 'ACTIF',
          bgColor: '#d1fae5',
          textColor: '#065f46',
          borderColor: '#6ee7b7',
        },
        inactive: {
          label: 'INACTIF',
          bgColor: '#fee2e2',
          textColor: '#991b1b',
          borderColor: '#fca5a5',
        },
        available: {
          label: 'DISPONIBLE',
          bgColor: '#e0e7ff',
          textColor: '#3730a3',
          borderColor: '#a5b4fc',
        },
      }[state]
    : null;

  function Badge({ config }: { config: any }) {
    // Protection contre les configs undefined
    if (!config) return null;

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: `1px solid ${config.borderColor}`,
          borderRadius: '3px',
        }}
      >
        {config.label}
      </span>
    );
  }

  const featuredBadge = {
    label: 'VEDETTE',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    borderColor: '#fbbf24',
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge config={sourceBadge} />
      {stateBadge && <Badge config={stateBadge} />}
      {featured && <Badge config={featuredBadge} />}
    </div>
  );
}
