/**
 * FR: Thèmes prédéfinis pour le Marketplace UI
 * EN: Predefined themes for Marketplace UI
 *
 * Session 61 - Marketplace UI Theme Customization
 */

import type { MarketplaceTheme, MarketplaceLayoutConfig } from '@cartae/design';

/**
 * FR: Configuration de layout par défaut
 * EN: Default layout configuration
 */
export const defaultLayoutConfig: MarketplaceLayoutConfig = {
  layoutMode: 'grid-normal',
  sidebarPosition: 'left',
  searchPosition: 'top-sticky',
  gridColumns: 3,
  cardSize: 'normal',
  showPreviews: true,
  showStats: true,
  showRatings: true,
};

/**
 * FR: Thème Light (professionnel et clean)
 * EN: Light theme (professional and clean)
 */
export const marketplaceLightTheme: MarketplaceTheme = {
  id: 'marketplace-light',
  name: 'Marketplace Light',
  description: 'Thème clair professionnel pour le marketplace',
  author: 'Cartae Team',
  version: '1.0.0',
  category: 'light',
  colors: {
    primary: '#3b82f6',      // Blue-500
    secondary: '#6366f1',     // Indigo-500
    accent: '#06b6d4',        // Cyan-500
    background: '#ffffff',    // White
    surface: '#f9fafb',       // Gray-50
    text: '#111827',          // Gray-900
    textMuted: '#6b7280',     // Gray-500
    border: '#e5e7eb',        // Gray-200
    success: '#10b981',       // Green-500
    warning: '#f59e0b',       // Amber-500
    error: '#ef4444',         // Red-500
    info: '#3b82f6',          // Blue-500
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  marketplaceVars: {
    // Cards
    cardBackground: '#ffffff',
    cardBackgroundHover: '#f9fafb',
    cardBorder: '#e5e7eb',
    cardBorderRadius: '0.75rem',
    cardShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    cardShadowHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

    // Featured/Trending
    featuredBadgeBackground: '#fef3c7',
    featuredBadgeText: '#92400e',
    trendingBadgeBackground: '#dbeafe',
    trendingBadgeText: '#1e40af',

    // Filters/Search
    filterBackground: '#ffffff',
    filterBackgroundHover: '#f3f4f6',
    filterBorder: '#d1d5db',
    searchBackground: '#ffffff',
    searchBorder: '#d1d5db',
    searchBorderFocus: '#3b82f6',

    // Stats/Metrics
    statsBackground: '#f3f4f6',
    statsText: '#374151',
    downloadColor: '#10b981',
    ratingColor: '#f59e0b',

    // Categories
    categoryBackground: '#ede9fe',
    categoryBackgroundHover: '#ddd6fe',
    categoryBorder: '#c4b5fd',
    categoryText: '#5b21b6',
  },
  layoutConfig: defaultLayoutConfig,
};

/**
 * FR: Thème Dark (élégant et sobre)
 * EN: Dark theme (elegant and minimal)
 */
export const marketplaceDarkTheme: MarketplaceTheme = {
  id: 'marketplace-dark',
  name: 'Marketplace Dark',
  description: 'Thème sombre élégant pour le marketplace',
  author: 'Cartae Team',
  version: '1.0.0',
  category: 'dark',
  colors: {
    primary: '#60a5fa',      // Blue-400
    secondary: '#818cf8',     // Indigo-400
    accent: '#22d3ee',        // Cyan-400
    background: '#0f0f0f',    // Near black
    surface: '#1a1a1a',       // Dark gray
    text: '#f9fafb',          // Gray-50
    textMuted: '#9ca3af',     // Gray-400
    border: '#374151',        // Gray-700
    success: '#34d399',       // Green-400
    warning: '#fbbf24',       // Amber-400
    error: '#f87171',         // Red-400
    info: '#60a5fa',          // Blue-400
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.5)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
  },
  marketplaceVars: {
    // Cards
    cardBackground: '#1a1a1a',
    cardBackgroundHover: '#262626',
    cardBorder: '#404040',
    cardBorderRadius: '0.75rem',
    cardShadow: '0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.5)',
    cardShadowHover: '0 10px 15px -3px rgb(0 0 0 / 0.7), 0 4px 6px -4px rgb(0 0 0 / 0.7)',

    // Featured/Trending
    featuredBadgeBackground: '#451a03',
    featuredBadgeText: '#fef3c7',
    trendingBadgeBackground: '#1e3a8a',
    trendingBadgeText: '#dbeafe',

    // Filters/Search
    filterBackground: '#262626',
    filterBackgroundHover: '#404040',
    filterBorder: '#525252',
    searchBackground: '#262626',
    searchBorder: '#525252',
    searchBorderFocus: '#60a5fa',

    // Stats/Metrics
    statsBackground: '#262626',
    statsText: '#d1d5db',
    downloadColor: '#34d399',
    ratingColor: '#fbbf24',

    // Categories
    categoryBackground: '#312e81',
    categoryBackgroundHover: '#3730a3',
    categoryBorder: '#4f46e5',
    categoryText: '#c7d2fe',
  },
  layoutConfig: defaultLayoutConfig,
};

/**
 * FR: Thème Minimal (focus sur le contenu)
 * EN: Minimal theme (content-focused)
 */
