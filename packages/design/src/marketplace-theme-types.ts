/**
 * FR: Types pour le système de thèmes Marketplace UI
 * EN: Types for Marketplace UI theme system
 *
 * Session 61 - Marketplace UI Theme Customization
 */

import { Theme } from './theme-types';

/**
 * FR: Configuration de layout pour le marketplace
 * EN: Layout configuration for the marketplace
 */
export type MarketplaceLayoutMode = 'grid-compact' | 'grid-normal' | 'grid-large' | 'list' | 'minimal';
export type SidebarPosition = 'left' | 'right' | 'hidden';
export type SearchPosition = 'top-sticky' | 'top-fixed' | 'floating' | 'sidebar';

export interface MarketplaceLayoutConfig {
  /** FR: Mode d'affichage des plugins | EN: Plugin display mode */
  layoutMode: MarketplaceLayoutMode;

  /** FR: Position de la barre latérale | EN: Sidebar position */
  sidebarPosition: SidebarPosition;

  /** FR: Position de la barre de recherche | EN: Search bar position */
  searchPosition: SearchPosition;

  /** FR: Nombre de colonnes en mode grille | EN: Number of columns in grid mode */
  gridColumns: 1 | 2 | 3 | 4;

  /** FR: Taille des cartes | EN: Card size */
  cardSize: 'compact' | 'normal' | 'large';

  /** FR: Afficher les images de prévisualisation | EN: Show preview images */
  showPreviews: boolean;

  /** FR: Afficher les statistiques de téléchargement | EN: Show download stats */
  showStats: boolean;

  /** FR: Afficher les notes | EN: Show ratings */
  showRatings: boolean;
}

/**
 * FR: Thème spécifique au marketplace
 * EN: Marketplace-specific theme
 *
 * Extends the base Theme with marketplace-specific variables
 */
export interface MarketplaceTheme extends Theme {
  /** FR: Variables CSS spécifiques marketplace | EN: Marketplace-specific CSS variables */
  marketplaceVars: {
    // Cards
    cardBackground: string;
    cardBackgroundHover: string;
    cardBorder: string;
    cardBorderRadius: string;
    cardShadow: string;
    cardShadowHover: string;

    // Featured/Trending
    featuredBadgeBackground: string;
    featuredBadgeText: string;
    trendingBadgeBackground: string;
    trendingBadgeText: string;

    // Filters/Search
    filterBackground: string;
    filterBackgroundHover: string;
    filterBorder: string;
    searchBackground: string;
    searchBorder: string;
    searchBorderFocus: string;

    // Stats/Metrics
    statsBackground: string;
    statsText: string;
    downloadColor: string;
    ratingColor: string;

    // Categories
    categoryBackground: string;
    categoryBackgroundHover: string;
    categoryBorder: string;
    categoryText: string;
  };

  /** FR: Configuration du layout | EN: Layout configuration */
  layoutConfig?: MarketplaceLayoutConfig;
}

/**
 * FR: Template de thème créé par un admin
 * EN: Theme template created by an admin
 */
export interface MarketplaceThemeTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;

  /** FR: Thème marketplace complet | EN: Complete marketplace theme */
  theme: MarketplaceTheme;

  /** FR: Nombre d'installations | EN: Number of installations */
  installCount: number;

  /** FR: Note moyenne | EN: Average rating */
  rating: number;

  /** FR: Nombre d'évaluations | EN: Number of ratings */
  ratingCount: number;

  /** FR: Vérifié par l'équipe | EN: Verified by team */
  verified: boolean;

  /** FR: Catégorie | EN: Category */
  category: 'official' | 'community' | 'experimental';

  /** FR: Tags pour recherche | EN: Tags for search */
  tags: string[];

  /** FR: Capture d'écran | EN: Screenshot */
  screenshot?: string;

  /** FR: Prévisualisation | EN: Preview */
  preview?: {
    colors: string[];
    layout: MarketplaceLayoutMode;
  };
}

/**
 * FR: Configuration du système de thèmes marketplace
 * EN: Marketplace theme system configuration
 */
export interface MarketplaceThemeConfig {
  /** FR: Thème actuel | EN: Current theme */
  currentTheme: string;

  /** FR: Configuration du layout | EN: Layout configuration */
  layoutConfig: MarketplaceLayoutConfig;

  /** FR: Thèmes disponibles | EN: Available themes */
  availableThemes: MarketplaceTheme[];

  /** FR: Thèmes personnalisés | EN: Custom themes */
  customThemes: MarketplaceTheme[];

  /** FR: Templates admin installés | EN: Installed admin templates */
  installedTemplates: MarketplaceThemeTemplate[];

  /** FR: Préférences utilisateur | EN: User preferences */
  userPreferences: {
    /** FR: Mode sombre automatique | EN: Auto dark mode */
    autoDarkMode: boolean;

    /** FR: Réduire les animations | EN: Reduce motion */
    reduceMotion: boolean;

    /** FR: Haute contrasté | EN: High contrast */
    highContrast: boolean;

    /** FR: Échelle de police | EN: Font size scale */
    fontSizeScale: number;

    /** FR: Synchroniser avec le thème Obsidian | EN: Sync with Obsidian theme */
    syncWithObsidian: boolean;
  };
}

/**
 * FR: Stockage du système de thèmes marketplace
 * EN: Marketplace theme system storage
 */
export interface MarketplaceThemeStorage {
  config: MarketplaceThemeConfig;
  version: string;
  lastUpdated: string;
}

/**
 * FR: Options de création de thème personnalisé
 * EN: Custom theme creation options
 */
export interface CreateMarketplaceThemeOptions {
  /** FR: Nom du thème | EN: Theme name */
  name: string;

  /** FR: Description | EN: Description */
  description: string;

  /** FR: Basé sur un thème existant | EN: Based on existing theme */
  baseThemeId?: string;

  /** FR: Couleurs personnalisées | EN: Custom colors */
  customColors?: Partial<MarketplaceTheme['marketplaceVars']>;

  /** FR: Configuration du layout | EN: Layout configuration */
  layoutConfig?: Partial<MarketplaceLayoutConfig>;
}

/**
 * FR: Événements du système de thèmes
 * EN: Theme system events
 */
export type MarketplaceThemeEvent =
  | { type: 'theme-changed'; themeId: string }
  | { type: 'layout-changed'; layoutConfig: MarketplaceLayoutConfig }
  | { type: 'theme-created'; theme: MarketplaceTheme }
  | { type: 'theme-deleted'; themeId: string }
  | { type: 'template-installed'; templateId: string }
  | { type: 'template-uninstalled'; templateId: string };

/**
 * FR: Callback pour les événements de thème
 * EN: Callback for theme events
 */
export type MarketplaceThemeEventCallback = (event: MarketplaceThemeEvent) => void;
