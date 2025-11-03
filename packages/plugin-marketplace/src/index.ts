/**
 * @cartae/plugin-marketplace
 * Plugin marketplace client for Cartae
 */

// Main API client
export { PluginStore } from './PluginStore';

// Rating Service (Supabase wrapper)
export { RatingService } from './RatingService';

// React Hooks - Performance & Caching
export { usePluginCache, usePluginsQuery, clearAllCaches, getCacheStats } from './hooks/usePluginCache';
export { useInfiniteScroll, usePaginatedData } from './hooks/useInfiniteScroll';

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
  RatingFilters
} from './types';

// React Components - Discovery
export { PluginCard } from './components/PluginCard';
export { PluginList } from './components/PluginList';
export { PluginFilters } from './components/PluginFilters';
export { InstallButton } from './components/InstallButton';
export { PluginDetails } from './components/PluginDetails';
export { FeaturedPlugins } from './components/FeaturedPlugins';
export { TrendingPlugins } from './components/TrendingPlugins';

// React Components - Ratings
export { RatingCard } from './components/RatingCard';
export { RatingList } from './components/RatingList';
export { RatingForm } from './components/RatingForm';
export { RatingStats } from './components/RatingStats';

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
export type { InstallButtonProps } from './components/InstallButton';
export type { PluginDetailsProps } from './components/PluginDetails';
export type { FeaturedPluginsProps } from './components/FeaturedPlugins';
export type { TrendingPluginsProps } from './components/TrendingPlugins';
export type { RatingCardProps } from './components/RatingCard';
export type { RatingListProps } from './components/RatingList';
export type { RatingFormProps } from './components/RatingForm';
export type { RatingStatsProps } from './components/RatingStats';

// Admin Component Props Types
export type { AdminDashboardProps } from './components/AdminDashboard';
export type { ModerationQueueProps } from './components/ModerationQueue';
export type { MarketplaceStatsProps } from './components/MarketplaceStats';
export type { PluginAnalyticsProps } from './components/PluginAnalytics';
export type { DownloadChartProps } from './components/DownloadChart';
export type { RatingTrendChartProps } from './components/RatingTrendChart';

// Performance Component Props Types
export type { OptimizedPluginListProps, OptimizedPluginGridProps } from './components/OptimizedPluginList';
export type { ImageLoaderProps, IconLoaderProps } from './components/ImageLoader';
