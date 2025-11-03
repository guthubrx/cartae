/**
 * RatingList - Display a list of ratings with sorting and pagination
 */

import React, { useEffect, useState } from 'react';
import type { Rating, RatingFilters } from '../types';
import { RatingCard } from './RatingCard';

export interface RatingListProps {
  pluginId: string;
  registryUrl?: string;
  showModeration?: boolean;
  onMarkHelpful?: (ratingId: string, helpful: boolean) => Promise<void>;
  onReport?: (ratingId: string) => void;
  onModerate?: (ratingId: string, approved: boolean, reason?: string) => Promise<void>;
}

interface PaginatedResponse {
  ratings: Rating[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function RatingList({
  pluginId,
  registryUrl = 'https://bigmind-registry.workers.dev',
  showModeration = false,
  onMarkHelpful,
  onReport,
  onModerate
}: RatingListProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RatingFilters>({
    sort: 'recent',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  const loadRatings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (showModeration) params.set('status', 'all'); // Admin sees all

      const url = showModeration
        ? `${registryUrl}/api/admin/ratings/pending?${params}`
        : `${registryUrl}/api/plugins/${pluginId}/ratings?${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ratings: ${response.statusText}`);
      }

      const data: PaginatedResponse = await response.json();

      setRatings(data.ratings || []);
      setPagination({
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 10,
        pages: data.pages || 1
      });
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginId, filters, showModeration]);

  const handleSortChange = (sort: RatingFilters['sort']) => {
    setFilters(prev => ({ ...prev, sort, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleMarkHelpful = async (ratingId: string, helpful: boolean) => {
    if (onMarkHelpful) {
      await onMarkHelpful(ratingId, helpful);
      loadRatings(); // Reload to get updated counts
    }
  };

  const handleModerate = async (ratingId: string, approved: boolean, reason?: string) => {
    if (onModerate) {
      await onModerate(ratingId, approved, reason);
      loadRatings(); // Reload to remove moderated rating
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600
              mx-auto mb-4`}
          />
          <p className="text-gray-600">Loading ratings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load ratings</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadRatings}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sort options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {showModeration ? 'Pending Reviews' : 'User Reviews'} ({pagination.total})
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={filters.sort}
            onChange={e => handleSortChange(e.target.value as RatingFilters['sort'])}
            className={`px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none
              focus:ring-2 focus:ring-blue-500`}
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Ratings list */}
      {ratings.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <span className="text-6xl mb-4 block">💬</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-600">
            {showModeration
              ? 'No pending reviews to moderate'
              : 'Be the first to review this plugin!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map(rating => (
            <RatingCard
              key={rating.id}
              rating={rating}
              onMarkHelpful={handleMarkHelpful}
              onReport={onReport}
              showModeration={showModeration}
              onModerate={handleModerate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={`px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
              let pageNum: number;

              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }

              const isActive = pageNum === pagination.page;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className={`px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Next
          </button>
        </div>
      )}

      {/* Page info */}
      <p className="text-sm text-gray-600 text-center">
        Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
        reviews
      </p>
    </div>
  );
}
