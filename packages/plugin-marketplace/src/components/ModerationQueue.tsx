/**
 * ModerationQueue - File de modération des ratings en attente
 * Permet approve/reject en masse ou individuellement
 */

import React, { useEffect, useState } from 'react';
import { RatingService } from '../RatingService';
import type { Rating } from '../types';

export interface ModerationQueueProps {
  registryUrl?: string;
  onRatingModerated?: (ratingId: string, approved: boolean) => void;
}

export function ModerationQueue({
  registryUrl = 'https://bigmind-registry.workers.dev',
  onRatingModerated
}: ModerationQueueProps) {
  const [pendingRatings, setPendingRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moderating, setModerating] = useState<Set<string>>(new Set());

  const ratingService = new RatingService();

  const loadPendingRatings = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await ratingService.getPendingRatings(1, 50);
      setPendingRatings(result.ratings);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load pending ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryUrl]);

  const handleToggleSelect = (ratingId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(ratingId)) {
      newSelected.delete(ratingId);
    } else {
      newSelected.add(ratingId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pendingRatings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRatings.map(r => r.id)));
    }
  };

  const handleModerate = async (ratingId: string, approved: boolean, reason?: string) => {
    setModerating(new Set(moderating).add(ratingId));

    try {
      await ratingService.moderateRating(ratingId, approved, reason);

      // Remove from list
      setPendingRatings(prev => prev.filter(r => r.id !== ratingId));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ratingId);
        return newSet;
      });

      onRatingModerated?.(ratingId, approved);
    } catch (err) {
      console.error('Failed to moderate rating:', err);
      alert(`Failed to ${approved ? 'approve' : 'reject'} rating: ${(err as Error).message}`);
    } finally {
      setModerating(prev => {
        const newSet = new Set(prev);
        newSet.delete(ratingId);
        return newSet;
      });
    }
  };

  const handleBulkModerate = async (approved: boolean) => {
    if (selectedIds.size === 0) return;

    const confirm = window.confirm(
      `Are you sure you want to ${approved ? 'approve' : 'reject'} ${selectedIds.size} ratings?`
    );
    if (!confirm) return;

    const idsToModerate = Array.from(selectedIds);
    setModerating(new Set(idsToModerate));

    try {
      // Moderate in parallel (with limit)
      const batchSize = 5;
      for (let i = 0; i < idsToModerate.length; i += batchSize) {
        const batch = idsToModerate.slice(i, i + batchSize);
        await Promise.all(
          batch.map(id => ratingService.moderateRating(id, approved))
        );
      }

      // Remove from list
      setPendingRatings(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());

      alert(`Successfully ${approved ? 'approved' : 'rejected'} ${idsToModerate.length} ratings`);
    } catch (err) {
      console.error('Failed to bulk moderate:', err);
      alert(`Failed to bulk moderate: ${(err as Error).message}`);
    } finally {
      setModerating(new Set());
    }
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= count ? 'text-yellow-500' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading moderation queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load moderation queue</h3>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadPendingRatings}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pendingRatings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">✅</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
        <p className="text-gray-600">No ratings pending moderation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Moderation Queue</h2>
          <p className="text-sm text-gray-600">
            {pendingRatings.length} rating{pendingRatings.length !== 1 ? 's' : ''} pending review
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => handleBulkModerate(true)}
              disabled={moderating.size > 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✓ Approve Selected
            </button>
            <button
              type="button"
              onClick={() => handleBulkModerate(false)}
              disabled={moderating.size > 0}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✗ Reject Selected
            </button>
          </div>
        )}
      </div>

      {/* Select All */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.size === pendingRatings.length}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Select all {pendingRatings.length} ratings
          </span>
        </label>
      </div>

      {/* Ratings List */}
      <div className="space-y-4">
        {pendingRatings.map(rating => {
          const isModeratingThis = moderating.has(rating.id);

          return (
            <div
              key={rating.id}
              className={`bg-white border rounded-lg p-6 transition-opacity ${
                isModeratingThis ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(rating.id)}
                  onChange={() => handleToggleSelect(rating.id)}
                  disabled={isModeratingThis}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        {renderStars(rating.rating)}
                        <span className="text-sm text-gray-500">
                          by {rating.author}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(rating.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerate(rating.id, true)}
                        disabled={isModeratingThis}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection (optional):');
                          if (reason !== null) {
                            handleModerate(rating.id, false, reason || undefined);
                          }
                        }}
                        disabled={isModeratingThis}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>

                  {rating.title && (
                    <h4 className="font-semibold text-gray-900 mb-2">{rating.title}</h4>
                  )}

                  {rating.comment && (
                    <p className="text-gray-700 whitespace-pre-wrap">{rating.comment}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Plugin ID: <span className="font-mono">{rating.pluginId}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