export const marketplaceMinimalTheme: MarketplaceTheme = {
  id: 'marketplace-minimal',
  name: 'Marketplace Minimal',
  description: 'Thème minimaliste focalisé sur le contenu',
  author: 'Cartae Team',
  version: '1.0.0',
  category: 'light',
  colors: {
    primary: '#000000',
    secondary: '#4b5563',
    accent: '#000000',
    background: '#ffffff',
    surface: '#fafafa',
    text: '#000000',
    textMuted: '#737373',
    border: '#e5e5e5',
    success: '#22c55e',
    warning: '#f97316',
    error: '#dc2626',
    info: '#0284c7',
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  borderRadius: {
    sm: '0',
    md: '0.125rem',  // 2px - subtle rounding
    lg: '0.25rem',   // 4px
    xl: '0.375rem',  // 6px
  },
  shadows: {
    sm: 'none',
    md: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    lg: '0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  marketplaceVars: {
    // Cards - ultra minimal
    cardBackground: '#ffffff',
    cardBackgroundHover: '#fafafa',
    cardBorder: '#e5e5e5',
    cardBorderRadius: '0.125rem',
    cardShadow: 'none',
    cardShadowHover: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Featured/Trending - subtle
    featuredBadgeBackground: '#fafafa',
    featuredBadgeText: '#000000',
    trendingBadgeBackground: '#f5f5f5',
    trendingBadgeText: '#404040',

    // Filters/Search - clean
    filterBackground: '#ffffff',
    filterBackgroundHover: '#fafafa',
    filterBorder: '#e5e5e5',
    searchBackground: '#ffffff',
    searchBorder: '#d4d4d4',
    searchBorderFocus: '#000000',

    // Stats/Metrics
    statsBackground: '#fafafa',
    statsText: '#404040',
    downloadColor: '#22c55e',
    ratingColor: '#f97316',

    // Categories
    categoryBackground: '#f5f5f5',
    categoryBackgroundHover: '#e5e5e5',
    categoryBorder: '#d4d4d4',
    categoryText: '#262626',
  },
  layoutConfig: {
    ...defaultLayoutConfig,
    layoutMode: 'list',  // List mode for minimal design
    cardSize: 'compact',
  },
};

/**
 * FR: Thème Colorful (vibrant et énergique)
 * EN: Colorful theme (vibrant and energetic)
 */
export const marketplaceColorfulTheme: MarketplaceTheme = {
  id: 'marketplace-colorful',
  name: 'Marketplace Colorful',
  description: 'Thème coloré vibrant et énergique',
  author: 'Cartae Team',
  version: '1.0.0',
  category: 'light',
  colors: {
    primary: '#8b5cf6',      // Violet-500
    secondary: '#ec4899',     // Pink-500
    accent: '#06b6d4',        // Cyan-500
    background: '#ffffff',
    surface: '#faf5ff',       // Violet-50
    text: '#1f2937',          // Gray-800
    textMuted: '#6b7280',     // Gray-500
    border: '#e9d5ff',        // Violet-200
    success: '#22c55e',       // Green-500
    warning: '#f59e0b',       // Amber-500
    error: '#ef4444',         // Red-500
    info: '#3b82f6',          // Blue-500
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  borderRadius: {
    sm: '0.5rem',    // 8px - more rounded
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
  },
  shadows: {
    sm: '0 1px 3px 0 rgb(139 92 246 / 0.1), 0 1px 2px -1px rgb(139 92 246 / 0.1)',
    md: '0 4px 6px -1px rgb(139 92 246 / 0.1), 0 2px 4px -2px rgb(139 92 246 / 0.1)',
    lg: '0 10px 15px -3px rgb(139 92 246 / 0.15), 0 4px 6px -4px rgb(139 92 246 / 0.15)',
  },
  marketplaceVars: {
    // Cards - colorful
    cardBackground: '#ffffff',
    cardBackgroundHover: '#faf5ff',
    cardBorder: '#e9d5ff',
    cardBorderRadius: '1rem',
    cardShadow: '0 2px 4px 0 rgb(139 92 246 / 0.1)',
    cardShadowHover: '0 8px 12px -2px rgb(139 92 246 / 0.2), 0 4px 6px -2px rgb(236 72 153 / 0.1)',

    // Featured/Trending - vibrant
    featuredBadgeBackground: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
    featuredBadgeText: '#ffffff',
    trendingBadgeBackground: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    trendingBadgeText: '#ffffff',

    // Filters/Search
    filterBackground: '#ffffff',
    filterBackgroundHover: '#f3e8ff',
    filterBorder: '#c4b5fd',
    searchBackground: '#ffffff',
    searchBorder: '#c4b5fd',
    searchBorderFocus: '#8b5cf6',

    // Stats/Metrics
    statsBackground: 'linear-gradient(135deg, #faf5ff 0%, #fce7f3 100%)',
    statsText: '#581c87',
    downloadColor: '#22c55e',
    ratingColor: '#f59e0b',

    // Categories
    categoryBackground: 'linear-gradient(135deg, #ddd6fe 0%, #fbcfe8 100%)',
    categoryBackgroundHover: 'linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)',
    categoryBorder: '#c084fc',
    categoryText: '#6b21a8',
  },
  layoutConfig: {
    ...defaultLayoutConfig,
    gridColumns: 2,  // Fewer columns for bigger cards
    cardSize: 'large',
  },
};

/**
 * FR: Liste de tous les thèmes prédéfinis
 * EN: List of all predefined themes
 */
export const marketplaceDefaultThemes: MarketplaceTheme[] = [
  marketplaceLightTheme,
  marketplaceDarkTheme,
  marketplaceMinimalTheme,
  marketplaceColorfulTheme,
];

/**
 * FR: Obtenir un thème par ID
 * EN: Get theme by ID
 */
export function getMarketplaceThemeById(id: string): MarketplaceTheme | undefined {
  return marketplaceDefaultThemes.find(theme => theme.id === id);
}

/**
 * FR: Obtenir les thèmes par catégorie
 * EN: Get themes by category
 */
export function getMarketplaceThemesByCategory(category: 'light' | 'dark' | 'custom'): MarketplaceTheme[] {
  return marketplaceDefaultThemes.filter(theme => theme.category === category);
}
