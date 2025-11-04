/**
 * Plugin marketplace types
 */

export interface PluginListing {
  id: string;
  name: string;
  version: string;
  description: string;
  longDescription?: string;
  author: string | { name: string; email?: string; url?: string };
  pricing: 'free' | 'paid' | 'freemium';
  category?: 'productivity' | 'integration' | 'theme' | 'developer' | 'export' | 'template';
  tags?: string[];
  icon?: string;
  banner?: string;
  screenshots?: string[];
  downloads?: number;
  rating?: number;
  verified?: boolean;
  featured?: boolean;
  homepage?: string;
  repository?: string;
  license?: string;
  updatedAt: string;
  downloadUrl: string;
  size: number;
}

export interface PluginSearchFilters {
  category?: string;
  pricing?: 'free' | 'paid' | 'freemium';
  search?: string;
  featured?: boolean;
  verified?: boolean;
  // Advanced filters (Session 60A)
  minRating?: number; // 1-5
  minDownloads?: number;
  tags?: string[];
  updatedAfter?: string; // ISO date
  sortBy?: 'name' | 'rating' | 'downloads' | 'updated' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  logic?: 'and' | 'or'; // Filter combination logic
}

export interface UpdateInfo {
  id: string;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog?: string;
}

export interface InstallProgress {
  pluginId: string;
  status: 'downloading' | 'extracting' | 'validating' | 'installing' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface InstalledPlugin {
  id: string;
  version: string;
  installedAt: string;
  enabled: boolean;
}

/**
 * Rating types (rating system avec modération)
 */
export interface Rating {
  id: string;
  pluginId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  author: string;
  helpful: number;
  unhelpful: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  moderatedAt?: string;
  moderationNotes?: string;
}

export interface RatingStatsData {
  totalCount: number;
  averageRating: number;
  distribution: [number, number, number, number, number]; // [1★, 2★, 3★, 4★, 5★]
  lastRatingDate?: string;
}

export interface SubmitRatingData {
  pluginId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  author: string;
}

export interface RatingFilters {
  sort?: 'recent' | 'helpful' | 'rating';
  page?: number;
  limit?: number;
}
