/**
 * @cartae/plugin-marketplace
 * Plugin marketplace client for Cartae
 */

// Main API client
export { PluginStore } from './PluginStore';

// Rating Service (Supabase wrapper)
export { RatingService } from './RatingService';

// Filter Storage Service (Session 60A)
export { FilterStorageService } from './services/FilterStorageService';

// Recommendation Service (Session 60B)
export { RecommendationService } from './services/RecommendationService';

// Favorites & History Services (Session 60C)
export { FavoritesService } from './services/FavoritesService';
export { HistoryService, type ViewHistoryItem } from './services/HistoryService';

// Analytics Service (Session 60D)
export {
  AnalyticsService,
  type PluginAnalytics as PluginAnalyticsData,
  type AuthorAnalytics,
} from './services/AnalyticsService';

// React Hooks - Performance & Caching
export {
  usePluginCache,
  usePluginsQuery,
  clearAllCaches,
  getCacheStats,
} from './hooks/usePluginCache';
export { useInfiniteScroll, usePaginatedData } from './hooks/useInfiniteScroll';
export { usePersistentFilters } from './hooks/usePersistentFilters';

// Types
export type {
  PluginListing,
  PluginSearchFilters,
  UpdateInfo,
  InstallProgress,
  InstalledPlugin,
  Rating,
  RatingStatsData,
  SubmitRatingData,
  RatingFilters,
} from './types';

// React Components - Discovery
export { PluginCard } from './components/PluginCard';
export { PluginList } from './components/PluginList';
export { PluginFilters } from './components/PluginFilters';
export { AdvancedFilters } from './components/AdvancedFilters';
export { InstallButton } from './components/InstallButton';
export { PluginDetails } from './components/PluginDetails';
export { FeaturedPlugins } from './components/FeaturedPlugins';
export { TrendingPlugins } from './components/TrendingPlugins';

// React Components - Ratings
export { RatingCard } from './components/RatingCard';
export { RatingList } from './components/RatingList';
export { RatingForm } from './components/RatingForm';
export { RatingStats } from './components/RatingStats';

// React Components - Recommendations (Session 60B)
export { PluginRecommendations } from './components/PluginRecommendations';

// React Components - Favorites & History (Session 60C)
export { FavoritesList } from './components/FavoritesList';
export { HistoryList } from './components/HistoryList';

// React Components - Analytics (Session 60D)
export { AuthorDashboard } from './components/AuthorDashboard';

// React Components - Admin Dashboard
export { AdminDashboard } from './components/AdminDashboard';
export { ModerationQueue } from './components/ModerationQueue';
export { MarketplaceStats } from './components/MarketplaceStats';
export { PluginAnalytics } from './components/PluginAnalytics';
export { DownloadChart } from './components/DownloadChart';
export { RatingTrendChart } from './components/RatingTrendChart';

// React Components - Performance Optimized
export { OptimizedPluginList, OptimizedPluginGrid } from './components/OptimizedPluginList';
export { ImageLoader, IconLoader } from './components/ImageLoader';

// Component Props Types
export type { PluginCardProps } from './components/PluginCard';
export type { PluginListProps } from './components/PluginList';
export type { PluginFiltersProps } from './components/PluginFilters';
export type { AdvancedFiltersProps } from './components/AdvancedFilters';
export type { InstallButtonProps } from './components/InstallButton';
export type { PluginDetailsProps } from './components/PluginDetails';
export type { FeaturedPluginsProps } from './components/FeaturedPlugins';
export type { TrendingPluginsProps } from './components/TrendingPlugins';
export type { RatingCardProps } from './components/RatingCard';
export type { RatingListProps } from './components/RatingList';
export type { RatingFormProps } from './components/RatingForm';
export type { RatingStatsProps } from './components/RatingStats';

// Recommendation Component Props Types (Session 60B)
export type { PluginRecommendationsProps } from './components/PluginRecommendations';

// Favorites & History Component Props Types (Session 60C)
export type { FavoritesListProps } from './components/FavoritesList';
export type { HistoryListProps } from './components/HistoryList';

// Analytics Component Props Types (Session 60D)
export type { AuthorDashboardProps } from './components/AuthorDashboard';

// Admin Component Props Types
export type { AdminDashboardProps } from './components/AdminDashboard';
export type { ModerationQueueProps } from './components/ModerationQueue';
export type { MarketplaceStatsProps } from './components/MarketplaceStats';
export type { PluginAnalyticsProps } from './components/PluginAnalytics';
export type { DownloadChartProps } from './components/DownloadChart';
export type { RatingTrendChartProps } from './components/RatingTrendChart';

// Performance Component Props Types
export type {
  OptimizedPluginListProps,
  OptimizedPluginGridProps,
} from './components/OptimizedPluginList';
export type { ImageLoaderProps, IconLoaderProps } from './components/ImageLoader';
