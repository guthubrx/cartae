/**
 * RatingStats - Display rating distribution and average
 */

import React from 'react';
import type { RatingStatsData } from '../types';

export interface RatingStatsProps {
  stats: RatingStatsData;
  pluginId: string;
}

export function RatingStats({ stats }: RatingStatsProps) {
  const { totalCount, averageRating, distribution } = stats;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getPercentage = (count: number): number => {
    if (totalCount === 0) return 0;
    return Math.round((count / totalCount) * 100);
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={star <= count ? 'text-yellow-500' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (totalCount === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Summary</h3>
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">⭐</span>
          <p className="text-gray-600">No ratings yet</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to rate this plugin!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Summary</h3>

      {/* Average rating (moyenne des ratings) */}
      <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          {renderStars(Math.round(averageRating))}
          <p className="text-sm text-gray-600 mt-2">
            {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="flex-1 space-y-2">
          {/* Distribution bars (barres de distribution) */}
          {[5, 4, 3, 2, 1].map(starCount => {
            const count = distribution[starCount - 1];
            const percentage = getPercentage(count);

            return (
              <div key={starCount} className="flex items-center gap-3">
                {/* Star label */}
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium text-gray-700">{starCount}</span>
                  <span className="text-yellow-500">★</span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Count and percentage */}
                <div className="w-24 text-right">
                  <span className="text-sm text-gray-600">
                    {count} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional stats (statistiques additionnelles) */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Reviews</p>
          <p className="text-lg font-semibold text-gray-900">{totalCount}</p>
        </div>

        <div>
          <p className="text-gray-600">Last Review</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(stats.lastRatingDate)}
          </p>
        </div>

        <div>
          <p className="text-gray-600">Positive (4-5★)</p>
          <p className="text-lg font-semibold text-green-600">
            {getPercentage(distribution[3] + distribution[4])}%
          </p>
        </div>

        <div>
          <p className="text-gray-600">Negative (1-2★)</p>
          <p className="text-lg font-semibold text-red-600">
            {getPercentage(distribution[0] + distribution[1])}%
          </p>
        </div>
      </div>
    </div>
  );
}
